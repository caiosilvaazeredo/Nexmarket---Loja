/**
 * Client mínimo do servidor de pagamentos da plataforma (repo
 * nexmarket--Empresa, pasta server/). A loja usa o relay de push
 * transacional e o cadastro de recebedor Pagar.me (KYC + conta bancária) —
 * cobranças e estornos em si acontecem no app do cliente e no painel
 * Empresa.
 */
import { auth } from './firebase';

export function paymentsApiUrl(): string {
  const env = (import.meta as any).env || {};
  return String(env.VITE_PAYMENTS_API_URL || '').trim().replace(/\/$/, '');
}

export function paymentsConfigured(): boolean {
  return paymentsApiUrl().length > 0;
}

/**
 * Push transacional para o cliente (o token Expo viaja no documento do
 * pedido). Fire-and-forget: nunca bloqueia o fluxo da loja.
 */
export async function sendPush(to: string | null | undefined, title: string, body: string): Promise<void> {
  const base = paymentsApiUrl();
  if (!to || !base) return;
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch(`${base}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, title, body }),
    });
  } catch {
    // silencioso — push é melhoria, não requisito
  }
}

/* ------------------------- Recebedor Pagar.me da loja ------------------------- */

export interface RecipientStatus {
  configured: boolean;
  recipientId?: string;
  status?: string;
}

/** Situação do cadastro de recebedor Pagar.me da loja (split das vendas). */
export async function getRecipientStatus(smId: string): Promise<RecipientStatus> {
  const base = paymentsApiUrl();
  if (!base) return { configured: false };
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return { configured: false };
    const res = await fetch(`${base}/api/recipients/store/status?smId=${encodeURIComponent(smId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { configured: false };
    return await res.json();
  } catch {
    return { configured: false };
  }
}

export interface RecipientBankInput {
  holderName: string;
  holderDocument?: string;
  /** Código do banco (3 dígitos, ex: 260 = Nubank, 341 = Itaú). */
  bank: string;
  branchNumber: string;
  branchCheckDigit?: string;
  accountNumber: string;
  accountCheckDigit: string;
  accountType: 'checking' | 'savings';
}

export interface RecipientInput {
  smId: string;
  type: 'individual' | 'corporation';
  document: string; // CPF ou CNPJ, só dígitos
  email: string;
  name: string; // razão social (corporation) ou nome do titular (individual)
  tradingName?: string;
  annualRevenue?: number;
  birthdate?: string; // AAAA-MM-DD (individual)
  monthlyIncome?: number;
  occupation?: string;
  bank: RecipientBankInput;
}

/** Cadastra (ou recadastra) o recebedor Pagar.me da loja — entra no split automático das vendas. */
export async function registerRecipient(input: RecipientInput): Promise<{ ok: boolean; recipientId: string; status: string }> {
  const base = paymentsApiUrl();
  if (!base) throw new Error('Servidor de pagamentos não configurado.');
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('É necessário estar logado.');
  const res = await fetch(`${base}/api/recipients/store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Servidor de pagamentos respondeu ${res.status}.`);
  return body;
}
