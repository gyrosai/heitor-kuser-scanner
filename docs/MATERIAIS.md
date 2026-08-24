# Biblioteca de Materiais e Templates

A biblioteca de materiais guarda, por produto, os **links externos** (mídia kit,
vídeos, MOU, missões comerciais etc.) e os **textos padrão de mensagem**. A
próxima etapa (envio do pacote por e-mail) monta "texto + lista de links" a
partir daqui.

Nesta versão a **administração é por importação de CSV**. A tela `/materiais` no
app é só de consulta (não edita). Não há upload de arquivos, e-mail nem WhatsApp
neste módulo.

---

## Como preencher o CSV

Arquivo **UTF-8 com BOM**, separador **vírgula**. Cabeçalho obrigatório na
primeira linha (a ordem das colunas não importa):

```
produto,grupo,item,tipo,idioma,url,texto,data,local,ordem,status,observacao
```

Exemplo pronto (sem urls): [`materiais-exemplo.csv`](./materiais-exemplo.csv).

### Colunas

| Coluna | Descrição |
|---|---|
| `produto` | `CIMI360`, `CIMI Invest`, `Leilão`, `INDIP`, `Feirão dos Corretores` ou `Reunião aleatória`. Nome desconhecido → a linha vira erro no relatório (o resto do arquivo continua). |
| `grupo` | Agrupamento livre. Ex.: `Institucional`, `Mídia Kit`, `Vídeo`, `MOU`, `Missões Comerciais`, `Kit documentos`, `Texto`. |
| `item` | Rótulo do material/template exibido na tela. |
| `tipo` | `link` (material com url) · `texto` (template de mensagem, usa a coluna `texto`) · `evento` (missão comercial: url + `data` + `local`). |
| `idioma` | Vazio, `PT`, `ENG` ou `ESP`. |
| `url` | Para `link`/`evento`. Deve começar com `http://` ou `https://`. |
| `texto` | Corpo do template quando `tipo=texto`. Placeholders: `{nome}`, `{primeiro_nome}`, `{evento}`, `{produto}`. |
| `data` | Só para `tipo=evento` (guardado em `meta.date`). |
| `local` | Só para `tipo=evento` (guardado em `meta.location`). |
| `ordem` | Inteiro. Define a ordenação dentro do grupo (`sort_order`). |
| `status` | `ok` = pronto/ativo. Qualquer outro valor = inativo. |
| `observacao` | Nota interna livre. |

### Quando um item fica ATIVO

- `link` / `evento`: `status == ok` **e** `url` preenchida.
- `texto`: `status == ok` **e** `texto` preenchido.

Itens inativos **não aparecem** em `GET /api/materials` nem na tela `/materiais`,
mas ficam salvos (visíveis em `GET /api/admin/materials`) para você completar
depois (ex.: colar a url e reimportar, ou ativar via `PATCH`).

### Mapeamento de produto → chave interna

| CSV | product_key | Label |
|---|---|---|
| CIMI360 | `cimi_360` | CIMI 360 |
| CIMI Invest | `cimi_invest` | CIMI Invest |
| Leilão | `leilao` | Leilão |
| INDIP | `indip` | INDIP |
| Feirão dos Corretores | `feirao` | Feirão dos Corretores |
| Reunião aleatória | `reuniao` | Reunião |

---

## Como importar

Os endpoints administrativos exigem o header `X-Admin-Token` (variável de
ambiente `ADMIN_TOKEN` no backend). Sem token válido → `401`.

Substitua `SEU_TOKEN` e a URL base conforme o ambiente
(`https://heitor-kuser-scanner-production.up.railway.app` em produção).

### 1. Sempre rode o `dry_run` primeiro (valida sem gravar)

```bash
curl -X POST \
  "https://heitor-kuser-scanner-production.up.railway.app/api/admin/materials/import-csv?dry_run=true" \
  -H "X-Admin-Token: SEU_TOKEN" \
  -F "file=@docs/materiais-exemplo.csv"
```

Resposta:

```json
{
  "dry_run": true,
  "created": 12,
  "updated": 0,
  "skipped": 1,
  "errors": [{ "line": 7, "reason": "produto desconhecido: 'Fulano'" }]
}
```

Revise `errors` e os contadores. Se estiver como esperado, rode de verdade.

### 2. Import real (grava)

```bash
curl -X POST \
  "https://heitor-kuser-scanner-production.up.railway.app/api/admin/materials/import-csv" \
  -H "X-Admin-Token: SEU_TOKEN" \
  -F "file=@docs/materiais-exemplo.csv"
```

**Idempotente:** reimportar o mesmo CSV atualiza as linhas existentes (chave:
`produto + grupo + item + idioma` para materiais; `produto` para o template
"Texto padrão"). Não cria duplicatas.

### 3. Conferir / ajustar

- Listar tudo (inclui inativos): `GET /api/admin/materials` (com `X-Admin-Token`).
- Ativar/editar um item pontual:

```bash
curl -X PATCH \
  "https://heitor-kuser-scanner-production.up.railway.app/api/admin/materials/123" \
  -H "X-Admin-Token: SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active": true, "url": "https://drive.google.com/..."}'
```

Campos aceitos no `PATCH`: `active`, `url`, `label`, `sort_order`.

---

## Endpoints públicos (consumidos pelo app)

- `GET /api/materials` — materiais **ativos** agrupados por produto → grupo.
- `GET /api/templates` — templates **ativos** por produto.

Ambos com `Cache-Control: public, max-age=120`. O frontend (`lib/materials.ts`)
cacheia em `localStorage` com stale-while-revalidate; sem rede e sem cache a tela
mostra lista vazia com aviso de offline (nunca quebra).

---

## Migration

`backend/migrations/010_materials.sql` (aditiva, `CREATE TABLE IF NOT EXISTS`,
nunca `DROP`). Em produção, aplicar só com `pg_dump` feito antes:

```bash
railway run -- bash -c 'pg_dump "$DATABASE_PUBLIC_URL" > backup_$(date +%Y%m%d_%H%M%S).sql'
railway run -- bash -c 'psql "$DATABASE_PUBLIC_URL" -f backend/migrations/010_materials.sql'
```

> As tabelas também são criadas automaticamente no startup do backend
> (`Base.metadata.create_all`), mas rodar a migration explicitamente é o caminho
> recomendado e auditável.
