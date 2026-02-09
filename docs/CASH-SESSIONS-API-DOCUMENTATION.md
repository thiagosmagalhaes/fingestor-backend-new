# Documentação da API - Sistema de Abertura e Fechamento de Caixa PDV

## Visão Geral

Esta documentação descreve a implementação da funcionalidade de abertura e fechamento de caixa para o PDV (Ponto de Venda). O sistema garante que vendas só possam ser realizadas quando houver uma sessão de caixa aberta.

---

## ⚠️ MUDANÇAS IMPORTANTES EM ENDPOINTS EXISTENTES

### Endpoint de Criação de Vendas (POST /api/sales)

**O QUE MUDOU:**
- Agora é **obrigatório** ter uma sessão de caixa aberta antes de criar qualquer venda
- Se não houver caixa aberto, o endpoint retornará erro 400
- Cada venda criada será automaticamente vinculada à sessão de caixa atual

**NOVO COMPORTAMENTO:**
Antes de permitir a criação de uma venda, o backend valida se existe uma sessão de caixa aberta. Se não existir, retorna:

```json
{
  "error": "Não é possível criar venda sem uma sessão de caixa aberta. Abra o caixa primeiro."
}
```

**AÇÕES NECESSÁRIAS NO FRONTEND:**
1. Antes de acessar a tela de PDV/vendas, verificar se há um caixa aberto
2. Se não houver caixa aberto, direcionar o usuário para abrir o caixa primeiro
3. Exibir mensagem clara quando tentar criar venda sem caixa aberto
4. Adicionar indicador visual do status do caixa (aberto/fechado) na interface do PDV

---

## 📋 FLUXO COMPLETO DO SISTEMA DE CAIXA

### Sequência de Operações

1. **Início do Dia:**
   - Usuário acessa o PDV
   - Frontend verifica se há caixa aberto (GET /api/cash-sessions/current)
   - Se não houver, exibe tela de abertura de caixa
   - Usuário informa valor inicial em dinheiro e abre o caixa (POST /api/cash-sessions/open)

2. **Durante o Dia:**
   - Com caixa aberto, usuário pode realizar vendas normalmente
   - Todas as vendas são vinculadas à sessão de caixa atual

3. **Fim do Dia:**
   - Usuário acessa funcionalidade de fechamento de caixa
   - Informa quanto de dinheiro há no caixa
   - Fecha o caixa (POST /api/cash-sessions/close)
   - Sistema confirma fechamento (fechamento "às cegas" - sem mostrar valores esperados)

---

## 🔌 ENDPOINTS DA API

### 1. Consultar Sessão de Caixa Atual

**Endpoint:** `GET /api/cash-sessions/current?companyId={companyId}`

**Descrição:** Retorna a sessão de caixa aberta atual da empresa. Use este endpoint para verificar se o caixa está aberto antes de permitir vendas.

**Headers:**
```
Authorization: Bearer {token}
```

**Exemplo de CURL:**
```bash
curl -X GET "https://api.fingestor.com.br/api/cash-sessions/current?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer seu_token_aqui"
```

**Resposta de Sucesso (200)** - Quando há caixa aberto:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "opened_by": "789e0123-e45b-67c8-d901-234567890123",
  "opening_amount": 100.00,
  "opening_date": "2024-02-08T08:00:00.000Z",
  "opening_notes": "Início do expediente",
  "status": "open",
  "created_at": "2024-02-08T08:00:00.000Z",
  "updated_at": "2024-02-08T08:00:00.000Z"
}
```

**Resposta de Sucesso (200)** - Quando NÃO há caixa aberto:
```json
null
```

**Resposta de Erro (400):**
```json
{
  "error": "companyId é obrigatório"
}
```

**Resposta de Erro (404):**
```json
{
  "error": "Empresa não encontrada ou você não tem permissão"
}
```

---

### 2. Abrir Sessão de Caixa

**Endpoint:** `POST /api/cash-sessions/open`

**Descrição:** Abre uma nova sessão de caixa. Só pode haver uma sessão aberta por vez para cada empresa.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "companyId": "123e4567-e89b-12d3-a456-426614174000",
  "openingAmount": 100.00,
  "openingNotes": "Início do expediente"
}
```

