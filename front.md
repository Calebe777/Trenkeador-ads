# LeadTrack CRM — Handoff Técnico

Documento de transferência para continuar o desenvolvimento, com foco na reconstrução do **frontend**. O **backend está pronto, no ar e funcional** — o novo frontend deve consumir a API REST existente.

> **Fonte de verdade da API:** o contrato completo (OpenAPI 3.1) está disponível ao vivo em
> `https://api.criatividads.com.br/openapi.json` e a documentação interativa em
> `https://api.criatividads.com.br/docs`. Sempre que houver dúvida sobre um endpoint, puxe daí.

---

## 1. O que é o produto

LeadTrack CRM une **rastreamento de origem de leads** (de qual anúncio/vídeo/campanha o lead veio) a um **CRM de atendimento no WhatsApp oficial**, e fecha o ciclo devolvendo as vendas ao Meta via **Conversions API (CAPI)** para o tráfego otimizar sozinho.

Fluxo central: `Anúncio → link rastreável → clique (grava UTM/fbclid) → WhatsApp → conversa no CRM → venda → CAPI devolve "Purchase" ao Meta`.

O sistema é **multi-tenant**: cada cliente/agência é uma "conta" (`conta_id`), e todo dado é isolado por conta.

---

## 2. Estado atual (resumo)

| Camada | Estado |
|---|---|
| Banco PostgreSQL 16 + Redis 7 (Docker) | ✅ No ar |
| Backend FastAPI (Python 3.12, async) | ✅ No ar, rodando 24/7 via systemd |
| Domínio + HTTPS (`api.criatividads.com.br`) | ✅ nginx + Let's Encrypt (atrás de Cloudflare) |
| Auth multi-tenant (JWT) | ✅ Funcional |
| Tracking (links + captura UTM/fbclid/IP) | ✅ Funcional, testado |
| CRM (leads, pipeline, negócios) | ✅ Funcional |
| CAPI (Purchase ao fechar venda) | ✅ Implementado (falta credencial Meta válida pra testar live) |
| WhatsApp Cloud API — receber mensagens (webhook) | ✅ Funcional, testado com lead real |
| WhatsApp Cloud API — enviar resposta | ⚠️ Implementado; bloqueado por token Meta expirado (ver §8) |
| Frontend | ⚠️ Painel single-page **provisório** (HTML/JS puro) — **é o que deve ser reconstruído** |

---

## 3. Arquitetura e infraestrutura

- **VPS:** Hostinger, Ubuntu 24.04, acesso root via Browser terminal (hPanel). Já roda nginx com outros 4 sites — **não tocar neles**.
- **Pasta do projeto:** `/root/leadtrack`
  - `docker-compose.yml`, `.env` (senhas), `schema.sql`, `CREDENCIAIS.txt`
  - `backend/` — app FastAPI (`app/`, `.venv/`, `requirements.txt`)
- **Containers Docker:**
  - `leadtrack_postgres` → escuta em `127.0.0.1:5432` (não exposto à internet)
  - `leadtrack_redis` → escuta em `127.0.0.1:6379`
- **Backend:** FastAPI + Uvicorn, serviço systemd `leadtrack` em `0.0.0.0:8000` (com `--proxy-headers`). Liga sozinho no boot.
  - Logs: `journalctl -u leadtrack -f`
  - Reiniciar: `systemctl restart leadtrack`
- **nginx:** `/etc/nginx/conf.d/leadtrack.conf` faz proxy de `api.criatividads.com.br` → `127.0.0.1:8000`. HTTPS via certbot. Headers de WebSocket já configurados.
- **DNS/CDN:** o domínio passa pela **Cloudflare** (proxy ligado). Importante para o frontend e para o IP real (ver §8).

**Stack do backend:** FastAPI, SQLAlchemy 2.0 (async, asyncpg), Pydantic v2, python-jose (JWT), passlib/bcrypt, httpx. Migrations via Alembic configuradas (mas o schema inicial foi aplicado via `schema.sql`).

