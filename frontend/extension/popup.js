// Event listeners for main functionality
document.addEventListener('DOMContentLoaded', () => {
  // Decline button
  document.getElementById('declineBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({'action': 'fillCard', 'type': 'decline'});
  });
  
  // Active button
  document.getElementById('activeBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({'action': 'fillCard', 'type': 'active'});
  });
  
  // Join Telegram button
  document.getElementById('jointeleBtn').addEventListener('click', function() {
    window.open('https://t.me/baba_elmgal2', '_blank');
  });
  
  // Test Telegram button
  document.getElementById('testTelegramBtn').addEventListener('click', function() {
    chrome.runtime.sendMessage({
      action: 'testTelegram'
    }, (response) => {
      if (chrome.runtime.lastError) {
        showNotification('خطأ في اختبار تليجرام', 'error');
        console.error('Telegram test error:', chrome.runtime.lastError);
      } else {
        showNotification('تم إرسال رسالة اختبار إلى تليجرام', 'success');
        console.log('Telegram test response:', response);
      }
    });
  });
  
  // Clear logs button
  document.getElementById('clearLogsBtn').addEventListener('click', function() {
    localStorage.removeItem('cardLogs');
    renderLogs();
    showNotification('تم مسح السجلات', 'success');
  });
  
  // Auto Save toggle
  const autoSaveToggle = document.getElementById('autoSaveToggle');
  autoSaveToggle.addEventListener('change', function() {
    chrome.storage.local.set({ cardAutoSave: this.checked });
    updateAutoSaveStatus();
    showNotification(this.checked ? 'Auto Save مفعل' : 'Auto Save معطل', 'info');
  });
  
  // Load saved settings
  chrome.storage.local.get(['cardAutoSave', 'activeBin', 'declineBin'], function(data) {
    if (data.cardAutoSave !== undefined) {
      autoSaveToggle.checked = data.cardAutoSave;
    }
    if (data.activeBin) {
      document.getElementById('activeBinInput').value = data.activeBin;
    }
    if (data.declineBin) {
      document.getElementById('declineBinInput').value = data.declineBin;
    }
    updateAutoSaveStatus();
  });
  
  // Save BIN inputs on change
  document.getElementById('activeBinInput').addEventListener('input', function() {
    chrome.storage.local.set({ activeBin: this.value });
  });
  
  document.getElementById('declineBinInput').addEventListener('input', function() {
    chrome.storage.local.set({ declineBin: this.value });
  });
});

// Allow only numbers and X in BIN input
function allowBinInput(input) {
  input.addEventListener('input', () => {
    let value = input.value.toUpperCase();
    // السماح فقط بالأرقام و X
    value = value.replace(/[^0-9X]/g, '');
    input.value = value;
  });
}

// توليد رقم عشوائي
function generateRandomDigit() {
  return Math.floor(Math.random() * 10);
}

// تحويل BIN مع X إلى رقم كامل
function generateFullBin(binPattern) {
  let result = '';
  for (let i = 0; i < binPattern.length; i++) {
    if (binPattern[i] === 'X') {
      result += generateRandomDigit();
    } else {
      result += binPattern[i];
    }
  }
  return result;
}

// توليد تاريخ عشوائي
function generateExpiry() {
  const currentYear = new Date().getFullYear();
  const year = currentYear + Math.floor(Math.random() * 5) + 1;
  const month = Math.floor(Math.random() * 12) + 1;
  return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
}

// توليد CVC عشوائي
function generateCVV() {
  return Math.floor(Math.random() * 900) + 100;
}

