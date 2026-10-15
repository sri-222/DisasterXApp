import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveUserProfile, getUserProfile, clearUserProfile } from '../userProfileStorage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('phone-number preservation (regression for the login overwrite bug)', () => {
  test('a missing (undefined) phone does not overwrite a previously saved one', async () => {
    await saveUserProfile({ name: 'Ada', phone: '9876543210', email: 'a@b.com' });
    await saveUserProfile({ name: 'Ada', email: 'a@b.com' }); // phone omitted entirely

    const profile = await getUserProfile();
    expect(profile?.phone).toBe('9876543210');
  });

  test('a null phone does not overwrite a previously saved one', async () => {
    await saveUserProfile({ name: 'Ada', phone: '9876543210', email: 'a@b.com' });
    await saveUserProfile({ name: 'Ada', phone: undefined, email: 'a@b.com' });

    const profile = await getUserProfile();
    expect(profile?.phone).toBe('9876543210');
  });

  test('an explicit empty string DOES overwrite (this is the one case that must still work - explicit clearing)', async () => {
    await saveUserProfile({ name: 'Ada', phone: '9876543210', email: 'a@b.com' });
    await saveUserProfile({ name: 'Ada', phone: '', email: 'a@b.com' });

    const profile = await getUserProfile();
    expect(profile?.phone).toBe('');
  });

  test('a valid phone value is saved and read back correctly', async () => {
    await saveUserProfile({ name: 'Ada', phone: '9876543210', email: 'a@b.com' });
    const profile = await getUserProfile();
    expect(profile?.phone).toBe('9876543210');
  });

  test('accounts with no phone ever set default to empty string, not undefined/crash', async () => {
    await saveUserProfile({ name: 'Ada', email: 'a@b.com' });
    const profile = await getUserProfile();
    expect(profile?.phone).toBe('');
  });

  test('clearUserProfile removes the cached profile entirely', async () => {
    await saveUserProfile({ name: 'Ada', phone: '9876543210', email: 'a@b.com' });
    await clearUserProfile();
    await expect(getUserProfile()).resolves.toBeNull();
  });
});
