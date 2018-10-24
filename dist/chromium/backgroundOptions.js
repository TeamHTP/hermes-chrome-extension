let options = {};

function queryOptions(callback) {
  const defaultOptions = {
    encryptKey: {
      title: 'Store keys encrypted using master password',
      info: 'Enabling this option will encrypt your secret key using your master password. This is neccessary for enabling Chrome sync storage.',
      type: 'boolean',
      default: false,
      value: false,
      disabled: (options) => {
        return options.masterPassword.value.length == 0;
      }
    },
    masterPassword: {
      title: 'Master password',
      info: 'Your master password is used to encrypt your secret key. Anyone can pretend to be you if they have access to your master password and your encrypted secret key.',
      type: 'hash',
      default: '',
      value: '',
      onUpdate: (options) => {
        if (options.masterPassword.value === 'unknown' && !options.encryptKey.value) {
          options.masterPassword.value = options.masterPassword.default;
        }
        else if (options.masterPassword.value === options.masterPassword.default && options.encryptKey.value) {
          options.masterPassword.value = 'unknown';
        }
      }
    },
    rememberMasterPassword: {
      title: 'Remember master password',
      info: 'Enabling this option means you will never have to input your master password when you want to use Hermes. Hermes will store hash of your password in local storage. This hash will never be stored in Chrome sync storage.',
      type: 'boolean',
      default: true,
      value: true,
      disabled: (options) => {
        return options.masterPassword.value.length == 0;
      }
    },
    keyStorageLocation: {
      title: 'Secret key storage location',
      info: 'Choose where you want your secret key to be stored. Choosing Chrome sync means Google will have access to your encrypted secret key, but never your master password.',
      type: 'selection',
      options: ['Local', 'Chrome sync'],
      default: 0,
      value: 0
    }
  };

  chrome.storage.local.get(['options'], (result) => {
    for (var optionKey in defaultOptions) {
      options = options[optionKey] || defaultOptions[optionKey];
    }
    runOptionsLogic();
    callback(options);
  });
}

function runOptionsLogic() {
  for (var optionKey in defaultOptions) {
    var option = options[optionKey];
    if (option.hasOwnProperty('disabled') && typeof option.disabled === 'function') {
      option._disabled = option.disabled(options)
    }
    else if (option.hasOwnProperty('disabled') && typeof !!option.disabled === 'boolean') {
      option._disabled = option.disabled;
    }
    else {
      option._disabled = false;
    }
    if (option._disabled) {
      option.value = option.default;
    }
    if (option.hasOwnProperty('onUpdate') && typeof option.onUpdate === 'function') {
      option.onUpdate(options);
    }
  }
}

function updateOption(key, value) {
  options[key].value = value;
  runOptionsLogic();
  return options;
}

function getOption(key) {
  runOptionsLogic();
  return options[key];
}
