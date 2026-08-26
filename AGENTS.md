# CIMI Leads — Status do Projeto (contexto para Task Master / OpenCode)

> Copie este arquivo para a raiz do repo como `AGENTS.md` (o OpenCode lê automaticamente).
> Última revisão: 24/08/2026 (pós-handoff v0.3.1). Itens ⚠️ CONFIRMAR precisam de validação antes de virar premissa.

## 1. O que é o produto

PWA de captura de leads em eventos. Escaneia cartão de visita → OCR (GPT-4o Vision) → operador enriquece (importância, tags, observações) → salva na base de leads (Postgres, sistema de verdade) → sincroniza com Google Contacts (saída secundária) → dispara e-mail de mídia kit → exporta CSV.

- **Nome:** CIMI Leads (ex-"Heitor Scanner"). Versão atual **0.3.1**.
- **Dono do produto:** Heitor Kuser (CEO CIMI360, Android)
- **Operador de campo:** Henrique
- **Dev / PO técnico:** Camila Martins (Gyros AI)

**Decisão de produto fundamental:** o app é **single-tenant intencional**. Todos os operadores salvam na MESMA conta Google central. Não implementar multi-tenant. Conta central hoje: `camila.martins@cimi360.com.br`; migração para a conta do Heitor prevista.

## 2. Stack e infraestrutura

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js + Tailwind (PWA) na **Vercel** — `heitor-kuser-scanner.vercel.app`. Chama `/api/*` relativo; **Next.js rewrites proxeiam pro Railway** (same-origin, sem CORS). **Não existe service worker** (só manifest); app atualiza com reload normal. |
| Backend | FastAPI + SQLAlchemy async + asyncpg no **Railway** — `heitor-kuser-scanner-production.up.railway.app`, projeto `appealing-passion` |
| Banco | PostgreSQL no Railway |
| OCR | GPT-4o Vision |
| Contatos | Google People API (OAuth single-account) |
| E-mail | Gmail SMTP via OAuth (scope `gmail.send` — restrito, ver §4) |
| Observabilidade | **Sentry** (org `gyros-ki`, projeto `cimi-leads`): breadcrumbs no save, session replay em erro, mascarado por LGPD (`maskAllText`/`blockAllMedia`/`maskAllInputs`) |
| Offline | IndexedDB v2 via `db.ts` centralizado (stores `pending_scans`, `pending_saves`); upgrade idempotente |
| Repo | `github.com/gyrosai/heitor-kuser-scanner` |

### Schema atual — `scanned_contacts`
`id, name, company, role, phone, email, event_tag (texto livre), importance (1–3), tags text[], card_image bytea, is_draft, google_contact_id, email_status, email_sent_at, email_error, source, notes, scanned_at, updated_at` ⚠️ CONFIRMAR nomes exatos em `backend/app/db_models.py`.

### Classificação que JÁ EXISTE no editor (screenshot 24/08)
Seção por produto com checkbox no produto + **radio** (perfil único) dentro: **CIMI Invest** (Parceria, Venda) e **CIMI 360** (Stand, Patrocínio). ⚠️ CONFIRMAR onde é persistido (coluna própria? dentro de `tags`? jsonb?) — a taxonomia nova ESTENDE essa estrutura, não cria outra.
Também existe no editor a seção "Mídia kit por e-mail": checkbox "Enviar Mídia Kit ao salvar", Para/De (`camila@gyrosai.com`), Idioma PT/EN/ES.

