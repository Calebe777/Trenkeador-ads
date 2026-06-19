# Instruções para o agente de frontend (LeadTrack CRM)

Você vai construir/atualizar o **frontend** de um CRM com rastreamento de leads. O **backend já existe, está no ar e é a fonte de verdade**. NÃO altere o backend — apenas consuma a API REST abaixo. Stack alvo do front: **React + TypeScript + TailwindCSS + Recharts** (Vite).

## Configuração base

- **API base:** `https://api.criatividads.com.br`
- **Contrato OpenAPI (use para gerar tipos TS):** `https://api.criatividads.com.br/openapi.json`
- Coloque a base num env: `VITE_API_BASE=https://api.criatividads.com.br`.
- Todas as rotas (exceto `/r/...`, webhooks e `/ws`) exigem header `Authorization: Bearer <token>`.
- CORS já liberado para qualquer origem; não há restrição.

## Autenticação (ATENÇÃO a um detalhe)

- **Registro:** `POST /auth/register` (JSON) `{ nome_conta, slug, nome, email, senha }`.
- **Login:** `POST /auth/login` — **`application/x-www-form-urlencoded`** (padrão OAuth2), campos `username` (= o **email**) e `password`. Retorna `{ access_token, token_type }`. NÃO é JSON.
- Guarde o JWT (localStorage). Injete `Authorization: Bearer` num interceptor. Deslogue em 401.
- `GET /auth/me` valida e retorna o usuário `{ id, conta_id, nome, email, papel }`.
- Sistema é multi-tenant: o backend isola por conta a partir do token; o front nunca envia `conta_id`.

## Gotchas (não ignore)

1. Login é **form-urlencoded**, não JSON.
2. IDs são UUID (string). Datas em ISO 8601 (UTC).
3. Erros de negócio voltam como **4xx com `{ detail }`** (use o `detail` na UI). Evite assumir 5xx.
4. `codigo_curto` (link), `phone_number_id` (canal) e nomes de tag são **únicos por conta** — duplicado retorna 409.

---

## Endpoints e telas a construir

### 1. Auth → tela de Login/Registro
Conforme acima.

### 2. Dashboard (com gráficos Recharts)
- `GET /analytics/resumo?dias=30` → `{ cliques, leads, qualificados, vendas, faturamento, gasto, cpl, roas, taxa_qualificacao, taxa_fechamento, ticket_medio }`
- `GET /analytics/funil` → `{ novo, em_atendimento, qualificado, negociacao, ganho, perdido }`
- `GET /analytics/dispositivos` → `{ device:{mobile,desktop,tablet}, os:{...}, navegador:{...} }`
- `GET /analytics/localizacao` → `{ estados:{...}, cidades:{...} }`
- `GET /analytics/por-criativo` → `[{ criativo, cliques, leads, vendas, valor }]`

Construir: cards de métricas; gráfico de **funil**; **pizza/barras** de dispositivos, SO e navegador; **barras** de estados/cidades; **tabela "Performance por criativo"** (cliques→leads→vendas→faturamento, ordenada por faturamento). Filtro de período (`dias`).

### 3. Links rastreáveis
- `GET /links` → lista. `POST /links` → `{ codigo_curto, destino_numero, mensagem_prefill?, utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term? }`.
- A URL pública do link é `${API_BASE}/r/${codigo_curto}`. Mostrar com botão "copiar" e a contagem de `cliques`. Tratar 409 (código duplicado) com mensagem amigável.

### 4. Leads (lista + detalhe rico)
- `GET /leads` → `[{ id, nome, telefone, cidade, estado, atendente_id, criado_em }]`.
- `GET /leads/{id}` → `{ lead, origem, tags[], anotacoes[] }`. A **origem** traz o rastreamento completo:
  ```
  origem: {
    utm_campaign, utm_content (criativo/vídeo), fbclid, ad_id, plataforma,
    device_tipo (mobile|desktop|tablet), os (Android|iOS|Windows|macOS|Linux),
    navegador (inclui "Instagram (in-app)" / "Facebook (in-app)"),
    dispositivo (marca, ex: Samsung/iPhone), idioma,
    pais, estado_ip, cidade_ip, landing_url, referrer, criado_em
  }
  ```
- `PATCH /leads/{id}` → `{ nome?, telefone?, email?, cidade?, estado?, atendente_id? }` (editar / reatribuir).

