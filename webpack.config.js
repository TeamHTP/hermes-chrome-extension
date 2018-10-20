module.exports = {
  entry: './crypto.js',
  output: {
    path: __dirname,
    library: 'HermesCrypto',
    filename: 'cryptobundle.js'
  }
};