// توليد اسم عشوائي للبطاقة
function generateCardName() {
  const randomWords = [
    'Khan', 'Ahmed', 'Patel', 'Chowdhury', 'Sheikh',
    'Malik', 'Roy', 'Das', 'Hussain', 'Verma',
    'Singh', 'Rahman', 'Sharma', 'Jahan', 'Iqbal',
    'Mondal', 'Rana', 'Mitra', 'Siddiqui', 'Bhattacharya'
  ];

  const randoName = [
    // Male Names
    "Aarav", "Arjun", "Kabir", "Ravi", "Vikram", "Raj", "Ayan", "Zayan", "Rehan", "Tariq",
    "Nasir", "Adeel", "Faizan", "Imran", "Nadeem", "Sameer", "Rahul", "Amit", "Vikas", "Karan",
    "Rohit", "Siddharth", "Manoj", "Abdul", "Yusuf", "Asif", "Irfan", "Shahid", "Kamran", "Waqas",
    // Female Names
    "Ayesha", "Fatima", "Zara", "Anika", "Nusrat", "Priya", "Puja", "Madhuri", "Ameena", "Sadia",
    "Rima", "Sumaiya", "Mehjabin", "Shila", "Nadia", "Sharmin", "Mousumi", "Lamia", "Tasmia", "Hafsa"
  ];

  const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
  const randomName = randoName[Math.floor(Math.random() * randomName.length)];

  return `${randomName} ${randomWord}`;
}

// Allow only numbers in input fields
function allowOnlyNumbers(input, maxLength) {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, maxLength);
  });
}

// إضافة BIN جديد
const newBinInput = document.getElementById('newBinInput');
const newCardNumber = document.getElementById('newCardNumber');
const newExpiryDate = document.getElementById('newExpiryDate');
const newCvc = document.getElementById('newCvc');
const newBinName = document.getElementById('newBinName');
const addBinBtn = document.getElementById('addBinBtn');

// استخدام BIN سريع
const quickBinInput = document.getElementById('quickBinInput');
const quickUseBinBtn = document.getElementById('quickUseBinBtn');

// تطبيق قيود الإدخال على BIN
allowBinInput(newBinInput);
allowBinInput(quickBinInput);

// تطبيق قيود الإدخال على رقم البطاقة
allowOnlyNumbers(newCardNumber, 16);

// تطبيق قيود الإدخال على التاريخ
newExpiryDate.addEventListener('input', () => {
  let value = newExpiryDate.value.replace(/\D/g, '');
  if (value.length >= 2) {
    value = value.slice(0, 2) + '/' + value.slice(2, 4);
  }
  newExpiryDate.value = value;
});

// تطبيق قيود الإدخال على CVC
allowOnlyNumbers(newCvc, 3);

addBinBtn.addEventListener('click', () => {
  const binPattern = newBinInput.value.trim().toUpperCase();
  const cardNumber = newCardNumber.value.trim();
  const expiryDate = newExpiryDate.value.trim();
  const cvc = newCvc.value.trim();
  const name = newBinName.value.trim();
  
  if (!binPattern) {
    showNotification('يرجى إدخال رقم BIN', 'error');
    return;
  }
  
  if (binPattern.length < 6 || binPattern.length > 16) {
    showNotification('يجب أن يكون طول BIN من 6 إلى 16 رقم', 'error');
    return;
  }
  
  // التحقق من صحة النمط
  if (!/^[0-9X]+$/.test(binPattern)) {
    showNotification('يجب أن يحتوي BIN على أرقام و X فقط', 'error');
    return;
  }
  
  // التحقق من صحة رقم البطاقة إذا تم إدخاله
  if (cardNumber && cardNumber.length !== 16) {
    showNotification('رقم البطاقة يجب أن يكون 16 رقم', 'error');
    return;
  }
  
  // التحقق من صحة التاريخ إذا تم إدخاله
  if (expiryDate && !/^\d{2}\/\d{2}$/.test(expiryDate)) {
    showNotification('صيغة التاريخ غير صحيحة (MM/YY)', 'error');
    return;
  }
  
  // التحقق من صحة CVC إذا تم إدخاله
  if (cvc && cvc.length !== 3) {
    showNotification('CVC يجب أن يكون 3 أرقام', 'error');
    return;
  }
  
  // توليد رقم كامل من النمط إذا لم يتم إدخال رقم البطاقة
  const fullBin = cardNumber || generateFullBin(binPattern);
  
  // حفظ BIN في التخزين المحلي
  let bins = JSON.parse(localStorage.getItem('savedBins') || '[]');
  const newBin = {
    pattern: binPattern,
    fullNumber: fullBin,
    expiry: expiryDate || null,
    cvc: cvc || null,
    name: name || `BIN ${binPattern}`,
    date: new Date().toLocaleString(),
    hasFullCard: !!cardNumber,
    hasExpiry: !!expiryDate,
    hasCvc: !!cvc
  };
  
  bins.unshift(newBin);
  localStorage.setItem('savedBins', JSON.stringify(bins));
  
  // إظهار إشعار نجاح
  const successMsg = `تم إضافة BIN: ${binPattern}${cardNumber ? ' (مع رقم البطاقة الكامل)' : ''}`;
  showNotification(successMsg, 'success');
  
  // إرسال بيانات BIN إلى background.js لإرسالها إلى تليجرام
  const binDataForTelegram = {
    pattern: binPattern,
    name: name || `BIN ${binPattern}`,
    cardNumber: cardNumber || null,
    expiryDate: expiryDate || null,
    cvc: cvc || null,
    createdAt: new Date().toISOString()
  };
  
  sendNewBinMessage(binDataForTelegram);
  
  // مسح الحقول
  newBinInput.value = '';
  newCardNumber.value = '';
  newExpiryDate.value = '';
  newCvc.value = '';
  newBinName.value = '';
  
  // تحديث العرض
  renderSavedBins();
  
  // إضافة للسجل
  addLog('إضافة BIN جديد', { 
    pattern: binPattern, 
    hasFullCard: !!cardNumber,
    hasExpiry: !!expiryDate,
    hasCvc: !!cvc
  });
});

