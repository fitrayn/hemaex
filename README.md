# 🔔 Telegram Card Logger - Complete Project

مشروع كامل للتليجرام مع نظام Rate Limiting متقدم - **10 رسائل لكل جهاز في الدقيقة**

## 📋 ملخص المشروع

هذا المشروع يحتوي على:
- **الباك إند**: Netlify Functions آمن مع Rate Limiting
- **الفرونت إند**: إكستنشن Chrome محسن مع واجهة تفاعلية

## 🚀 الميزات

### 📊 نظام Rate Limiting متقدم
- **10 رسائل فقط لكل جهاز في الدقيقة**
- حظر مؤقت لمدة 5 دقائق عند تجاوز الحد
- تتبع الطلبات المتبقية والوقت المتبقي
- مراقبة الأنشطة المشبوهة

### 🛡️ حماية متطورة
- تشفير البيانات الحساسة
- التحقق من صحة الطلبات
- مراقبة الأنشطة المشبوهة
- حظر الأجهزة المزعجة

### 📱 واجهة مستخدم محسنة
- Popup تفاعلي مع إحصائيات مباشرة
- عرض حالة الاتصال في الوقت الفعلي
- سجلات مفصلة للأنشطة
- تنبيهات عند تجاوز الحد

## 📁 هيكل المشروع

```
├── backend/
│   ├── netlify-functions/
│   │   └── telegram-api-updated.js    # دالة Netlify الرئيسية
│   └── netlify.toml                   # إعدادات Netlify
├── frontend/
│   ├── background.js                  # Background Script
│   ├── content.js                     # Content Script
│   ├── popup.html                     # واجهة Popup
│   ├── popup.js                       # منطق Popup
│   ├── manifest.json                  # إعدادات الإكستنشن
│   ├── icon16.png                     # أيقونة 16x16
│   ├── icon48.png                     # أيقونة 48x48
│   └── icon128.png                    # أيقونة 128x128
├── .gitignore                         # ملفات مستثناة من Git
├── README.md                          # هذا الملف
├── README_BACKEND.md                  # دليل مفصل للباك إند
└── README_FRONTEND.md                 # دليل مفصل للفرونت إند
```

## ⚙️ التثبيت والإعداد

### 1. إنشاء مفتاح التشفير
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. إعداد الباك إند (Netlify)
```bash
# تثبيت Netlify CLI
npm install -g netlify-cli

# تسجيل الدخول
netlify login

# رفع المشروع
netlify deploy --prod --dir=backend
```

### 3. إعداد متغيرات البيئة
في لوحة تحكم Netlify:
- **Key**: `ENCRYPTION_KEY`
- **Value**: المفتاح الذي أنشأته

### 4. إعداد الفرونت إند
1. تحديث رابط API في `frontend/background.js`:
   ```javascript
   const NETLIFY_API_URL = 'https://your-site.netlify.app/.netlify/functions/telegram-api';
   ```

2. تحميل الإكستنشن:
   - افتح `chrome://extensions/`
   - فعّل Developer mode
   - اضغط Load unpacked
   - اختر مجلد `frontend`

## 🔧 API Endpoints

### POST `/telegram-api`
إرسال رسالة إلى تليجرام

### GET `/telegram-api`
الحصول على إحصائيات النظام

## 📊 أنواع الرسائل المدعومة

- **card**: بيانات البطاقة
- **bin**: بيانات BIN
- **message**: رسالة عادية

## 🛡️ الأمان

- تشفير توكن البوت و Chat ID
- توقيع الطلبات
- Rate Limiting متقدم
- مراقبة الأنشطة المشبوهة

## 📖 للمزيد من التفاصيل

- **الباك إند**: راجع ملف `README_BACKEND.md`
- **الفرونت إند**: راجع ملف `README_FRONTEND.md`

## 📄 الترخيص

هذا المشروع مخصص للاستخدام التعليمي والبحثي فقط.

---

**⚠️ تحذير**: هذا المشروع مخصص للاستخدام القانوني فقط. يرجى احترام خصوصية الآخرين وقوانين حماية البيانات. 