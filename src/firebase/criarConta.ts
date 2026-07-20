import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "./config";

/**
 * Cria uma conta no Firebase Auth SEM trocar a sessão atual (a do gestor).
 *
 * `createUserWithEmailAndPassword` do SDK web faz login automático como o usuário
 * recém-criado — isso expulsaria o gestor e o deixaria logado na conta nova (bug
 * observado ao cadastrar um servidor). Para evitar, a conta é criada numa INSTÂNCIA
 * SECUNDÁRIA e isolada do app, com persistência apenas em memória (não escreve tokens
 * no localStorage do navegador do gestor). A sessão principal nunca é tocada e a
 * instância secundária é descartada ao final.
 *
 * O `setDoc` em `usuarios` e o `sendPasswordResetEmail` continuam rodando na sessão
 * principal (do gestor), que é quem tem permissão nas Security Rules.
 *
 * Retorna o UID do novo usuário.
 */
export async function criarContaSemTrocarSessao(email: string, senha: string): Promise<string> {
  const appSecundario = initializeApp(firebaseConfig, "criar-conta-" + Date.now());
  try {
    const authSecundario = initializeAuth(appSecundario, { persistence: inMemoryPersistence });
    const cred = await createUserWithEmailAndPassword(authSecundario, email, senha);
    return cred.user.uid;
  } finally {
    await deleteApp(appSecundario);
  }
}
