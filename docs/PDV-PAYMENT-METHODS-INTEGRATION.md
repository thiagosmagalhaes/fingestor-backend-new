# Mudanças no PDV - Integração com Formas de Pagamento Customizáveis

## Visão Geral das Mudanças

O sistema PDV foi atualizado para suportar **formas de pagamento customizáveis**. Agora cada empresa pode cadastrar suas próprias formas de pagamento com taxas específicas.

## O que mudou?

### Antes
- Formas de pagamento eram strings fixas: `"credit_card"`, `"pix"`, `"money"`, etc
- Sem suporte a taxas automáticas
- Sem validação de parcelamento

### Agora
- Formas de pagamento são cadastradas pela empresa
- Cada forma pode ter taxas configuradas
- Taxas diferentes por número de parcelas (para cartões)
- Validação automática de parcelamento
- Campo `payment_method_id` (UUID) adicionado

## Compatibilidade

✅ **O sistema é totalmente retrocompatível!**

- Campo `payment_method` (string) continua funcionando
- Novos sistemas devem usar `payment_method_id` (UUID)
- Se ambos forem enviados, `payment_method_id` tem prioridade

---

## Mudanças nos Endpoints

### 1. Criar Venda - POST /api/sales

#### Campo Novo

**Adicionar:**
- `paymentMethodId` (UUID, opcional): ID da forma de pagamento cadastrada

**Manter (opcional):**
- `paymentMethod` (string): Nome da forma de pagamento (compatibilidade)

#### Exemplo ANTES:

```bash
curl -X POST "https://api.fingestor.com/api/sales" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-empresa",
    "paymentMethod": "credit_card",
    "items": [...]
  }'
```

#### Exemplo AGORA (recomendado):

```bash
curl -X POST "https://api.fingestor.com/api/sales" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-empresa",
    "paymentMethodId": "uuid-forma-pagamento",
    "items": [...]
  }'
```

#### Resposta Atualizada:

Agora inclui `payment_method_id`:

```json
{
  "id": "uuid-venda",
  "company_id": "uuid-empresa",
  "sale_number": "VEN-2026-00001",
  "payment_method": "Cartão Visa Crédito",
  "payment_method_id": "uuid-visa-credito",
  "total_amount": 1000.00,
  ...
}
```

---

### 2. Atualizar Venda - PUT /api/sales/:id

#### Campo Novo

**Adicionar:**
- `paymentMethodId` (UUID, opcional): Para alterar a forma de pagamento

#### Exemplo:

```bash
curl -X PUT "https://api.fingestor.com/api/sales/uuid-venda" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-empresa",
    "paymentMethodId": "uuid-nova-forma"
  }'
```

---

### 3. Converter Orçamento em Venda - POST /api/sales/convert-budget

#### Campo Novo

**Adicionar:**
- `paymentMethodId` (UUID, opcional): ID da forma de pagamento

#### Exemplo ANTES:

```bash
curl -X POST "https://api.fingestor.com/api/sales/convert-budget" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetId": "uuid-orcamento",
    "paymentMethod": "credit_card",
    "installments": 3
  }'
```

#### Exemplo AGORA:

```bash
curl -X POST "https://api.fingestor.com/api/sales/convert-budget" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetId": "uuid-orcamento",
    "paymentMethodId": "uuid-forma",
    "installments": 3
  }'
```

---

### 4. Pagar Parcela - POST /api/sales/installments/:id/pay

#### Campo Novo

**Adicionar:**
- `paymentMethodId` (UUID, opcional): ID da forma de pagamento usada no pagamento

#### Exemplo:

```bash
curl -X POST "https://api.fingestor.com/api/sales/installments/uuid-parcela/pay" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "paidAmount": 350.00,
    "paymentMethodId": "uuid-pix",
    "notes": "Pagamento via PIX"
  }'
```

#### Resposta:

```json
{
  "id": "uuid-parcela",
  "sale_id": "uuid-venda",
  "installment_number": 2,
  "amount": 350.00,
  "paid_amount": 350.00,
  "status": "paid",
  "payment_method": "PIX",
  "payment_method_id": "uuid-pix",
  "paid_at": "2026-02-08T14:30:00Z"
}
```

