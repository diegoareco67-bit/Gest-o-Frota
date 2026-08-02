type Listener = (user: MockUser | null) => void;

interface MockUser {
  uid: string;
  email: string;
  emailVerified?: boolean;
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
    : email.includes("terceiro") ? "uid-terceiro-servidor"
    : "uid-usuario-teste";
  const user: MockUser = { uid, email, emailVerified: true };
  notificar(user);
  return Promise.resolve({ user });
}

export function sendEmailVerification(_user: unknown) {
  return Promise.resolve();
}

export function createUserWithEmailAndPassword(_auth: unknown, email: string, _password: string) {
  const uid = "uid-new-" + Math.random().toString(36).slice(2, 8);
  const user: MockUser = { uid, email };
  // Não chama notificar(): criar conta não pode trocar a sessão atual (do gestor).
  return Promise.resolve({ user });
}

// Instância secundária de Auth (usada por criarConta.ts para criar usuários sem
// deslogar o gestor). No mock devolvemos o mesmo objeto — createUser não muda a sessão.
export const inMemoryPersistence = { type: "NONE" };
export function initializeAuth(_app: unknown, _opts?: unknown) {
  return authObj;
}

export function sendPasswordResetEmail(_auth: unknown, _email: string) {
  return Promise.resolve();
}

export function signOut(_auth: unknown) {
  notificar(null);
  return Promise.resolve();
}

// ─── MFA (TOTP) — stubs ───────────────────────────────────────────────
// Os testes nunca exercitam MFA de verdade (as contas mockadas não têm 2º fator),
// mas login.tsx e a tela de Segurança importam estas funções — sem os stubs o
// import quebraria a aplicação inteira sob o mock.
export function multiFactor(_user: unknown) {
  return {
    enrolledFactors: [] as { uid: string; displayName?: string }[],
    getSession: () => Promise.resolve({}),
    enroll: (_assertion: unknown, _name?: string) => Promise.resolve(),
    unenroll: (_factor: unknown) => Promise.resolve(),
  };
}

export const TotpMultiFactorGenerator = {
  FACTOR_ID: "totp",
  generateSecret: (_session: unknown) => Promise.resolve({
    secretKey: "MOCKSECRETKEY234567ABCDEF",
    generateQrCodeUrl: (_acc?: string, _iss?: string) => "otpauth://totp/Hub:teste?secret=MOCKSECRETKEY234567ABCDEF&issuer=Hub",
  }),
  assertionForEnrollment: (_secret: unknown, _otp: string) => ({}),
  assertionForSignIn: (_uid: string, _otp: string) => ({}),
};

export function getMultiFactorResolver(_auth: unknown, _error: unknown) {
  return {
    hints: [{ uid: "mock-hint", displayName: "App Autenticador" }],
    resolveSignIn: (_assertion: unknown) => Promise.resolve({ user: authObj.currentUser }),
  };
}

export function onAuthStateChanged(_auth: unknown, callback: Listener) {
  listeners.push(callback);
  setTimeout(() => callback(getStoredUser()), 0);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
