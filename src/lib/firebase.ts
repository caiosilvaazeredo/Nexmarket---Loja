import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

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

const AUTH_API_URL = (import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8787').replace(/\/$/, '');

async function requestCustomToken(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${AUTH_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
