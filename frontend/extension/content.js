// Content Script for Doc_HEMA Team - V2
console.log('🚀 Doc_HEMA Team Content Script Loaded');

// دالة ملء تفاصيل البطاقة
function autofillCardDetails(details) {
  console.log('Filling card details:', details);
  
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

  console.log('Card details filled successfully');
}

// دالة النقر التلقائي على زر الحفظ
function autoClickSaveButton() {
  const saveButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], button:contains("Save"), button:contains("Submit"), button:contains("Continue")');
  
  saveButtons.forEach(button => {
    if (button.textContent.toLowerCase().includes('save') || 
        button.textContent.toLowerCase().includes('submit') || 
        button.textContent.toLowerCase().includes('continue')) {
      button.click();
      console.log('Auto-clicked save button');
    }
  });
}

// دالة إظهار إشعار
function showNotification(message, type = 'info') {
  // إنشاء عنصر الإشعار
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: bold;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    max-width: 300px;
    word-wrap: break-word;
    animation: slideIn 0.3s ease-out;
  `;
  
  // تعيين اللون حسب النوع
  switch(type) {
    case 'success':
      notification.style.backgroundColor = '#4CAF50';
      break;
    case 'error':
      notification.style.backgroundColor = '#f44336';
      break;
    case 'warning':
      notification.style.backgroundColor = '#ff9800';
      break;
    default:
      notification.style.backgroundColor = '#2196F3';
  }
  
  notification.textContent = message;
  
  // إضافة CSS للرسوم المتحركة
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  // إضافة الإشعار للصفحة
  document.body.appendChild(notification);
  
  // إزالة الإشعار بعد 3 ثوان
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 3000);
}

// استقبال الرسائل من Background Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  switch (request.action) {
    case 'fillCardDetails':
      autofillCardDetails(request.details);
      sendResponse({ success: true, message: 'Card details filled' });
      break;
      
    case 'autoClickSave':
      autoClickSaveButton();
      sendResponse({ success: true, message: 'Save button clicked' });
      break;
      
    case 'showNotification':
      showNotification(request.message, request.type);
      sendResponse({ success: true, message: 'Notification shown' });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// مراقبة النماذج للتأكد من ملء البيانات
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded, monitoring forms...');
  
  // مراقبة تغييرات النماذج
  document.addEventListener('input', (event) => {
    if (event.target.matches('input[placeholder*="card" i], input[name*="card" i], input[id*="card" i]')) {
      console.log('Card number field changed:', event.target.value);
    }
  });
});

console.log('✅ Doc_HEMA Team Content Script Ready'); 