const assert = require('assert');
const crypto = require('../src/common/crypto.js');
const {
  decodeUTF8,
  encodeUTF8,
  encodeBase64,
  decodeBase64
} = require('tweetnacl-util');

let tests = [];

function test(testFunc) {
  console.log(`Running test: ${testFunc.name}`);
  testFunc();
  console.log('\x1b[42mTest passed!\x1b[0m\n');
}

function runTests() {
  let i;
  for (i = 0; i < tests.length; i++) {
    test(tests[i]);
  }
  console.log(`${i} test(s) ran`);
}

function encryptDecrypt() {
  const myKeyPair = crypto.generateKeyPair();
  const theirKeyPair = crypto.generateKeyPair();
  const messageUTF8 = 'Hello world 1234!@#$';

  const encryptedBase64 = crypto.encryptMessage(messageUTF8, encodeBase64(theirKeyPair.publicKey), encodeBase64(myKeyPair.secretKey));
  const decryptedUTF8 = crypto.decryptMessage(encryptedBase64, encodeBase64(theirKeyPair.publicKey), encodeBase64(myKeyPair.secretKey));

  console.log(`Message to encrypt: ${messageUTF8}`);
  console.log(`Encrypted b64: ${encryptedBase64}`);
  console.log(`Decrypted message: ${decryptedUTF8}`);
  assert(messageUTF8 === decryptedUTF8);
}

tests.push(encryptDecrypt);
runTests();
