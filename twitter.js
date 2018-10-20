//Test
var keyPair = HermesCrypto.generateKeyPair();
var keyPair2 = HermesCrypto.generateKeyPair();

var theirPublicKey = '';

function getTheirPublicKey() {
  return theirPublicKey;
}

function getMyPublicKey() {
  return HermesCrypto.encodeBase64(keyPair.publicKey);
}

function getMySecretKey() {
  return HermesCrypto.encodeBase64(keyPair.secretKey);
}

function encryptMessage(message) {
  return HermesCrypto.encryptMessage(message, getTheirPublicKey(), getMySecretKey());
}

function encryptMessageForSelf(message) {
  return HermesCrypto.encryptMessage(message, getMyPublicKey(), getMySecretKey());
}

function lookupTwitterId(id) {
  return HermesCrypto.encodeBase64(keyPair2.publicKey);
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
        event.data.e.text = `HERMES_A:${encryptMessage(message)}`;
        window.postMessage({ type: 'uiDMSendMessage_r', e: event.data.e }, '*');
        event.data.e.text = `HERMES_B:${encryptMessageForSelf(message)}`;
        window.postMessage({ type: 'uiDMSendMessage_r', e: event.data.e }, '*');
      }
    }
    else if (event.data.type == 'uiDMDialogOpenedConversation') {
      var theirId = event.data.e.recipient.split('-')[1];
      theirPublicKey = lookupTwitterId(theirId);
      console.log(`New conversation: ${event.data.e.recipient}`);
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

function findDMConversationComponent() {
  var comps = DEBUG.registry.components;
  var i;
  for (i = 0; i < comps.length; i++) {
    for (var j in comps[i].instances) {
      for (var k in comps[i].instances[j].events) {
        if (comps[i].instances[j].events[k].type.indexOf('dataDMUserUpdates') != -1) {
          console.trace(comps[i].instances[j]);
        }
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

  if (event.data.type && (event.data.type == 'uiDMSendMessage_r')) {
    e = event.data.e;
    //console.trace(e);
    uiDMSendMessageCallback(oldT, e);
  }
};


var uiDMSendMessageEventInterceptListener = (t, e) => {
  window.postMessage({ type: 'uiDMSendMessage', e: e }, '*');
  oldT = t;
};

var dataDMUserUpdatesEventInterceptListener = (t, e) => {
  console.trace(e);
  window.postMessage({ type: 'dataDMUserUpdates', e: e }, '*');
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

function dataDMUserUpdatesEventIntercept() {
  var DMConversationComponent = findDMConversationComponent();
  for (var i = 0; i < DMConversationComponent.events.length; i++) {
    if (DMConversationComponent.events[i].type.indexOf('dataDMUserUpdates') != -1) {
      var dataDMUserUpdatesCallback = DMConversationComponent.events[i].callback;
      $(document).off('dataDMUserUpdates', undefined, dataDMUserUpdatesCallback);

      $(document).off('dataDMUserUpdates', dataDMUserUpdatesEventInterceptListener);
      $(document).on('dataDMUserUpdates', dataDMUserUpdatesEventInterceptListener);
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
      //dataDMUserUpdatesEventIntercept();
    });
  }
}, 500);

`;
document.documentElement.appendChild(s);
