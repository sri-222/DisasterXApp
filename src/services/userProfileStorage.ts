import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'disasterx_user_profile';

export type StoredUserProfile = {
  name: string;
  phone: string;
  email?: string;
};

export const getUserProfile = async (): Promise<StoredUserProfile | null> => {
  const rawProfile = await AsyncStorage.getItem(PROFILE_KEY);

  if (!rawProfile) {
    return null;
  }

  try {
    return JSON.parse(rawProfile) as StoredUserProfile;
  } catch {
    return null;
  }
};

export const saveUserProfile = async (profile: Partial<StoredUserProfile>) => {
  const existingProfile = await getUserProfile();
  const nextProfile: StoredUserProfile = {
    name: profile.name ?? existingProfile?.name ?? '',
    phone: profile.phone ?? existingProfile?.phone ?? '',
    email: profile.email ?? existingProfile?.email ?? '',
  };

  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
};

export const clearUserProfile = async () => {
  await AsyncStorage.removeItem(PROFILE_KEY);
};
