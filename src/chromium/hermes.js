const keyPair = {
  publicKey: '',
  secretKey: '',
};
const theirPublicKey = '';
let downgraded = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'keyPair') {
    keyPair.publicKey = msg.publicKey;
    keyPair.secretKey = msg.secretKey;
  }
});

chrome.runtime.sendMessage({ action: 'getKeyPair' });

function getTheirPublicKey() {
  return theirPublicKey;
}

function getMyPublicKey() {
  return keyPair.publicKey;
}

function getMySecretKey() {
  return keyPair.secretKey;
}

function encryptMessage(message) {
  let encryptedMessage = '';
  try {
    encryptedMessage = HermesCrypto.encryptMessage(message, getTheirPublicKey(), getMySecretKey());
  } catch (e) {
    return false;
  }
  return encryptedMessage;
}

function encryptMessageForSelf(message) {
  let encryptedMessage = '';
  try {
    encryptedMessage = HermesCrypto.encryptMessage(message, getMyPublicKey(), getMySecretKey());
  } catch (e) {
    return false;
  }
  return encryptedMessage;
}

function decryptMessage(message) {
  let decryptedMessage = '';
  try {
    decryptedMessage = HermesCrypto.decryptMessage(message, getTheirPublicKey(), getMySecretKey());
  } catch (e) {
    return false;
  }
  return decryptedMessage;
}

function decryptMessageForSelf(message) {
  let decryptedMessage = '';
  try {
    decryptedMessage = HermesCrypto.decryptMessage(message, getMyPublicKey(), getMySecretKey());
  } catch (e) {
    return false;
  }
  return decryptedMessage;
}

function upgrade() {
  downgraded = false;
  chrome.runtime.sendMessage({
    action: 'changeIcon',
    value: 'locked',
  });
}

function downgrade() {
  downgraded = true;
  chrome.runtime.sendMessage({
    action: 'changeIcon',
    value: 'unlocked',
  });
}

function cryptoTest() {
  const testStr = 'Hermes123!@#';
  const encrypted = encryptMessage(testStr);
  if (encrypted && decryptMessage(encrypted) === testStr) {
    upgrade();
  } else {
    downgrade();
  }
}
