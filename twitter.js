window.addEventListener('message', function(event) {
  if (event.source != window)
    return;

  if (event.data.type) {
    //let port = chrome.runtime.connect();
    if (event.data.type == 'uiDMSendMessage') {
      console.log(`Request to encrypt: ${event.data.e.text}`);
      event.data.e.text = event.data.e.text + '#e';
      window.postMessage({ type: 'uiDMSendMessage_r', e: event.data.e }, '*');
    }
    else if (event.data.type == 'uiDMDialogOpenedConversation') {
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

function uiDMSendMessageEventIntercept(beforeEvent) {
  var sendDMComponent = findSendDMComponent();
  for (var i = 0; i < sendDMComponent.events.length; i++) {
    if (sendDMComponent.events[i].type.indexOf('uiDMSendMessage') != -1) {
      var oldCallback = sendDMComponent.events[i].callback;
      uiDMSendMessageCallback = oldCallback;
      $(document).off('uiDMSendMessage', undefined, oldCallback);
      $(document).on('uiDMSendMessage', (t, e) => {
        beforeEvent(t, e);
        oldT = t;
        //oldCallback(t, e);
      });
      window.removeEventListener('message', listener);
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
      uiDMSendMessageEventIntercept((t, e) => {
        window.postMessage({ type: 'uiDMSendMessage', e: e }, '*');
        //console.trace(e);
      });
    });
  }
}, 500);

`;
document.documentElement.appendChild(s);