**Campos:**
- `companyId` (string, obrigatório): UUID da empresa
- `openingAmount` (number, obrigatório): Valor inicial de dinheiro no caixa (pode ser 0)
- `openingNotes` (string, opcional): Observações sobre a abertura

**Exemplo de CURL:**
```bash
curl -X POST "https://api.fingestor.com.br/api/cash-sessions/open" \
  -H "Authorization: Bearer seu_token_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "openingAmount": 100.00,
    "openingNotes": "Início do expediente"
  }'
```

**Resposta de Sucesso (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "opened_by": "789e0123-e45b-67c8-d901-234567890123",
  "closed_by": null,
  "opening_amount": 100.00,
  "opening_date": "2024-02-08T08:00:00.000Z",
  "closing_amount": null,
  "closing_date": null,
  "opening_notes": "Início do expediente",
  "closing_notes": null,
  "status": "open",
  "created_at": "2024-02-08T08:00:00.000Z",
  "updated_at": "2024-02-08T08:00:00.000Z"
}
```

**Resposta de Erro (400)** - Validação:
```json
{
  "error": "companyId é obrigatório"
}
```
```json
{
  "error": "openingAmount é obrigatório"
}
```
```json
{
  "error": "openingAmount não pode ser negativo"
}
```

**Resposta de Erro (400)** - Já existe caixa aberto:
```json
{
  "error": "Já existe uma sessão de caixa aberta. Feche a sessão atual antes de abrir uma nova."
}
```

**Resposta de Erro (404):**
```json
{
  "error": "Empresa não encontrada ou você não tem permissão"
}
```

---

### 3. Fechar Sessão de Caixa

**Endpoint:** `POST /api/cash-sessions/close`

**Descrição:** Fecha a sessão de caixa aberta atual. O fechamento é feito "às cegas" - o usuário informa o valor sem ver quanto deveria ter. O backend apenas registra o valor informado e fecha a sessão.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "companyId": "123e4567-e89b-12d3-a456-426614174000",
  "closingAmount": 850.50,
  "closingNotes": "Fim do expediente"
}
```

**Campos:**
- `companyId` (string, obrigatório): UUID da empresa
- `closingAmount` (number, obrigatório): Valor de dinheiro que há no caixa no momento do fechamento
- `closingNotes` (string, opcional): Observações sobre o fechamento

**Exemplo de CURL:**
```bash
curl -X POST "https://api.fingestor.com.br/api/cash-sessions/close" \
  -H "Authorization: Bearer seu_token_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "closingAmount": 850.50,
    "closingNotes": "Fim do expediente"
  }'
```

**Resposta de Sucesso (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "opened_by": "789e0123-e45b-67c8-d901-234567890123",
  "closed_by": "789e0123-e45b-67c8-d901-234567890123",
  "opening_amount": 100.00,
  "opening_date": "2024-02-08T08:00:00.000Z",
  "closing_amount": 850.50,
  "closing_date": "2024-02-08T18:00:00.000Z",
  "opening_notes": "Início do expediente",
  "closing_notes": "Fim do expediente",
  "status": "closed",
  "created_at": "2024-02-08T08:00:00.000Z",
  "updated_at": "2024-02-08T18:00:00.000Z"
}
```

**Resposta de Erro (400)** - Validação:
```json
{
  "error": "companyId é obrigatório"
}
```
```json
{
  "error": "closingAmount é obrigatório"
}
```
```json
{
  "error": "closingAmount não pode ser negativo"
}
```

**Resposta de Erro (400)** - Não há caixa aberto:
```json
{
  "error": "Não há sessão de caixa aberta para fechar"
}
```

**Resposta de Erro (404):**
```json
{
  "error": "Empresa não encontrada ou você não tem permissão"
}
```

---

### 4. Listar Histórico de Sessões de Caixa

**Endpoint:** `GET /api/cash-sessions?companyId={companyId}&limit=50&offset=0&from=yyyy-mm-dd&to=yyyy-mm-dd`

**Descrição:** Lista o histórico de todas as sessões de caixa (abertas e fechadas) da empresa, ordenadas da mais recente para a mais antiga. Suporta filtros por range de data.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `companyId` (string, obrigatório): UUID da empresa
- `limit` (number, opcional): Limite de registros por página (padrão: 50)
- `offset` (number, opcional): Offset para paginação (padrão: 0)
- `from` (string, opcional): Data inicial do filtro no formato YYYY-MM-DD
- `to` (string, opcional): Data final do filtro no formato YYYY-MM-DD

**Exemplo de CURL:**
```bash
# Sem filtros de data
curl -X GET "https://api.fingestor.com.br/api/cash-sessions?companyId=123e4567-e89b-12d3-a456-426614174000&limit=10&offset=0" \
  -H "Authorization: Bearer seu_token_aqui"

