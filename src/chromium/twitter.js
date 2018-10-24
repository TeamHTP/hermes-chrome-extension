var keyPair = {
  publicKey: '',
  secretKey: ''
};
var myTwitterId = '';
var theirPublicKey = '';
var lookupAttempts = {};
var downgraded = false;
var eventHandlers = {};
var latestReceivedMessage = {
  id: -1,
  text: ''
};

/*chrome.storage.local.get(['publicKey', 'secretKey'], (result) => {
  keyPair.publicKey = result.publicKey;
  keyPair.secretKey = result.secretKey;
});*/

chrome.runtime.sendMessage({ action: 'getKeyPair' });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'keyPair') {
    keyPair.publicKey = msg.publicKey;
    keyPair.secretKey = msg.secretKey;
  }
});

function getTheirPublicKey() {
  return theirPublicKey;
}

function getMyPublicKey() {
  return keyPair.publicKey;
}

function getMySecretKey() {
  return keyPair.secretKey;
}

function encryptMessage(message) {
  return HermesCrypto.encryptMessage(message, getTheirPublicKey(), getMySecretKey());
}

function encryptMessageForSelf(message) {
  return HermesCrypto.encryptMessage(message, getMyPublicKey(), getMySecretKey());
}

function decryptMessage(message) {
  return HermesCrypto.decryptMessage(message, getTheirPublicKey(), getMySecretKey());
}

function decryptMessageForSelf(message) {
  return HermesCrypto.decryptMessage(message, getMyPublicKey(), getMySecretKey());
}

function lookupTwitterId(id) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', `https://hermes.teamhtp.com/api/v1/twitter/public_key/get?twitter_user_id=${id}`, true);
  xhr.send();
  xhr.onreadystatechange = () => {
    if(xhr.readyState === 4) {
      if (xhr.status === 404) {
        theirPublicKey = '';
      }
      else if (xhr.status === 200) {
        var foundPublicKey = JSON.parse(xhr.responseText).data.publicKey;
        if (theirPublicKey != foundPublicKey) {
          theirPublicKey = foundPublicKey;
          console.log('Found their public key from Hermes API.');
          chrome.runtime.sendMessage({
            action: 'changeIcon',
            value: 'locked'
          });
        }
      }
    }
  };
}

function pairTwitterUserIdWithPublicKey(id, publicKey) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', `https://hermes.teamhtp.com/api/v1/twitter/public_key/update?twitter_user_id=${id}&public_key=${encodeURIComponent(publicKey)}`, true);
  xhr.send();
}

eventHandlers.uiDMSendMessage = (event) => {
  //console.log(JSON.stringify(event.data.e));
  if (getTheirPublicKey().length != 0 && !downgraded) {
    var sendMediaConfirmResult;
    if (event.data.e.media_data) {
      sendMediaConfirmResult = confirm('Hermes does not support encryption of non-text media on Twitter. Do you want to send your message anyway? Your media will NOT be encrypted, but your comment will still be encrypted.');
    }
    if (!event.data.e.media_data || (event.data.e.media_data && sendMediaConfirmResult)) {
      var message = event.data.e.text;
      if (event.data.e.text.length > 0) {
        event.data.e.text = `HERMES_A:${encryptMessage(message)}\nHERMES_B:${encryptMessageForSelf(message)}`;
      }
      window.postMessage({ type: 'uiDMSendMessage_r', e: event.data.e }, '*');
    }
  }
  else {
    window.postMessage({ type: 'uiDMSendMessage_r', e: event.data.e }, '*');
  }
};

eventHandlers.uiDMDialogOpenedConversation = (event) => {
  var conversation = event.data.e.recipient.split('-');
  if (conversation[0] === myTwitterId) {
    lookupTwitterId(conversation[1]);
  }
  else if (conversation[1] === myTwitterId) {
    lookupTwitterId(conversation[0]);
  }

  console.log(`New conversation: ${event.data.e.recipient}`);
  //console.log(event);
  theirPublicKey = '';
  latestReceivedMessage = {
    id: -1,
    text: ''
  };
  downgraded = false;
  chrome.runtime.sendMessage({
    action: 'changeIcon',
    value: 'unlocked'
  });
};

eventHandlers.notInDMConversation = (event) => {
  chrome.runtime.sendMessage({
    action: 'changeIcon',
    value: 'unsupported'
  });
};

eventHandlers.directMessage = (event) => {
  var isOwnMessage = event.data.sender_id == myTwitterId;
  var isHermesMessage = event.data.text.match(/HERMES_A:.*\nHERMES_B:.*/g);
  var isLatestReceivedMessage = false;
  if (!isOwnMessage) {
    isLatestReceivedMessage = event.data.id > latestReceivedMessage.id;
    if (isLatestReceivedMessage) {
      latestReceivedMessage.text = event.data.text;
    }
  }
  if (isHermesMessage) {
    var hermesA = event.data.text.split('\n')[0].substring(9);
    var hermesB = event.data.text.split('\n')[1].substring(9);
    try {
      if (isOwnMessage) {
        window.postMessage({ type: 'directMessage_r', id: event.data.id, text: decryptMessageForSelf(hermesB), own: isOwnMessage, success: true }, '*');
      }
      else {
        window.postMessage({ type: 'directMessage_r', id: event.data.id, text: decryptMessage(hermesA), own: isOwnMessage, success: true }, '*');
      }
    }
    catch (err) {
      if (!isOwnMessage) {
        lookupAttempts[event.data.id] = lookupAttempts[event.data.id] || 0;
        if (lookupAttempts[event.data.id] < 2) {
          lookupAttempts[event.data.id]++;
          lookupTwitterId(event.data.sender_id);
        }
      }
      window.postMessage({ type: 'directMessage_r', id: event.data.id, text: '', own: isOwnMessage, success: false }, '*');
    }
    downgraded = false;
  }
  else if (!isOwnMessage && isLatestReceivedMessage) {
    downgraded = true;
    chrome.runtime.sendMessage({
      action: 'changeIcon',
      value: 'unlocked'
    });
  }
  //console.log(event.data);
};

eventHandlers._userId = (event) => {
  myTwitterId = event.data.data;
  pairTwitterUserIdWithPublicKey(myTwitterId, getMyPublicKey());
  console.log('Pairing your public key with Hermes API.');
  //console.log(myTwitterId);
};

window.addEventListener('message', (event) => {
  if (event.source != window)
    return;

  if (event.data.type && event.data.type.indexOf('_r') != event.data.type.length - 2) {
    //let port = chrome.runtime.connect();
    if (eventHandlers.hasOwnProperty(event.data.type)) {
      eventHandlers[event.data.type](event);
    }
    else {
      console.log(`Received unhandled event: ${event.data.type}`);
    }
  }
}, false);

var s = document.createElement('script');
s.src = chrome.extension.getURL('twitterInject.js');
(document.head || document.documentElement).appendChild(s);
s.onload = () => {
  s.parentNode.removeChild(s);
};
