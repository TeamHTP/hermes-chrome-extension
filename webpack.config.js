const path = require('path');

module.exports = {
  mode: 'production',
  entry: './webpackSrc/crypto.js',
  output: {
    path: path.resolve(__dirname, 'webpackDist'),
    library: 'HermesCrypto',
    filename: 'cryptoBundle.js'
  }
};
