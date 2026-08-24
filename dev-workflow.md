# dev-workflow.md

## Workflow de Desenvolvimento — CIMI Leads

Este projeto segue um workflow estruturado com IA. O agente DEVE seguir as etapas abaixo
em toda tarefa. Prioridade absoluta: **zero regressão em produção** — há evento em poucos
dias e não haverá tempo de correção em campo.

Leia também `AGENTS.md` (status e regras do projeto) antes de qualquer sessão.

### 1. Antes de começar
- Ler a tarefa atual no Task Master: `task-master show <id>`
- Confirmar que os critérios de aceite estão claros; se não estiverem, perguntar antes de codar
- Buscar contexto técnico relevante:
  - Documentação da lib via Context7 (FastAPI, SQLAlchemy async, Next.js, phonenumbers)
  - Implementações reais via Octocode quando aplicável
  - Memórias do projeto via Basic Memory (`memories/`)
- Ler o código existente que a tarefa toca ANTES de propor mudança (usar Serena: find_symbol / find_referencing_symbols)

### 2. Preparação
- Garantir main limpa: `git status` e `git pull origin main`
- Criar branch por tarefa: `git checkout -b feature/<id>-<descricao-curta>`
- Rodar QA pré-dev (baseline verde obrigatória):
  - Backend: `cd backend && pytest -q`
  - Frontend: `cd frontend && npm run lint && npm run test`
- Se a tarefa envolve schema: criar `backend/migrations/NNN_<nome>.sql` aditiva (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`). NUNCA `DROP`, NUNCA alterar tipo de coluna existente.

### 3. Implementação
- Apresentar um PLANO (arquivos, funções, migrations, testes) ANTES de qualquer escrita de código e aguardar aprovação
- Implementar incrementalmente, um subtask por vez, mostrando o diff
- Escrever o teste JUNTO com a feature (não depois)
- Usar Serena para refactors em nível de símbolo
- Regras específicas do projeto:
  - Todo request usa o helper de fetch com timeout e a classificação de erro existente (`NetworkError`/`ApiError`/`ApiConflictError`); nenhum `fetch` cru
  - Mutações que podem falhar por rede entram na fila `pending_saves` (padrão da v0.3.0); toast de sucesso só depois da resposta
  - IndexedDB só via `db.ts`: bump de versão, upgrade idempotente, nunca apagar store existente
  - Não criar service worker
  - Ações que abrem app externo (wa.me) usam `<a href>` real no gesto do usuário; nunca `window.open` em callback async
  - Sentry: adicionar breadcrumbs nos fluxos novos; replay continua mascarado (LGPD)
  - Validators Pydantic para taxonomia retornam 422 em valor inválido (não filtram silenciosamente); `ALLOWED_TAGS` deriva de `taxonomy.py`
  - Frontend nunca duplica listas de taxonomia/materiais — consome `GET /api/taxonomy` e `GET /api/materials` com cache em IndexedDB
  - Compatibilidade obrigatória com: histórico, modo batch offline (IndexedDB), CSV export, `event_tag`
  - Endpoints administrativos exigem header `X-Admin-Token`
  - Sem PII em logs; sem chaves no frontend

### 4. Validação
- Rodar testes: `cd backend && pytest -q` · `cd frontend && npm run test`
- Rodar linter/formatador: `ruff check . && ruff format --check .` · `npm run lint`
- Rodar type-check: `npx tsc --noEmit`
- Verificar cobertura nos módulos novos (≥ 70%): `pytest --cov=app --cov-report=term-missing`
- Se a tarefa toca UI de campo: rodar E2E mobile em staging: `npx playwright test --project=mobile`
- Migration: aplicar primeiro em staging; em produção só com `pg_dump` feito e verificado

### 5. Commit e PR
- Mensagem no formato Conventional Commits (`feat(backend): ...`, `fix(frontend): ...`, `chore(db): ...`)
- Nunca commitar direto na main (hook bloqueia)
- Abrir PR via `gh pr create --base main --fill`
- Pedir ao agente uma revisão do diff focada em: regressão, compatibilidade, migração, tratamento de erro, teste faltando
- Staging = Vercel preview do PR + Railway PR environment (banco próprio); rodar smoke test manual (`docs/SMOKE-TEST.md`) no Android antes do merge
- Conferir o Sentry do preview antes do merge (zero erro novo)

### 6. Documentação
- Registrar decisões técnicas no Basic Memory: "Salva uma memória de decisão arquitetural: [decisão] + [contexto] + [trade-offs]"
- Atualizar README quando há mudança de uso, variável de ambiente ou rotina operacional
- Marcar tarefa como done no Task Master: `task-master set-status --id=<id> --status=done`

## Convenções do projeto
- Backend: Python 3.11 · FastAPI · SQLAlchemy 2 async · asyncpg · Pydantic v2
- Frontend: TypeScript · Next.js (Vercel) · Tailwind · IndexedDB via `db.ts` · Sentry
- Gestor de pacotes: `uv` (backend) · `npm` (frontend)
- Testes: `pytest` + `pytest-asyncio` + `httpx` (backend) · `vitest` + `@testing-library/react` (frontend) · `playwright` (E2E)
- Linter: `ruff` (backend) · `eslint` + `prettier` (frontend)
- Padrão de commit: Conventional Commits
- Branches: `feature/<task-id>-<slug>`, `fix/<task-id>-<slug>`, `chore/<slug>`

## Comandos essenciais
- Testes backend: `cd backend && uv run pytest -q`
- Testes frontend: `cd frontend && npm run test`
- Lint backend: `cd backend && uv run ruff check . && uv run ruff format --check .`
- Lint frontend: `cd frontend && npm run lint && npx tsc --noEmit`
- Build frontend: `cd frontend && npm run build`
- Dev backend: `cd backend && uv run uvicorn app.main:app --reload`
- Dev frontend: `cd frontend && npm run dev`
- Backup produção: `railway run -- bash -c 'pg_dump "$DATABASE_PUBLIC_URL" > backup_$(date +%Y%m%d_%H%M%S).sql'`
- Aplicar migration: `railway run -- bash -c 'psql "$DATABASE_PUBLIC_URL" -f backend/migrations/NNN_nome.sql'`
- Health: `curl -s https://heitor-kuser-scanner-production.up.railway.app/api/health`

## Congelamento pré-evento
- 48 h antes do evento: só `fix/*` críticos entram, com aprovação explícita da Camila
- Rollback backend: Railway → Deployments → deploy anterior → "Redeploy". Rollback frontend: Vercel → Deployments → "Promote to Production" no anterior. Documentar no README