---

## 4. URLs importantes

| Recurso | URL |
|---|---|
| Base da API | `https://api.criatividads.com.br` |
| Docs interativas (Swagger) | `https://api.criatividads.com.br/docs` |
| OpenAPI JSON | `https://api.criatividads.com.br/openapi.json` |
| Painel provisório | `https://api.criatividads.com.br/painel` |
| Webhook do WhatsApp (Meta) | `https://api.criatividads.com.br/webhooks/whatsapp` |
| Health check | `https://api.criatividads.com.br/health` |

---

## 5. Autenticação (como o frontend deve autenticar)

1. **Registro** (cria conta + usuário admin): `POST /auth/register` (JSON).
2. **Login**: `POST /auth/login` — **importante: é `application/x-www-form-urlencoded`** (padrão OAuth2), campos `username` (o **email**) e `password`. Retorna `{ access_token, token_type: "bearer" }`.
3. Em todas as rotas protegidas, enviar header `Authorization: Bearer <access_token>`.
4. O token é um JWT com `sub` (id do usuário) e `conta_id`. Expira em 24h (`JWT_EXPIRE_MINUTES=1440`).
5. `GET /auth/me` valida o token e retorna o usuário.

O backend isola tudo por `conta_id` automaticamente a partir do token — o frontend **não** precisa enviar `conta_id`.

---

## 6. Referência da API (endpoints atuais)

Todos os IDs são UUID (string). Datas em ISO 8601 (UTC).

### Auth
- `POST /auth/register` → body `{ nome_conta, slug, nome, email, senha }` → `UsuarioOut`
- `POST /auth/login` → form `{ username=email, password }` → `{ access_token, token_type }`
- `GET /auth/me` 🔒 → `UsuarioOut { id, conta_id, nome, email, papel }`

### Tracking
- `POST /links` 🔒 → body `LinkIn { codigo_curto, destino_numero, mensagem_prefill?, utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term? }` → `LinkOut { ...campos, id, cliques }`
  - `codigo_curto` é **único por conta** (duplicado retorna 409).
- `GET /links` 🔒 → `LinkOut[]`
- `GET /r/{codigo}` 🌐 público → grava a origem (UTM, fbclid, gclid, ttclid, ad_id, IP, user agent, referrer) e **redireciona 302 para `wa.me`** com a mensagem pré-preenchida. É o link que vai no anúncio.

### CRM
- `GET /leads` 🔒 → `LeadOut[] { id, nome, telefone, cidade, estado, criado_em }`
- `GET /leads/{id}` 🔒 → `{ lead: LeadOut, origem: Origem | null }` (a origem traz utm_*, fbclid, ad_id, ip, cidade_ip, landing_url etc.)
- `GET /negocios` 🔒 → `NegocioOut[] { id, lead_id, etapa, status, valor }`
- `POST /negocios` 🔒 → body `{ lead_id, valor?, etapa? }` → `NegocioOut`
- `PATCH /negocios/{id}` 🔒 → body `{ status?, etapa?, valor? }` → `NegocioOut`
  - `etapa` ∈ `novo, em_atendimento, qualificado, negociacao, ganho, perdido`
  - `status` ∈ `aberto, ganho, perdido`
  - **Quando `status="ganho"`, dispara o evento `Purchase` no Meta via CAPI** (usa o fbclid da origem + valor).

### WhatsApp — configuração de canal
- `POST /whatsapp/canais` 🔒 → body `CanalIn { nome, phone_number_id, access_token, waba_id?, numero_exibicao?, verify_token? }` → `CanalOut`
  - `phone_number_id` é **único por conta**. **Não existe endpoint de update ainda** (ver §9, tarefa prioritária).
- `GET /whatsapp/canais` 🔒 → `CanalOut[] { id, nome, phone_number_id, numero_exibicao, ativo }`

