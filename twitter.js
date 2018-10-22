var keyPair = {
  publicKey: "",
  secretKey: ""
};
chrome.storage.local.get(['publicKey', 'secretKey'], (result) => {
  keyPair.publicKey = result.publicKey;
  keyPair.secretKey = result.secretKey;
});
var myTwitterId = '';
var theirPublicKey = '';
var lookupAttempts = {};

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
  xhr.open('GET', `https://hermes-v0.hyt.space/api/v1/twitter/public_key/get?twitter_user_id=${id}`, true);
  xhr.send();
  xhr.onreadystatechange = function () {
    if(xhr.readyState === 4) {
      if (xhr.status === 404) {
        theirPublicKey = '';
      }
      else if (xhr.status === 200) {
        theirPublicKey = JSON.parse(xhr.responseText).data.publicKey;
        console.log('Found public key from Hermes API.');
        chrome.runtime.sendMessage({
          action: 'changeIcon',
          value: 'locked'
        });
      }
    }
  };
}

function pairTwitterUserIdWithPublicKey(id, publicKey) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', `https://hermes-v0.hyt.space/api/v1/twitter/public_key/update?twitter_user_id=${id}&public_key=${encodeURIComponent(publicKey)}`, true);
  xhr.send();
}

window.addEventListener('message', function(event) {
  if (event.source != window)
    return;

  if (event.data.type) {
    //let port = chrome.runtime.connect();
    if (event.data.type == 'uiDMSendMessage') {
      //console.log(`Request to encrypt: ${event.data.e.text}`);
      if (getTheirPublicKey().length != 0) {
        var message = event.data.e.text;
        event.data.e.text = `HERMES_A:${encryptMessage(message)}\nHERMES_B:${encryptMessageForSelf(message)}`;
        window.postMessage({ type: 'uiDMSendMessage_r', e: event.data.e }, '*');
      }
      else {
        console.log('No public key for recipient!!!');
        window.postMessage({ type: 'uiDMSendMessage_r', e: event.data.e }, '*');
      }
    }
    else if (event.data.type == 'uiDMDialogOpenedConversation') {
      var conversation = event.data.e.recipient.split('-');
      if (conversation[0] === myTwitterId) {
        lookupTwitterId(conversation[1]);
      }
      else if (conversation[1] === myTwitterId) {
        lookupTwitterId(conversation[0]);
      }

      console.log(`New conversation: ${event.data.e.recipient}`);
      //console.log(event);
      chrome.runtime.sendMessage({
        action: 'changeIcon',
        value: 'unlocked'
      });
    }
    else if (event.data.type == 'notInDMConversation') {
      chrome.runtime.sendMessage({
        action: 'changeIcon',
        value: 'unsupported'
      });
    }
    else if (event.data.type === 'directMessage') {
      var isOwnMessage = event.data.sender_id == myTwitterId;
      var isHermesMessage = event.data.text.match(/HERMES_A:.*\nHERMES_B:.*/g);
      if (isHermesMessage) {
        var hermesA = event.data.text.split('\n')[0].substring(9);
        var hermesB = event.data.text.split('\n')[1].substring(9);
        try {
          if (isOwnMessage) {
            window.postMessage({ type: 'directMessage_r', id: event.data.id, text: decryptMessageForSelf(hermesB), own: isOwnMessage }, '*');
          }
          else {
            window.postMessage({ type: 'directMessage_r', id: event.data.id, text: decryptMessage(hermesA), own: isOwnMessage }, '*');
          }
        }
        catch (err) {
          //TODO: Fail icon
          if (!isOwnMessage) {
            lookupAttempts[event.data.id] = lookupAttempts[event.data.id] || 0;
            if (lookupAttempts[event.data.id] < 2) {
              lookupAttempts[event.data.id]++;
              lookupTwitterId(event.data.sender_id);
            }
          }
        }
      }
      //console.log(event.data);
    }
    else if (event.data.type == '_userId') {
      myTwitterId = event.data.data;
      pairTwitterUserIdWithPublicKey(myTwitterId, getMyPublicKey());
      console.log('Pairing public key with Hermes API.');
      //console.log(myTwitterId);
    }
  }
}, false);

let s = document.createElement('script');
s.src = chrome.extension.getURL('injectTwitter.js');
(document.head||document.documentElement).appendChild(s);
s.onload = function() {
    s.parentNode.removeChild(s);
};
