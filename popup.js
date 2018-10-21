var disabled = false;

function sendGenerateRequest() {
  if (!disabled) {
    chrome.runtime.sendMessage({ action: 'regenKeyPair' });
    disabled = true;
    document.getElementById('generateKeyButton').innerHTML = 'Refresh your page to use new keypair!';
    setTimeout(() => {
      document.getElementById('generateKeyButton').innerHTML = 'Generate new keypair';
      disabled = false;
    }, 2500);
  }
}

document.getElementById('generateKeyButton').onclick = sendGenerateRequest;
