# DELETE Transaction - Documentação

## Visão Geral

O endpoint `DELETE /api/transactions/:id` suporta 3 modos de deleção para transações **parceladas** ou **recorrentes**, permitindo controle granular sobre quais transações deletar.

## Endpoint

```
DELETE /api/transactions/:id?companyId=xxx&deleteMode=single|future|all
```

## Parâmetros

| Parâmetro | Tipo | Obrigatório | Valores | Descrição |
|-----------|------|-------------|---------|-----------|
| `id` | path | ✅ | uuid | ID da transação a deletar |
| `companyId` | query | ✅ | uuid | ID da empresa |
| `deleteMode` | query | ❌ | `single`, `future`, `all` | Modo de deleção (default: `single`) |

## Modos de Deleção

### 1️⃣ `single` (Padrão)

Deleta **apenas a transação especificada** pelo ID.

```bash
curl -X DELETE "http://localhost:3001/api/transactions/uuid-transacao?companyId=uuid-empresa&deleteMode=single" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Uso:**
- Deletar apenas uma parcela específica
- Deletar apenas uma ocorrência de uma recorrência
- Comportamento padrão se `deleteMode` não for especificado

**Response:**
```json
{
  "message": "Transação deletada com sucesso",
  "deleted_count": 1
}
```

---

### 2️⃣ `future`

Deleta a transação atual + **todas as futuras não pagas**.

```bash
curl -X DELETE "http://localhost:3001/api/transactions/uuid-transacao?companyId=uuid-empresa&deleteMode=future" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Para Parceladas:**
- Deleta a parcela atual + parcelas futuras com `status != 'paid'`
- Identifica parcelas pelo `description`, `amount` e `total_installments`
- Usa `installment_number >= atual` para identificar futuras

**Para Recorrentes:**
- Deleta a transação atual + transações futuras com `status != 'paid'`
- Identifica pelo `recurring_transaction_id`
- Usa `date >= atual` para identificar futuras

**Exemplo - Parcelamento:**
```
Parcelas: 1/12 (paid), 2/12 (paid), 3/12 (pending), 4/12 (pending), ..., 12/12 (scheduled)
DELETE parcela 3/12 com deleteMode=future
Resultado: Deleta 3/12, 4/12, 5/12, ..., 12/12 (10 parcelas)
Mantém: 1/12, 2/12 (já pagas)
```

**Response:**
```json
{
  "message": "5 transação(ões) deletada(s) com sucesso",
  "deleted_count": 5
}
```

---

### 3️⃣ `all`

Deleta **todas as transações relacionadas**, independente do status.

```bash
curl -X DELETE "http://localhost:3001/api/transactions/uuid-transacao?companyId=uuid-empresa&deleteMode=all" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Para Parceladas:**
- Deleta TODAS as parcelas (1/12 até 12/12)
- Independente se já foram pagas

**Para Recorrentes:**
- Deleta TODAS as transações geradas pela recorrência
- Independente se já foram pagas

**Exemplo - Parcelamento:**
```
Parcelas: 1/12 (paid), 2/12 (paid), 3/12 (pending), ..., 12/12 (scheduled)
DELETE parcela 3/12 com deleteMode=all
Resultado: Deleta TODAS as 12 parcelas
```

**Response:**
```json
{
  "message": "12 transação(ões) deletada(s) com sucesso",
  "deleted_count": 12
}
```

---

## Transações Normais

Para transações **não parceladas** e **não recorrentes**:
- Todos os modos (`single`, `future`, `all`) têm o **mesmo efeito**
- Deleta apenas a transação especificada

```bash
# Estes 3 comandos têm o mesmo resultado para transações normais:
DELETE /api/transactions/:id?deleteMode=single
DELETE /api/transactions/:id?deleteMode=future
DELETE /api/transactions/:id?deleteMode=all
```

---

## Exemplos Práticos

### Exemplo 1: Parcelamento de Compra

**Cenário:**
- Compra parcelada em 6x de R$ 100
- Parcelas: 1/6 (paid), 2/6 (paid), 3/6 (pending), 4/6 (pending), 5/6 (scheduled), 6/6 (scheduled)
- Usuário quer deletar parcela 3/6

**Opção A - Deletar só a parcela 3:**
```bash
DELETE /api/transactions/uuid-parcela-3?companyId=xxx&deleteMode=single
# Deleta: 3/6 (1 transação)
# Mantém: 1/6, 2/6, 4/6, 5/6, 6/6
```

**Opção B - Deletar parcela 3 e futuras não pagas:**
```bash
DELETE /api/transactions/uuid-parcela-3?companyId=xxx&deleteMode=future
# Deleta: 3/6, 4/6, 5/6, 6/6 (4 transações)
# Mantém: 1/6, 2/6 (já pagas)
```

**Opção C - Deletar todo o parcelamento:**
```bash
DELETE /api/transactions/uuid-parcela-3?companyId=xxx&deleteMode=all
# Deleta: 1/6, 2/6, 3/6, 4/6, 5/6, 6/6 (6 transações)
```

---

### Exemplo 2: Recorrência Mensal

**Cenário:**
- Aluguel recorrente mensal de R$ 1.500
- Transações: Jan (paid), Fev (paid), Mar (pending), Abr (scheduled), Mai (scheduled), ...
- Usuário quer deletar a de Março

**Opção A - Deletar só Março:**
```bash
DELETE /api/transactions/uuid-marco?companyId=xxx&deleteMode=single
# Deleta: Mar (1 transação)
# Mantém: Jan, Fev, Abr, Mai, ...
```

**Opção B - Deletar Março e meses futuros não pagos:**
```bash
DELETE /api/transactions/uuid-marco?companyId=xxx&deleteMode=future
# Deleta: Mar, Abr, Mai, Jun, ... (todas futuras não pagas)
# Mantém: Jan, Fev (já pagas)
```

**Opção C - Deletar toda a recorrência:**
```bash
DELETE /api/transactions/uuid-marco?companyId=xxx&deleteMode=all
# Deleta: Jan, Fev, Mar, Abr, Mai, ... (TODAS)
```

---

## Códigos de Status

| Código | Descrição |
|--------|-----------|
| 200 | Transação(ões) deletada(s) com sucesso |
| 400 | `deleteMode` inválido ou parâmetros faltando |
| 401 | Não autenticado |
| 404 | Transação não encontrada |
| 500 | Erro interno do servidor |

---

## Notas Importantes

⚠️ **Atenção:**
- Deleção é **permanente** e não pode ser desfeita
- Use `deleteMode=all` com cautela em transações já pagas
- Para recorrências, deletar transações NÃO cancela a regra de recorrência (use `DELETE /api/transactions/recurring/:id`)

💡 **Dicas:**
- Para cancelar um parcelamento futuro, use `deleteMode=future`
- Para remover uma compra parcelada completamente, use `deleteMode=all`
- Para remover apenas uma parcela específica que teve problema, use `deleteMode=single`

🔒 **Segurança:**
- Todas as operações verificam `companyId` para garantir que o usuário tem permissão
- Não é possível deletar transações de outras empresas
