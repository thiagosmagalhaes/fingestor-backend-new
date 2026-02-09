# Integração: Transações Financeiras Automáticas para Vendas

## O que mudou?

Agora quando uma venda é criada no PDV, o sistema **automaticamente cria uma transação financeira** correspondente, respeitando:
✅ **Prazo de recebimento** definido no método de pagamento (`days_to_receive`)
✅ **Desconto de taxas** aplicadas ao método de pagamento
✅ **Notas detalhadas** com valor bruto, taxa paga e data da venda
✅ **Vinculação à venda** para exclusão em cascata se cancelada

---

## Como funciona?

### Criação Automática de Transação

Quando uma venda é registrada com as seguintes condições:
- ✅ Possui `payment_method_id` (método de pagamento definido)
- ✅ Status **não é** `draft` ou `cancelled`
- ✅ Payment status é `paid` ou `partial`

O sistema **automaticamente**:

1. **Busca informações do método de pagamento**
   - Nome do método
   - Taxa percentual (`fee_percentage`)
   - Taxa fixa (`fee_fixed_amount`)
   - Dias até recebimento (`days_to_receive`)

2. **Calcula valores**
   ```
   Taxa Total = (Valor Venda × fee_percentage ÷ 100) + fee_fixed_amount
   Valor Líquido = Valor Venda - Taxa Total
   ```

3. **Determina data de recebimento**
   ```
   Data Recebimento = Data da Venda + days_to_receive dias
   ```

4. **Define status da transação**
   - `paid` se data de recebimento ≤ data atual
   - `pending` se data de recebimento > data atual

5. **Cria transação com nota formatada**
   ```
   Venda realizada em DD/MM/YYYY - Valor bruto: R$ XX,XX - Taxa aplicada: R$ Y,YY (Z.ZZ%) - Método: Nome do Método
   ```

### Exemplo Prático

**Venda criada:**
- Data: 08/02/2026
- Valor total: R$ 59,90
- Método: Cartão Crédito Visa
  - Taxa: 3,5%
  - Taxa fixa: R$ 0,00
  - Dias para recebimento: 30

**Cálculos:**
```
Taxa = (59,90 × 3,5 ÷ 100) + 0,00 = R$ 2,10
Valor Líquido = 59,90 - 2,10 = R$ 57,80
Data Recebimento = 08/02/2026 + 30 dias = 10/03/2026
```

**Transação criada:**
```json
{
  "id": "uuid",
  "company_id": "uuid",
  "sale_id": "uuid-da-venda",
  "type": "income",
  "description": "Recebimento de venda - Cartão Crédito Visa",
  "amount": 57.80,
  "date": "2026-03-10",
  "status": "pending",
  "notes": "Venda realizada em 08/02/2026 - Valor bruto: R$ 59,90 - Taxa aplicada: R$ 2,10 (3,50%) - Método: Cartão Crédito Visa"
}
```

---

## Vinculação com Venda

A transação é vinculada à venda através do campo `sale_id`. Isso significa:

### ✅ Exclusão Automática
A transação vinculada é **automaticamente deletada** quando:
- A venda é **deletada** (hard delete)
- A venda é **cancelada** (via função `cancel_sale`)

### ✅ Cancelamento de Venda
Quando uma venda é **cancelada** (função `cancel_sale`):
- ✅ Status da venda muda para `cancelled`
- ✅ Estoque é devolvido
- ✅ Parcelas pendentes são canceladas
- ✅ **Transação financeira é deletada automaticamente**

**Vantagem:** Mantém a integridade financeira, removendo recebimentos que não ocorrerão devido ao cancelamento da venda.

---

## Novos Campos

### Tabela `transactions`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `sale_id` | UUID (nullable) | ID da venda que originou esta transação |

**Foreign Key:** `REFERENCES sales(id) ON DELETE CASCADE`

---

## API - Endpoints Afetados

### GET /api/transactions

**Mudança:** Agora retorna o campo `sale_id` quando a transação foi criada automaticamente por uma venda.

