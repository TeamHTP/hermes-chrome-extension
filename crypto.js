const { box, randomBytes } = require('tweetnacl');
const {
  decodeUTF8,
  encodeUTF8,
  encodeBase64,
  decodeBase64
} = require('tweetnacl-util');

const newNonce = () => randomBytes(box.nonceLength);

module.exports.generateKeyPair = () => box.keyPair();

module.exports.generateKeyPairFromSecretKey = (secretKey) => box.keyPair.fromSecretKey(secretKey);

module.exports.encryptMessage = (message, theirPublicKeyBase64, mySecretKeyBase64) => {
  const nonce = newNonce();
  const theirPublicKeyUint8Array = decodeBase64(theirPublicKeyBase64);
  const mySecretKeyUint8Array = decodeBase64(mySecretKeyBase64);
  const messageUint8 = decodeUTF8(message);

  const encryptedMessage = box(messageUint8, nonce, theirPublicKeyUint8Array, mySecretKeyUint8Array);
  const fullMessage = new Uint8Array(nonce.length + encryptedMessage.length);
  fullMessage.set(nonce);
  fullMessage.set(encryptedMessage, nonce.length);

  return encodeBase64(fullMessage);
};

module.exports.decryptMessage = (messageWithNonce, theirPublicKeyBase64, mySecretKeyBase64) => {
  const messageWithNonceUint8Array = decodeBase64(messageWithNonce);
  const theirPublicKeyUint8Array = decodeBase64(theirPublicKeyBase64);
  const mySecretKeyUint8Array = decodeBase64(mySecretKeyBase64);

  const nonce = messageWithNonceUint8Array.slice(0, box.nonceLength);
  const message = messageWithNonceUint8Array.slice(
    box.nonceLength,
    messageWithNonce.length
  );
  const decryptedMessage = box.open(message, nonce, theirPublicKeyUint8Array, mySecretKeyUint8Array);

  if (!decryptedMessage) {
    throw new Error('Could not decrypt message');
  }

  return encodeUTF8(decryptedMessage);
};
