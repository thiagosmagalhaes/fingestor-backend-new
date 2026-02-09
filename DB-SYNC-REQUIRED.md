# Nota sobre db.sql desatualizado

⚠️ **IMPORTANTE:** O arquivo `db.sql` está desatualizado e não reflete o schema real do banco de dados.

## Problemas Identificados:

### 1. Tabela `budgets` falta coluna:
- ❌ `share_token` VARCHAR(64) UNIQUE - Adicionada na migração `20260209000000_add_share_token_to_budgets.sql`

### 2. Tabela `companies` - Estrutura atual:
**Colunas que existem:**
- ✅ `id` - UUID
- ✅ `user_id` - UUID
- ✅ `name` - TEXT
- ✅ `cnpj` - TEXT
- ✅ `type` - account_type
- ✅ `created_at` - TIMESTAMPTZ
- ✅ `updated_at` - TIMESTAMPTZ

**Colunas que NÃO existem (mas estavam no código):**
- ❌ `email`
- ❌ `phone`
- ❌ `website`
- ❌ `address`
- ❌ `logo_url`

## Ação Requerida:

Para atualizar o `db.sql`, execute:

```bash
# No terminal
.\db.bat
```

Isso irá:
1. Exportar o schema atual do banco de dados
2. Atualizar o arquivo `db.sql` com todas as tabelas e colunas corretas
3. Incluir todas as migrações aplicadas

## Status Atual:

✅ **Código corrigido** - As queries agora usam apenas colunas que realmente existem
✅ **Documentação atualizada** - Reflete a estrutura real do banco
⚠️ **db.sql desatualizado** - Precisa ser regenerado para refletir o schema atual

---

**Data da última análise:** 9 de Fevereiro de 2026
