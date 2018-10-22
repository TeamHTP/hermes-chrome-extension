var disabled = false;

function sendGenerateRequest() {
  if (!disabled) {
    chrome.runtime.sendMessage({ action: 'regenKeyPair' });
    disabled = true;
    var oldButtonText = document.getElementById('generateKeyButton').innerHTML;
    document.getElementById('generateKeyButton').innerHTML = 'New keys generated!';
    setTimeout(() => {
      document.getElementById('generateKeyButton').innerHTML = oldButtonText;
      disabled = false;
    }, 2500);
  }
}

document.getElementById('generateKeyButton').onclick = sendGenerateRequest;
