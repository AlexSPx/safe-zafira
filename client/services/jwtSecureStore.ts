import * as SecureStore from 'expo-secure-store';

const JWT_STORAGE_KEY = 'safe-zafira.jwt';

export async function saveJwtToSecureStore(jwt: string) {
  await SecureStore.setItemAsync(JWT_STORAGE_KEY, jwt);
}

export async function getJwtFromSecureStore() {
  return SecureStore.getItemAsync(JWT_STORAGE_KEY);
}

export async function clearJwtFromSecureStore() {
  await SecureStore.deleteItemAsync(JWT_STORAGE_KEY);
}
