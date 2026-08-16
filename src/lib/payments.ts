/**
 * Client mínimo do servidor de pagamentos da plataforma (repo
 * nexmarket--Empresa, pasta server/). A loja usa apenas o relay de push
 * transacional — cobranças e estornos acontecem no app do cliente e no
 * painel Empresa.
 */
import { auth } from './firebase';
import { apiBaseUrl } from './apiBase';

export function paymentsApiUrl(): string {
  // Mesma origem da autenticação: era uma string vazia por padrão, o que
  // desligava o push transacional silenciosamente em produção.
  return apiBaseUrl();
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