# Com filtro de range de data (sessões de fevereiro de 2024)
curl -X GET "https://api.fingestor.com.br/api/cash-sessions?companyId=123e4567-e89b-12d3-a456-426614174000&from=2024-02-01&to=2024-02-29" \
  -H "Authorization: Bearer seu_token_aqui"
```

**Resposta de Sucesso (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "opened_by": "789e0123-e45b-67c8-d901-234567890123",
    "closed_by": "789e0123-e45b-67c8-d901-234567890123",
    "opening_amount": 100.00,
    "opening_date": "2024-02-08T08:00:00.000Z",
    "closing_amount": 850.50,
    "closing_date": "2024-02-08T18:00:00.000Z",
    "opening_notes": "Início do expediente",
    "closing_notes": "Fim do expediente",
    "status": "closed",
    "cash_difference": 0,
    "created_at": "2024-02-08T08:00:00.000Z",
    "updated_at": "2024-02-08T18:00:00.000Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "opened_by": "789e0123-e45b-67c8-d901-234567890123",
    "closed_by": "789e0123-e45b-67c8-d901-234567890123",
    "opening_amount": 50.00,
    "opening_date": "2024-02-07T08:00:00.000Z",
    "closing_amount": 720.00,
    "closing_date": "2024-02-07T18:00:00.000Z",
    "opening_notes": null,
    "closing_notes": null,
    "status": "closed",
    "cash_difference": -5.50,
    "created_at": "2024-02-07T08:00:00.000Z",
    "updated_at": "2024-02-07T18:00:00.000Z"
  }
]
```

**Campo Adicional:**
- `cash_difference`: Diferença entre o valor informado no fechamento e o valor esperado (abertura + vendas em dinheiro)
  - `null`: Caixa ainda está aberto ou não há vendas
  - `0`: Valor bateu exatamente
  - Positivo: Sobrou dinheiro no caixa
  - Negativo: Faltou dinheiro no caixa

**Resposta de Erro (400):**
```json
{
  "error": "companyId é obrigatório"
}
```

**Resposta de Erro (404):**
```json
{
  "error": "Empresa não encontrada ou você não tem permissão"
}
```

---

### 5. Obter Relatório Completo de Sessão de Caixa

**Endpoint:** `GET /api/cash-sessions/{id}?companyId={companyId}`

**Descrição:** Retorna um relatório completo e detalhado de uma sessão de caixa específica, incluindo:
- Dados completos da sessão (abertura e fechamento)
- Todas as vendas vinculadas à sessão
- Totais agrupados por método de pagamento
- Comparação entre valor informado no fechamento vs valor esperado
- Status de balanço (se bateu, sobrou ou faltou dinheiro)

**Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `id` (string, obrigatório): UUID da sessão de caixa

**Query Parameters:**
- `companyId` (string, obrigatório): UUID da empresa

**Exemplo de CURL:**
```bash
curl -X GET "https://api.fingestor.com.br/api/cash-sessions/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer seu_token_aqui"
```

