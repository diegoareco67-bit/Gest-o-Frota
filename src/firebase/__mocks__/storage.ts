// Mock de firebase/storage para testes (Vitest/Playwright) — evita chamada real ao
// Firebase Storage de produção durante upload de PDF assinado (Anexo I/Anexo II).
interface StorageRef { path: string; }

const uploads = new Map<string, { blob: Blob; contentType?: string }>();

export function getStorage() { return {}; }

export function ref(_storage: unknown, path: string): StorageRef {
  return { path };
}

export async function uploadBytes(storageRef: StorageRef, blob: Blob, metadata?: { contentType?: string }) {
  uploads.set(storageRef.path, { blob, contentType: metadata?.contentType });
  return { ref: storageRef, metadata: { fullPath: storageRef.path } };
}

export async function getDownloadURL(storageRef: StorageRef) {
  if (!uploads.has(storageRef.path)) throw new Error(`Mock storage: nada foi enviado para ${storageRef.path}`);
  return `https://mock-storage.test/${storageRef.path}`;
}
