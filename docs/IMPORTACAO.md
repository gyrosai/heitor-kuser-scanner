# Importação da Base do Heitor (Google Contacts CSV)

Importa a base de contatos exportada do Google Contacts para dentro do CIMI
Leads como contatos de **referência** (`source="base_heitor"`). Serve para que,
ao escanear um cartão em campo, o operador seja avisado quando aquela pessoa
**já está na base do Heitor** — evitando cadastrar de novo alguém que já é
conhecido.

> **Contatos importados são somente-leitura de referência.** Eles NÃO são
> sincronizados com o Google Contacts, NÃO recebem e-mail/Mídia Kit e ficam
> escondidos da listagem principal por padrão (ver §5). O sistema de verdade
> continua sendo o que é escaneado/salvo em campo.

---

## 1. Exportar do Google Contacts

1. Acesse [contacts.google.com](https://contacts.google.com) na conta certa.
2. Menu **Exportar** → formato **Google CSV**.
3. Salve o arquivo (UTF-8; o parser tolera BOM).

O parser aceita o **layout novo** (`First Name`, `Last Name`,
`Organization Name`, `Organization Title`, `E-mail N - Value`,
`Phone N - Value`, `Labels`…) e o **layout antigo** (`Given Name`,
`Family Name`, `Organization 1 - Name`…). Exemplo pronto:
[`contatos-google-exemplo.csv`](./contatos-google-exemplo.csv).

---

## 2. O que o parser faz com cada linha

| Situação | Comportamento |
|---|---|
| Nome (First/Last ou Given/Family) presente | Usa como `name`. |
| Sem nome | Fallback para `File As` → `Organization Name` → 1º e-mail → 1º telefone → `"Sem nome"`. |
| Vários `E-mail N`/`Phone N` | O **1º válido** vira o principal (`email`/`phone` + normalizado); os demais vão para `notes` ("Outros emails/telefones"). |
| `Labels` com marcadores | Marcadores úteis viram `import_labels` e também vão para `notes` ("Marcadores: …"). |
| Marcadores de sistema (`* myContacts`, `* starred`, `importado…`) | Descartados. |
| Marcadores pessoais (`* family`, `parente`, `amigo`) | **Linha ignorada** (não importa contato pessoal). |

Normalização usada para dedup:
- **Telefone → E.164** via `phonenumbers` (região padrão `BR`). Inválido → descartado.
- **E-mail →** `strip().lower()`.

---

## 3. Deduplicação

Uma linha é **ignorada (`skipped`)** quando o telefone E.164 **ou** o e-mail
normalizado já existe:
- contra **qualquer contato já no banco** (escaneado, manual ou importado); e
- contra **linhas anteriores do próprio arquivo** (dois registros iguais no
  mesmo CSV entram só uma vez).

Uma linha é **inválida (`invalid`)** quando não tem nenhum telefone/e-mail
válido após a normalização.

A importação é **idempotente**: rodar o mesmo arquivo duas vezes não duplica.

---

## 4. Como importar

Endpoint administrativo — exige o header `X-Admin-Token` (variável de ambiente
`ADMIN_TOKEN` no backend; sem token válido → `401`). Se `ADMIN_TOKEN` não estiver
configurado, o endpoint é **fail-closed** (bloqueia tudo).

> Migration necessária antes do 1º import (adiciona `phone_e164`, `email_norm`,
> `import_labels`). Faça `pg_dump` antes — ver §6.

### 4.1. Sempre rode o `dry_run` primeiro (valida sem gravar)

```bash
curl -X POST \
  "https://heitor-kuser-scanner-production.up.railway.app/api/admin/contacts/import-google-csv?dry_run=true" \
  -H "X-Admin-Token: SEU_TOKEN" \
  -F "file=@docs/contatos-google-exemplo.csv"
```

Resposta:

```json
{
  "created": 3,
  "skipped": 1,
  "invalid": 0,
  "skipped_personal": 1,
  "errors": [],
  "skipped_details": [{ "line": 4, "existing_id": 812, "reason": "duplicado" }],
  "dry_run": true
}
```

- `created` — linhas que seriam/foram criadas.
- `skipped` — duplicadas (existentes ou repetidas no arquivo).
- `invalid` — sem telefone/e-mail válido (detalhe em `errors`).
- `skipped_personal` — linhas pessoais ignoradas (`* family` etc.).
- `skipped_details` — até 20 exemplos de duplicatas (com `existing_id`).

Revise os contadores. Se estiver como esperado, rode de verdade.

### 4.2. Import real (grava)

```bash
curl -X POST \
  "https://heitor-kuser-scanner-production.up.railway.app/api/admin/contacts/import-google-csv" \
  -H "X-Admin-Token: SEU_TOKEN" \
  -F "file=@docs/contatos-google-exemplo.csv"
```

Grava em lotes de 500 com commit por lote; uma linha problemática não aborta o
arquivo inteiro.

---

## 5. Como aparecem no app

- **Escondidos por padrão:** `GET /api/contacts` (sem parâmetro) continua
  retornando **array puro** só de contatos de campo — contrato legado
  preservado. Contatos `base_heitor` só aparecem com
  `GET /api/contacts?include_imported=true`, que retorna `{ contacts, total }`
  (paginado por `limit`, padrão 200 / máx 500).
- **Toggle na Home:** filtro "Incluir Base Heitor (contatos importados)".
- **Badge "Base Heitor"** e ícone de banco no lugar dos badges de
  sync/e-mail (eles não sincronizam nem enviam e-mail).
- **Aviso de duplicata no scan:** ao salvar um contato cujo telefone/e-mail
  bate com a base, o `DuplicateModal` mostra **"Já está na base do Heitor"**
  (`match_type: "imported"` no 409), com opção de atualizar o existente ou
  salvar assim mesmo.

---

## 6. Migration e backup (produção)

A importação depende da migration **012** (aditiva e idempotente:
`ADD COLUMN IF NOT EXISTS`). Rode **antes** do primeiro import, com backup:

```bash
# 1) Backup (obrigatório antes de qualquer migration em produção)
railway run -- bash -c 'pg_dump "$DATABASE_PUBLIC_URL" > backup_$(date +%Y%m%d_%H%M%S).sql'

# 2) Aplicar a migration
railway run -- bash -c 'psql "$DATABASE_PUBLIC_URL" -f backend/migrations/012_contacts_source.sql'
```

> `create_all` do SQLAlchemy **não** adiciona colunas a tabela existente — por
> isso a migration roda à parte, antes do deploy. Os arquivos `backup_*.sql`
> nunca vão para o repositório.

### Backfill dos contatos já existentes

Contatos salvos antes da migration ficam com `phone_e164`/`email_norm` nulos e
não participariam do dedup contra a base. O script
`scripts/backfill_normalized_contact_fields.py` preenche esses campos. Rode com
`--dry-run` primeiro.
