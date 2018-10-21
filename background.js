chrome.runtime.onInstalled.addListener(() => {
  const keyPair = HermesCrypto.generateKeyPair();
  chrome.storage.local.set({
    publicKey: HermesCrypto.encodeBase64(keyPair.publicKey),
    secretKey: HermesCrypto.encodeBase64(keyPair.secretKey)
  });
});

let currentTabId;
let tabIcons = {};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'changeIcon') {
    tabIcons[currentTabId] = msg.value;
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

function updateIconFromTab() {
  chrome.browserAction.setIcon({
    path: {
      "16": `assets/${tabIcons[currentTabId] || 'unsupported'}.png`,
      "32": `assets/${tabIcons[currentTabId] || 'unsupported'}2x.png`,
      "48": `assets/${tabIcons[currentTabId] || 'unsupported'}3x.png`,
      "128": `assets/${tabIcons[currentTabId] || 'unsupported'}8x.png`
    }
  });
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  currentTabId = activeInfo.tabId;
  updateIconFromTab();
});

chrome.tabs.onUpdated.addListener((tabId) => {
  tabIcons[tabId] = 'unsupported';
  updateIconFromTab();
});
