let currentTabId;
let tabIcons = {};
let workingKeyPair = {};
let workingMasterPassword = '';

function checkAndGenerateKeysLocalStorage() {
  chrome.storage.local.get(['publicKey', 'secretKey'], (result) => {
    if (typeof result.secretKey === 'undefined') {
      generateAndStoreKeyPairLocalStorage();
    }
    else {
      workingKeyPair.secretKey = result.secretKey;
      var publicKey = result.publicKey;
      if (typeof publicKey === 'undefined') {
        publicKey = HermesCrypto.encodeBase64(HermesCrypto.generateKeyPairFromSecretKey(HermesCrypto.decodeBase64(result.secretKey)).publicKey);
      }
      workingKeyPair.publicKey = publicKey;
    }
  });
}

function generateAndStoreKeyPairLocalStorage() {
  const keyPair = HermesCrypto.generateKeyPair();
  keyPair.publicKey = HermesCrypto.encodeBase64(keyPair.publicKey);
  keyPair.secretKey = HermesCrypto.encodeBase64(keyPair.secretKey);
  workingKeyPair = keyPair;
  chrome.storage.local.set({
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey
  });
  runOptionsLogic();
  console.log('Generating and storing new key pair');
  return keyPair;
}

function checkAndGeneratePublicKeyWorkingKeyPair() {
  if (typeof workingKeyPair.secretKey !== 'undefined' && typeof workingKeyPair.publicKey === 'undefined') {
    var publicKey = HermesCrypto.encodeBase64(HermesCrypto.generateKeyPairFromSecretKey(HermesCrypto.decodeBase64(workingKeyPair.secretKey)).publicKey);
    workingKeyPair.publicKey = publicKey;
  }
}

function updateIcon(type) {
  type = type || 'unsupported';
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
      var decryptedSecretKey = HermesCrypto.decryptSecret(result.encryptedSecretKey, masterPasswordHash);

      workingKeyPair.secretKey = decryptedSecretKey;

      callback();
    }
  });
}

function promptForMasterPasswordAndDecrypt() {
  //TODO: better way to ask user for master password
  var masterPasswordRaw = prompt('Enter your master password');
  if (masterPasswordRaw !== null) {
    workingMasterPassword = HermesCrypto.hash32(masterPasswordRaw);

    decryptEncryptedSecret(workingMasterPassword, () => { checkAndGeneratePublicKeyWorkingKeyPair(); });
  }
  else {
    promptForMasterPasswordAndDecrypt();
  }
}

let actionHandlers = {};

actionHandlers.changeIcon = (msg, sender, sendResponse) => {
  tabIcons[sender.tab.id] = msg.value;
  updateIcon(tabIcons[currentTabId]);
}

actionHandlers.regenKeyPair = (msg, sender, sendResponse) => {
  //TODO: #7
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

actionHandlers.getKeyPair = (msg, sender, sendResponse) => {
  chrome.tabs.query({}, (tabs) => {
    for (var i = 0; i < tabs.length; ++i) {
      chrome.tabs.sendMessage(tabs[i].id, {
        action: 'keyPair',
        publicKey: workingKeyPair.publicKey,
        secretKey: workingKeyPair.secretKey
      });
    }
  });
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (actionHandlers.hasOwnProperty(msg.action)) {
    actionHandlers[msg.action](msg, sender, sendResponse);
  }
  else {
    console.log(`Received message with no handler: ${msg}`);
  }
});

var startupAndInstalledHandler = () => {
  queryOptions((options) => {
    if (options.encryptKey.value) {
      if (options.rememberMasterPassword.value) {
        workingMasterPassword = options.masterPassword.value;

        decryptEncryptedSecret(workingMasterPassword, () => { checkAndGeneratePublicKeyWorkingKeyPair(); });
      }
      else if (!options.rememberMasterPassword.value) {
        promptForMasterPasswordAndDecrypt();
      }
    }
    else if (options.keyStorageLocation.value == 0) {
      checkAndGenerateKeysLocalStorage();
    }
  });
};

chrome.runtime.onStartup.addListener(startupAndInstalledHandler);
chrome.runtime.onInstalled.addListener(startupAndInstalledHandler);

chrome.tabs.onActivated.addListener((activeInfo) => {
  currentTabId = activeInfo.tabId;
  updateIcon(tabIcons[currentTabId]);
});

chrome.tabs.onUpdated.addListener((tabId) => {
  tabIcons[tabId] = 'unsupported';
  updateIcon(tabIcons[currentTabId]);
});