### Constantes e helpers relevantes
- `ALLOWED_TAGS = ["Patrocínio", "Palestrante", "Parceria", "Cliente", "Mídia", "Follow-up"]` — validator Pydantic **filtra silenciosamente** tags desconhecidas. ⚠️ Categoria nova precisa entrar aqui ANTES do frontend enviar, senão some sem erro.
- `localStorage["heitor_scanner_last_event_tag"]` — último evento digitado (pré-preenchido + botão Limpar).
- `timeoutSignal` — todo `fetch` usa timeout (30s mutações, 15s leituras, 90s scan, 180s batch) com fallback pra browsers sem `AbortSignal.timeout`.
- Erros classificados: `NetworkError` (retriável) · `ApiError` (lógico) · `ApiConflictError` (409).
- Fila `pending_saves`: save que falha por rede é reenviado ao voltar conexão; 409 no retry resolve por merge; 401 fica na fila sem consumir tentativa e dispara reconexão. Banner na home com "Reenviar agora". Flush bumpa `historyKey`.
- Endpoints conhecidos: `POST /api/scan/card`, `POST /api/vcard` (salva definitivo + Google + agenda e-mail), `GET /api/contacts` (retorna `google_contact_id`, `email_status`, `email_sent_at`, `email_error`), `GET /api/contacts/{id}`, `POST /api/contacts/{id}/merge` (aceita `discard_draft_id`), `GET /api/contacts/tags`, `GET /api/contacts/events`, `GET /api/contacts/export.csv`, batch endpoint, `GET /api/health`.
- Código morto: `ContactHistory.tsx` (componente vivo é `ContactListCard`).

## 3. Histórico de entregas

| Versão / PR | Escopo | Status |
|---|---|---|
| PR 1–3 | CRM-lite backend, frontend (editor, dedup, CSV), modo batch offline | ✅ Produção |
| PR 4 | Rebrand CIMI Leads, event tag pré-preenchida, logos/manifest, banner | ✅ Produção |
| Mídia kit / e-mail | Botão "Salvar e enviar Mídia Kit", e-mail via Gmail SMTP com status por contato | ✅ Produção |
| v0.3.0 | Resiliência: Sentry, timeouts, classificação de erro, fila de retry offline, banner de pendências, toast corrigido, "conexão lenta" após 8s | ✅ Produção (24/08) |
| v0.3.1 | Listagem com campos de sync/e-mail, merge com `discard_draft_id`, lista preservada em falha de rede | ✅ Produção (24/08) |
| Drafts | 45 drafts triados; 15 de 17 "leads" já existiam (órfãos de batch). Promovidos 361 (Assis), 363 (Yasser Hatia), 365 (Frederico Guidoni) | ✅ Feito |
| 24/08 | Taxonomia 5 produtos, biblioteca de materiais (CSV), pacote por e-mail (individual) | ✅ Produção |
| Modo batch | Pacote de materiais no modo batch: padrão por lote + override por item, preview colapsável, persistência via `extracted_data` | ✅ Este PR |

**Bug crítico do evento de 14/08 — RESOLVIDO.** Causa raiz: `fetch` sem timeout em rede zumbi (conexão aceita, resposta nunca chega) → promise pendurada, botão travado em `saving=true`, zero request no backend. Não era OAuth, não era service worker, não era código novo.

## 4. Pendências ABERTAS

1. **✅ OAuth publicado em Production (24/08).** Tokens não expiram mais em 7 dias. Falta: reconectar a conta central uma vez e validar save + Google Contacts. Verificação formal (política de privacidade pública etc.) fica para depois do evento; inviável enquanto o app pedir `gmail.send`.
2. **🟠 E-mail depende de `gmail.send`** (scope restrito). Caminho recomendado: trocar Gmail SMTP por Resend/Mailgun (~US$ 10/mês) → elimina o scope, viabiliza verificação, dá tracking. Não é P0.
3. **🟠 Câmera abre frontal no Android do Heitor** (`<input capture="environment">` inconsistente). Não migrar pra getUserMedia antes do evento sem teste no aparelho dele.
4. 🟡 Drafts órfãos antigos ainda no banco (correção só previne novos). Limpeza = script com dry-run, P2.
5. 🟡 `ContactHistory.tsx` morto — remover quando tocar na área.
6. 🟡 Migração da conta Google central de Camila → Heitor.
7. 🟡 Sem suíte de testes automatizada consolidada e sem staging formal (Vercel tem preview por PR; Railway precisa de PR environment). ⚠️ CONFIRMAR o que já existe de teste.

## 5. Aprendizados que o agente DEVE respeitar

