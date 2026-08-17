import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Conta de recebimento da loja (onde a plataforma deposita o repasse).
 *
 * Fica em `supermarkets/{id}/settings/payout` — um documento **separado** do
 * `settings/storeInfo`, que é público para o app do cliente. Dados bancários
 * nunca podem trafegar junto com horário/formas de pagamento da vitrine.
 */

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
export type PayoutMethod = 'pix' | 'bank';
export type AccountType = 'checking' | 'savings';

export interface PayoutAccount {
  method?: PayoutMethod;
  /** PIX */
  pixKeyType?: PixKeyType;
  pixKey?: string;
  /** Conta bancária */
  bankName?: string;
  bankCode?: string;
  agency?: string;
  account?: string;
  accountType?: AccountType;
  /** Titular (comum aos dois métodos) */
  holderName?: string;
  holderDocument?: string; // CPF ou CNPJ
  updatedAt?: any;
}

export const PIX_KEY_LABELS: Record<PixKeyType, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Celular',
  random: 'Chave aleatória',
};

const digits = (v: string) => (v || '').replace(/\D/g, '');

export function isValidCpf(value: string): boolean {
  const d = digits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(d[9]) && digit(10) === Number(d[10]);
}

export function isValidCnpj(value: string): boolean {
  const d = digits(value);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/** Valida a chave conforme o tipo — evita repasse preso por chave errada. */
export function validatePixKey(type: PixKeyType, key: string): string | null {
  const raw = (key || '').trim();
  if (!raw) return 'Informe a chave PIX.';
  switch (type) {
    case 'cpf':
      return isValidCpf(raw) ? null : 'CPF inválido.';
    case 'cnpj':
      return isValidCnpj(raw) ? null : 'CNPJ inválido.';
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw) ? null : 'E-mail inválido.';
    case 'phone':
      // Celular brasileiro: DDD + 9 dígitos (aceita +55 na frente).
      return /^(55)?\d{11}$/.test(digits(raw)) ? null : 'Celular inválido (DDD + 9 dígitos).';
    case 'random':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
        ? null
        : 'Chave aleatória deve ter o formato UUID.';
    default:
      return 'Tipo de chave inválido.';
  }
}

/** Valida a conta inteira; devolve a primeira mensagem de erro ou null. */
export function validatePayoutAccount(a: PayoutAccount): string | null {
  if (!a.holderName?.trim()) return 'Informe o nome do titular.';
  const docDigits = digits(a.holderDocument || '');
  if (!docDigits) return 'Informe o CPF ou CNPJ do titular.';
  if (docDigits.length === 11 ? !isValidCpf(docDigits) : !isValidCnpj(docDigits)) {
    return 'CPF/CNPJ do titular inválido.';
  }
  if (a.method === 'bank') {
    if (!a.bankName?.trim()) return 'Informe o banco.';
    if (!digits(a.agency || '')) return 'Informe a agência.';
    if (!digits(a.account || '')) return 'Informe a conta.';
    return null;
  }
  return validatePixKey(a.pixKeyType || 'cpf', a.pixKey || '');
}

/** Resumo curto para exibir na tela ("PIX · CNPJ 12.345.678/0001-90"). */
export function describeAccount(a: PayoutAccount | null): string {
  if (!a || !validatePayoutAccountIsComplete(a)) return 'Não cadastrada';
  if (a.method === 'bank') {
    return `${a.bankName} · Ag. ${a.agency} · Conta ${a.account}`;
  }
  return `PIX · ${PIX_KEY_LABELS[a.pixKeyType || 'cpf']}: ${a.pixKey}`;
}

export function validatePayoutAccountIsComplete(a: PayoutAccount | null): boolean {
  return !!a && validatePayoutAccount(a) === null;
}

const payoutRef = (smId: string) => doc(db, `supermarkets/${smId}/settings/payout`);

export async function getPayoutAccount(smId: string): Promise<PayoutAccount | null> {
  const snap = await getDoc(payoutRef(smId));
  return snap.exists() ? (snap.data() as PayoutAccount) : null;
}

export function subscribePayoutAccount(smId: string, cb: (a: PayoutAccount | null) => void) {
  return onSnapshot(
    payoutRef(smId),
    (snap) => cb(snap.exists() ? (snap.data() as PayoutAccount) : null),
    () => cb(null),
  );
}

export async function savePayoutAccount(smId: string, account: PayoutAccount): Promise<void> {
  await setDoc(payoutRef(smId), { ...account, updatedAt: serverTimestamp() }, { merge: true });
}

/* ------------------- Calendário de repasse (vem da Empresa) --------------- */

export interface PayoutSchedule {
  cadence?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  weekday?: number;
  monthDay?: number;
  holdDays?: number;
  minimumAmount?: number;
}

const WEEKDAYS = ['', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

/** Lê o calendário publicado pela Empresa em `platformConfig/public`. */
export function subscribePayoutSchedule(cb: (s: PayoutSchedule | null) => void) {
  return onSnapshot(
    doc(db, 'platformConfig', 'public'),
    (snap) => cb(snap.exists() ? ((snap.data() as any).storePayout ?? null) : null),
    () => cb(null),
  );
}

export function describeSchedule(s: PayoutSchedule | null): string {
  if (!s) return 'Calendário definido pela Nexmarket.';
  const when =
    s.cadence === 'daily'
      ? 'Todo dia útil'
      : s.cadence === 'monthly'
        ? `Todo dia ${s.monthDay ?? 5}`
        : s.cadence === 'biweekly'
          ? `A cada 15 dias (${WEEKDAYS[s.weekday ?? 5]})`
          : `Toda ${WEEKDAYS[s.weekday ?? 5]}`;
  const hold = (s.holdDays ?? 0) > 0 ? ` · liberado em D+${s.holdDays}` : '';
  const min = (s.minimumAmount ?? 0) > 0 ? ` · mínimo R$ ${Number(s.minimumAmount).toFixed(2)}` : '';
  return `${when}${hold}${min}`;
}
