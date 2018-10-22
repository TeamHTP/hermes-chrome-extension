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
      $(`.DirectMessage[data-message-id=${event.data.id}]`).find('p.js-tweet-text').html(event.data.text);

      var encryptedIcon = `
      <span class="DirectMessage-actio hermes-iconn">
        <button type="button" class="js-tooltip" title="Encrypted with Hermes" data-message-id="${event.data.id}" aria-hidden="false">
          <span class="Icon Icon--protected" style="color: inherit;"></span>
        </button>
      </span>
      `;
      var failedIcon = `
      <span class="DirectMessage-action hermes-icon">
        <button type="button" class="js-tooltip" title="Failed to decrypt Hermes message; have keys changed?" data-message-id="${event.data.id}" aria-hidden="false">
          <span class="Icon Icon--info" style="color: #e0245e; transform: rotate(180deg) translateY(-2px);"></span>
        </button>
      </span>
      `;
      var dmActionsEl = $(`.DirectMessage[data-message-id=${event.data.id}]`).find('.DirectMessage-actions');
      dmActionsEl.find('.hermes-icon').remove();
      if (event.data.own) {
        dmActionsEl.append(event.data.success ? encryptedIcon : failedIcon);
      }
      else {
        dmActionsEl.prepend(event.data.success ? encryptedIcon : failedIcon);
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
      setTimeout(attemptDecryptMessages, 100);
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
