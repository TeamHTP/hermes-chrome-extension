var groupmeServices = {};

function groupMessageCreateIntercept() {
  angular.element(document.body).injector().get('groupMessageService').create = (r, a) => {
    //console.trace(r);
    //console.trace(a);
    return new Promise((resolve, reject) => {
      var thisListener = (event) => {
        if (event.source != window) {
          return;
        }

        if (event.data.type && event.data.type === 'groupMessageService.create' && event.data.context && event.data.context === 'extension') {
          //console.trace(event.data);
          resolve(groupmeServices.groupMessageService.create(event.data.r, event.data.a));
          window.removeEventListener('message', thisListener);
        }
      };
      window.addEventListener('message', thisListener);
      window.postMessage({
        type: 'groupMessageService.create',
        context: 'injected',
        r: r,
        a: a
      }, '*');
    });
  };
}

var loadMessagesHandler = (returned) => {
  return new Promise((resolve, reject) => {
    var thisListener = (event) => {
      if (event.source != window) {
        return;
      }

      if (event.data.type && event.data.type === 'loadMessagesService.loadLatest' && event.data.context && event.data.context === 'extension') {
        window.removeEventListener('message', thisListener);
        resolve(event.data.returned);
        event.data.returned.forEach(messageAddIcon);
      }
    };
    window.addEventListener('message', thisListener);
    window.postMessage({
      type: 'loadMessagesService.loadLatest',
      context: 'injected',
      returned: returned
    }, '*');
  });
};

var messageAddIcon = (message) => {
  if (message.hermesMessage) {
    var messageWaitInterval = setInterval(() => {
      var messageEl = $(`#${message.source_guid}`);

      if (messageEl.find('.likes-container').length) {
        clearInterval(messageWaitInterval);

        if (!messageEl.hasClass('hermes-encrypted')) {
          var likesContainerEl = messageEl.find('.likes-container');
          var encryptedIconHtml = '<i class="gmicon-lock" style="margin-top: 3px; color: #d4d4d4;" title="Encrypted by Hermes"></i>';
          var failedIconHtml = '<i class="gmicon-unlocked" style="margin-top: 3px; color: #d4d4d4;" title="Failed to decrypt; have any keys changed?"></i>';

          likesContainerEl.prepend(message.hermesSuccess ? encryptedIconHtml : failedIconHtml);
          messageEl.addClass('hermes-encrypted');
        }
      }
    }, 300);
  }
};

function loadMessageLoadLatestIntercept() {
  angular.element(document.body).injector().get('loadMessagesService').loadLatest = (e, t) => {
    return groupmeServices.loadMessagesService.loadLatest(e, t).then(loadMessagesHandler);
  };
  angular.element(document.body).injector().get('loadMessagesService').loadOlder = (e, t) => {
    return groupmeServices.loadMessagesService.loadOlder(e, t).then(loadMessagesHandler);
  };
}

function messageStoreGetChatContentIntercept() {
  angular.element(document.body).injector().get('messageStoreService').getChatContent = (e) => {
    var returned = groupmeServices.messageStoreService.getChatContent(e);
    returned.pages.forEach((page) => {
      page.forEach(messageAddIcon);
    });
    return returned;
  };
}

function messagesLoadChatIntercept() {
  angular.element(document.body).injector().get('messagesService').loadChat = (e) => {
    return new Promise((resolve, reject) => {
      var thisListener = (event) => {
        if (event.source != window) {
          return;
        }

        if (event.data.type && event.data.type === 'messagesService.loadChat' && event.data.context && event.data.context === 'extension') {
          resolve(groupmeServices.messagesService.loadChat(event.data.e));
          window.removeEventListener('message', thisListener);
        }
      };
      window.addEventListener('message', thisListener);
      window.postMessage({
        type: 'messagesService.loadChat',
        context: 'injected',
        e: e
      }, '*');
    });
  };
}

const injectorWaitInterval = setInterval(() => {
  if (typeof angular !== 'undefined' && typeof angular.element(document.body).injector() !== 'undefined') {
    clearInterval(injectorWaitInterval);

    groupmeServices.groupMessageService = {};
    groupmeServices.groupMessageService.create = angular.element(document.body).injector().get('groupMessageService').create;

    groupmeServices.loadMessagesService = {};
    groupmeServices.loadMessagesService.loadLatest = angular.element(document.body).injector().get('loadMessagesService').loadLatest;
    groupmeServices.loadMessagesService.loadOlder = angular.element(document.body).injector().get('loadMessagesService').loadOlder;

    groupmeServices.messagesService = {};
    groupmeServices.messagesService.loadChat = angular.element(document.body).injector().get('messagesService').loadChat;

    groupmeServices.messageStoreService = {};
    groupmeServices.messageStoreService.getChatContent = angular.element(document.body).injector().get('messageStoreService').getChatContent;

    groupMessageCreateIntercept();
    loadMessageLoadLatestIntercept();
    messagesLoadChatIntercept();
    messageStoreGetChatContentIntercept();

    angular.element(document.body).injector().get('sessionService').currentUser().then((currentUser) => {
      window.postMessage({
        type: 'sessionService.currentUser',
        context: 'injected',
        currentUser: currentUser
      }, '*');
    });
  }
}, 500);