- **Logs vazios no backend = problema no frontend.** Se o request não chega, não é bug de servidor.
- **Todo `fetch` precisa de timeout** (usar o helper existente). Rede zumbi não rejeita — pendura.
- **Não existe service worker.** Não criar um sem decisão explícita; app atualiza com reload.
- Antes de promover/reprocessar draft, **sempre checar se já existe salvo** (15 de 17 já existiam).
- Mudanças em IndexedDB só via `db.ts`, com bump de versão e upgrade idempotente preservando stores existentes. `deleteDatabase` trava com conexão aberta — testar em janela anônima.
- Toasts de sucesso só DEPOIS da resposta do backend.
- Data Explorer do Railway roda uma query por vez e mostra "0 rows" em UPDATE bem-sucedido.
- Histórico vem do backend, nunca de `sessionStorage`.
- Migrations sempre aditivas (`ADD COLUMN IF NOT EXISTS`), nunca `DROP`, com `pg_dump` antes. `backup_*.sql` nunca vai pro repo.
- Validators que filtram silenciosamente precisam ser atualizados junto com qualquer taxonomia nova (ou passar a retornar 422).
- Nunca usar API não-oficial de WhatsApp. Envio é via `wa.me`.
- **Taxonomia: editar só `shared/taxonomy.json` e rodar `python3 scripts/sync_taxonomy.py`.** `frontend/src/lib/taxonomy.json` e `backend/app/taxonomy.json` são cópias reais (não symlink) — o pre-commit hook `check-taxonomy-sync` bloqueia commit se alguma divergir.
- Backend local: Python 3.11 (`uv venv --python 3.11`), `brew install zbar`, e `export DYLD_LIBRARY_PATH=/opt/homebrew/lib` para o pyzbar.
- `package-lock.json` SEMPRE commitado junto com `package.json`.
- Migration que altera tabela EXISTENTE roda ANTES do deploy (`create_all` não adiciona colunas).
- `.env.example` só com placeholders; GitHub push protection bloqueia segredos.
- Produto sem template usa texto genérico; ausência de dado nunca bloqueia save nem envio.
- **Identidade visual (rebrand v0.4):** paleta **teal/navy** — navy `#01303f` (títulos, header, botão primário), teal `#36a8ad` (destaque, links, chips/ícones ativos), grey `#d9d9d9` (bordas). Derivados: teal-soft `#e6f4f5`, navy-soft `#e8eef0`, teal-dark `#2a8a8f`, surface `#f5f7f8`, texto secundário `#4a5b63`. **Laranja foi descontinuado do tema.** Regra: **botão primário = navy; accent/selecionado/ativo = teal; destrutivo = vermelho.** Texto branco sobre teal só em ≥16px bold (botões); texto normal sobre teal → usar navy. Tipografia Montserrat (400/600/800). Tokens vivem em `frontend/src/app/globals.css` (`@theme`) + `frontend/src/lib/tokens.ts` — mantê-los em sincronia. Preferir aliases `primary`/`accent`/`accent-soft`; nomes legados (`laranja-360`, `azul-noturno`, `azul-atlantico`) ainda funcionam (remapeados) e serão renomeados pós-evento.
- **Banner de pendências = `PendingSavesBanner`** (não existe "AccountBanner"). Assets de marca ficam em `frontend/public/brand/` (logos) e `frontend/public/icons/` (ícones PWA/favicon/apple-touch). PWA já instalado guarda o ícone antigo em cache — precisa remover e reinstalar o app para ver o novo.
- **Tarefa futura (fora do rebrand):** template de e-mail/mídia kit ainda usa a identidade antiga — atualizar pelo pipeline de envio, escopo separado.

## 6. O que está sendo pedido agora (Henrique, mapa mental de 22/08)

Ver `02-prd.txt`. **Evento: CIMI360, 27 e 28/08/2026** (deploy final até 26/08 meio-dia). P0 = estender a classificação existente (Leilão, INDIP, Feirão; CIMI Invest com a lista nova) + biblioteca de materiais + envio WhatsApp. Eventos estruturados, base do Heitor, marca e e-mail de pacote ficam para depois do evento.
