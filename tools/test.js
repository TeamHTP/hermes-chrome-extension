const assert = require('assert');
const {
  encodeBase64,
} = require('tweetnacl-util');
const crypto = require('../src/common/crypto.js');

const tests = [];

function test(testFunc) {
  console.log(`Running test: ${testFunc.name}`);
  testFunc();
  console.log('\x1b[42mTest passed!\x1b[0m\n');
}

function runTests() {
  let i;
  for (i = 0; i < tests.length; i += 1) {
    test(tests[i]);
  }
  console.log(`${i} test(s) ran`);
}

function encryptDecrypt() {
  const myKeyPair = crypto.generateKeyPair();
  const theirKeyPair = crypto.generateKeyPair();
  const messageUTF8 = 'Hello world 1234!@#$';

  const encryptedBase64 = crypto.encryptMessage(
    messageUTF8,
    encodeBase64(theirKeyPair.publicKey),
    encodeBase64(myKeyPair.secretKey),
  );
  const decryptedUTF8 = crypto.decryptMessage(
    encryptedBase64,
    encodeBase64(theirKeyPair.publicKey),
    encodeBase64(myKeyPair.secretKey),
  );

  console.log(`Message to encrypt: ${messageUTF8}`);
  console.log(`Encrypted b64: ${encryptedBase64}`);
  console.log(`Decrypted message: ${decryptedUTF8}`);
  assert(messageUTF8 === decryptedUTF8);
}

function encryptDecryptSecret() {
  const password = 'this_is_a_secret';
  const passwordHashB64 = crypto.hash32(password);
  const messageUTF8 = encodeBase64(crypto.generateKeyPair().secretKey);

  const encryptedBase64 = crypto.encryptSecret(messageUTF8, passwordHashB64);
  const decryptedUTF8 = crypto.decryptSecret(encryptedBase64, passwordHashB64);

  console.log(`Message to encrypt: ${messageUTF8}`);
  console.log(`Encrypted b64: ${encryptedBase64}`);
  console.log(`Decrypted message: ${decryptedUTF8}`);
  assert(messageUTF8 === decryptedUTF8);
}

tests.push(encryptDecrypt);
tests.push(encryptDecryptSecret);
runTests();