Construir: lista com busca/filtro; painel de detalhe com bloco **"Origem do clique"** mostrando ícones de dispositivo/SO/navegador, localização (país/estado/cidade) e o criativo; seletor de atendente; tags e anotações (abaixo).

### 5. Pipeline (Kanban)
- `GET /negocios` → `[{ id, lead_id, etapa, status, valor }]`.
- `POST /negocios` → `{ lead_id, etapa?, valor? }`.
- `PATCH /negocios/{id}` → `{ etapa?, status?, valor? }`.
  - `etapa` ∈ novo, em_atendimento, qualificado, negociacao, ganho, perdido.
  - `status` ∈ aberto, ganho, perdido.
  - Mudar `etapa` para **qualificado** dispara evento Meta `LeadQualificado`; **negociacao** dispara `InitiateCheckout`; `status="ganho"` dispara `Purchase` (com `valor`). Tudo automático no backend.

Construir: Kanban com **drag-and-drop** entre colunas (cada drop = `PATCH /negocios/{id}` com a nova `etapa`); ao marcar "ganho", pedir o valor.

### 6. Inbox (estilo WhatsApp Web) + TEMPO REAL
- `GET /conversas` → `[{ id, lead_id, lead_nome, lead_telefone, status_atendimento, atendente_id, ultima_mensagem_em, janela_24h_expira_em }]`.
- `GET /conversas/{id}/mensagens` → `[{ id, direcao(entrada|saida), tipo, conteudo, criado_em }]`.
- `POST /conversas/{id}/responder` → `{ texto }`. Se a janela de 24h expirou, retorna 400 (use template).
- `POST /conversas/{id}/template` → `{ template_name, lang }` (reabrir conversa fora das 24h).
- **WebSocket:** conecte em `wss://api.criatividads.com.br/ws?token=<JWT>`. Recebe `{ type:"mensagem", conversa_id?, direcao }`. Ao receber, recarregue a lista de conversas e, se a conversa aberta for a do evento, recarregue as mensagens. Reconecte se cair.

Construir: layout chat (lista à esquerda, mensagens à direita, balões entrada/saída), caixa de resposta; **atualização em tempo real via WebSocket**; mostrar a origem do lead ao lado; quando `janela_24h_expira_em < agora`, bloquear texto livre e oferecer envio de template.

### 7. Respostas rápidas (na Inbox)
- `GET /respostas-rapidas`, `POST /respostas-rapidas` → `{ atalho, texto }`.
- Construir: digitar `/atalho` na caixa insere o texto correspondente.

### 8. WhatsApp — canais
- `GET /whatsapp/canais` → lista. `POST /whatsapp/canais` → `{ nome, phone_number_id, access_token, waba_id?, numero_exibicao?, verify_token? }`.
- `PATCH /whatsapp/canais/{id}` → atualizar (ex.: só `{ access_token }` para renovar o token).
- Construir: tela de canais; formulário de registro; **botão "atualizar token"**; exibir a Callback URL `${API_BASE}/webhooks/whatsapp` e instruções da Meta.

### 9. Equipe (multi-atendente)
- `GET /usuarios` → atendentes. `POST /usuarios` (admin/gestor) → `{ nome, email, senha, papel }`.
- Leads novos do WhatsApp já são distribuídos automaticamente (round-robin). Construir: tela de equipe; filtro "meus leads" usando `atendente_id`.

### 10. Tags, anotações e follow-ups
- Tags: `GET /tags`, `POST /tags {nome, cor}`, `POST /leads/{id}/tags/{tag_id}`, `DELETE /leads/{id}/tags/{tag_id}`.
- Anotações: `POST /leads/{id}/anotacoes {texto}` (também vêm em `GET /leads/{id}`).
- Follow-ups: `GET /followups` (pendentes), `POST /leads/{id}/followups {quando, nota}`, `PATCH /followups/{id}/feito`.
- Construir: chips de tags coloridas; campo de anotações no lead; lista/agenda de follow-ups (destacar vencidos).

---

## Prioridade sugerida de implementação
1. Login → Dashboard → Inbox (com WebSocket) → Pipeline (drag-and-drop). É o uso diário.
2. Leads (detalhe com origem/dispositivo) → WhatsApp (canais + atualizar token).
3. Tags/anotações/follow-ups → Equipe → Respostas rápidas → Templates.

## Deploy
O front (build estático Vite) será servido em `https://painel.criatividads.com.br` (mesmo padrão da API). Garanta que a `VITE_API_BASE` aponte para `https://api.criatividads.com.br` no build de produção.