### WhatsApp — webhook (consumido pela Meta, não pelo frontend)
- `GET /webhooks/whatsapp` 🌐 → handshake de verificação (compara `hub.verify_token` com o `verify_token` do canal).
- `POST /webhooks/whatsapp` 🌐 → recebe mensagens, casa lead/origem pelo código `#abc123`, cria conversa e mensagem. **Idempotente** (deduplica por `wa_message_id`).

### Inbox (atendimento)
- `GET /conversas` 🔒 → `[{ id, lead_id, lead_nome, lead_telefone, status_atendimento, ultima_mensagem_em, janela_24h_expira_em }]`
- `GET /conversas/{id}/mensagens` 🔒 → `MensagemOut[] { id, direcao(entrada|saida), tipo, conteudo, criado_em }`
- `POST /conversas/{id}/responder` 🔒 → body `{ texto }` → `{ status: "enviado" }`
  - Valida a **janela de 24h** (fora dela retorna 400 pedindo template).
  - Em falha de envio, retorna **400 com o motivo real da Meta** no campo `detail` (ex.: "WhatsApp recusou: ...").

### Meta (CAPI / Marketing API)
- `PUT /meta/config` 🔒 → body `MetaConfigIn { pixel_id?, capi_access_token?, ad_account_id?, test_event_code? }` → `{ status: "ok" }`

### Outros
- `GET /painel` → serve o painel HTML provisório.
- `GET /health` → `{ status: "ok" }`

🔒 = exige Bearer token. 🌐 = público.

---

## 7. Modelo de dados (PostgreSQL)

Tabelas (todas com `conta_id` para isolamento multi-tenant, exceto `contas`):

- **contas** — tenants. `id, nome, slug, ativo, criado_em`
- **equipes** — times dentro da conta.
- **usuarios** — `id, conta_id, equipe_id, nome, email, senha_hash, papel(admin|gestor|atendente), ativo`
- **canais_whatsapp** — `id, conta_id, nome, phone_number_id, waba_id, numero_exibicao, access_token, verify_token, ativo`
- **meta_config** — 1 por conta. `pixel_id, capi_access_token, ad_account_id, test_event_code`
- **links_rastreaveis** — `id, conta_id, codigo_curto(único), destino_numero, mensagem_prefill, utm_*, cliques`
- **leads** — `id, conta_id, nome, telefone, email, cidade, estado, atendente_id, criado_em`
- **origens** — a "caixa-preta" do tracking, 1 por clique. `lead_id, link_id, codigo_curto, plataforma, utm_*, click_id, fbclid, ad_id, campaign_id, adset_id, ip, user_agent, cidade_ip, estado_ip, landing_url, referrer`
- **conversas** — `id, conta_id, lead_id, canal_id, status_atendimento, atendente_id, ultima_mensagem_em, janela_24h_expira_em`
- **mensagens** — `id, conta_id, conversa_id, wa_message_id, direcao(entrada|saida), tipo, conteudo, midia_url, criado_em`
- **negocios** — pipeline. `id, conta_id, lead_id, etapa, valor, status, fechado_em`
- **eventos_meta** — registro do que foi devolvido via CAPI. `tipo_evento, event_id(idempotência), valor, status_envio, resposta_meta`
- **gastos_meta** — importado da Marketing API (ainda não há job de importação). `anuncio_id, data, gasto, impressoes, cliques, nome_criativo`

Os ENUMs do Postgres definem os valores válidos de etapa/status/direção/etc. (ver `schema.sql`).

A amarração-chave: `origens.lead_id` liga a origem do tráfego ao lead; `origens.fbclid` liga tudo de volta ao Meta no CAPI.

---

## 8. Problemas conhecidos / gotchas (ler antes de mexer)

