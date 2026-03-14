let jwtInMemory: string | null = null;

export async function saveJwtToSecureStore(jwt: string) {
  jwtInMemory = jwt;
}

export async function getJwtFromSecureStore() {
  return jwtInMemory;
}

export async function clearJwtFromSecureStore() {
  jwtInMemory = null;
}
