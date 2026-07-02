# 📘 Manual — Nexmarket Loja (painel do lojista · web)

Painel web do supermercado/loja: catálogo e gôndolas, estoque, promoções, construtor
de vitrine, **fila de pedidos com separação** (integrada ao status de pagamento
Stripe), configuração de entrega e formas de pagamento, e acompanhamento de entregas.

## 🧩 Integração com os outros sistemas

Os 4 apps usam o **mesmo projeto Firebase** (config em `firebase-applet-config.json`):

- Pedidos chegam do app **Cliente** em tempo real na fila de separação.
- Pedidos **online (PIX/cartão)** só liberam a separação **depois de pagos** — o chip
  de pagamento no card do pedido mostra *Pago online*, *Aguardando pagamento*,
  *Estornado* ou o método na entrega.
- Pedidos prontos entram no pool do app **Entregador**.
- O painel **Empresa** modera a loja, concilia comissões e executa estornos reais
  via servidor de pagamentos (Stripe).

## ▶️ Rodar localmente

Requisitos: **Node.js 18+** e npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

Login com e-mail/senha ou Google (conta do lojista dono do supermercado).

## 🏗️ Build (renderizar para produção)

```bash
npm run build        # gera dist/ (site estático)
npm run preview      # pré-visualiza o build
npm run lint         # checagem de tipos (tsc)
```

## 🚀 Publicar

**Firebase Hosting** (recomendado — mesmo projeto da plataforma):
```bash
npm i -g firebase-tools
firebase login
firebase init hosting     # public: dist · SPA: yes
npm run build
firebase deploy --only hosting
```

**Vercel/Netlify:** build command `npm run build`, output `dist`.

### Regras do Firestore

O arquivo `firestore.rules` deste repositório espelha o canônico (repo
`nexmarket--Empresa`). Ao alterar, publique a partir do projeto:
```bash
firebase deploy --only firestore:rules
```

## 💳 Pagamentos (Stripe) — o papel da loja

A loja **não precisa de chave Stripe**: as cobranças online acontecem no app do
cliente através do servidor de pagamentos da plataforma (repo `nexmarket--Empresa`,
pasta `server/`).

O que a loja controla:

1. **Formas de pagamento aceitas** — Configurações da loja → *Pagamento*:
   PIX, cartão online (via Stripe no app), cartão/dinheiro/vale na entrega.
2. **Gate de separação** — pedidos PIX/cartão online aparecem como
   *“Aguardando pagamento do cliente”* e só liberam o botão **Iniciar Separação**
   após a confirmação (webhook/verificação do app).
3. **Estornos** — executados pelo painel Empresa (estorno real na Stripe); o status
   *Estornado* aparece no card do pedido.

## ✨ Novidades operacionais (ver ROADMAP.md no repo Empresa)

- **Campainha de pedido novo** 🔔: som + destaque pulsante no card + timer
  "aguardando há X min" (fica vermelho após 5 min).
- **Kanban de pedidos**: alternância *Fila | Kanban* na tela de pedidos — arraste
  os cards entre **Novos → Em separação → Prontos** (a coluna *Em entrega* é do
  entregador). O gate de pagamento vale também no arraste.
- **Frete dinâmico (surge)**: com 5+ pedidos na fila o multiplicador sobe para
  1,5× (10+ → 2×) automaticamente e o app do cliente avisa "alta demanda ⚡".
- **Push transacional**: com `VITE_PAYMENTS_API_URL` no `.env`, o cliente recebe
  push quando o pedido entra em separação e quando fica pronto.

## 🆘 Problemas comuns

| Sintoma | Correção |
|---|---|
| Pedido online sempre "Aguardando pagamento" | cliente não concluiu o pagamento; confira o webhook do servidor de pagamentos |
| Alterações de regras negadas (permission denied) | publique o `firestore.rules` mais recente |
| Cliente não vê a opção de cartão online | habilite "Cartão de Crédito Online (App)" nas configurações da loja |