---

## Novo Fluxo Recomendado no Frontend

### Passo 1: Listar Formas de Pagamento

Ao abrir a tela de criar/editar venda, buscar as formas de pagamento da empresa:

```bash
curl -X GET "https://api.fingestor.com/api/payment-methods?companyId=uuid-empresa" \
  -H "Authorization: Bearer seu_token"
```

**Resposta:**

```json
[
  {
    "id": "uuid-1",
    "name": "Dinheiro",
    "type": "cash",
    "is_default": true,
    "is_active": true,
    "fee_percentage": 0,
    "allow_installments": false
  },
  {
    "id": "uuid-2",
    "name": "PIX",
    "type": "pix",
    "is_active": true,
    "fee_percentage": 1.5,
    "allow_installments": false
  },
  {
    "id": "uuid-3",
    "name": "Cartão Visa Crédito",
    "type": "card",
    "card_type": "credit",
    "card_brand": "Visa",
    "is_active": true,
    "allow_installments": true,
    "max_installments": 12,
    "min_installment_amount": 50,
    "installment_fees": {
      "1": 2.5,
      "2": 3.0,
      "3": 3.5,
      "6": 4.0,
      "12": 5.0
    }
  }
]
```

### Passo 2: Exibir Formas de Pagamento

O frontend deve:

1. **Exibir lista** ordenada por `display_order`
2. **Marcar a padrão** visualmente (`is_default: true`)
3. **Exibir ícones** baseados em `type`:
   - `cash` → 💵 Dinheiro
   - `pix` → 📱 PIX
   - `card` → 💳 Cartão
   - `other` → 📄 Outro
4. **Mostrar informações adicionais** para cartões:
   - `card_brand`: Visa, Mastercard, etc
   - `card_type`: débito, crédito, ambos

### Passo 3: Validar Parcelamento (se aplicável)

Quando usuário selecionar uma forma de pagamento:

**Se `allow_installments: false`:**
- Não mostrar opção de parcelamento
- Definir `installments: 1`

**Se `allow_installments: true`:**
- Mostrar opção de parcelamento
- Limitar escolha até `max_installments`
- Validar se valor da parcela >= `min_installment_amount`

**Exemplo de validação:**
```javascript
// Pseudo-código
if (paymentMethod.allow_installments) {
  const installmentAmount = totalAmount / selectedInstallments;
  
  if (selectedInstallments > paymentMethod.max_installments) {
    // Mostrar erro: "Máximo de X parcelas para esta forma de pagamento"
  }
  
  if (installmentAmount < paymentMethod.min_installment_amount) {
    // Mostrar erro: "Valor mínimo por parcela: R$ X"
  }
}
```

### Passo 4: Calcular Taxa

Antes de finalizar a venda, calcular a taxa:

```bash
curl -X POST "https://api.fingestor.com/api/payment-methods/calculate-fee" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-empresa",
    "paymentMethodId": "uuid-visa-credito",
    "amount": 1000.00,
    "installments": 3
  }'
```

**Resposta:**

```json
{
  "amount": 1000.00,
  "feeAmount": 35.00,
  "totalAmount": 1035.00,
  "feePercentage": 3.5,
  "feeFixedAmount": 0
}
```

### Passo 5: Exibir Resumo

Mostrar claramente ao cliente:

```
┌─────────────────────────────────────┐
│ Resumo da Venda                     │
├─────────────────────────────────────┤
│ Subtotal:          R$ 1.000,00      │
│ Taxa (3.5%):       R$    35,00      │
│ ═══════════════════════════════════ │
│ Total:             R$ 1.035,00      │
│ 3x de R$ 345,00                     │
└─────────────────────────────────────┘
```

### Passo 6: Criar Venda

```bash
curl -X POST "https://api.fingestor.com/api/sales" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-empresa",
    "paymentMethodId": "uuid-visa-credito",
    "installments": 3,
    "items": [
      {
        "productServiceId": "uuid-produto",
        "quantity": 1,
        "unitPrice": 1000.00
      }
    ]
  }'
```

