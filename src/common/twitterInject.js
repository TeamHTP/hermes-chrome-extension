// Remember to console.trace()!
function findDMTextbox() {
  const comps = DEBUG.registry.components;
  let i;
  for (i = 0; i < comps.length; i += 1) {
    for (const j in comps[i].instances) {
      if (Object.prototype.hasOwnProperty.call(comps[i].instances[j].instance.attr, 'composerEditorSelector') && comps[i].instances[j].instance.attr.composerEditorSelector === '.DMComposer-editor') {
        return comps[i].instances[j];
      }
    }
  }
}

function findSendDMComponent() {
  const comps = DEBUG.registry.components;
  let i;
  for (i = 0; i < comps.length; i += 1) {
    for (const j in comps[i].instances) {
      for (const k in comps[i].instances[j].events) {
        if (comps[i].instances[j].events[k].type.indexOf('uiDMSendMessage') !== -1) {
          if (Object.prototype.hasOwnProperty.call(comps[i].instances[j].instance.attr, 'noShowError')) {
            return comps[i].instances[j];
          }
        }
      }
    }
  }
}

let uiDMSendMessageCallback;
let oldT;
const listener = (event) => {
  if (event.source !== window) { return; }

  if (event.data.type) {
    if (event.data.type === 'uiDMSendMessage_r') {
      uiDMSendMessageCallback(oldT, event.data.e);
    } else if (event.data.type === 'directMessage_r') {
      if (event.data.success) {
        const tweetTextEl = $(`.DirectMessage[data-message-id=${event.data.id}]`).find('p.js-tweet-text');
        tweetTextEl.html(event.data.text);
        tweetTextEl.addClass('hermes-decrypted');
      }

      const encryptedIcon = `
      <span class="DirectMessage-action hermes-icon">
        <button type="button" class="js-tooltip" title="Encrypted with Hermes" data-message-id="${event.data.id}" aria-hidden="false">
          <span class="Icon Icon--protected" style="color: inherit;"></span>
        </button>
      </span>
      `;
      const failedIcon = `
      <span class="DirectMessage-action hermes-icon">
        <button type="button" class="js-tooltip" title="Failed to decrypt; have any keys changed?" data-message-id="${event.data.id}" aria-hidden="false">
          <span class="Icon Icon--info" style="color: #e0245e; transform: rotate(180deg) translateY(-2px);"></span>
        </button>
      </span>
      `;
      const dmActionsEl = $(`.DirectMessage[data-message-id=${event.data.id}]`).find('.DirectMessage-actions');
      dmActionsEl.find('.hermes-icon').remove();
      if (event.data.own) {
        dmActionsEl.append(event.data.success ? encryptedIcon : failedIcon);
      } else {
        dmActionsEl.prepend(event.data.success ? encryptedIcon : failedIcon);
      }
    }
  }
};


const uiDMSendMessageEventInterceptListener = (t, e) => {
  window.postMessage({ type: 'uiDMSendMessage', e }, '*');
  oldT = t;
};

function uiDMSendMessageEventIntercept() {
  const sendDMComponent = findSendDMComponent();
  for (let i = 0; i < sendDMComponent.events.length; i += 1) {
    if (sendDMComponent.events[i].type.indexOf('uiDMSendMessage') !== -1) {
      uiDMSendMessageCallback = uiDMSendMessageCallback || sendDMComponent.events[i].callback;
      $(document).off('uiDMSendMessage', undefined, uiDMSendMessageCallback);

      $(document).off('uiDMSendMessage', uiDMSendMessageEventInterceptListener);
      $(document).on('uiDMSendMessage', uiDMSendMessageEventInterceptListener);

      window.removeEventListener('message', listener, false);
      window.addEventListener('message', listener, false);
      // console.trace(sendDMComponent);
    }
  }
}

const attemptDecryptMessages = (t, e) => {
  setTimeout(() => {
    const messages = $('.DirectMessage');
    for (let i = 0; i < messages.length; i += 1) {
      const text = $(messages[i]).find('p.js-tweet-text').html();
      if (!$(messages[i]).find('p.js-tweet-text').hasClass('hermes-decrypted') && typeof text !== 'undefined') {
        const id = $(messages[i]).attr('data-message-id');
        const senderId = $(messages[i]).attr('data-sender-id');
        const timestampEl = $(messages[i]).find('._timestamp');
        const timestamp = timestampEl.attr('data-time');
        const now = timestampEl.html().toLowerCase().indexOf('now') !== -1;
        window.postMessage({
          type: 'directMessage', id, senderId, text, timestamp, now,
        }, '*');
      }
    }
  }, 100);
};

const jqueryWaitInterval = setInterval(() => {
  if (typeof $ !== 'undefined') {
    clearInterval(jqueryWaitInterval);
    // console.trace('jQuery found');
    $(document).on('uiDMDialogOpenedConversation', (t, e) => {
      // console.trace('Entered new DM conversation: ');
      // console.trace(e.recipient);
      window.postMessage({ type: 'uiDMDialogOpenedConversation', e }, '*');
      uiDMSendMessageEventIntercept();
      setTimeout(attemptDecryptMessages, 100);
    });
    $(document).on('dataDMUserUpdates', attemptDecryptMessages);
    $(document).on('uiDMDialogOpenedConversationList', (t, e) => {
      window.postMessage({ type: 'notInDMConversation', e }, '*');
    });
    $(document).on('uiDMDialogClosed', (t, e) => {
      window.postMessage({ type: 'notInDMConversation', e }, '*');
    });
    window.postMessage({ type: '_userId', data: JSON.parse($('#init-data').val()).userId }, '*');
  }
}, 500);
