type Listener = (user: MockUser | null) => void;

interface MockUser {
  uid: string;
  email: string;
}

const STORAGE_KEY = "__frotagov_mock_auth__";

function getStoredUser(): MockUser | null {
  try {
    const s = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return s ? (JSON.parse(s) as MockUser) : null;
  } catch { return null; }
}

function setStoredUser(user: MockUser | null) {
  try {
    if (typeof localStorage === "undefined") return;
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* noop */ }
}

const listeners: Listener[] = [];
const authObj: { currentUser: MockUser | null } = { currentUser: getStoredUser() };

function notificar(user: MockUser | null) {
  authObj.currentUser = user;
  setStoredUser(user);
  listeners.forEach(fn => fn(user));
}

export function getAuth() {
  return authObj;
}

export function signInWithEmailAndPassword(_auth: unknown, email: string, password: string) {
  if (email.startsWith("errado") || password === "senhaerrada") {
    const erro = new Error("Firebase: Error (auth/invalid-credential).") as Error & { code: string };
    erro.code = "auth/invalid-credential";
    return Promise.reject(erro);
  }
  const uid = email.includes("gestor") ? "uid-gestor-teste"
    : email.includes("consulta") ? "uid-consulta-teste"
    : email.includes("auditor") ? "uid-auditor-teste"
    : email.includes("outro") ? "uid-outro-servidor"
    : "uid-usuario-teste";
  const user: MockUser = { uid, email };
  notificar(user);
  return Promise.resolve({ user });
}

export function createUserWithEmailAndPassword(_auth: unknown, email: string, _password: string) {
  const uid = "uid-new-" + Math.random().toString(36).slice(2, 8);
  const user: MockUser = { uid, email };
  return Promise.resolve({ user });
}

export function sendPasswordResetEmail(_auth: unknown, _email: string) {
  return Promise.resolve();
}

export function signOut(_auth: unknown) {
  notificar(null);
  return Promise.resolve();
}

export function onAuthStateChanged(_auth: unknown, callback: Listener) {
  listeners.push(callback);
  setTimeout(() => callback(getStoredUser()), 0);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
