let currentTabId;
let tabIcons = {};

function checkAndGenerateLocalStorageKeys() {
  chrome.storage.local.get(['publicKey', 'secretKey'], (result) => {
    if (typeof result.secretKey === 'undefined') {
      generateAndStoreKeyPair();
    }
    else {
      if (typeof result.publicKey === 'undefined') {
        var publicKey = HermesCrypto.encodeBase64(HermesCrypto.generateKeyPairFromSecretKey(result.secretKey).publicKey);
        chrome.storage.local.set({
          publicKey: publicKey
        });
      }
    }
  });
}

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

actionHandlers = {};

actionHandlers.changeIcon = (msg, sender, sendResponse) => {
  tabIcons[sender.tab.id] = msg.value;
  updateIcon(tabIcons[currentTabId]);
}

actionHandlers.regenKeyPair = (msg, sender, sendResponse) => {
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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (actionHandlers.hasOwnProperty(msg.action)) {
    actionHandlers[msg.action](msg, sender, sendResponse);
  }
  else {
    console.log(`Received message with no handler: ${msg}`);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  queryOptions((options) => {
    if (!options.rememberMasterPassword._disabled) {
      /*
      var masterPasswordHash = options.masterPassword.value;
      var decryptedSecretKey = '';
      chrome.storage.local.set({
        secretKey: decryptedSecretKey
      });*/
    }
    checkAndGenerateLocalStorageKeys();
  });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  currentTabId = activeInfo.tabId;
  updateIcon(tabIcons[currentTabId] || 'unsupported');
});

chrome.tabs.onUpdated.addListener((tabId) => {
  tabIcons[tabId] = 'unsupported';
  updateIcon(tabIcons[currentTabId] || 'unsupported');
});
