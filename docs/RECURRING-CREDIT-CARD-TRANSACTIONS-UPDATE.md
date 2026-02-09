# Transações Recorrentes com Cartão de Crédito

## Resumo da Atualização

As transações recorrentes agora **podem ser vinculadas a cartões de crédito**. A única restrição que permanece é que **transações recorrentes não podem ser parceladas**.

## Regras de Negócio

### ✅ Permitido
- Criar transação recorrente vinculada a um cartão de crédito
- Converter transação com cartão de crédito em transação recorrente
- Editar transação recorrente para adicionar/remover cartão de crédito

### ❌ Não Permitido
- Criar transação que seja recorrente E parcelada ao mesmo tempo
- Parcelar uma transação recorrente existente

---

## 1. Criar Transação Recorrente com Cartão de Crédito

### Endpoint
```
POST /api/transactions
```

### Instruções

Para criar uma transação recorrente vinculada a um cartão de crédito, você deve:

1. Enviar `isRecurring: true`
2. Informar a `recurringFrequency` (7, 15 ou 30 dias)
3. Informar `isCreditCard: true`
4. Informar o `creditCardId` do cartão desejado
5. **NÃO** enviar `isInstallment: true` (isso causará erro)

### Exemplo de Requisição

```bash
curl -X POST https://api.seudominio.com/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "companyId": "uuid-da-empresa",
    "categoryId": "uuid-da-categoria",
    "type": "expense",
    "description": "Netflix - Assinatura Mensal",
    "amount": 45.90,
    "date": "2026-02-05",
    "status": "pending",
    "isRecurring": true,
    "recurringFrequency": "30",
    "recurringEndDate": "2027-02-05",
    "isCreditCard": true,
    "creditCardId": "uuid-do-cartao",
    "notes": "Renovação automática"
  }'
```

### Resposta Esperada (201 Created)

```json
{
  "message": "Transação recorrente criada com sucesso",
  "recurring_rule": {
    "id": "uuid-da-regra",
    "company_id": "uuid-da-empresa",
    "category_id": "uuid-da-categoria",
    "type": "expense",
    "description": "Netflix - Assinatura Mensal",
    "amount": 45.90,
    "frequency": "30",
    "start_date": "2026-02-05",
    "end_date": "2027-02-05",
    "is_active": true,
    "credit_card_id": "uuid-do-cartao",
    "is_credit_card": true,
    "created_at": "2026-02-05T10:30:00.000Z",
    "updated_at": "2026-02-05T10:30:00.000Z"
  },
  "info": "Transações geradas até 2027-02-05"
}
```

### Possíveis Erros

**400 - Recorrente e parcelada ao mesmo tempo**
```json
{
  "error": "Não é possível criar uma transação recorrente e parcelada ao mesmo tempo"
}
```

**404 - Cartão de crédito não encontrado**
```json
{
  "error": "Cartão de crédito não encontrado ou não pertence a esta empresa"
}
```

---

## 2. Converter Transação Existente em Recorrente (com Cartão)

### Endpoint
```
PUT /api/transactions/:id?companyId=xxx
```

### Instruções

Para converter uma transação existente (inclusive se já tiver cartão de crédito) em transação recorrente:

1. Enviar `isRecurring: true`
2. Informar a `recurringFrequency` (7, 15 ou 30 dias)
3. Opcionalmente informar `recurringEndDate`
4. A transação original será **deletada** e substituída pela regra recorrente

### Exemplo de Requisição

```bash
curl -X PUT https://api.seudominio.com/api/transactions/uuid-da-transacao?companyId=uuid-da-empresa \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "isRecurring": true,
    "recurringFrequency": "30",
    "recurringEndDate": "2027-02-05"
  }'
```

### Resposta Esperada (200 OK)

```json
{
  "id": "novo-uuid",
  "company_id": "uuid-da-empresa",
  "category_id": "uuid-da-categoria",
  "type": "expense",
  "description": "Descrição original",
  "amount": 100.00,
  "date": "2026-02-05",
  "status": "pending",
  "is_credit_card": true,
  "credit_card_id": "uuid-do-cartao",
  "recurring_transaction_id": "uuid-da-regra-recorrente",
  "recurring_transaction": {
    "id": "uuid-da-regra-recorrente",
    "description": "Descrição original",
    "frequency": "30",
    "start_date": "2026-02-05",
    "end_date": "2027-02-05",
    "is_active": true
  },
  "category": {
    "id": "uuid-da-categoria",
    "name": "Nome da Categoria",
    "type": "expense",
    "color": "#FF5733"
  },
  "credit_card": {
    "id": "uuid-do-cartao",
    "name": "Nubank",
    "brand": "Mastercard"
  }
}
```

### Possíveis Erros

**400 - Já é recorrente**
```json
{
  "error": "Esta transação já é recorrente e não pode ser convertida novamente"
}
```

**400 - É uma parcela**
```json
{
  "error": "Não é possível converter uma parcela de parcelamento em transação recorrente"
}
```

---

## 3. Editar Transação Recorrente para Adicionar Cartão

### Endpoint
```
PUT /api/transactions/:id?companyId=xxx
```

