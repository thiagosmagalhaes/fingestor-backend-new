# Documentação de API - Sistema de Orçamentos e Follow-up

## Visão Geral

Esta documentação descreve os endpoints disponíveis para gerenciar clientes, orçamentos, tarefas de follow-up e o sistema de CRM integrado.

## Autenticação

Todos os endpoints requerem autenticação via token Bearer:

```
Authorization: Bearer {seu_access_token}
```

---

## 1. Clientes

### 1.1. Listar Clientes

**Endpoint:** `GET /api/customers`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa
- `search` (opcional): Busca por nome, email, telefone ou documento

**Exemplo de Requisição:**

```bash
curl -X GET "https://api.fingestor.com/api/customers?companyId=uuid-da-empresa&search=João" \
  -H "Authorization: Bearer seu_token"
```

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-cliente",
    "company_id": "uuid-da-empresa",
    "customer_type": "person",
    "document": "123.456.789-00",
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "(11) 98765-4321",
    "mobile": "(11) 91234-5678",
    "address": {
      "street": "Rua das Flores",
      "number": "123",
      "complement": "Apto 45",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "zip": "01234-567"
    },
    "birth_date": "1985-05-15",
    "notes": "Cliente preferencial",
    "tags": ["vip", "fidelizado"],
    "is_active": true,
    "metadata": {
      "preferredContact": "whatsapp"
    },
    "created_at": "2026-02-07T10:00:00Z",
    "updated_at": "2026-02-07T10:00:00Z"
  }
]
```

### 1.2. Obter Cliente por ID

**Endpoint:** `GET /api/customers/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

### 1.3. Criar Cliente

**Endpoint:** `POST /api/customers`

**Body:**

```json
{
  "companyId": "uuid-da-empresa",
  "customerType": "person",
  "document": "123.456.789-00",
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "(11) 98765-4321",
  "mobile": "(11) 91234-5678",
  "address": {
    "street": "Rua das Flores",
    "number": "123",
    "complement": "Apto 45",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zip": "01234-567"
  },
  "birthDate": "1985-05-15",
  "notes": "Cliente preferencial",
  "tags": ["vip", "fidelizado"],
  "metadata": {
    "preferredContact": "whatsapp"
  }
}
```

**Campos Obrigatórios:**
- `companyId`
- `name`
- `customerType` (`person` ou `company`)

**Exemplo de Requisição:**

```bash
curl -X POST "https://api.fingestor.com/api/customers" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "customerType": "person",
    "document": "123.456.789-00",
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "(11) 98765-4321"
  }'
```

**Resposta de Sucesso (201):** Retorna o cliente criado

**Erros Possíveis:**
- `400`: Dados obrigatórios não fornecidos
- `409`: Já existe um cliente com esse documento

### 1.4. Atualizar Cliente

**Endpoint:** `PUT /api/customers/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Body:** Todos os campos são opcionais

### 1.5. Excluir Cliente

**Endpoint:** `DELETE /api/customers/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

---

## 2. Interações com Clientes (CRM)

### 2.1. Listar Interações de um Cliente

**Endpoint:** `GET /api/customers/:customerId/interactions`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa
- `type` (opcional): Tipo de interação (`call`, `email`, `whatsapp`, `meeting`, `note`)
- `from` (opcional): Data inicial
- `to` (opcional): Data final

**Exemplo de Requisição:**

