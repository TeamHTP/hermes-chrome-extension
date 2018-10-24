let currentTabId;
let tabIcons = {};
let storageLocation = chrome.storage.lcoal;

function checkAndGenerateKeysLocalStorage() {
  chrome.storage.local.get(['publicKey', 'secretKey'], (result) => {
    if (typeof result.secretKey === 'undefined') {
      generateAndStoreKeyPairLocalStorage();
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

function generateAndStoreKeyPairLocalStorage() {
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

function decryptEncryptedSecret(masterPasswordHash, callback) {
  storageLocation.get(['encryptedSecretKey'], (result) => {
    if (typeof result.encryptedSecretKey != 'undefined') {
      var decryptedSecretKey = HermesCrypto.decrytSecret(result.encryptedSecretKey, masterPasswordHash);

      chrome.storage.local.set({
        secretKey: decryptedSecretKey
      }, callback);
    }
  });
}

let actionHandlers = {};

actionHandlers.changeIcon = (msg, sender, sendResponse) => {
  tabIcons[sender.tab.id] = msg.value;
  updateIcon(tabIcons[currentTabId]);
}

actionHandlers.regenKeyPair = (msg, sender, sendResponse) => {
  var keyPair = generateAndStoreKeyPairLocalStorage();
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

chrome.runtime.onStartup.addListener(() => {
  queryOptions((options) => {
    if (options.keyStorageLocation.value == 0) {
      storageLocation = chrome.storage.local;
    }
    else if (options.keyStorageLocation.value == 0) {
      storageLocation = chrome.storage.sync;
    }

    if (!options.rememberMasterPassword._disabled) {
      var masterPasswordHash = options.masterPassword.value;

      decryptEncryptedSecret(masterPasswordHash, () => { checkAndGenerateKeysLocalStorage(); });
    }
    else if (options.rememberMasterPassword._disabled) {
      //TODO: ask user for master password
      var masterPasswordRaw = '';
      var masterPasswordHash = HermesCrypto.hash32(masterPasswordRaw);

      decryptEncryptedSecret(masterPasswordHash, () => { checkAndGenerateKeysLocalStorage(); });
    }
    else {
      checkAndGenerateKeysLocalStorage();
    }
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
