// Manual mock for react-native-keychain. Jest auto-applies __mocks__ files
// for node_modules packages at the project root without needing jest.mock().
let store = {};

function keyFor(options) {
  return (options && options.service) || 'default';
}

async function setGenericPassword(username, password, options) {
  store[keyFor(options)] = { username, password };
  return true;
}

async function getGenericPassword(options) {
  const entry = store[keyFor(options)];
  return entry ? { ...entry, service: keyFor(options), storage: 'mock' } : false;
}

async function resetGenericPassword(options) {
  delete store[keyFor(options)];
  return true;
}

// Test helper, not part of the real library's API.
function __reset() {
  store = {};
}

module.exports = {
  setGenericPassword,
  getGenericPassword,
  resetGenericPassword,
  __reset,
};
