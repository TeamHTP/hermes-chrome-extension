const defaultOptions = {
  encryptKey: {
    title: 'Store keys encrypted using master password',
    info: 'Enabling this option will encrypt your secret key using your master password. This is neccessary for enabling Chrome sync storage.',
    type: 'boolean',
    default: false,
    value: false,
    disabled: options => options.masterPassword.value.length == 0,
    onUpdate: (options) => {
      if (options.encryptKey.value && workingKeyPair.secretKey) {
        storageLocation.remove('secretKey');
        storageLocation.set({
          encryptedSecretKey: HermesCrypto.encryptSecret(workingKeyPair.secretKey, workingMasterPassword),
        });
      }
    },
  },
  masterPassword: {
    title: 'Master password',
    info: 'Your master password is used to encrypt your secret key. Anyone can pretend to be you if they have access to your master password and your encrypted secret key.',
    type: 'hash',
    default: '',
    value: '',
    onUpdate: (options) => {
      if (options.masterPassword.value === 'unknown' && !options.encryptKey.value) {
        // Value is 'unknown' (not stored) and encryptKey is disabled
        // Set password back to default
        options.masterPassword.value = options.masterPassword.default;
      } else if (options.masterPassword.value === options.masterPassword.default && options.encryptKey.value) {
        // Value is default (not set) and encryption key is enabled
        // Set password to 'unknown'
        options.masterPassword.value = 'unknown';
      }
    },
    onSave: (options) => {
      if (!options.rememberMasterPassword) {
        workingMasterPassword = options.masterPassword.value;
        options.masterPassword.value = 'unknown';
      }
    },
  },
  rememberMasterPassword: {
    title: 'Remember master password',
    info: 'Enabling this option means you will never have to input your master password when you want to use Hermes. Hermes will store hash of your password in local storage. This hash will never be stored in Chrome sync storage.',
    type: 'boolean',
    default: true,
    value: true,
    disabled: options => options.masterPassword.value.length == 0,
  },
  keyStorageLocation: {
    title: 'Secret key storage location',
    info: 'Choose where you want your secret key to be stored. Choosing Chrome sync means Google will have access to your encrypted secret key, but never your master password.',
    type: 'selection',
    options: ['Local', 'Chrome sync'],
    default: 0,
    value: 0,
  },
};
const options = {};
let storageLocation = chrome.storage.lcoal;

function resetOptions() {
  chrome.storage.local.set({ options: {} });
  queryOptions(() => {});
}

function queryOptions(callback) {
  chrome.storage.local.get(['options'], (result) => {
    const optionsFoundInStorage = result.hasOwnProperty('options');
    for (const optionKey in defaultOptions) {
      if (optionsFoundInStorage) {
        options[optionKey] = result.options[optionKey] || defaultOptions[optionKey];
      } else {
        options[optionKey] = defaultOptions[optionKey];
      }
    }
    if (options.keyStorageLocation.value == 0) {
      storageLocation = chrome.storage.local;
    } else if (options.keyStorageLocation.value == 0) {
      storageLocation = chrome.storage.sync;
    }
    runOptionsLogic();
    callback(options);
  });
}

function runOptionsLogic() {
  for (const optionKey in defaultOptions) {
    const option = options[optionKey];
    if (defaultOptions[optionKey].hasOwnProperty('disabled') && typeof defaultOptions[optionKey].disabled === 'function') {
      option._disabled = defaultOptions[optionKey].disabled(options);
    } else if (option.hasOwnProperty('disabled') && typeof !!option.disabled === 'boolean') {
      option._disabled = option.disabled;
    } else {
      option._disabled = false;
    }
    if (option._disabled) {
      option.value = defaultOptions[optionKey].default;
    }
    if (defaultOptions[optionKey].hasOwnProperty('onUpdate') && typeof defaultOptions[optionKey].onUpdate === 'function') {
      defaultOptions[optionKey].onUpdate(options);
    }
  }
}

function runSaveLogic() {
  for (const optionKey in defaultOptions) {
    const option = options[optionKey];
    if (defaultOptions[optionKey].hasOwnProperty('onSave') && typeof defaultOptions[optionKey].onUpdate === 'function') {
      defaultOptions[optionKey].onSave(options);
    }
  }
}

function updateOption(key, value) {
  runOptionsLogic();
  if (options[key]._disabled) {
    return false;
  }
  options[key].value = value;
  runOptionsLogic();
  runSaveLogic();
  chrome.storage.local.set({ options });
  return true;
}

function getOption(key) {
  runOptionsLogic();
  return options[key];
}
