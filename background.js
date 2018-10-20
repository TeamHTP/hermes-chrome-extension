chrome.runtime.onInstalled.addListener(() => {
    const keyPair = HermesCrypto.generateKeyPair();
    chrome.storage.local.set({
        publicKey: HermesCrypto.encodeBase64(keyPair.publicKey),
        secretKey: HermesCrypto.encodeBase64(keyPair.secretKey)
    });
});
