const { box, randomBytes } = require('tweetnacl');
const {
  decodeUTF8,
  encodeUTF8,
  encodeBase64,
  decodeBase64
} = require('tweetnacl-util');

const newNonce = () => randomBytes(box.nonceLength);

/**
Generates a new key pair
{
  publicKey: Uint8Array,
  secretKey: Uint8Array
}
*/
module.exports.generateKeyPair = () => box.keyPair();

/**
Generates a key pair given a 32 byte secret key
*/
module.exports.generateKeyPairFromSecretKey = (secretKey) => box.keyPair.fromSecretKey(secretKey);

/**
Returns a base64 string with the encrypted message given a UTF8 message, their public key in base64 and our secret key in base64
The first 24 bytes of the encoded message will be the nonce
*/
module.exports.encryptMessage = (message, theirPublicKeyBase64, mySecretKeyBase64) => {
  // Generate a nonce
  const nonce = newNonce();
  // Decode strings to Uint8Arrays
  const theirPublicKeyUint8Array = decodeBase64(theirPublicKeyBase64);
  const mySecretKeyUint8Array = decodeBase64(mySecretKeyBase64);
  const messageUint8 = decodeUTF8(message);
  // Encrypt
  const encryptedMessage = box(messageUint8, nonce, theirPublicKeyUint8Array, mySecretKeyUint8Array);
  // Prepend encrypted message with nonce
  const fullMessage = new Uint8Array(nonce.length + encryptedMessage.length);
  fullMessage.set(nonce);
  fullMessage.set(encryptedMessage, nonce.length);
  // Return message in base64
  return encodeBase64(fullMessage);
};

/**
Decrypts a base64 message given their public key in base 64 and our secret key in base 64
*/
module.exports.decryptMessage = (messageWithNonce, theirPublicKeyBase64, mySecretKeyBase64) => {
  // Decode strings to Uint8Arrays
  const messageWithNonceUint8Array = decodeBase64(messageWithNonce);
  const theirPublicKeyUint8Array = decodeBase64(theirPublicKeyBase64);
  const mySecretKeyUint8Array = decodeBase64(mySecretKeyBase64);
  // Extract nonce and message
  const nonce = messageWithNonceUint8Array.slice(0, box.nonceLength);
  const message = messageWithNonceUint8Array.slice(
    box.nonceLength,
    messageWithNonce.length
  );
  // Decrypt message
  const decryptedMessage = box.open(message, nonce, theirPublicKeyUint8Array, mySecretKeyUint8Array);
  if (!decryptedMessage) {
    throw new Error('Could not decrypt message');
  }
  // Return message as UTF8
  return encodeUTF8(decryptedMessage);
};
