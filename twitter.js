//Test
var keyPair = {
  publicKey: "",
  secretKey: ""
};
chrome.storage.local.get(['publicKey', 'secretKey'], (result) => {
  keyPair.publicKey = result.publicKey;
  keyPair.secretKey = result.secretKey;
});
var keyPair2 = HermesCrypto.generateKeyPair();
var myTwitterId = '';
var theirPublicKey = '';

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
  xhr.open("GET", `http://142.93.82.253/user/find?uid=${id}`, false);
  xhr.send();
  var response = JSON.parse(xhr.responseText);
  if (response[0] === 'No user') {
    return "";
  }
  else {
    return response;
  }
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
    }
    else if (event.data.type == 'uiDMDialogOpenedConversation') {
      var conversation = event.data.e.recipient.split('-');
      var publicKeys = [
        lookupTwitterId(conversation[0]),
        lookupTwitterId(conversation[1])
      ];
      if (publicKeys[0] === myTwitterId) {
        theirPublicKey = publicKeys[1];
      }
      else if (publicKeys[1] === myTwitterId) {
        theirPublicKey = publicKeys[0];
      }
      console.log(`New conversation: ${event.data.e.recipient}`);
      console.log(event);
    }
    else if (event.data.type === 'directMessage') {
      window.postMessage({ type: 'directMessage_r', id: event.data.id, text: event.data.id }, '*');
      //console.log(event.data);
    }
    else if (event.data.type == '_userId') {
      myTwitterId = event.data.data;
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
      $('.DirectMessage[data-message-id=' + event.data.id + ']').find('p.js-tweet-text').html(event.data.text);
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
    $(document).on('dataDMUserUpdates', (t, e) => {
      var messages = $('.DirectMessage');
      for (var i = 0; i < messages.length; i++) {
        var id = $(messages[i]).attr('data-message-id');
        var text = $(messages[i]).find('p.js-tweet-text').html();
        window.postMessage({ type: 'directMessage', id: id, text: text }, '*');
      }
    });
    window.postMessage({ type: '_userId', data: JSON.parse($('#init-data').val()).userId }, '*');
  }
}, 500);

`;
document.documentElement.appendChild(s);
