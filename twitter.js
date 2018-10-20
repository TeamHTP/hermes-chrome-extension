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

function uiDMSendMessageEventIntercept(beforeEvent) {
  var sendDMComponent = findSendDMComponent();
  for (var i = 0; i < sendDMComponent.events.length; i++) {
    if (sendDMComponent.events[i].type.indexOf('uiDMSendMessage') != -1) {
      var oldCallback = sendDMComponent.events[i].callback;
      $(document).off('uiDMSendMessage', undefined, oldCallback);
      $(document).on('uiDMSendMessage', (t, e) => {
        beforeEvent(t, e);
        oldCallback(t, e);
      });
      //console.trace(sendDMComponent);
    }
  }
}

var jqueryWaitInterval = setInterval(() => {
  if (typeof $ !== 'undefined') {
    clearInterval(jqueryWaitInterval);
    //console.trace('jQuery found');
    $(document).on('uiDMDialogOpenedConversation', (t, e) => {
      console.trace('Entered new DM conversation: ');
      console.trace(e.recipient);
      uiDMSendMessageEventIntercept((t, e) => {
        console.trace(e);
      });
    });
  }
}, 500);

`;
document.documentElement.appendChild(s);
