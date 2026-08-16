/**
 * Endereço do servidor compartilhado (repo nexmarket--Empresa, pasta server/),
 * que atende autenticação, pagamentos e push.
 *
 * Por que isto existe em vez de uma constante solta: as variáveis `VITE_*` são
 * lidas em tempo de BUILD e ficam gravadas dentro do JavaScript publicado. Se
 * faltarem na hora de compilar, ajustá-las depois no painel de hospedagem não
 * conserta nada — o valor errado já foi para o ar. E o sintoma
 * (ERR_CONNECTION_REFUSED em localhost:8787) parece falha de rede, mandando
 * quem investiga para o lado errado.
 *
 * Por isso o padrão não é fixo: depende de onde a página está rodando.
 * Publicado, aponta para o servidor de produção mesmo sem variável nenhuma
 * configurada; em desenvolvimento, para o servidor local. A variável continua
 * valendo como override, e é ela quem manda quando o endereço mudar.
 *
 * Não é segredo: é o mesmo endereço público que os quatro apps chamam.
 */

const PRODUCAO = 'https://nexmarket-payments-60k3.onrender.com';
const LOCAL = 'http://localhost:8787';

function rodandoLocal(): boolean {
  if (typeof location === 'undefined') return true;
  return ['localhost', '127.0.0.1', ''].includes(location.hostname);
}

/** URL base do servidor, sem barra no fim. */
export function apiBaseUrl(): string {
  const env = (import.meta as any).env || {};
  const configurada = String(env.VITE_AUTH_API_URL || env.VITE_PAYMENTS_API_URL || '').trim();
  const base = configurada || (rodandoLocal() ? LOCAL : PRODUCAO);
  return base.replace(/\/$/, '');
}
