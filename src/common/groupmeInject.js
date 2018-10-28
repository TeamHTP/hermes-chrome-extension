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

function loadMessageLoadLatestIntercept() {
  angular.element(document.body).injector().get('loadMessagesService').loadLatest = (e, t) => {
    return groupmeServices.loadMessagesService.loadLatest(e, t).then((returned) => {
      return new Promise((resolve, reject) => {
        var thisListener = (event) => {
          if (event.source != window) {
            return;
          }

          if (event.data.type && event.data.type === 'loadMessagesService.loadLatest' && event.data.context && event.data.context === 'extension') {
            resolve(event.data.returned);
            window.removeEventListener('message', thisListener);
          }
        };
        window.addEventListener('message', thisListener);
        window.postMessage({
          type: 'loadMessagesService.loadLatest',
          context: 'injected',
          returned: returned
        }, '*');
      });
    });
  };
}

const injectorWaitInterval = setInterval(() => {
  if (typeof angular.element(document.body).injector() !== 'undefined') {
    clearInterval(injectorWaitInterval);

    groupmeServices.groupMessageService = {};
    groupmeServices.groupMessageService.create = angular.element(document.body).injector().get('groupMessageService').create;

    groupmeServices.loadMessagesService = {};
    groupmeServices.loadMessagesService.loadLatest = angular.element(document.body).injector().get('loadMessagesService').loadLatest;

    groupMessageCreateIntercept();
    loadMessageLoadLatestIntercept();
    
    angular.element(document.body).injector().get('sessionService').currentUser().then((currentUser) => {
      window.postMessage({
        type: 'sessionService.currentUser',
        context: 'injected',
        currentUser: currentUser
      }, '*');
    });
  }
}, 500);
