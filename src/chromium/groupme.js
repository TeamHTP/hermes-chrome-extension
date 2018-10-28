var eventHandlers = {};
var myGroupmeId = -1;

eventHandlers['groupMessageService.create'] = (event) => {
  var messageToSend = event.data.a.text;
  if (getTheirPublicKey().length != 0 && !downgraded) {
    var groupId = event.data.r.group.id;
    var message = event.data.a.text;
    messageToSend = `HERMES_A:${encryptMessage(message)}\nHERMES_B:${encryptMessageForSelf(message)}`;
    event.data.a.text = messageToSend;
    event.data.r.lastMessage.text = messageToSend;
  }
  else {

  }
  window.postMessage({
    type: 'groupMessageService.create',
    context: 'extension',
    r: event.data.r,
    a: event.data.a
  }, '*');
};

eventHandlers['loadMessagesService.loadLatest'] = (event) => {
  console.log(event.data.returned);
  if (event.data.returned) {
    for (var i = 0; i < event.data.returned.length; i++) {
      var isOwnMessage = event.data.returned[i].sender_id == myGroupmeId;
      if (isOwnMessage) {
        event.data.returned[i].text = 'intercepted';
      }
      else {
        event.data.returned[i].text = 'intercepted';
      }
    }
  }
  window.postMessage({
    type: 'loadMessagesService.loadLatest',
    context: 'extension',
    returned: event.data.returned
  }, '*');
};

window.addEventListener('message', (event) => {
  if (event.source != window)
    return;

  if (event.data.type && event.data.context && event.data.context === 'injected') {
    //let port = chrome.runtime.connect();
    if (eventHandlers.hasOwnProperty(event.data.type)) {
      eventHandlers[event.data.type](event);
    }
    else {
      console.log(`Received unhandled event: ${event.data.type}`);
    }
  }
}, false);

var s = document.createElement('script');
s.src = chrome.extension.getURL('groupmeInject.js');
(document.head || document.documentElement).appendChild(s);
s.onload = () => {
  s.parentNode.removeChild(s);
};
