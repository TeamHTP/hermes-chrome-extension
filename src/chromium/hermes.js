var keyPair = {
  publicKey: '',
  secretKey: ''
};
var theirPublicKey = '';
var downgraded = false;

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
  var encryptedMessage = '';
  try {
    encryptedMessage = HermesCrypto.encryptMessage(message, getTheirPublicKey(), getMySecretKey());
  }
  catch(e) {
    return false;
  }
  return encryptedMessage;
}

function encryptMessageForSelf(message) {
  var encryptedMessage = '';
  try {
    encryptedMessage = HermesCrypto.encryptMessage(message, getMyPublicKey(), getMySecretKey());}
  catch(e) {
    return false;
  }
  return encryptedMessage;
}

function decryptMessage(message) {
  var decryptedMessage = '';
  try {
    decryptedMessage = HermesCrypto.decryptMessage(message, getTheirPublicKey(), getMySecretKey());}
  catch(e) {
    return false;
  }
  return decryptedMessage;
}

function decryptMessageForSelf(message) {
  var decryptedMessage = '';
  try {
    decryptedMessage = HermesCrypto.decryptMessage(message, getMyPublicKey(), getMySecretKey());}
  catch(e) {
    return false;
  }
  return decryptedMessage;
}

function cryptoTest() {
  var testStr = 'Hermes123!@#';
  var encrypted = encryptMessage(testStr);
  if (encrypted && decryptMessage(encrypted) == testStr) {
    upgrade();
  }
  else {
    downgrade();
  }
}

function downgrade() {
  downgraded = true;
  chrome.runtime.sendMessage({
    action: 'changeIcon',
    value: 'unlocked'
  });
}

function upgrade() {
  downgraded = false;
  chrome.runtime.sendMessage({
    action: 'changeIcon',
    value: 'locked'
  });
}
