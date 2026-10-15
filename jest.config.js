module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  // react-navigation (and some of its scoped sub-packages) ship untranspiled
  // ESM, so the default react-native preset's ignore list has to be widened
  // to let Jest transform it too. (Pre-existing gap - App.tsx already
  // imported @react-navigation/native before this change, so __tests__/App.test.tsx
  // was already failing with "Unexpected token export".)
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation)/',
  ],
};