---

## Regras que o Frontend Deve Seguir

### 1. Sempre Buscar Formas de Pagamento

❌ **Não faça:**
```javascript
// Não usar formas de pagamento fixas no código
const paymentMethods = ["cash", "credit_card", "pix"];
```

✅ **Faça:**
```javascript
// Buscar do backend para cada empresa
const paymentMethods = await fetch('/api/payment-methods?companyId=...');
```

### 2. Usar payment_method_id

❌ **Evite (apenas para compatibilidade):**
```json
{
  "paymentMethod": "credit_card"
}
```

✅ **Prefira:**
```json
{
  "paymentMethodId": "uuid-forma-pagamento"
}
```

### 3. Validar Parcelamento

O frontend deve validar **antes** de enviar:

✅ **Validações obrigatórias:**
- `installments` <= `max_installments`
- `totalAmount / installments` >= `min_installment_amount`
- Apenas se `allow_installments: true`

### 4. Mostrar Taxas Claramente

Se houver taxa (`feeAmount > 0`):

✅ **Deixar claro para o usuário:**
- Valor original
- Taxa aplicada (valor e %)
- Valor total com taxa
- Informar que a taxa é da operadora/forma de pagamento

### 5. Exibir Tabela de Taxas por Parcela

Para cartões com `installment_fees`, mostrar tabela comparativa:

```
┌──────────────────────────────────┐
│ Parcelamento Cartão Visa Crédito │
├──────────────────────────────────┤
│ 1x  - Taxa: 2.5% - R$ 1.025,00   │
│ 2x  - Taxa: 3.0% - R$ 1.030,00   │
│ 3x  - Taxa: 3.5% - R$ 1.035,00   │
│ 6x  - Taxa: 4.0% - R$ 1.040,00   │
│ 12x - Taxa: 5.0% - R$ 1.050,00   │
└──────────────────────────────────┘
```

### 6. Destacar Forma de Pagamento Padrão

A forma com `is_default: true` deve:
- Vir pré-selecionada
- Ter badge/tag "Padrão"
- Aparecer em destaque visualmente

### 7. Filtrar Formas Inativas

Por padrão, o endpoint retorna apenas formas ativas.

Se precisar mostrar inativas (ex: em relatórios):
```bash
GET /api/payment-methods?companyId=xxx&includeInactive=true
```

---

## Erros Comuns e Como Tratar

### Erro 1: Parcelas Acima do Permitido

**Cenário:** Usuário tenta parcelar em 18x, mas forma permite apenas 12x

**Resposta do Backend:**
```json
{
  "error": "Número de parcelas excede o máximo permitido"
}
```

**O que o Frontend Deve Fazer:**
- Validar **antes** de enviar
- Desabilitar opções acima de `max_installments` no select
- Mostrar mensagem: "Esta forma permite no máximo X parcelas"

### Erro 2: Valor da Parcela Muito Baixo

**Cenário:** R$ 100 parcelado em 10x = R$ 10/parcela, mas mínimo é R$ 50

**O que o Frontend Deve Fazer:**
- Calcular: `totalAmount / installments`
- Se < `min_installment_amount`: desabilitar opção
- Mostrar: "Valor mínimo por parcela: R$ 50,00"

### Erro 3: Forma de Pagamento Não Permite Parcelamento

**Cenário:** Usuário tenta parcelar PIX (que não permite)

**O que o Frontend Deve Fazer:**
- Verificar `allow_installments: false`
- Não mostrar opção de parcelamento
- Fixar em 1x

---

## Migrando Sistema Antigo

Se seu frontend já está funcionando com strings:

### Opção 1: Migração Gradual (Recomendado)

**Fase 1:** Adicionar suporte a `payment_method_id` sem quebrar o existente
```javascript
// Aceitar ambos
const paymentData = {
  paymentMethod: formData.paymentMethod, // String (antigo)
  paymentMethodId: formData.paymentMethodId // UUID (novo)
};
```

**Fase 2:** Adicionar tela de configuração de formas de pagamento

**Fase 3:** Migrar fluxo do PDV para usar `payment_method_id`