```bash
curl -X GET "https://api.fingestor.com/api/customers/uuid-cliente/interactions?companyId=uuid-da-empresa" \
  -H "Authorization: Bearer seu_token"
```

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-interacao",
    "company_id": "uuid-da-empresa",
    "customer_id": "uuid-cliente",
    "interaction_type": "call",
    "interaction_date": "2026-02-07T14:30:00Z",
    "subject": "Ligação sobre orçamento",
    "description": "Cliente demonstrou interesse em fechar negócio",
    "created_by": "uuid-usuario",
    "metadata": {
      "duration": "15min",
      "outcome": "positive"
    },
    "created_at": "2026-02-07T14:35:00Z"
  }
]
```

**Tipos de Interação:**
- `call`: Ligação telefônica
- `email`: E-mail enviado/recebido
- `whatsapp`: Mensagem via WhatsApp
- `meeting`: Reunião presencial
- `note`: Anotação/observação

### 2.2. Criar Interação

**Endpoint:** `POST /api/customers/:customerId/interactions`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Body:**

```json
{
  "interactionType": "call",
  "interactionDate": "2026-02-07T14:30:00Z",
  "subject": "Ligação sobre orçamento",
  "description": "Cliente demonstrou interesse em fechar negócio",
  "metadata": {
    "duration": "15min",
    "outcome": "positive"
  }
}
```

**Campos Obrigatórios:**
- `interactionType`
- `subject`

**Resposta de Sucesso (201):** Retorna a interação criada

---

## 3. Orçamentos

### 3.0. Obter Orçamento Público (Sem Autenticação)

**Endpoint:** `GET /public/budgets/:shareToken`

Este endpoint público permite que clientes acessem orçamentos compartilhados sem necessidade de autenticação. Cada orçamento possui um `share_token` único que é gerado automaticamente na criação.

**Parâmetros de URL:**
- `shareToken` (obrigatório): Token único de compartilhamento do orçamento

**Exemplo de Requisição:**

```bash
curl -X GET "https://api.fingestor.com/public/budgets/abc123def456..."
```

**Resposta de Sucesso (200):**

```json
{
  "id": "uuid-orcamento",
  "budget_number": "ORC-2026-00001",
  "customer_name": "João Silva",
  "customer_email": "joao@email.com",
  "customer_phone": "(11) 98765-4321",
  "subtotal": 5000.00,
  "discount_amount": 500.00,
  "discount_percentage": 10.00,
  "tax_amount": 0.00,
  "total_amount": 4500.00,
  "status": "sent",
  "issue_date": "2026-02-07",
  "expiry_date": "2026-02-22",
  "notes": "Orçamento para sistema de segurança",
  "terms": "Pagamento em 30 dias",
  "created_at": "2026-02-07T10:00:00Z",
  "is_expired": false,
  "budget_items": [
    {
      "id": "uuid-item",
      "item_type": "product",
      "product_service_id": "uuid-produto",
      "name": "Câmera IP 5MP",
      "sku": "CAM-001",
      "description": "Câmera IP de alta resolução",
      "quantity": 2,
      "unit_price": 2500.00,
      "discount_amount": 0,
      "discount_percentage": 0,
      "tax_percentage": 0,
      "total_amount": 5000.00,
      "sort_order": 0
    }
  ],
  "companies": {
    "id": "uuid-empresa",
    "name": "Empresa ABC",
    "cnpj": "12.345.678/0001-90"
  }
}
```

**Notas:**
- Este endpoint **não requer autenticação** (token Bearer)
- O `share_token` é gerado automaticamente ao criar um orçamento
- O campo `is_expired` indica se o orçamento está expirado baseado na `expiry_date`
- Apenas orçamentos não deletados podem ser acessados
- Informações sensíveis da empresa (documentos fiscais, dados bancários) não são expostas

**Erros:**
- `400`: Share token é obrigatório
- `404`: Orçamento não encontrado (token inválido ou orçamento deletado)
- `500`: Erro interno do servidor

**Uso no Frontend:**
Para gerar uma URL compartilhável, combine o share_token do orçamento:
```
https://seuapp.com/orcamentos/compartilhado/{share_token}
```

---

### 3.1. Listar Orçamentos

**Endpoint:** `GET /api/budgets`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa
- `customerId` (opcional): UUID do cliente
- `status` (opcional): `draft`, `sent`, `approved`, `rejected`, `expired`, `converted`
- `from` (opcional): Data inicial
- `to` (opcional): Data final

**Exemplo de Requisição:**

```bash
curl -X GET "https://api.fingestor.com/api/budgets?companyId=uuid-da-empresa&status=sent" \
  -H "Authorization: Bearer seu_token"
```

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-orcamento",
    "company_id": "uuid-da-empresa",
    "customer_id": "uuid-cliente",
    "budget_number": "ORC-2026-00001",
    "customer_name": "João Silva",
    "customer_document": "123.456.789-00",
    "customer_email": "joao@email.com",
    "customer_phone": "(11) 98765-4321",
    "issue_date": "2026-02-07",
    "expiry_date": "2026-02-22",
    "status": "sent",
    "pipeline_stage": "sent",
    "win_probability": 50,
    "subtotal": 5000.00,
    "discount_percentage": 10.00,
    "discount_amount": 500.00,
    "tax_amount": 0.00,
    "total_amount": 4500.00,
    "notes": "Orçamento para sistema de segurança",
    "terms": null,
    "rejection_reason": null,
    "loss_reason": null,
    "sent_at": "2026-02-07T14:00:00Z",
    "approved_at": null,
    "rejected_at": null,
    "converted_at": null,
    "last_followup_at": null,
    "next_followup_date": "2026-02-10",
    "followup_count": 0,
    "days_in_pipeline": 0,
    "assigned_to": "uuid-usuario",
    "metadata": {},
    "created_by": "uuid-usuario",
    "created_at": "2026-02-07T10:00:00Z",
    "updated_at": "2026-02-07T10:00:00Z",
    "deleted_at": null,
    "customers": {
      "id": "uuid-cliente",
      "name": "João Silva",
      "email": "joao@email.com",
      "mobile": "(11) 98765-4321"
    }
  }
]
```

