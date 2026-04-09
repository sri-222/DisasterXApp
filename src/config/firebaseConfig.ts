import { getApps, initializeApp } from 'firebase/app';
import {
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

const initializedApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

const persistence = getReactNativePersistence(ReactNativeAsyncStorage);

type FirebaseGlobal = typeof globalThis & {
  firebaseAuth?: ReturnType<typeof initializeAuth>;
};

const globalRef = globalThis as FirebaseGlobal;

const firebaseAuth =
  globalRef.firebaseAuth ?? initializeAuth(initializedApp, { persistence });

globalRef.firebaseAuth = firebaseAuth;

export { firebaseAuth };
export const firebaseFirestore = getFirestore(initializedApp);
