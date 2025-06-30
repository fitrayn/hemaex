const NETLIFY_API_URL = 'https://deluxe-sfogliatella-8f76e0.netlify.app/.netlify/functions/telegram-api';

// تخزين مؤقت للرسائل الفاشلة
const failedMessages = [];

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
    message: `تليجرام يتعرض لضغط عالي، سيتم إعادة المحاولة بعد ${Math.ceil(retryAfter / 60)} دقيقة`
  });
  
  // إعادة المحاولة بعد الوقت المحدد من تليجرام
  setTimeout(async () => {
    console.log('🔄 إعادة محاولة إرسال الرسالة...');
    const retryResult = await sendToTelegram(data);
    if (retryResult.success) {
      console.log('✅ تم إرسال الرسالة بنجاح بعد إعادة المحاولة');
    } else {
      console.log('❌ فشلت إعادة المحاولة:', retryResult.error);
    }
  }, retryAfter * 1000);
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