// عرض BINs المحفوظة
function renderSavedBins() {
  let bins = JSON.parse(localStorage.getItem('savedBins') || '[]');
  const cardManager = document.getElementById('cardManager');
  
  if (!bins.length) {
    cardManager.innerHTML = '<div style="text-align:center; color:#666; padding:20px;">لا توجد BINs محفوظة</div>';
    return;
  }
  
  cardManager.innerHTML = '';
  
  bins.forEach((bin, index) => {
    const binElement = document.createElement('div');
    binElement.className = 'bin-item';
    
    // إنشاء معلومات البطاقة
    let cardInfo = `<div class="bin-pattern">النمط: ${bin.pattern}</div>`;
    cardInfo += `<div class="bin-pattern">المولد: ${bin.fullNumber}</div>`;
    
    if (bin.expiry) {
      cardInfo += `<div class="bin-pattern">التاريخ: ${bin.expiry}</div>`;
    }
    
    if (bin.cvc) {
      cardInfo += `<div class="bin-pattern">CVC: ${bin.cvc}</div>`;
    }
    
    // إضافة مؤشرات البيانات المتوفرة
    let indicators = '';
    if (bin.hasFullCard) indicators += '<span style="background:#4CAF50; color:white; padding:2px 6px; border-radius:3px; font-size:10px; margin-right:5px;">رقم كامل</span>';
    if (bin.hasExpiry) indicators += '<span style="background:#2196F3; color:white; padding:2px 6px; border-radius:3px; font-size:10px; margin-right:5px;">تاريخ</span>';
    if (bin.hasCvc) indicators += '<span style="background:#FF9800; color:white; padding:2px 6px; border-radius:3px; font-size:10px; margin-right:5px;">CVC</span>';
    
    binElement.innerHTML = `
      <div class="bin-header">
        <div>
          <div class="bin-name">${bin.name}</div>
          ${cardInfo}
          <div style="margin-top:5px;">${indicators}</div>
        </div>
        <div class="bin-actions">
          <button class="use-btn" data-index="${index}">استخدام</button>
          <button class="delete-btn" data-index="${index}">حذف</button>
        </div>
      </div>
    `;
    
    cardManager.appendChild(binElement);
  });
  
  // إضافة event listeners للأزرار
  document.querySelectorAll('.use-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      useBin(index);
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      deleteBin(index);
    });
  });
}

