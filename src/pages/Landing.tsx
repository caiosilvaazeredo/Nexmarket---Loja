import { Link } from 'react-router-dom';
import {
  Store,
  ShoppingBasket,
  Bike,
  ShieldCheck,
  Smartphone,
  MapPin,
  Clock,
  CreditCard,
  BarChart3,
  MessageCircle,
  Wallet,
  ArrowRight,
  Star,
  CheckCircle2,
  Zap,
  LayoutGrid,
  Headphones,
  FileText,
} from 'lucide-react';

/* =============================================================================
 * Landing page pública da plataforma Nexmarket — antecede a tela de login.
 * Vende o ecossistema completo: Cliente · Loja · Entregador · Empresa.
 * Mesma identidade visual “Duolingo” dos apps (verde #58CC02, botões 3D,
 * tipografia pesada, cantos arredondados).
 * ========================================================================== */

const GREEN = '#58CC02';
const GREEN_DARK = '#4ba802';

function CTAButton({ to, children, variant = 'primary', className = '' }: {
  to: string;
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'dark';
  className?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-black rounded-2xl px-6 py-3.5 text-base transition-all active:translate-y-[2px] active:shadow-none';
  const styles = {
    primary: `bg-[${GREEN}] text-white shadow-[0_4px_0_#4ba802] hover:brightness-105`,
    outline:
      'bg-white text-slate-700 border-2 border-slate-200 shadow-[0_4px_0_#e2e8f0] hover:border-slate-300',
    dark: 'bg-slate-900 text-white shadow-[0_4px_0_#0f172a] hover:bg-slate-800',
  } as const;
  return (
    <Link to={to} className={`${base} ${styles[variant]} ${className}`} style={variant === 'primary' ? { backgroundColor: GREEN, boxShadow: '0 4px 0 ' + GREEN_DARK } : undefined}>
      {children}
    </Link>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-green-100 text-[#3f8f01] font-black text-xs uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
      {children}
    </span>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="font-black text-slate-800">{title}</p>
        <p className="text-slate-500 font-medium text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* ------------------------------- Navbar ------------------------------- */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b-2 border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#topo" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl rotate-12 flex items-center justify-center" style={{ backgroundColor: GREEN }}>
              <Store className="w-5 h-5 text-white -rotate-12" strokeWidth={3} />
            </div>
            <span className="text-xl font-black tracking-tight">Nexmarket</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-500">
            <a href="#cliente" className="hover:text-slate-800 transition-colors">Para você</a>
            <a href="#loja" className="hover:text-slate-800 transition-colors">Para sua loja</a>
            <a href="#entregador" className="hover:text-slate-800 transition-colors">Para entregar</a>
            <a href="#empresa" className="hover:text-slate-800 transition-colors">Plataforma</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="font-black text-sm text-slate-600 hover:text-slate-900 transition-colors px-2">
              Entrar
            </Link>
            <CTAButton to="/login" className="!px-4 !py-2 !text-sm">Começar grátis</CTAButton>
          </div>
        </div>
      </header>

      {/* -------------------------------- Hero -------------------------------- */}
      <section id="topo" className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-green-100/70 blur-3xl" />
          <div className="absolute top-40 -left-32 w-80 h-80 rounded-full bg-green-50 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <SectionTag>Supermercado · delivery · gestão — em um só lugar</SectionTag>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] max-w-3xl mx-auto">
            O mercado do seu bairro,{' '}
            <span style={{ color: GREEN }}>na velocidade de um app.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto">
            A Nexmarket conecta quem compra, quem vende e quem entrega em uma única
            plataforma — do carrinho à porta de casa, com pagamento online, rastreio
            em tempo real e gestão completa para o lojista.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <CTAButton to="/login">
              Cadastre sua loja grátis <ArrowRight className="w-5 h-5" strokeWidth={3} />
            </CTAButton>
            <CTAButton to="/login" variant="outline">Já tenho conta</CTAButton>
          </div>

          {/* Prova social / números */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { n: '4 apps', l: 'um só ecossistema' },
              { n: '30 min', l: 'da prateleira à porta' },
              { n: 'PIX + cartão', l: 'pagamento integrado' },
              { n: '100%', l: 'rastreável em tempo real' },
            ].map((s) => (
              <div key={s.l} className="bg-white border-2 border-slate-100 rounded-2xl px-4 py-5 shadow-sm">
                <p className="text-2xl font-black" style={{ color: GREEN }}>{s.n}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------- Como funciona --------------------------- */}
      <section className="bg-slate-50 border-y-2 border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <SectionTag>Como funciona</SectionTag>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Um pedido, quatro pontas, zero fricção
            </h2>
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { icon: <ShoppingBasket className="w-6 h-6 text-white" strokeWidth={2.5} />, t: '1. Cliente pede', d: 'Escolhe o mercado, monta o carrinho e paga pelo app — PIX, cartão ou na entrega.' },
              { icon: <Store className="w-6 h-6 text-white" strokeWidth={2.5} />, t: '2. Loja separa', d: 'O painel avisa na hora. A equipe separa os itens guiada pelo mapa de gôndolas.' },
              { icon: <Bike className="w-6 h-6 text-white" strokeWidth={2.5} />, t: '3. Entregador leva', d: 'Oferta aceita em segundos, navegação integrada e comprovante digital na entrega.' },
              { icon: <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2.5} />, t: '4. Empresa cuida', d: 'Suporte, pagamentos, repasses e antifraude rodando nos bastidores, 24/7.' },
            ].map((s, i) => (
              <div key={s.t} className="relative bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: GREEN, transform: `rotate(${i % 2 ? -6 : 6}deg)` }}>
                  {s.icon}
                </div>
                <p className="font-black text-lg mb-1">{s.t}</p>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------- Cliente ------------------------------ */}
      <section id="cliente" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <SectionTag>Para quem compra</SectionTag>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
              As compras do mês sem sair do sofá
            </h2>
            <p className="text-slate-500 font-medium text-lg mb-8">
              Compare preços entre mercados, aproveite cupons e acompanhe o entregador
              no mapa — como nos grandes apps de delivery, só que feito para supermercado.
            </p>
            <div className="space-y-5">
              <Feature icon={<Smartphone className="w-5 h-5 text-[#3f8f01]" strokeWidth={2.5} />} title="Busca multi-loja" text='“Em qual mercado tem leite mais barato?” — o app responde e já monta o carrinho.' />
              <Feature icon={<MapPin className="w-5 h-5 text-[#3f8f01]" strokeWidth={2.5} />} title="Rastreio em tempo real" text="Veja o pedido ser separado, coletado e chegar até você, minuto a minuto, no mapa." />
              <Feature icon={<CreditCard className="w-5 h-5 text-[#3f8f01]" strokeWidth={2.5} />} title="Pague como preferir" text="PIX, cartão salvo em 1 toque, carteiras digitais ou dinheiro na entrega — com cashback." />
            </div>
          </div>
          <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 sm:p-10">
            <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm p-6 max-w-sm mx-auto">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl rotate-6 flex items-center justify-center" style={{ backgroundColor: GREEN }}>
                  <ShoppingBasket className="w-6 h-6 text-white -rotate-6" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-black">Seu pedido</p>
                  <p className="text-xs font-bold text-slate-400">Mercado São Jorge · hoje</p>
                </div>
                <span className="ml-auto text-xs font-black text-white px-3 py-1 rounded-full" style={{ backgroundColor: GREEN }}>a caminho</span>
              </div>
              <div className="space-y-3">
                {[
                  { l: 'Pedido confirmado', done: true },
                  { l: 'Separado pela loja', done: true },
                  { l: 'Saiu para entrega', done: true },
                  { l: 'Chegou! 🎉', done: false },
                ].map((s) => (
                  <div key={s.l} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5" style={{ color: s.done ? GREEN : '#cbd5e1' }} strokeWidth={2.5} />
                    <p className={`font-bold text-sm ${s.done ? 'text-slate-700' : 'text-slate-300'}`}>{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t-2 border-slate-100 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400">Entrega prevista</p>
                <p className="font-black" style={{ color: GREEN }}>~ 12 min</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------- Loja -------------------------------- */}
      <section id="loja" className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="order-2 lg:order-1 bg-slate-800/60 border-2 border-slate-700 rounded-3xl p-8">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <LayoutGrid className="w-5 h-5" style={{ color: GREEN }} strokeWidth={2.5} />, n: 'Mapa de gôndolas', d: 'Catálogo organizado como a loja física' },
                  { icon: <BarChart3 className="w-5 h-5" style={{ color: GREEN }} strokeWidth={2.5} />, n: 'Vendas em tempo real', d: 'Faturamento, ticket médio e promoções' },
                  { icon: <Zap className="w-5 h-5" style={{ color: GREEN }} strokeWidth={2.5} />, n: 'Pedidos ao vivo', d: 'Fila de separação com alerta sonoro' },
                  { icon: <CreditCard className="w-5 h-5" style={{ color: GREEN }} strokeWidth={2.5} />, n: 'Recebimento online', d: 'PIX e cartão com split automático' },
                ].map((f) => (
                  <div key={f.n} className="bg-slate-900/80 border-2 border-slate-700 rounded-2xl p-4">
                    <div className="mb-2">{f.icon}</div>
                    <p className="font-black text-sm">{f.n}</p>
                    <p className="text-slate-400 text-xs font-medium mt-1">{f.d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <SectionTag>Para o lojista</SectionTag>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
                Seu mercado online em minutos, não em meses
              </h2>
              <p className="text-slate-300 font-medium text-lg mb-8">
                Cadastre a loja, monte as gôndolas digitais e comece a vender com
                delivery próprio — sem taxa de adesão, sem servidor, sem TI.
                Uma vitrine pública pronta para compartilhar no WhatsApp.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Painel completo: produtos, promoções, cupons e equipe',
                  'Vitrine pública com link próprio (sua loja no ar em 1 clique)',
                  'Entregadores da rede Nexmarket — sem contratar frota',
                  'Relatórios de vendas e repasses transparentes',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 font-bold">
                    <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: GREEN }} strokeWidth={2.5} />
                    {t}
                  </li>
                ))}
              </ul>
              <CTAButton to="/login">
                Cadastrar minha loja <ArrowRight className="w-5 h-5" strokeWidth={3} />
              </CTAButton>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------- Entregador ----------------------------- */}
      <section id="entregador" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <SectionTag>Para quem entrega</SectionTag>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
              Fique online, aceite e fature
            </h2>
            <p className="text-slate-500 font-medium text-lg mb-8">
              Estilo Uber Driver: um botão para ficar online, ofertas com valor e
              distância na tela, e carteira com saque quando você quiser.
            </p>
            <div className="space-y-5">
              <Feature icon={<Zap className="w-5 h-5 text-[#3f8f01]" strokeWidth={2.5} />} title="Ofertas em 30 segundos" text="Veja ganho, distância até a loja e até o cliente antes de aceitar — sem surpresa." />
              <Feature icon={<MapPin className="w-5 h-5 text-[#3f8f01]" strokeWidth={2.5} />} title="Navegação integrada" text="Google Maps ou Waze a um toque, com rastreamento só enquanto você está em corrida." />
              <Feature icon={<Wallet className="w-5 h-5 text-[#3f8f01]" strokeWidth={2.5} />} title="Carteira transparente" text="Ganhos por dia, semana e mês + gorjetas 100% suas. Saque direto pelo app." />
            </div>
          </div>
          <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 sm:p-10">
            <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm p-6 max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-5">
                <p className="font-black">Nova oferta 📭</p>
                <span className="text-xs font-black text-white px-3 py-1 rounded-full bg-amber-500">0:27</span>
              </div>
              <div className="text-center py-4">
                <p className="text-4xl font-black" style={{ color: GREEN }}>R$ 14,50</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">ganho estimado</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center mb-5">
                <div className="bg-slate-50 rounded-2xl py-3">
                  <p className="font-black">1,2 km</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">até a loja</p>
                </div>
                <div className="bg-slate-50 rounded-2xl py-3">
                  <p className="font-black">3,8 km</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">até o cliente</p>
                </div>
              </div>
              <div className="rounded-2xl text-center py-3.5 font-black text-white" style={{ backgroundColor: GREEN, boxShadow: '0 4px 0 ' + GREEN_DARK }}>
                Aceitar corrida
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------- Empresa ------------------------------ */}
      <section id="empresa" className="bg-slate-50 border-y-2 border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <SectionTag>A plataforma por trás de tudo</SectionTag>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 max-w-2xl mx-auto">
            Uma operação inteira cuidando de cada pedido
          </h2>
          <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto mb-12">
            Enquanto você compra, vende ou entrega, o backoffice Nexmarket valida
            entregadores, monitora tudo em um mapa ao vivo, resolve tickets e
            garante que cada centavo chegue à pessoa certa.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {[
              { icon: <ShieldCheck className="w-6 h-6 text-[#3f8f01]" strokeWidth={2.5} />, t: 'Validação e antifraude', d: 'Documentos verificados, blacklist e auditoria imutável de cada ação.' },
              { icon: <Headphones className="w-6 h-6 text-[#3f8f01]" strokeWidth={2.5} />, t: 'Suporte em tempo real', d: 'Chat direto com cliente, loja e entregador + estorno em 2 cliques.' },
              { icon: <MapPin className="w-6 h-6 text-[#3f8f01]" strokeWidth={2.5} />, t: 'Mapa ao vivo', d: 'Todos os pedidos e entregadores da cidade em uma única tela.' },
              { icon: <FileText className="w-6 h-6 text-[#3f8f01]" strokeWidth={2.5} />, t: 'Financeiro completo', d: 'Split automático, repasses, conciliação e informe de rendimentos.' },
            ].map((f) => (
              <div key={f.t} className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm">
                <div className="w-11 h-11 rounded-2xl bg-green-100 flex items-center justify-center mb-4">{f.icon}</div>
                <p className="font-black mb-1">{f.t}</p>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------- Depoimentos ---------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { q: 'Coloquei meu mercado no ar em uma tarde. No primeiro fim de semana já saíram 40 pedidos.', a: 'Dona de mercado de bairro' },
            { q: 'A oferta mostra quanto vou ganhar antes de aceitar. Isso muda tudo pra quem vive de entrega.', a: 'Entregador parceiro' },
            { q: 'Comprar no mercado da esquina pelo app, com rastreio? Virou rotina aqui em casa.', a: 'Cliente Nexmarket' },
          ].map((t) => (
            <div key={t.a} className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="font-bold text-slate-700 leading-relaxed mb-3">“{t.q}”</p>
              <p className="text-sm font-black text-slate-400">— {t.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------ CTA final ----------------------------- */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-6xl mx-auto rounded-3xl px-6 py-14 sm:py-16 text-center relative overflow-hidden" style={{ backgroundColor: GREEN }}>
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/10" aria-hidden />
          <div className="absolute -bottom-14 -right-8 w-56 h-56 rounded-full bg-white/10" aria-hidden />
          <h2 className="relative text-3xl sm:text-4xl font-black tracking-tight text-white max-w-2xl mx-auto">
            Pronto para colocar seu mercado no mapa?
          </h2>
          <p className="relative text-green-50 font-medium text-lg mt-3 mb-8">
            Crie sua conta grátis e faça sua primeira venda hoje.
          </p>
          <Link
            to="/login"
            className="relative inline-flex items-center gap-2 bg-white font-black rounded-2xl px-8 py-4 text-lg shadow-[0_4px_0_rgba(0,0,0,0.15)] active:translate-y-[2px] active:shadow-none transition-all"
            style={{ color: GREEN_DARK }}
          >
            Começar agora <ArrowRight className="w-5 h-5" strokeWidth={3} />
          </Link>
        </div>
      </section>

      {/* -------------------------------- Footer ------------------------------ */}
      <footer className="border-t-2 border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl rotate-12 flex items-center justify-center" style={{ backgroundColor: GREEN }}>
              <Store className="w-4 h-4 text-white -rotate-12" strokeWidth={3} />
            </div>
            <span className="font-black">Nexmarket</span>
            <span className="text-slate-400 font-medium text-sm">· Plataforma integrada de delivery</span>
          </div>
          <div className="flex items-center gap-5 text-sm font-bold text-slate-400">
            <Link to="/login" className="hover:text-slate-600 transition-colors">Entrar</Link>
            <a href="#cliente" className="hover:text-slate-600 transition-colors">Cliente</a>
            <a href="#loja" className="hover:text-slate-600 transition-colors">Loja</a>
            <a href="#entregador" className="hover:text-slate-600 transition-colors">Entregador</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