### Instruções

Para adicionar ou alterar o cartão de crédito de uma transação recorrente:

1. Enviar `isCreditCard: true` para vincular
2. Enviar o `creditCardId` do cartão desejado
3. Para remover o cartão, enviar `isCreditCard: false`

### Exemplo de Requisição (Adicionar Cartão)

```bash
curl -X PUT https://api.seudominio.com/api/transactions/uuid-da-transacao?companyId=uuid-da-empresa \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "isCreditCard": true,
    "creditCardId": "uuid-do-novo-cartao"
  }'
```

### Exemplo de Requisição (Remover Cartão)

```bash
curl -X PUT https://api.seudominio.com/api/transactions/uuid-da-transacao?companyId=uuid-da-empresa \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "isCreditCard": false
  }'
```

### Resposta Esperada (200 OK)

```json
{
  "id": "uuid-da-transacao",
  "company_id": "uuid-da-empresa",
  "description": "Descrição",
  "amount": 100.00,
  "is_credit_card": true,
  "credit_card_id": "uuid-do-novo-cartao",
  "recurring_transaction_id": "uuid-da-regra",
  "updated_at": "2026-02-05T11:00:00.000Z",
  "credit_card": {
    "id": "uuid-do-novo-cartao",
    "name": "Novo Cartão",
    "brand": "Visa"
  }
}
```

---

## Regras para o Frontend

### Validações de Formulário

1. **Checkbox de Recorrência e Parcelamento**
   - Se o usuário marcar "Recorrente", desabilite a opção "Parcelar"
   - Se o usuário marcar "Parcelar", desabilite a opção "Recorrente"
   - Exiba mensagem: "Transações recorrentes não podem ser parceladas"

2. **Campo de Cartão de Crédito**
   - Permitir seleção de cartão tanto para transações recorrentes quanto não-recorrentes
   - O campo de cartão deve estar disponível mesmo quando "Recorrente" estiver marcado

3. **Conversão de Transação**
   - Ao converter uma transação em recorrente, avisar o usuário que:
     - A transação original será deletada
     - Novas transações serão geradas automaticamente
     - O cartão vinculado (se houver) será mantido

### Exibição de Dados

1. **Lista de Transações**
   - Transações recorrentes com cartão devem exibir:
     - Ícone de recorrência
     - Nome/ícone do cartão de crédito
     - Badge indicando a frequência (Semanal, Quinzenal, Mensal)

2. **Detalhes da Transação**
   - Mostrar informações da regra de recorrência
   - Mostrar cartão vinculado, se houver
   - Permitir editar/remover cartão
   - Permitir pausar/retomar recorrência

### Mensagens de Feedback

**Sucesso ao criar:**
```
✓ Transação recorrente criada com sucesso!
As transações serão geradas automaticamente até [data final]
```

**Sucesso ao converter:**
```
✓ Transação convertida em recorrente!
A transação original foi deletada e novas transações foram geradas até [data final]
```

**Erro ao tentar parcelar transação recorrente:**
```
✗ Não é possível parcelar uma transação recorrente.
Escolha apenas uma das opções: Recorrente OU Parcelada
```

### Fluxos Recomendados

#### Criar Assinatura de Streaming
1. Usuário seleciona categoria "Entretenimento"
2. Marca "Recorrente" (campo "Parcelar" fica desabilitado)
3. Seleciona frequência "Mensal (30 dias)"
4. Seleciona cartão de crédito "Nubank"
5. Define data final (ex: 1 ano)
6. Salva → Sistema gera 12 transações mensais no cartão

#### Converter Despesa Única em Recorrente
1. Usuário visualiza transação existente
2. Clica em "Converter para Recorrente"
3. Seleciona frequência
4. Confirma conversão
5. Sistema deleta transação original e cria regra recorrente
6. Cartão vinculado é mantido automaticamente

---

## Perguntas Frequentes

**P: Posso criar uma transação recorrente SEM cartão de crédito?**
R: Sim, o cartão é opcional. Basta não enviar `isCreditCard` ou enviá-lo como `false`.

**P: O que acontece com as transações já geradas se eu adicionar um cartão à regra recorrente?**
R: Apenas as novas transações geradas após a edição terão o cartão vinculado. As transações já existentes não serão alteradas.

**P: Posso parcelar uma transação recorrente?**
R: Não. Transações recorrentes e parceladas são mutuamente exclusivas.

**P: A data das transações recorrentes mantém o mesmo dia do mês?**
R: Sim. Para frequência de 30 dias (mensal), o sistema incrementa o mês mantendo o mesmo dia (ex: dia 5 sempre será dia 5).

**P: Posso ter uma transação recorrente semanal no cartão de crédito?**
R: Sim, basta usar `recurringFrequency: "7"` com `isCreditCard: true`.

---

## Changelog

**2026-02-05**
- ✅ Removida restrição que impedia transações recorrentes com cartão de crédito
- ✅ Mantida restrição de não permitir transações recorrentes E parceladas
- ✅ Adicionado suporte a `credit_card_id` na tabela `recurring_transactions`
- ✅ Transações geradas automaticamente herdam o cartão da regra recorrente