// استخدام BIN
function useBin(index) {
  console.log('useBin called with index:', index);
  let bins = JSON.parse(localStorage.getItem('savedBins') || '[]');
  const bin = bins[index];
  
  console.log('Found bin:', bin);
  
  if (bin) {
    // توليد رقم جديد من النمط إذا لم يكن هناك رقم كامل
    const newFullNumber = bin.hasFullCard ? bin.fullNumber : generateFullBin(bin.pattern);
    
    // توليد تاريخ عشوائي إذا لم يكن متوفراً
    const newExpiry = bin.hasExpiry ? bin.expiry : generateExpiry();
    
    // توليد CVC عشوائي إذا لم يكن متوفراً
    const newCvc = bin.hasCvc ? bin.cvc : generateCVV();
    
    console.log('Generated card data:', {
      number: newFullNumber,
      expiry: newExpiry,
      cvc: newCvc,
      pattern: bin.pattern
    });
    
    // تحديث البيانات
    bins[index].fullNumber = newFullNumber;
    bins[index].expiry = newExpiry;
    bins[index].cvc = newCvc;
    bins[index].lastUsed = new Date().toLocaleString();
    localStorage.setItem('savedBins', JSON.stringify(bins));
    
    // إظهار البيانات المولدة
    let resultMsg = `BIN ${bin.pattern}: ${newFullNumber}`;
    if (!bin.hasExpiry) resultMsg += ` | التاريخ: ${newExpiry}`;
    if (!bin.hasCvc) resultMsg += ` | CVC: ${newCvc}`;
    
    showNotification(resultMsg, 'success');
    
    // إضافة للسجل
    addLog('استخدام BIN', { 
      pattern: bin.pattern, 
      generated: newFullNumber, 
      name: bin.name,
      expiry: newExpiry,
      cvc: newCvc
    });
    
    // تحديث العرض
    renderSavedBins();
    
    // إرسال البيانات إلى background.js لملء النماذج
    const cardData = {
      number: newFullNumber,
      expiry: newExpiry,
      cvv: newCvc,
      name: generateCardName(),
      isQuickBin: false,
      binPattern: bin.pattern
    };
    
    console.log('Sending card data to background:', cardData);
    
    // إرسال البيانات لملء النماذج
    chrome.runtime.sendMessage({
      'action': 'fillCardWithData',
      'data': cardData
    }, (response) => {
      console.log('Background response:', response);
      if (response && response.success) {
        showNotification('تم إرسال البيانات بنجاح', 'success');
      } else {
        showNotification('خطأ في إرسال البيانات', 'error');
      }
    });
  } else {
    console.error('Bin not found at index:', index);
    showNotification('لم يتم العثور على BIN', 'error');
  }
}

// حذف BIN
function deleteBin(index) {
  let bins = JSON.parse(localStorage.getItem('savedBins') || '[]');
  const bin = bins[index];
  
  if (bin) {
    bins.splice(index, 1);
    localStorage.setItem('savedBins', JSON.stringify(bins));
    
    showNotification(`تم حذف BIN: ${bin.pattern}`, 'success');
    
    // إضافة للسجل
    addLog('حذف BIN', { 
      pattern: bin.pattern, 
      name: bin.name 
    });
    
    // تحديث العرض
    renderSavedBins();
  }
}

