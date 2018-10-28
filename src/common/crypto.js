const {
  box, secretbox, hash, randomBytes,
} = require('tweetnacl');
const {
  decodeUTF8,
  encodeUTF8,
  encodeBase64,
  decodeBase64,
} = require('tweetnacl-util');

const newMessageNonce = () => randomBytes(box.nonceLength);

const newSecretNonce = () => randomBytes(secretbox.nonceLength);

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
module.exports.generateKeyPairFromSecretKey = secretKey => box.keyPair.fromSecretKey(secretKey);

/**
Returns a base64 string with the encrypted message given a UTF8 message, their public key in base64
and our secret key in base64
The first 24 bytes of the encoded message will be the nonce
*/
module.exports.encryptMessage = (message, theirPublicKeyBase64, mySecretKeyBase64) => {
  // Generate a nonce
  const nonce = newMessageNonce();
  // Decode strings to Uint8Arrays
  const theirPublicKeyUint8Array = decodeBase64(theirPublicKeyBase64);
  const mySecretKeyUint8Array = decodeBase64(mySecretKeyBase64);
  const messageUint8 = decodeUTF8(message);
  // Encrypt
  const encryptedMessage = box(
    messageUint8,
    nonce,
    theirPublicKeyUint8Array,
    mySecretKeyUint8Array,
  );
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
    messageWithNonce.length,
  );
  // Decrypt message
  const decryptedMessage = box.open(
    message,
    nonce,
    theirPublicKeyUint8Array,
    mySecretKeyUint8Array,
  );
  if (!decryptedMessage) {
    throw new Error('Could not decrypt message');
  }
  // Return message as UTF8
  return encodeUTF8(decryptedMessage);
};

module.exports.encryptSecret = (secret, key) => {
  const nonce = newSecretNonce();
  const secretUint8Array = decodeUTF8(secret);
  const keyUint8Array = decodeBase64(key);

  const encryptedSecret = secretbox(secretUint8Array, nonce, keyUint8Array);
  const fullSecret = new Uint8Array(nonce.length + encryptedSecret.length);
  fullSecret.set(nonce);
  fullSecret.set(encryptedSecret, nonce.length);

  return encodeBase64(fullSecret);
};

module.exports.decryptSecret = (secretWithNonce, key) => {
  const secretWithNonceUint8Array = decodeBase64(secretWithNonce);
  const keyUint8Array = decodeBase64(key);

  const nonce = secretWithNonceUint8Array.slice(0, secretbox.nonceLength);
  const secret = secretWithNonceUint8Array.slice(
    secretbox.nonceLength,
    secretWithNonce.length,
  );

  const decryptedSecret = secretbox.open(secret, nonce, keyUint8Array);
  if (!decryptedSecret) {
    throw new Error('Could not decrypt secret');
  }
  // Return secret as UTF8
  return encodeUTF8(decryptedSecret);
};

module.exports.hash64 = raw => encodeBase64(hash(decodeUTF8(raw)));

module.exports.hash32 = raw => encodeBase64(hash(decodeUTF8(raw)).slice(0, 32));

module.exports.decodeUTF8 = decodeUTF8;
module.exports.encodeUTF8 = encodeUTF8;
module.exports.decodeBase64 = decodeBase64;
module.exports.encodeBase64 = encodeBase64;
