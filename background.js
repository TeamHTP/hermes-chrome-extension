chrome.runtime.onInstalled.addListener(() => {
  generateAndStoreKeyPair();
});

function generateAndStoreKeyPair() {
  const keyPair = HermesCrypto.generateKeyPair();
  chrome.storage.local.set({
    publicKey: HermesCrypto.encodeBase64(keyPair.publicKey),
    secretKey: HermesCrypto.encodeBase64(keyPair.secretKey)
  });
  console.log('Generating and storing new key pair');
}

let currentTabId;
let tabIcons = {};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'changeIcon') {
    tabIcons[currentTabId] = msg.value;
    updateIcon(msg.value);
  }
  else if (msg.action === 'regenKeyPair') {
    generateAndStoreKeyPair();
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