1. **Token do WhatsApp expira em 24h.** O token de teste da Meta é temporário. Hoje o envio está bloqueado por isso ("Authentication Error"). **Solução definitiva: token permanente via Usuário de Sistema no Business Manager.** Enquanto isso, atualiza-se o token direto no banco (não há tela ainda).
2. **Cloudflare esconde erros 5xx.** O domínio passa pela Cloudflare, que substitui respostas 5xx pela página de erro dela. Por isso o backend foi ajustado para retornar **4xx** em erros de negócio (ex.: falha de envio = 400). Mantenha esse padrão — evite 5xx para erros previsíveis.
3. **IP real atrás da Cloudflare.** Hoje o `origens.ip` pode gravar o IP da Cloudflare, não o do lead. **Pendente:** configurar no nginx `set_real_ip_from` (faixas Cloudflare) + `real_ip_header CF-Connecting-IP`. Importante porque a localização por IP faz parte do produto.
4. **Inbox não é tempo real.** Sem WebSocket ainda; o frontend precisa dar refresh/polling para ver mensagens novas.
5. **Sem mídia.** O chat só trata texto. Receber/enviar imagem/áudio é incremento futuro (`mensagens.midia_url` já existe).
6. **Sem verificação de assinatura no webhook** (`X-Hub-Signature-256`). Pendente para produção.
7. **Webhooks processados inline** (sem fila Redis ainda). O Redis está no ar mas ainda não é usado.
8. **CORS** está `allow_origins=["*"]`. Se o novo frontend for servido em **outro domínio** (ex.: `painel.criatividads.com.br`), restringir o CORS para esse domínio. Se for servido pelo mesmo domínio da API, não há CORS.
9. **Sem Row-Level Security** no Postgres — o isolamento por `conta_id` é garantido na aplicação. Considerar RLS para defesa em profundidade.
10. **Login é form-urlencoded**, não JSON (engana fácil).
11. **Número de teste da Meta** só envia para até 5 destinatários cadastrados/verificados no painel da Meta.

---

## 9. O que precisa ser feito — FRONTEND (tarefa do Antigravity)

### Objetivo
Reconstruir o frontend como aplicação **React + TypeScript + TailwindCSS + Recharts** (stack do projeto original), profissional, consumindo a API REST acima. O painel atual (HTML/JS puro em `/painel`) é só um protótipo funcional — serve de referência de comportamento, mas deve ser substituído.

### Como começar
- Puxar o contrato da API de `https://api.criatividads.com.br/openapi.json` (gerar tipos TS a partir dele, ex.: `openapi-typescript`).
- Base URL configurável por env (`VITE_API_BASE=https://api.criatividads.com.br`).
- Guardar o JWT (localStorage) e injetar `Authorization: Bearer` num interceptor; deslogar em 401.

### Telas a construir
1. **Login / Registro** — login via form-urlencoded; registro cria conta+admin.
2. **Dashboard** — cards (leads, links, negócios abertos, faturamento) + **gráficos com Recharts** (leads por dia, funil, ROAS por criativo quando houver gasto). Hoje só há contadores.
3. **Links rastreáveis** — CRUD, exibir URL pronta (`{API}/r/{codigo}`), botão copiar, cliques por link, tratamento amigável de código duplicado (409).
4. **Leads** — lista + busca/filtros; detalhe lateral com a **origem completa** (anúncio, vídeo, fbclid, IP/cidade) ao lado dos dados do lead.
5. **Pipeline (Kanban)** — colunas por etapa, **drag-and-drop** real (hoje é por botão), card com lead/valor; ação "Ganho" pede valor e dispara CAPI.
6. **Inbox (estilo WhatsApp Web)** — lista de conversas + chat (balões entrada/saída) + caixa de resposta; mostrar origem do lead ao lado; respeitar/avisar a janela de 24h; **idealmente tempo real** (ver backend pendente). Hoje precisa de refresh manual.
7. **WhatsApp (config de canal)** — registrar/editar canal (precisa do endpoint de update, ver abaixo); mostrar a Callback URL e instruções da Meta.
8. **Config Meta** — formulário de pixel/token/ad account.