**Exemplo de resposta:**
```json
{
  "id": "uuid",
  "company_id": "uuid",
  "sale_id": "uuid-da-venda",
  "type": "income",
  "description": "Recebimento de venda - PIX",
  "amount": 100.00,
  "date": "2026-02-08",
  "status": "paid",
  "notes": "Venda realizada em 08/02/2026 - Valor bruto: R$ 100,00 - Taxa aplicada: R$ 0,00 (0,00%) - Método: PIX",
  "created_at": "2026-02-08T15:30:00Z",
  "updated_at": "2026-02-08T15:30:00Z"
}
```

### POST /api/sales

**Comportamento:** Ao criar uma venda, uma transação é **automaticamente criada** em background (via trigger de banco de dados).

**Não é necessário** fazer nenhuma chamada adicional para criar a transação.

**Requisitos para criação automática:**
```json
{
  "companyId": "uuid",
  "paymentMethodId": "uuid",  // ← OBRIGATÓRIO para criar transação
  "paymentStatus": "paid",     // ← Deve ser 'paid' ou 'partial'
  "status": "completed",       // ← Não pode ser 'draft' ou 'cancelled'
  "totalAmount": 59.90,
  "items": [...]
}
```

---

## O que o Frontend deve ajustar?

### 1. **Exibir campo sale_id em transações**

Nas listagens e detalhes de transações, considere mostrar quando uma transação foi originada de uma venda:

```jsx
{transaction.sale_id && (
  <Badge variant="info">
    Venda #{sale_number}
  </Badge>
)}
```

### 2. **Buscar transações de uma venda específica**

Para ver a transação financeira de uma venda:

```typescript
const getTransactionFromSale = async (saleId: string) => {
  const response = await fetch(
    `/api/transactions?companyId=${companyId}&saleId=${saleId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.json();
};
```

**Nota:** Será necessário adicionar filtro por `sale_id` no backend se ainda não existir.

### 3. **Mostrar informações de recebimento na venda**

Na tela de detalhes da venda, considere mostrar:
- Data de recebimento prevista
- Valor líquido após taxas
- Valor das taxas

```jsx
<VendaDetalhes venda={venda}>
  {venda.payment_method_id && (
    <RecebimentoInfo>
      <div>
        <Label>Valor Bruto:</Label>
        <Value>R$ {venda.total_amount.toFixed(2)}</Value>
      </div>
      <div>
        <Label>Taxa:</Label>
        <Value>R$ {calcularTaxa(venda).toFixed(2)}</Value>
      </div>
      <div>
        <Label>Valor Líquido:</Label>
        <Value>R$ {calcularLiquido(venda).toFixed(2)}</Value>
      </div>
      <div>
        <Label>Recebimento em:</Label>
        <Value>{formatarDataRecebimento(venda)}</Value>
      </div>
    </RecebimentoInfo>
  )}
</VendaDetalhes>
```

### 4. **Alertas sobre transações vinculadas**

Ao cancelar uma venda, informe o usuário sobre as consequências:

```jsx
<Dialog title="Cancelar Venda">
  <Warning>
    Esta ação irá:
    • Cancelar a venda e devolver o estoque
    • Cancelar parcelas pendentes
    • Deletar a transação financeira vinculada
    
    Esta ação não pode ser desfeita.
  </Warning>
  <Input 
    label="Motivo do cancelamento" 
    required 
  />
  <Button onClick={cancelarVenda} variant="destructive">
    Confirmar Cancelamento
  </Button>
</Dialog>
```

### 5. **Dashboard Financeiro**

Considere adicionar filtros para transações:
- Transações de vendas
- Transações manuais
- Por método de pagamento

```jsx
<FilterBar>
  <Select label="Origem">
    <option value="all">Todas</option>
    <option value="sales">Vendas</option>
    <option value="manual">Manuais</option>
  </Select>
