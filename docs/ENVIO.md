# Envio de e-mail: mídia kit legado vs. pacote de materiais

Este documento explica a seção **"Mídia Kit por E-mail"** do editor de contato
depois da feature de pacote de materiais (tasks 15/18/19). Ver também
[`MATERIAIS.md`](./MATERIAIS.md) para como a biblioteca de materiais/templates
é alimentada (import CSV).

## Como escolher o pacote

Na seção "Mídia Kit por E-mail" (aparece no preview pré-save e no editor
pós-save, componente `EmailKitSection`):

1. **Produto** (opcional): chips com os produtos que têm materiais cadastrados
   (`GET /api/materials`). "Nenhum" = comportamento legado (mídia kit fixo,
   PDF anexado, texto padrão de `email_content.py`).
   - Pré-seleção automática: se a classificação do contato (seção acima, checkbox+
     radio por produto) tem **exatamente 1 produto marcado**, ele já vem selecionado.
     Com vários produtos marcados, usa o primeiro na ordem canônica
     (`cimi_360, cimi_invest, leilao, indip, feirao, reuniao`). Sem classificação,
     fica em "Nenhum".
2. **Idioma** (PT/EN/ES, o mesmo toggle de sempre): filtra quais materiais entram
   no pacote — item com idioma `null` entra em qualquer envio; com idioma
   definido, só entra se bater com o idioma escolhido.
3. **Materiais**: checklist agrupado (mesmos grupos do CSV, ex. "Institucional",
   "Vídeos"). Pré-marcados: grupo **Institucional** inteiro + itens no idioma
   escolhido. O operador pode marcar/desmarcar antes de enviar.
4. **Preview** (colapsável, "Ver preview do e-mail"): mostra o texto que vai ser
   montado — mesma lógica de `lib/package.ts` no frontend e
   `app/services/package.py::compose_package` no backend (o servidor sempre
   recompõe e revalida antes de enviar de verdade; o preview é só uma
   antecipação local, sem round-trip de rede).

O checkbox "Enviar Mídia Kit ao salvar" vira **"Enviar pacote ao salvar"**
automaticamente quando há produto selecionado. Sem produto, texto e
comportamento continuam idênticos ao anterior.

## O que "Reenviar" faz

O botão "Reenviar" (dentro do editor, nos estados "enviado"/"falhou"/"pendente",
e também o atalho no card da lista de contatos) abre **o mesmo seletor** —
produto, idioma, materiais e preview ficam editáveis ali mesmo antes de
reenviar. Não existe uma tela separada duplicando essa configuração.

Por trás, todo envio (legado ou pacote, save ou reenvio explícito) passa pelo
mesmo pipeline: `POST /api/contacts/{id}/send-email` com um campo opcional
`package: {product_key, material_ids, template_id}`. Sem `package`, é o mídia
kit fixo de sempre. Não existe endpoint `/resend` separado — decisão consciente
para não duplicar a lógica de disparo/registro que já existia.

## Onde ver o status

- **Editor de contato**: banner com status do último envio (enviado/falha/
  pendente) + a mesma seção de configuração do pacote.
- **Lista de contatos** (`ContactListCard`): linha com o resumo do último envio
  (ex. "E-mail enviado · CIMI Invest · 24/08 15:02" ou "Falhou") vinda de
  `contact.last_send` (campo aditivo em `GET /api/contacts`).
- **Histórico completo de um contato**: `GET /api/contacts/{id}/sends` retorna
  todos os envios (não só o último), incluindo `product_key`, `material_ids`,
  `template_id`, `status`, `error`, `sent_at`. Não há tabela nova para isso —
  é a mesma `email_logs` que já existia, estendida de forma aditiva (migration
  `011_email_logs_package.sql`): `channel` (gancho para WhatsApp futuro),
  `product_key`, `material_ids`, `template_id`, `message_snapshot`.

## Limitações conhecidas (fase atual)

- **Modo batch (`ReviewCarousel`, "Em sequência")**: continua usando só o
  mídia kit fixo. O seletor de pacote não está integrado ali ainda — fica para
  uma fase 2, quando fizer sentido replicar a mesma UI no carrossel.
- Sem anexo de PDF no e-mail de pacote (só os links selecionados). O mídia kit
  legado continua anexando o PDF normalmente.
- Assunto do e-mail é o mesmo para os dois caminhos (não varia por produto
  ainda).
