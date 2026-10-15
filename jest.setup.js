/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The native geolocation module isn't linked under Jest.
jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(() => 0),
    clearWatch: jest.fn(),
    stopObserving: jest.fn(),
    requestAuthorization: jest.fn(),
    setRNConfiguration: jest.fn(),
  },
}));
