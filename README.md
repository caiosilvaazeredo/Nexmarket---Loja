> 📘 **[MANUAL.md](./MANUAL.md)** — como rodar, buildar e publicar o painel da loja (integração de pagamentos Stripe incluída).

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2ab80fc8-bdc4-40c4-9282-35669db98074

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## 💰 Onde a loja recebe

Em **Configurações da loja → Onde você recebe** a loja cadastra a conta que
recebe o repasse das vendas: **PIX** (com tipo de chave validado: CPF, CNPJ,
e-mail, celular ou aleatória) ou **conta bancária** (banco, agência, conta,
corrente/poupança), sempre com titular e CPF/CNPJ validados.

Esses dados ficam em `supermarkets/{id}/settings/payout` — um documento
**separado** do `settings/storeInfo`, que é público para o app do cliente.
Dados bancários nunca trafegam junto com horário de funcionamento e formas de
pagamento da vitrine.

O **calendário** (de quanto em quanto tempo o dinheiro cai) é definido pela
Nexmarket no app da Empresa e apenas exibido aqui, lido de
`platformConfig/public.storePayout`.
