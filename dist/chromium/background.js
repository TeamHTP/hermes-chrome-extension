chrome.runtime.onInstalled.addListener(() => {
  generateAndStoreKeyPair();
});

function generateAndStoreKeyPair() {
  const keyPair = HermesCrypto.generateKeyPair();
  keyPair.publicKey = HermesCrypto.encodeBase64(keyPair.publicKey);
  keyPair.secretKey = HermesCrypto.encodeBase64(keyPair.secretKey)
  chrome.storage.local.set({
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey
  });
  console.log('Generating and storing new key pair');
  return keyPair;
}

let currentTabId;
let tabIcons = {};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'changeIcon') {
    tabIcons[sender.tab.id] = msg.value;
    updateIcon(tabIcons[currentTabId]);
  }
  else if (msg.action === 'regenKeyPair') {
    var keyPair = generateAndStoreKeyPair();
    chrome.tabs.query({}, (tabs) => {
      for (var i = 0; i < tabs.length; ++i) {
        chrome.tabs.sendMessage(tabs[i].id, {
          action: 'keyPair',
          publicKey: keyPair.publicKey,
          secretKey: keyPair.secretKey
        });
      }
    });
  }
});

function updateIcon(type) {
  chrome.browserAction.setIcon({
    path: {
      "16": `assets/${type}.png`,
      "32": `assets/${type}2x.png`,
      "48": `assets/${type}3x.png`,
      "128": `assets/${type}8x.png`
    }
  });
  switch (type) {
    case 'unsupported':
      chrome.browserAction.setTitle({ title: 'Hermes is idle' });
      break;
    case 'unlocked':
      chrome.browserAction.setTitle({ title: 'Hermes was unable to handshake with your recipient' });
      break;
    case 'locked':
      chrome.browserAction.setTitle({ title: 'Hermes is encrypting your messages' });
      break;
  }
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  currentTabId = activeInfo.tabId;
  updateIcon(tabIcons[currentTabId] || 'unsupported');
});

chrome.tabs.onUpdated.addListener((tabId) => {
  tabIcons[tabId] = 'unsupported';
  updateIcon(tabIcons[currentTabId] || 'unsupported');
});
