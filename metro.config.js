const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Disable new architecture features
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: false,
};

// Restrict watch folders to only the mobile directory and its subdirectories
config.watchFolders = [
  path.resolve(__dirname),
];

// Block the backend server src directory (repo root /src)
config.resolver = {
  ...config.resolver,
  blockList: [
    new RegExp(path.resolve(__dirname, '../src').replace(/\\/g, '\\\\')),
  ],
};

module.exports = config;
