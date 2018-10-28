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
    event.data.returned.forEach((message) => {
      var isOwnMessage = message.sender_id == myGroupmeId;
      if (isOwnMessage) {
        //message.text += '';
        message.hermesMessage = true;
        message.hermesSuccess = false;
      }
      else {
        //message.text += '';
        message.hermesMessage = true;
        message.hermesSuccess = false;
      }
    });
  }
  window.postMessage({
    type: 'loadMessagesService.loadLatest',
    context: 'extension',
    returned: event.data.returned
  }, '*');
};

eventHandlers['messagesService.loadChat'] = (event) => {
  console.log(event.data.e);
  window.postMessage({
    type: 'messagesService.loadChat',
    context: 'extension',
    e: event.data.e
  }, '*');
};

eventHandlers['sessionService.currentUser'] = (event) => {
  myGroupmeId = event.data.currentUser.id;
  console.log(`Got current GroupMe ID: ${myGroupmeId}`);
};

window.addEventListener('message', (event) => {
  if (event.source != window) {
    return;
  }

  if (event.data.type && event.data.context && event.data.context === 'injected') {
    //let port = chrome.runtime.connect();
    if (Object.prototype.hasOwnProperty.call(eventHandlers, event.data.type)) {
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