### Melhorias de UX desejadas
- Tempo real na inbox (WebSocket ou polling a cada poucos segundos como interim).
- Multi-atendente: atribuição de conversa/lead a um atendente (campo `atendente_id` já existe no banco).
- Notificações de mensagem nova.
- Responsivo / mobile-friendly.
- Suporte a mídia (imagem/áudio) no chat.

### Deploy do novo frontend (sugestão)
- Build estático (Vite) servido pelo nginx num subdomínio próprio, ex.: `painel.criatividads.com.br` (criar registro A + cert certbot, igual foi feito para `api.`), **OU** continuar servindo pela API.
- Se for domínio separado, **liberar o CORS** no backend para esse domínio.

---

## 10. O que precisa ser feito — BACKEND (suporte ao novo front)

Pequenas adições recomendadas para o frontend ficar completo:

1. **`PATCH /whatsapp/canais/{id}`** — atualizar token/dados do canal (hoje só dá pra criar; trocar token exige SQL manual). **Prioritário** por causa do token de 24h.
2. **WebSocket** (ex.: `/ws`) para a inbox em tempo real — empurrar mensagens novas recebidas no webhook. Headers de WS já estão no nginx.
3. **Endpoints de listagem que faltam para dashboards:** métricas agregadas (CPL, taxa de qualificação/fechamento, ROAS por criativo), contadores por período.
4. **Atribuição de atendente** (`PATCH /leads/{id}` / `PATCH /conversas/{id}` para setar `atendente_id`).
5. **Envio de templates** fora da janela de 24h (Cloud API message templates).
6. **Marketing API job** — importar gasto por anúncio para `gastos_meta` e calcular ROAS real.
7. **Hardening:** assinatura do webhook, fila Redis para webhooks, RLS no Postgres, `real_ip` Cloudflare no nginx, token Meta permanente.

---

## 11. Como acessar tudo (credenciais)

- **VPS:** Hostinger hPanel → VPS → Browser terminal (root).
- **Banco:** usuário `leadtrack`, senha em `/root/leadtrack/CREDENCIAIS.txt` (e em `/root/leadtrack/.env`). Acesso só interno (`127.0.0.1:5432`).
- **String de conexão do backend:** em `/root/leadtrack/backend/.env` (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`).
- **Conta de teste do app:** criada via `/auth/register` (email `paescalebe4@gmail.com`). Use `/auth/register` para criar novas.
- **Atualizar token do WhatsApp manualmente (interino):**
  ```bash
  docker exec -it leadtrack_postgres psql -U leadtrack -d leadtrack \
    -c "UPDATE canais_whatsapp SET access_token='TOKEN_NOVO';"
  ```

### Comandos úteis na VPS
```bash
systemctl restart leadtrack          # reinicia o backend
journalctl -u leadtrack -f           # logs ao vivo do backend
cd /root/leadtrack && docker compose ps    # status do banco/redis
docker exec -it leadtrack_postgres psql -U leadtrack -d leadtrack   # abrir o banco
```

O código-fonte do backend está em `/root/leadtrack/backend/app/` (organizado em `routers/`, `services/`, `models.py`, `schemas.py`).

---

## 12. Resumo para quem vai pegar o front

- A **API está pronta e documentada** em `/openapi.json` — construa o front em cima dela.
- Comece por **Login → Dashboard → Inbox → Pipeline**, que são o coração do uso diário.
- Os dois ganhos de UX que mais importam: **inbox em tempo real** e **drag-and-drop no pipeline**.
- Combine com o backend as 7 adições do §10 (a #1, update de canal, é a mais urgente).
- Cuidado com os gotchas do §8 (login form-urlencoded, erros 4xx por causa da Cloudflare, IP real, token Meta 24h).