### 3.2. Obter Orçamento Completo (com itens)

**Endpoint:** `GET /api/budgets/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Resposta de Sucesso (200):**

```json
{
  "id": "uuid-orcamento",
  "company_id": "uuid-da-empresa",
  "customer_id": "uuid-cliente",
  "budget_number": "ORC-2026-00001",
  "customer_name": "João Silva",
  "customer_document": "123.456.789-00",
  "customer_email": "joao@email.com",
  "customer_phone": "(11) 98765-4321",
  "issue_date": "2026-02-07",
  "expiry_date": "2026-02-22",
  "status": "sent",
  "pipeline_stage": "sent",
  "win_probability": 50,
  "subtotal": 5000.00,
  "discount_percentage": 10.00,
  "discount_amount": 500.00,
  "tax_amount": 0.00,
  "total_amount": 4500.00,
  "notes": "Orçamento para sistema de segurança",
  "terms": "Pagamento em 30 dias",
  "rejection_reason": null,
  "loss_reason": null,
  "sent_at": "2026-02-07T14:00:00Z",
  "approved_at": null,
  "rejected_at": null,
  "converted_at": null,
  "last_followup_at": null,
  "next_followup_date": "2026-02-10",
  "followup_count": 0,
  "days_in_pipeline": 0,
  "assigned_to": "uuid-usuario",
  "metadata": {},
  "created_by": "uuid-usuario",
  "created_at": "2026-02-07T10:00:00Z",
  "updated_at": "2026-02-07T10:00:00Z",
  "deleted_at": null,
  "budget_items": [
    {
      "id": "uuid-item",
      "budget_id": "uuid-orcamento",
      "product_service_id": "uuid-produto",
      "item_type": "product",
      "sku": "CAM-001",
      "name": "Câmera IP 5MP",
      "description": "Câmera IP de alta resolução",
      "quantity": 2,
      "unit_price": 2500.00,
      "discount_percentage": 0,
      "discount_amount": 0,
      "tax_percentage": 0,
      "total_amount": 5000.00,
      "sort_order": 0,
      "created_at": "2026-02-07T10:00:00Z",
      "updated_at": "2026-02-07T10:00:00Z",
      "products_services": {
        "id": "uuid-produto",
        "name": "Câmera IP 5MP",
        "current_stock": 25
      }
    }
  ],
  "customers": {
    "id": "uuid-cliente",
    "name": "João Silva",
    "email": "joao@email.com",
    "mobile": "(11) 98765-4321",
    "document": "123.456.789-00"
  }
}
```

### 3.3. Criar Orçamento

**Endpoint:** `POST /api/budgets`

**Body:**

```json
{
  "companyId": "uuid-da-empresa",
  "customerId": "uuid-cliente",
  "issueDate": "2026-02-07",
  "expiryDate": "2026-02-22",
  "items": [
    {
      "productServiceId": "993ece75-1ca7-4f4a-a79f-78a68d7cc172",
      "quantity": 2,
      "unitPrice": 2500.00
    }
  ],
  "discountPercentage": 10.00,
  "taxAmount": 0.00,
  "notes": "Orçamento para sistema de segurança",
  "terms": "Pagamento em 30 dias",
  "assignedTo": "uuid-usuario",
  "pipelineStage": "initial",
  "winProbability": 50
}
```

**Campos Obrigatórios:**
- `companyId`: UUID da empresa
- `customerId`: UUID do cliente
- `items` (array com pelo menos 1 item)
  - **Cada item precisa apenas:**
    - `productServiceId`: UUID do produto/serviço (busca automaticamente name, sku, itemType, description, taxPercentage do banco)
    - `quantity`: Quantidade
    - `unitPrice`: Preço unitário

**Campos Opcionais:**
- `issueDate` (padrão: data atual), `expiryDate` (data de validade)
- `discountAmount`, `discountPercentage`, `taxAmount`
- `notes`, `terms`, `assignedTo` (UUID do usuário responsável)
- `pipelineStage` (padrão: 'initial'): Estágio no pipeline (initial, sent, under_review, negotiating, final_review, approved, lost)
- `winProbability` (padrão: 0): Probabilidade de ganho (0-100)
- `nextFollowupDate`: Data do próximo follow-up
- `customerName`, `customerDocument`, `customerEmail`, `customerPhone` (caso queira sobrescrever dados do cadastro do cliente)
- `metadata`: Objeto JSON com informações customizadas

**Exemplo de Requisição:**

```bash
curl -X POST "https://api.fingestor.com/api/budgets" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "customerId": "uuid-cliente",
    "items": [
      {
        "productServiceId": "993ece75-1ca7-4f4a-a79f-78a68d7cc172",
        "quantity": 1,
        "unitPrice": 22.90
      }
    ]
  }'