**Fase 4:** Depreciar uso de `paymentMethod` (string)

### Opção 2: Migração Imediata

1. Buscar formas de pagamento da empresa
2. Mapear strings antigas para UUIDs:
```javascript
const paymentMethodMap = {
  'cash': paymentMethods.find(pm => pm.type === 'cash')?.id,
  'pix': paymentMethods.find(pm => pm.type === 'pix')?.id,
  'credit_card': paymentMethods.find(pm => pm.type === 'card' && pm.card_type === 'credit')?.id
};
```
3. Usar mapeamento nas chamadas de API

---

## Exemplos de Interface

### Seletor de Forma de Pagamento

```
┌─────────────────────────────────────────┐
│ Forma de Pagamento                      │
├─────────────────────────────────────────┤
│ ○ 💵 Dinheiro [PADRÃO]                  │
│   Sem taxa                              │
├─────────────────────────────────────────┤
│ ○ 📱 PIX                                │
│   Taxa: 1.5%                            │
├─────────────────────────────────────────┤
│ ● 💳 Cartão Visa Crédito                │
│   Taxa: 2.5% à vista ou 3.5% em 3x     │
│   Parcela em até 12x (mín. R$ 50)      │
│                                         │
│   Parcelar em: [v]                      │
│   ┌───────────────────────────┐         │
│   │ 1x - Taxa 2.5% - À vista  │         │
│   │ 2x - Taxa 3.0%            │         │
│   │ 3x - Taxa 3.5%           ← │
│   │ 6x - Taxa 4.0%            │         │
│   │ 12x - Taxa 5.0%           │         │
│   └───────────────────────────┘         │
└─────────────────────────────────────────┘
```

### Resumo da Venda

```
┌─────────────────────────────────────────┐
│ 📊 Resumo da Venda                      │
├─────────────────────────────────────────┤
│ Subtotal:              R$ 1.000,00      │
│ Desconto:             -R$    50,00      │
│ ─────────────────────────────────────── │
│ Valor Líquido:         R$   950,00      │
│                                         │
│ Taxa Cartão (3.5%):   +R$    33,25      │
│ ═══════════════════════════════════════ │
│ TOTAL A PAGAR:         R$   983,25      │
│                                         │
│ Forma: Cartão Visa Crédito              │
│ 3x de R$ 327,75                         │
└─────────────────────────────────────────┘
```

---

## Checklist de Implementação

- [ ] Buscar formas de pagamento ao abrir tela de venda
- [ ] Exibir lista de formas disponíveis
- [ ] Destacar forma padrão
- [ ] Validar se permite parcelamento
- [ ] Validar número máximo de parcelas
- [ ] Validar valor mínimo por parcela
- [ ] Calcular taxa antes de finalizar
- [ ] Exibir taxa claramente no resumo
- [ ] Enviar `paymentMethodId` na criação de venda
- [ ] Enviar `paymentMethodId` ao pagar parcelas
- [ ] Tratar erros de validação
- [ ] Adicionar loading states
- [ ] Testar com diferentes formas de pagamento
- [ ] Testar com parcelamento
- [ ] Testar com taxas

---

## Endpoints Relacionados

Para implementação completa, consultar também:

📄 **[PAYMENT-METHODS-API-DOCUMENTATION.md](docs/PAYMENT-METHODS-API-DOCUMENTATION.md)**
- Como listar formas de pagamento
- Como criar/editar formas de pagamento
- Como calcular taxas
- Todos os tipos de formas disponíveis

📄 **[PDV-API-DOCUMENTATION.md](docs/PDV-API-DOCUMENTATION.md)**
- Documentação completa do sistema PDV
- Todos os endpoints de vendas
- Parcelamento
- Conversão de orçamentos

---

## Suporte

Para dúvidas sobre a implementação:
1. Consulte a documentação completa
2. Verifique os exemplos de CURL
3. Teste usando as rotas de desenvolvimento
4. Valide os campos obrigatórios

**Importante:** O sistema mantém total compatibilidade retroativa. Sistemas antigos continuam funcionando com `paymentMethod` (string).