**Resposta de Sucesso (200):**
```json
{
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "opened_by": "789e0123-e45b-67c8-d901-234567890123",
    "closed_by": "789e0123-e45b-67c8-d901-234567890123",
    "opening_amount": 100.00,
    "opening_date": "2024-02-08T08:00:00.000Z",
    "closing_amount": 850.50,
    "closing_date": "2024-02-08T18:00:00.000Z",
    "status": "closed",
    "opening_notes": "Início do expediente",
    "closing_notes": "Fim do expediente",
    "created_at": "2024-02-08T08:00:00.000Z",
    "updated_at": "2024-02-08T18:00:00.000Z"
  },
  "summary": {
    "total_sales": 15,
    "total_sales_amount": 1520.00,
    "total_cash_sales": 750.50,
    "expected_cash_amount": 850.50,
    "informed_closing_amount": 850.50,
    "difference": 0,
    "balance_status": "balanced"
  },
  "payment_methods": [
    {
      "payment_method": "Dinheiro",
      "sales_count": 8,
      "total_amount": 750.50
    },
    {
      "payment_method": "Cartão de Crédito",
      "sales_count": 5,
      "total_amount": 620.00
    },
    {
      "payment_method": "PIX",
      "sales_count": 2,
      "total_amount": 149.50
    }
  ],
  "sales": [
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "sale_number": "VD-001",
      "customer_name": "João Silva",
      "total_amount": 150.00,
      "paid_amount": 150.00,
      "payment_status": "paid",
      "payment_method": "Dinheiro",
      "sale_date": "2024-02-08T09:30:00.000Z",
      "created_at": "2024-02-08T09:30:00.000Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-2345-678901bcdefg",
      "sale_number": "VD-002",
      "customer_name": "Maria Santos",
      "total_amount": 80.00,
      "paid_amount": 80.00,
      "payment_status": "paid",
      "payment_method": "Cartão de Crédito",
      "sale_date": "2024-02-08T10:15:00.000Z",
      "created_at": "2024-02-08T10:15:00.000Z"
    }
  ]
}
```

**Campos do Relatório:**

**`session`**: Dados completos da sessão de caixa

**`summary`**: Resumo financeiro da sessão
- `total_sales`: Quantidade total de vendas realizadas
- `total_sales_amount`: Valor total de todas as vendas
- `total_cash_sales`: Valor total das vendas em dinheiro
- `expected_cash_amount`: Valor esperado no caixa (abertura + vendas em dinheiro)
- `informed_closing_amount`: Valor informado pelo usuário no fechamento (null se ainda aberto)
- `difference`: Diferença entre valor informado e esperado (null se ainda aberto)
- `balance_status`: Status do balanço
  - `"balanced"`: Valor informado bate com o esperado (diferença = 0)
  - `"surplus"`: Sobrou dinheiro (diferença > 0)
  - `"shortage"`: Faltou dinheiro (diferença < 0)
  - `null`: Caixa ainda está aberto

**`payment_methods`**: Array com totais por método de pagamento
- `payment_method`: Nome do método de pagamento
- `sales_count`: Quantidade de vendas com este método
- `total_amount`: Valor total das vendas com este método

**`sales`**: Array com todas as vendas da sessão

**Resposta de Erro (400):**
```json
{
  "error": "ID é obrigatório"
}
```
```json
{
  "error": "companyId é obrigatório"
}
```

**Resposta de Erro (404):**
```json
{
  "error": "Sessão de caixa não encontrada"
}
```
```json
{
  "error": "Empresa não encontrada ou você não tem permissão"
}
```

---

## 🎯 REGRAS DE NEGÓCIO

### Abertura de Caixa
1. Só pode haver **uma sessão de caixa aberta por vez** para cada empresa
2. O valor inicial pode ser **zero ou positivo** (não pode ser negativo)
3. A data/hora de abertura é registrada automaticamente pelo sistema
4. O usuário que abriu o caixa é registrado automaticamente

### Fechamento de Caixa
1. Só é possível fechar se houver uma sessão aberta
2. O fechamento é **"às cegas"** - o usuário informa o valor sem ver quanto deveria ter
3. O valor de fechamento pode ser qualquer valor >= 0
4. A data/hora de fechamento é registrada automaticamente
5. O usuário que fechou o caixa é registrado automaticamente
6. Uma vez fechada, a sessão não pode ser reaberta

### Criação de Vendas
1. **OBRIGATÓRIO** ter uma sessão de caixa aberta
2. Se não houver caixa aberto, retorna erro 400
3. Cada venda é vinculada automaticamente à sessão de caixa atual
4. O vínculo com a sessão de caixa serve para auditoria e relatórios

