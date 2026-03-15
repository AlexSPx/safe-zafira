import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser } from '../services/authService';
import { saveJwtToSecureStore, clearJwtFromSecureStore } from '../services/jwtSecureStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthState = {
  user: AuthUser | null;
  jwt: string | null;
};

export const useAuthStore = create<AuthState>()(
  persist<AuthState>(
    (set, get) => ({
      user: null,
      jwt: null,
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
export async function setAuthStore(user: AuthUser, jwt: string) {
  useAuthStore.setState({ user, jwt });
  await saveJwtToSecureStore(jwt);
}

export async function clearAuthStore() {
  useAuthStore.setState({ user: null, jwt: null });
  await clearJwtFromSecureStore();
}

export function getAuthStore(): AuthState {
  return useAuthStore.getState();
}