```

**Resposta de Sucesso (201):** Retorna o orçamento criado com número gerado automaticamente e todos os itens com informações completas do produto

**Notas:**
- O `budget_number` é gerado automaticamente no formato `ORC-YYYY-NNNNNN`
- Os totais são calculados automaticamente via trigger do banco
- Status inicial é `draft`
- **Todos os dados do item (name, sku, itemType, description, taxPercentage) são buscados automaticamente do produto cadastrado**
- Basta enviar apenas `productServiceId`, `quantity` e `unitPrice` no frontend

### 3.4. Atualizar Orçamento

**Endpoint:** `PUT /api/budgets/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Body:**

```json
{
  "expiryDate": "2026-02-28",
  "status": "sent",
  "pipelineStage": "sent",
  "winProbability": 60,
  "items": [
    {
      "productServiceId": "uuid-produto",
      "quantity": 3,
      "unitPrice": 2500.00
    }
  ],
  "discountPercentage": 15.00,
  "nextFollowupDate": "2026-02-10"
}
```

**Notas:**
- Ao atualizar `items`, todos os itens anteriores são substituídos
- Totais são recalculados automaticamente
- Mudanças de status são registradas no histórico

### 3.5. Excluir Orçamento

**Endpoint:** `DELETE /api/budgets/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

---

## 4. Histórico de Status do Orçamento

### 4.1. Obter Histórico de Status

**Endpoint:** `GET /api/budgets/:budgetId/status-history`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-historico",
    "budget_id": "uuid-orcamento",
    "previous_status": "draft",
    "new_status": "sent",
    "changed_by": "uuid-usuario",
    "notes": "Orçamento enviado ao cliente",
    "changed_at": "2026-02-07T15:00:00Z"
  },
  {
    "id": "uuid-historico-2",
    "budget_id": "uuid-orcamento",
    "previous_status": "sent",
    "new_status": "approved",
    "changed_by": "uuid-usuario",
    "notes": "Cliente aprovou o orçamento",
    "changed_at": "2026-02-08T10:30:00Z"
  }
]
```

---

## 5. Tarefas de Follow-up

### 5.1. Listar Tarefas

**Endpoint:** `GET /api/followup`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa
- `budgetId` (opcional): UUID do orçamento
- `customerId` (opcional): UUID do cliente
- `status` (opcional): `pending`, `completed`, `cancelled`
- `from` (opcional): Data inicial
- `to` (opcional): Data final

**Exemplo de Requisição:**

```bash
curl -X GET "https://api.fingestor.com/api/followup?companyId=uuid-da-empresa&status=pending" \
  -H "Authorization: Bearer seu_token"
```

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-tarefa",
    "company_id": "uuid-da-empresa",
    "budget_id": "uuid-orcamento",
    "customer_id": "uuid-cliente",
    "task_type": "call",
    "title": "Ligar para cliente",
    "description": "Verificar se o cliente recebeu o orçamento",
    "due_date": "2026-02-08T14:00:00Z",
    "completed_at": null,
    "status": "pending",
    "priority": "high",
    "assigned_to": "uuid-usuario",
    "created_by": "uuid-usuario",
    "notes": null,
    "created_at": "2026-02-07T10:00:00Z",
    "updated_at": "2026-02-07T10:00:00Z",
    "budgets": {
      "id": "uuid-orcamento",
      "budget_number": "ORC-2026-00001",
      "status": "sent",
      "total_amount": 4500.00
    },
    "customers": {
      "id": "uuid-cliente",
      "name": "João Silva",
      "phone": "(11) 98765-4321"
    }
  }
]
```

**Tipos de Tarefa:**
- `call`: Ligação
- `email`: E-mail
- `whatsapp`: Mensagem WhatsApp
- `meeting`: Reunião
- `visit`: Visita
- `other`: Outro

**Níveis de Prioridade:**
- `low`: Baixa
- `medium`: Média
- `high`: Alta
- `urgent`: Urgente

### 5.2. Obter Tarefa por ID

**Endpoint:** `GET /api/followup/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

### 5.3. Criar Tarefa de Follow-up

**Endpoint:** `POST /api/followup`

**Body:**

