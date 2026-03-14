import { useSyncExternalStore } from 'react';
import type { AuthUser } from '../services/authService';

type AuthState = {
  user: AuthUser | null;
  jwt: string | null;
};

let state: AuthState = {
  user: null,
  jwt: null,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAuthStore(): AuthState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function setAuthStore(user: AuthUser, jwt: string) {
  state = { user, jwt };
  notifyListeners();
}

export function clearAuthStore() {
  state = { user: null, jwt: null };
  notifyListeners();
}

export function getAuthStore(): AuthState {
  return state;
}
