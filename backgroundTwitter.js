const networkFilters = {
  urls: [
    '*://twitter.com/*'
  ]
};

const extraInfoSpecBeforeRequest = [
  'requestBody'
];

const extraInfoSpecBeforeSendHeaders = [
  'blocking',
  'requestHeaders'
];

let capturedRequests = {};

chrome.webRequest.onBeforeRequest.addListener((details) => {
  if (details.url.indexOf('direct_messages/new') != -1) {
    const conversationId = details.requestBody.formData.conversation_id[0];
    const senderId = conversationId.split('-')[0];
    const receiverId = conversationId.split('-')[1];

    const message = details.requestBody.formData.text[0];

    console.log(`Sender: ${senderId}, Receiver: ${receiverId}`);
    console.log(message);

    console.log(details);
    capturedRequests[details.requestId] = details;
  }
}, networkFilters, extraInfoSpecBeforeRequest);

chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
  if (typeof capturedRequests[details.requestId] !== 'undefined') {
    let xhr = new XMLHttpRequest();
    let params = '';
    xhr.open('POST', details.url, false);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.send();
    const result = xhr.responseText;
    return { cancel: true };
  }
}, networkFilters, extraInfoSpecBeforeSendHeaders);