</FilterBar>
```

---

## Funções de Banco de Dados Criadas

### `create_transaction_from_sale`

**Parâmetros:**
- `p_sale_id` - ID da venda
- `p_company_id` - ID da empresa
- `p_amount` - Valor total da venda
- `p_payment_method_id` - ID do método de pagamento
- `p_sale_date` - Data da venda

**Retorna:** UUID da transação criada

**Uso:** Esta função é chamada automaticamente pelo trigger. Não precisa ser chamada manualmente.

### Trigger: `trigger_auto_create_transaction_from_sale`

**Quando:** AFTER INSERT em `sales`

**Condições:**
- `payment_method_id IS NOT NULL`
- `status NOT IN ('draft', 'cancelled')`
- `payment_status IN ('paid', 'partial')`

**Ação:** Chama `create_transaction_from_sale` automaticamente

---

## Casos de Uso

### ✅ Caso 1: Venda com PIX (recebimento imediato)
```
Venda: R$ 100,00
Método: PIX (0% taxa, D+0)
→ Transação: R$ 100,00, data hoje, status: paid
```

### ✅ Caso 2: Venda com Débito (recebimento D+1)
```
Venda: R$ 150,00
Método: Débito Visa (2,5% taxa, D+1)
Taxa: R$ 3,75
→ Transação: R$ 146,25, data amanhã, status: pending
```

### ✅ Caso 3: Venda com Crédito (recebimento D+30)
```
Venda: R$ 500,00
Método: Crédito Mastercard (3,5% taxa + R$0,50, D+30)
Taxa: R$ 18,00
→ Transação: R$ 482,00, data +30 dias, status: pending
```

### ✅ Caso 4: Venda com Dinheiro (recebimento imediato, sem taxa)
```
Venda: R$ 50,00
Método: Dinheiro (0% taxa, D+0)
→ Transação: R$ 50,00, data hoje, status: paid
```

### ❌ Caso 5: Venda sem método de pagamento definido
```
Venda: R$ 200,00
Método: null
→ Transação: NÃO CRIADA (trigger não é acionado)
```

### ❌ Caso 6: Venda em rascunho
```
Venda: R$ 300,00
Status: draft
→ Transação: NÃO CRIADA (aguardando conclusão)
```

---

## Testando a Funcionalidade

### 1. Criar uma venda completa

```bash
curl -X POST https://api.seudominio.com/api/sales \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid",
    "customerId": "uuid",
    "paymentMethodId": "uuid-cartao-credito",
    "paymentStatus": "paid",
    "status": "completed",
    "paidAmount": 59.90,
    "items": [
      {
        "productServiceId": "uuid",
        "quantity": 1,
        "unitPrice": 59.90
      }
    ]
  }'
```

### 2. Verificar transação criada

```bash
curl -X GET "https://api.seudominio.com/api/transactions?companyId=uuid" \
  -H "Authorization: Bearer {token}"
```

Procure por uma transação com:
- `sale_id` igual ao ID da venda criada
- `amount` com valor líquido (após taxas)
- `notes` contendo detalhes da venda

---

## Observações Importantes

⚠️ **Taxas são descontadas do valor da venda**
O usuário recebe oexclui transação**
Quando uma venda é cancelada, a transação financeira vinculada é automaticamente deletada do sistema
⚠️ **Transação não é criada para vendas em rascunho**
Apenas vendas com status `completed` ou `refunded` geram transações.

⚠️ **Cancelamento não exclui transação**
Por segurança contábil, transações não são excluídas quando a venda é cancelada. Apenas se a venda for deletada (hard delete).

⚠️ **Método de pagamento é obrigatório**
Para criar a transação automaticamente, a venda **deve** ter `payment_method_id` definido.

---

## Compatibilidade

✅ **Vendas antigas:** Vendas criadas antes desta atualização não terão transações vinculadas. A funcionalidade é apenas para novas vendas.

✅ **Transações manuais:** Transações criadas manualmente não terão `sale_id` e continuam funcionando normalmente.

✅ **Métodos sem taxas:** Se o método de pagamento tiver taxa 0%, a transação será criada com o valor integral.

---

## Precisa de ajuda?

Se tiver dúvidas sobre como implementar essa integração no frontend ou precisar de endpoints adicionais, entre em contato com a equipe de backend.
