chrome.runtime.onInstalled.addListener(() => {
  const keyPair = HermesCrypto.generateKeyPair();
  chrome.storage.local.set({
    publicKey: HermesCrypto.encodeBase64(keyPair.publicKey),
    secretKey: HermesCrypto.encodeBase64(keyPair.secretKey)
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'changeIcon') {
    chrome.browserAction.setIcon({
      path: {
        "16": `assets/${msg.value}.png`,
        "32": `assets/${msg.value}2x.png`,
        "48": `assets/${msg.value}3x.png`,
        "128": `assets/${msg.value}8x.png`
      }
    });
  }
});