---

## 💡 RECOMENDAÇÕES DE IMPLEMENTAÇÃO NO FRONTEND

### 1. Verificação de Status do Caixa

**Quando Verificar:**
- Ao carregar a tela do PDV/vendas
- Após fazer login
- Periodicamente a cada X minutos (opcional)

**Como Implementar:**
```
1. Chamar GET /api/cash-sessions/current?companyId={companyId}
2. Se retornar null: mostrar tela/modal de abertura de caixa
3. Se retornar objeto: armazenar o ID da sessão e permitir vendas
```

### 2. Interface de Abertura de Caixa

**Elementos da Tela:**
- Campo numérico para "Valor Inicial em Dinheiro"
- Campo opcional de texto para "Observações"
- Botão "Abrir Caixa"
- Validação: não permitir valores negativos
- Deve bloquear acesso ao PDV até o caixa ser aberto

**Após Abertura Bem-Sucedida:**
- Mostrar mensagem de sucesso
- Redirecionar para tela do PDV
- Armazenar informações da sessão atual

### 3. Interface de Fechamento de Caixa

**Elementos da Tela:**
- Título: "Fechamento de Caixa"
- Informações da sessão atual:
  - Data/hora de abertura
  - Valor inicial informado
- Campo numérico para "Valor em Dinheiro no Caixa"
- Campo opcional de texto para "Observações"
- Botão "Fechar Caixa"
- **IMPORTANTE:** NÃO mostrar valores esperados (fechamento "às cegas")

**Após Fechamento:**
- Mostrar mensagem de sucesso
- Bloquear acesso ao PDV
- Limpar informações da sessão
- Oferecer opção de abrir novo caixa

### 4. Indicador Visual de Status

**Sugestão de Implementação:**
- Badge/tag sempre visível na tela do PDV
- Status "Caixa Aberto" (verde) / "Caixa Fechado" (vermelho)
- Ao clicar, mostrar detalhes da sessão atual
- Opção de fechar caixa facilmente acessível

### 5. Tratamento de Erros

**Ao Tentar Criar Venda Sem Caixa Aberto:**
```
1. Backend retorna erro 400 com mensagem
2. Frontend intercepta o erro
3. Mostra modal/alerta: "Caixa não está aberto"
4. Oferece botão para abrir o caixa
```

**Ao Tentar Abrir Caixa Já Aberto:**
```
1. Backend retorna erro 400
2. Frontend mostra: "Já existe um caixa aberto"
3. Oferece opção de ir para o PDV ou fechar o caixa atual
```

### 6. Estados da Aplicação

**Armazenar no Estado Global:**
- `cashSession`: objeto da sessão atual ou null
- `isCashOpen`: boolean
- `cashSessionId`: UUID da sessão (para vincular vendas)

**Atualizar Estado:**
- Ao abrir caixa: armazenar dados da sessão
- Ao fechar caixa: limpar dados da sessão
- Ao fazer logout: limpar dados da sessão

### 7. Relatório de Fechamento de Caixa

**Quando Implementar:**
- Após fechar o caixa
- Ao visualizar histórico de caixas fechados
- Em relatórios gerenciais

**Como Implementar:**
```
1. Chamar GET /api/cash-sessions/{id}?companyId={companyId}
2. Exibir informações da sessão:
   - Valor de abertura
   - Valor informado no fechamento
   - Valor esperado (abertura + vendas em dinheiro)
   - Diferença (sobra/falta)
3. Mostrar breakdown por método de pagamento
4. Listar todas as vendas do período
5. Destacar visualmente se houve diferença no caixa
```

**Exemplo de Interface:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RELATÓRIO DE FECHAMENTO DE CAIXA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sessão: #550e8400
Abertura: 08/02/2024 08:00
Fechamento: 08/02/2024 18:00

💵 RESUMO FINANCEIRO
Valor inicial: R$ 100,00
Vendas em dinheiro: R$ 750,50
Esperado no caixa: R$ 850,50
Informado no fechamento: R$ 850,50
✅ Caixa conferido - Diferença: R$ 0,00

📊 VENDAS POR MÉTODO
Dinheiro: 8 vendas - R$ 750,50
Cartão de Crédito: 5 vendas - R$ 620,00
PIX: 2 vendas - R$ 149,50

