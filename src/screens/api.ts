const API_BASE_URL = 'http://localhost:4000'; // Adjust this to your backend URL

export interface SignupPayload {
  name: string;
  phone?: string;
  email: string;
  password: string;
  role?: string;
}

export interface SignupResponse {
  success: boolean;
  userId: string;
  email: string;
  role: string;
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
  success: boolean;
  token: string;
  sessionId: string;
  expiresAt: string;
  ttlMs: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeRole(role?: string) {
  const cleaned = role?.trim();
  return cleaned && cleaned.length ? cleaned : 'responder';
}

export async function login(payload: { email: string; password: string }): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(errorData.error || 'Login failed');
  }

  const data = await response.json();
  return data;
}

export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  const response = await fetch(`${API_BASE_URL}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
      role: payload.role,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Signup failed' }));
    throw new Error(errorData.error || 'Signup failed');
  }

  const data = await response.json();
  return data;
}