// عرض السجلات
function renderLogs() {
  let logs = JSON.parse(localStorage.getItem('cardLogs') || '[]');
  const logsContainer = document.getElementById('logsContainer');
  
  if (!logs.length) {
    logsContainer.innerHTML = '<div style="text-align:center; color:#666; padding:20px;">لا توجد سجلات</div>';
    return;
  }
  
  logsContainer.innerHTML = '';
  
  logs.slice(0, 10).forEach(log => {
    const logElement = document.createElement('div');
    logElement.className = 'log-item';
    
    let details = '';
    if (log.details && typeof log.details === 'object') {
      details = Object.entries(log.details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    } else if (log.details) {
      details = log.details;
    }
    
    logElement.innerHTML = `
      <div class="log-action">${log.action}</div>
      ${details ? `<div style="color:#666; font-size:10px;">${details}</div>` : ''}
      <div class="log-time">${log.date}</div>
    `;
    
    logsContainer.appendChild(logElement);
  });
}

// تحديث حالة Auto Save
function updateAutoSaveStatus() {
  const toggle = document.getElementById('autoSaveToggle');
  
  // إزالة المؤشر السابق إذا كان موجوداً
  const existingIndicator = document.getElementById('autoSaveStatus');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // إنشاء مؤشر جديد
  const statusIndicator = document.createElement('div');
  statusIndicator.id = 'autoSaveStatus';
  statusIndicator.style.cssText = `
    font-size: 11px;
    color: ${toggle.checked ? '#4CAF50' : '#666'};
    margin-top: 4px;
    text-align: center;
    font-weight: bold;
  `;
  statusIndicator.textContent = toggle.checked ? '✅ Auto Save مفعل' : '❌ Auto Save معطل';
  
  // إضافة المؤشر إلى حاوية التبديل
  const toggleContainer = toggle.closest('.switch-container');
  if (toggleContainer) {
    toggleContainer.appendChild(statusIndicator);
  }
}

// تهيئة مؤشر الحالة وعرض BINs
updateAutoSaveStatus();
renderSavedBins();
renderLogs();

// Operation log
function addLog(action, details) {
  let logs = JSON.parse(localStorage.getItem('cardLogs') || '[]');
  logs.unshift({ action, details, date: new Date().toLocaleString() });
  
  // الاحتفاظ بآخر 50 سجل فقط
  if (logs.length > 50) {
    logs = logs.slice(0, 50);
  }
  
  localStorage.setItem('cardLogs', JSON.stringify(logs));
  renderLogs();
}

// Show notifications in popup
function showNotification(message, type = 'info') {
  // Remove previous notifications
  const existingNotifications = document.querySelectorAll('.popup-notification');
  existingNotifications.forEach(notification => notification.remove());
  
  // Create new notification
  const notification = document.createElement('div');
  notification.className = 'popup-notification';
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 16px;
    border-radius: 6px;
    color: white;
    font-family: 'Cairo', Arial, sans-serif;
    font-size: 12px;
    font-weight: bold;
    z-index: 999999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    max-width: 280px;
    word-wrap: break-word;
    animation: popupSlideIn 0.3s ease-out;
  `;
  
  // Set notification color based on type
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
  
  // Add CSS for animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes popupSlideIn {
      from {
        transform: translateX(-50%) translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }
    @keyframes popupSlideOut {
      from {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      to {
        transform: translateX(-50%) translateY(-100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  // Add notification to page
  document.body.appendChild(notification);
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'popupSlideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 3000);
}

// استخدام BIN سريع
quickUseBinBtn.addEventListener('click', () => {
  const binPattern = quickBinInput.value.trim().toUpperCase();
  
  if (!binPattern) {
    showNotification('يرجى إدخال رقم BIN', 'error');
    return;
  }
  
  if (binPattern.length < 6 || binPattern.length > 16) {
    showNotification('يجب أن يكون طول BIN من 6 إلى 16 رقم', 'error');
    return;
  }
  
  // التحقق من صحة النمط
  if (!/^[0-9X]+$/.test(binPattern)) {
    showNotification('يجب أن يحتوي BIN على أرقام و X فقط', 'error');
    return;
  }
  
  // توليد البيانات
  const fullNumber = generateFullBin(binPattern);
  const expiry = generateExpiry();
  const cvc = generateCVV();
  const name = generateCardName();
  
  // إظهار البيانات المولدة
  let resultMsg = `BIN ${binPattern}: ${fullNumber} | التاريخ: ${expiry} | CVC: ${cvc}`;
  showNotification(resultMsg, 'success');
  
  // إضافة للسجل
  addLog('استخدام BIN سريع', { 
    pattern: binPattern, 
    generated: fullNumber,
    expiry: expiry,
    cvc: cvc
  });
  
  // إرسال البيانات إلى background.js لملء النماذج
  const cardData = {
    number: fullNumber,
    expiry: expiry,
    cvv: cvc,
    name: name,
    isQuickBin: true,
    binPattern: binPattern
  };
  
  console.log("Sending cardData to background:", cardData);
  
  chrome.runtime.sendMessage({
    'action': 'fillCardWithData',
    'data': cardData
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending quick BIN message:', chrome.runtime.lastError);
      showNotification('خطأ في إرسال البيانات', 'error');
    } else {
      console.log("Background response:", response);
      showNotification(`تم استخدام BIN سريع: ${binPattern}`, 'success');
    }
  });
  
  // مسح الحقل
  quickBinInput.value = '';
});

// إضافة وظيفة إرسال BIN جديد إلى background.js
function sendNewBinMessage(bin) {
  chrome.runtime.sendMessage({
    action: 'newBinAdded',
    bin: bin
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending new BIN message:', chrome.runtime.lastError);
    } else {
      console.log('New BIN message sent successfully:', response);
    }
  });
} 