TOTAL: 15 vendas - R$ 1.520,00

📝 LISTA DE VENDAS (15)
[Tabela com todas as vendas]
```

---

## 📊 CASOS DE USO

### Caso 1: Primeiro Acesso do Dia
```
1. Usuário faz login
2. Acessa tela do PDV
3. Frontend verifica status do caixa
4. Não há caixa aberto
5. Mostra tela de abertura
6. Usuário informa R$ 100,00 de valor inicial
7. Clica em "Abrir Caixa"
8. Backend cria sessão e retorna sucesso
9. Frontend redireciona para PDV
10. Usuário pode começar a vender
```

### Caso 2: Durante o Dia
```
1. Caixa já está aberto
2. Usuário cria vendas normalmente
3. Cada venda é vinculada à sessão atual
4. Frontend mantém indicador "Caixa Aberto" visível
```

### Caso 3: Fim do Dia
```
1. Usuário clica em "Fechar Caixa"
2. Frontend mostra tela de fechamento
3. Usuário conta dinheiro no caixa
4. Informa valor: R$ 850,50
5. Adiciona observação: "Fim do expediente"
6. Clica em "Fechar Caixa"
7. Backend registra fechamento
8. Frontend mostra confirmação
9. Bloqueia criação de novas vendas
10. Oferece opção de abrir novo caixa
```

### Caso 4: Tentativa de Venda Sem Caixa Aberto
```
1. Caixa está fechado (ou nunca foi aberto)
2. Usuário tenta criar uma venda
3. Backend retorna erro 400
4. Frontend intercepta e mostra modal
5. Usuário é direcionado para abrir o caixa
```

### Caso 5: Visualizar Relatório de Caixa Fechado
```
1. Usuário acessa histórico de caixas
2. Lista caixas fechados (pode filtrar por data)
3. Clica em um caixa específico
4. Frontend chama GET /api/cash-sessions/{id}
5. Exibe relatório completo:
   - Dados da sessão
   - Resumo financeiro
   - Status do balanço
   - Totais por método de pagamento
   - Lista de vendas
6. Usuário pode imprimir ou exportar relatório
```

### Caso 6: Filtrar Caixas por Período
```
1. Usuário acessa tela de histórico
2. Seleciona período (ex: 01/02/2024 a 28/02/2024)
3. Frontend chama GET /api/cash-sessions?from=2024-02-01&to=2024-02-28
4. Sistema retorna apenas caixas do período
5. Usuário pode clicar em qualquer um para ver detalhes
```

---

## 🔒 SEGURANÇA E PERMISSÕES

- Todos os endpoints requerem autenticação via token JWT
- Usuários só podem acessar sessões de caixa de suas próprias empresas
- O sistema registra automaticamente quem abriu e fechou cada sessão
- As políticas RLS (Row Level Security) garantem isolamento de dados

---

## 📝 CAMPOS DE AUDITORIA

Cada sessão de caixa registra automaticamente:
- `opened_by`: UUID do usuário que abriu
- `closed_by`: UUID do usuário que fechou
- `opening_date`: Data/hora da abertura
- `closing_date`: Data/hora do fechamento
- `created_at`: Timestamp de criação do registro
- `updated_at`: Timestamp da última atualização

---

## ⚡ PERFORMANCE

- As consultas usam índices otimizados
- A função `get_open_cash_session` é eficiente e evita N+1 queries
- Recomenda-se cachear o status do caixa no frontend para reduzir chamadas à API

---

## 🐛 TROUBLESHOOTING

### Problema: "Não é possível criar venda sem uma sessão de caixa aberta"
**Solução:** Certifique-se de abrir o caixa antes de tentar criar vendas

### Problema: "Já existe uma sessão de caixa aberta"
**Solução:** Feche o caixa atual antes de abrir um novo

### Problema: "Não há sessão de caixa aberta para fechar"
**Solução:** Verifique se realmente há um caixa aberto antes de tentar fechar

---

## 📞 SUPORTE

Para dúvidas ou problemas com a integração, entre em contato com a equipe de desenvolvimento backend.
