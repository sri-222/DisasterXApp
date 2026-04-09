import { firebaseAuth, firebaseFirestore } from '../config/firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';

const USERS_COLLECTION = 'users';

export interface SignupPayload {
  name: string;
  phone?: string;
  email: string;
  password: string;
  role?: string;
}

export interface SignupResponse {
  success: true;
  userId: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  user?: UserProfile;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeRole(role?: string) {
  const cleaned = role?.trim();
  return cleaned && cleaned.length ? cleaned : 'responder';
}

function timestampToIso(value: string | Timestamp | null | undefined) {
  if (!value) return undefined;
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return undefined;
}

export async function login(payload: { email: string; password: string }): Promise<LoginResponse> {
  const credential = await signInWithEmailAndPassword(firebaseAuth, payload.email, payload.password);
  const token = await credential.user.getIdToken();
  const userRef = doc(firebaseFirestore, USERS_COLLECTION, credential.user.uid);
  const snapshot = await getDoc(userRef);

  const userData = snapshot.data();
  const user: UserProfile | undefined = userData
    ? {
        id: snapshot.id,
        name: typeof userData.name === 'string' ? userData.name : '',
        email:
          typeof userData.email === 'string'
            ? userData.email
            : normalizeEmail(payload.email),
        phone: typeof userData.phone === 'string' ? userData.phone : null,
        role: normalizeRole(typeof userData.role === 'string' ? userData.role : undefined),
        status: typeof userData.status === 'string' ? userData.status : 'active',
        createdAt: timestampToIso(userData.createdAt),
      }
    : undefined;

  return { token, user };
}

export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  const credential = await createUserWithEmailAndPassword(
    firebaseAuth,
    payload.email,
    payload.password
  );
  const userRef = doc(firebaseFirestore, USERS_COLLECTION, credential.user.uid);
  await setDoc(userRef, {
    name: payload.name.trim(),
    email: normalizeEmail(payload.email),
    phone: payload.phone?.trim() || null,
    role: normalizeRole(payload.role),
    status: 'active',
    createdAt: serverTimestamp(),
  });
  return { success: true, userId: credential.user.uid };
}
