> 📘 **[MANUAL.md](./MANUAL.md)** — como rodar, buildar e publicar o painel da loja (integração de pagamentos Stripe incluída).

# Nexmarket · Painel da Loja

Painel web onde o supermercado gerencia a operação na Nexmarket: catálogo de
produtos, estoque, preços e promoções, recebimento e acompanhamento de
pedidos, horário de funcionamento e a conta que recebe os repasses.

## Rodar localmente

**Pré-requisitos:** Node.js

```bash
npm install
npm run dev
```

O painel sobe em `http://localhost:3000` e fala direto com o Firestore — as
chaves públicas do Firebase já estão no repositório, que é como o Firebase
funciona; o que protege os dados são as Security Rules.

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

---

## 🌐 Publicar na web (Render)

O painel é um site estático — o Vite gera `dist/` e o Render serve. O
`render.yaml` na raiz já descreve tudo:

1. No Render: **New → Blueprint** apontando para este repositório.
2. Escolha a branch onde está o `render.yaml`
   (`claude/flutter-client-delivery-apps-m8lmbw`, ou `main` depois do merge).

Não há variável de ambiente a preencher: a loja fala direto com o Firestore, e
as chaves públicas do Firebase já vivem no repositório — é assim que o
Firebase funciona. O que protege os dados são as **Security Rules**, não o
segredo da chave.

O Blueprint já configura o *rewrite* de SPA (um F5 em `/pedidos` não dá 404) e
`Cache-Control` longo para `/assets/*`, que carregam hash no nome.

---

## 📍 Marcar a loja no mapa

Em **Configurações da loja → Endereço da Loja**, duas formas de definir as
coordenadas:

- **Buscar pelo endereço** — geocodificação pelo Nominatim (OpenStreetMap).
  Funciona de qualquer lugar. Roda automaticamente ao salvar, se ainda não
  houver ponto.
- **Estou na loja agora (GPS)** — exato, mas grava **onde quem clica está**.
  O rótulo diz isso de propósito: o botão anterior ("Definir localização
  atual") levava o pino da loja para a casa de quem configurava de casa.

Isso alimenta dois lugares:

1. `settings/storeInfo.storeLocation` → o **app do entregador** usa para o
   mapa da coleta e para os botões de Waze/Google Maps;
2. o mesmo campo → o **app do cliente** usa para mostrar a distância e
   ordenar mercados por proximidade. Loja sem ponto fica sem distância e cai
   para o fim da lista.

Falhar a busca não impede salvar — o endereço escrito continua valendo, só
fica sem o ponto.
