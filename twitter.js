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
s.innerHTML = `
// Remember to console.trace()!
function findDMTextbox() {
  var comps = DEBUG.registry.components;
  var i;
  for (i = 0; i < comps.length; i++) {
    for (var j in comps[i].instances) {
      if (comps[i].instances[j].instance.attr.hasOwnProperty('composerEditorSelector') && comps[i].instances[j].instance.attr.composerEditorSelector === '.DMComposer-editor') {
        return comps[i].instances[j];
      }
    }
  }
}

function findSendDMComponent() {
  var comps = DEBUG.registry.components;
  var i;
  for (i = 0; i < comps.length; i++) {
    for (var j in comps[i].instances) {
      for (var k in comps[i].instances[j].events) {
        if (comps[i].instances[j].events[k].type.indexOf('uiDMSendMessage') != -1) {
          if (comps[i].instances[j].instance.attr.hasOwnProperty('noShowError')) {
            return comps[i].instances[j];
          }
        }
      }
    }
  }
}

function overwriteDMTextbox(newText) {
  findDMTextbox().instance.$text[0].textContent = newText;
}

function getDMTextbox() {
  return findDMTextbox().instance.$text[0].textContent;
}

var uiDMSendMessageCallback;
var oldT;
var listener = function(event) {
  if (event.source != window)
    return;

  if (event.data.type) {
    if (event.data.type == 'uiDMSendMessage_r') {
      e = event.data.e;
      //console.trace(e);
      uiDMSendMessageCallback(oldT, e);
    }
    else if (event.data.type == 'directMessage_r') {
      var encryptedIcon = \`
      <span class="DirectMessage-action">
        <button type="button" class="js-tooltip" title="Encrypted with Hermes" data-message-id="\${event.data.id}" aria-hidden="false">
          <span class="Icon Icon--protected" style="color: inherit;"></span>
        </button>
      </span>
      \`
      $('.DirectMessage[data-message-id=' + event.data.id + ']').find('p.js-tweet-text').html(event.data.text);
      var newHtml = $('.DirectMessage[data-message-id=' + event.data.id + ']').find('.DirectMessage-actions').html().replace(encryptedIcon, '');
      $('.DirectMessage[data-message-id=' + event.data.id + ']').find('.DirectMessage-actions').html(newHtml);
      if (event.data.own) {
        $('.DirectMessage[data-message-id=' + event.data.id + ']').find('.DirectMessage-actions').append(encryptedIcon);
      }
      else {
        $('.DirectMessage[data-message-id=' + event.data.id + ']').find('.DirectMessage-actions').prepend(encryptedIcon);
      }
    }
  }
};


var uiDMSendMessageEventInterceptListener = (t, e) => {
  window.postMessage({ type: 'uiDMSendMessage', e: e }, '*');
  oldT = t;
};

function uiDMSendMessageEventIntercept() {
  var sendDMComponent = findSendDMComponent();
  for (var i = 0; i < sendDMComponent.events.length; i++) {
    if (sendDMComponent.events[i].type.indexOf('uiDMSendMessage') != -1) {
      uiDMSendMessageCallback = uiDMSendMessageCallback || sendDMComponent.events[i].callback;
      $(document).off('uiDMSendMessage', undefined, uiDMSendMessageCallback);

      $(document).off('uiDMSendMessage', uiDMSendMessageEventInterceptListener);
      $(document).on('uiDMSendMessage', uiDMSendMessageEventInterceptListener);

      window.removeEventListener('message', listener, false);
      window.addEventListener('message', listener, false);
      //console.trace(sendDMComponent);
    }
  }
}

var attemptDecryptMessages = (t, e) => {
  setTimeout(() => {
    var messages = $('.DirectMessage');
    for (var i = 0; i < messages.length; i++) {
      var id = $(messages[i]).attr('data-message-id');
      var sender_id = $(messages[i]).attr('data-sender-id');
      var text = $(messages[i]).find('p.js-tweet-text').html();
      window.postMessage({ type: 'directMessage', id: id, sender_id: sender_id, text: text }, '*');
    }
  }, 100);
};

var jqueryWaitInterval = setInterval(() => {
  if (typeof $ !== 'undefined') {
    clearInterval(jqueryWaitInterval);
    //console.trace('jQuery found');
    $(document).on('uiDMDialogOpenedConversation', (t, e) => {
      //console.trace('Entered new DM conversation: ');
      //console.trace(e.recipient);
      window.postMessage({ type: 'uiDMDialogOpenedConversation', e: e }, '*');
      uiDMSendMessageEventIntercept();
    });
    $(document).on('dataDMUserUpdates', attemptDecryptMessages);
    $(document).on('uiDMDialogOpenedConversationList', (t, e) => {
      window.postMessage({ type: 'notInDMConversation', e: e }, '*');
    });
    $(document).on('uiDMDialogClosed', (t, e) => {
      window.postMessage({ type: 'notInDMConversation', e: e }, '*');
    });
    window.postMessage({ type: '_userId', data: JSON.parse($('#init-data').val()).userId }, '*');
  }
}, 500);

`;
document.documentElement.appendChild(s);