```json
{
  "companyId": "uuid-da-empresa",
  "budgetId": "uuid-orcamento",
  "customerId": "uuid-cliente",
  "taskType": "call",
  "title": "Ligar para cliente",
  "description": "Verificar se o cliente recebeu o orçamento",
  "dueDate": "2026-02-08T14:00:00Z",
  "priority": "high",
  "assignedTo": "uuid-usuario"
}
```

**Campos Obrigatórios:**
- `companyId`
- `customerId`
- `taskType`
- `title`
- `dueDate`

**Resposta de Sucesso (201):** Retorna a tarefa criada

### 5.4. Atualizar Tarefa

**Endpoint:** `PUT /api/followup/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Body:**

```json
{
  "status": "completed",
  "notes": "Cliente confirmou recebimento e está analisando"
}
```

**Notas:**
- Ao marcar como `completed`, o campo `completed_at` é preenchido automaticamente

### 5.5. Excluir Tarefa

**Endpoint:** `DELETE /api/followup/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

---

## Regras de Negócio

### Para o Frontend

1. **Clientes:**
   - Suportar dois tipos: `person` (pessoa física) e `company` (pessoa jurídica)
   - Validar CPF para `person` e CNPJ para `company`
   - Tags são úteis para segmentação (array de strings)
   - Metadata pode armazenar informações customizadas

2. **Interações (CRM):**
   - Criar automaticamente ao enviar orçamento, fazer ligação, etc
   - Histórico completo de relacionamento com o cliente
   - Útil para análise de pipeline de vendas

3. **Orçamentos:**
   - Número gerado automaticamente: `ORC-YYYY-NNNNN`
   - Ciclo de vida: `draft` → `sent` → `approved`/`rejected`
   - Validade padrão: 15 dias (sugestão)
   - Descontos podem ser por porcentagem ou valor fixo
   - Totais calculados automaticamente no backend
   - Apenas orçamentos em `draft` ou `sent` podem ser editados
   - Orçamentos `approved` podem ser convertidos em vendas (próxima seção)

4. **Itens do Orçamento:**
   - Cada item tem desconto individual opcional
   - Total do item = (quantidade × preço) - desconto
   - Validar se produto/serviço existe e está ativo
   - Mostrar estoque disponível para produtos

5. **Follow-up:**
   - Criar automaticamente após enviar orçamento
   - Sugestão: tarefa de follow-up 3 dias após envio
   - Notificar usuário sobre tarefas vencidas
   - Dashboard com tarefas do dia/semana
   - Prioridades com cores diferentes (urgente = vermelho, etc)

6. **Status do Orçamento:**
   - `draft`: Rascunho, ainda sendo elaborado
   - `sent`: Enviado ao cliente
   - `approved`: Aprovado pelo cliente
   - `rejected`: Rejeitado pelo cliente
   - `expired`: Vencido (após `expiry_date`)
   - `converted`: Convertido em venda (automático)
   - `in_negotiation`: Em negociação com o cliente

7. **Pipeline Stages (Estágios do Pipeline):**
   - `initial`: Inicial, orçamento criado
   - `sent`: Enviado ao cliente
   - `under_review`: Cliente está analisando
   - `negotiating`: Em negociação
   - `final_review`: Revisão final
   - `approved`: Aprovado
   - `lost`: Perdido

8. **Loss Reasons (Motivos de Perda):**
   - `price`: Preço muito alto
   - `competitor`: Escolheu concorrente
   - `timing`: Timing inadequado
   - `budget`: Cliente sem budget
   - `no_interest`: Cliente perdeu interesse
   - `other`: Outro motivo

## Fluxos Recomendados

### Criação de Orçamento Completo

1. Selecionar/criar cliente
2. Adicionar produtos/serviços
3. Aplicar descontos se necessário
4. Salvar como `draft`
5. Revisar e enviar (mudar para `sent`)
6. Criar tarefa de follow-up automática
7. Registrar interação "Orçamento enviado"

### Gestão de Follow-up

1. Dashboard mostra tarefas pendentes e vencidas
2. Ao completar tarefa, registrar resultado nas notas
3. Se necessário, criar nova tarefa de follow-up
4. Histórico completo visível no card do cliente

### Pipeline de Vendas

1. Listar orçamentos por status (Kanban)
2. Drag & drop para mudar status
3. Métricas: taxa de conversão, tempo médio, valor médio
4. Alertar sobre orçamentos prestes a vencer

### Relatórios

- Orçamentos por período e status
- Taxa de conversão por vendedor
- Tempo médio de fechamento
- Produtos mais orçados
- Clientes com mais orçamentos
