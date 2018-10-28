let disabled = false;

function sendGenerateRequest() {
  if (!disabled) {
    chrome.runtime.sendMessage({ action: 'regenKeyPair' });
    disabled = true;
    const oldButtonText = document.getElementById('generateKeyButton').innerHTML;
    document.getElementById('generateKeyButton').innerHTML = 'New keys generated!';
    setTimeout(() => {
      document.getElementById('generateKeyButton').innerHTML = oldButtonText;
      disabled = false;
    }, 2200);
  }
}

document.getElementById('generateKeyButton').onclick = sendGenerateRequest;
