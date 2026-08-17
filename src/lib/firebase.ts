import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { apiBaseUrl } from './apiBase';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);

/* -------------------------- Auth helpers -------------------------- *
 * Login/senha NÃO usam mais os provedores nativos do Firebase (nem e-mail/
 * senha nativo, nem Google) — vivem no Firestore, validados pelo backend
 * compartilhado (repo nexmarket--empresa, pasta server/), que emite um
 * Firebase Custom Token. O Firebase Auth aqui é usado SÓ como mecanismo de
 * sessão, para as Security Rules continuarem funcionando (request.auth). */

/*
 * O servidor roda em hospedagem que hiberna após um período sem uso: a
 * primeira chamada do dia pode levar quase um minuto só para acordá-lo. Sem
 * teto, a tela fica em "Entrando..." indefinidamente e parece travada — a
 * pessoa recarrega, o que reinicia a espera do zero.
 *
 * 60s dá folga para o servidor acordar; passando disso, é falha de verdade e
 * a mensagem precisa dizer isso em vez de deixar o botão girando.
 */
const TIMEOUT_MS = 60_000;

async function requestCustomToken(path: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    throw new Error(
      err?.name === 'AbortError'
        ? 'O servidor demorou para responder. Ele pode estar iniciando — tente de novo em um minuto.'
        : 'Não foi possível falar com o servidor. Verifique sua conexão.',
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Falha na autenticação.');
  return data as { customToken: string; uid: string };
}

export const loginWithEmail = async (email: string, pass: string) => {
  const { customToken } = await requestCustomToken('/api/auth/login', {
    app: 'loja',
    email,
    password: pass,
  });
  return (await signInWithCustomToken(auth, customToken)).user;
};

export const registerWithEmail = async (email: string, pass: string) => {
  const { customToken } = await requestCustomToken('/api/auth/register', {
    app: 'loja',
    email,
    password: pass,
  });
  return (await signInWithCustomToken(auth, customToken)).user;
};

export const loginAsVisitor = async () => {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  return (await signInAnonymously(auth)).user;
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout failed', error);
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
