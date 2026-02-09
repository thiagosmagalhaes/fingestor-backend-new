# Atualizações da API - Sistema de Caixa PDV

## Visão Geral

Este documento descreve as novas funcionalidades adicionadas ao sistema de abertura e fechamento de caixa do PDV.

---

## 🆕 NOVAS FUNCIONALIDADES

### 1. Filtro por Range de Data no Histórico de Caixas

**Endpoint Atualizado:** `GET /api/cash-sessions?companyId={companyId}&from=yyyy-mm-dd&to=yyyy-mm-dd`

**O que mudou:**
- Adicionados parâmetros opcionais `from` e `to` para filtrar sessões por período
- Permite ao frontend buscar apenas caixas de um período específico
- **Novo campo `cash_difference`**: Cada sessão retornada agora inclui a diferença calculada entre o valor informado no fechamento e o esperado (abertura + vendas em dinheiro)

**Exemplo de uso:**
```bash
# Buscar caixas de fevereiro de 2024
curl -X GET "https://api.fingestor.com.br/api/cash-sessions?companyId=xxx&from=2024-02-01&to=2024-02-29" \
  -H "Authorization: Bearer seu_token"
```

**Resposta do Endpoint:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "opening_amount": 100.00,
    "closing_amount": 850.50,
    "status": "closed",
    "cash_difference": 0,
    "opening_date": "2024-02-08T08:00:00.000Z",
    "closing_date": "2024-02-08T18:00:00.000Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "opening_amount": 50.00,
    "closing_amount": 720.00,
    "status": "closed",
    "cash_difference": -5.50,
    "opening_date": "2024-02-07T08:00:00.000Z",
    "closing_date": "2024-02-07T18:00:00.000Z"
  }
]
```

**Campo `cash_difference`:**
- `null`: Caixa ainda está aberto
- `0`: Valor bateu exatamente (✅)
- Número positivo: Sobrou dinheiro (ex: 10.00 = sobrou R$ 10,00)
- Número negativo: Faltou dinheiro (ex: -5.50 = faltou R$ 5,50)

**Implementação no Frontend:**
```
1. Adicionar seletores de data (from/to) na tela de histórico
2. Ao filtrar, passar os parâmetros from e to na query string
3. Formato das datas: YYYY-MM-DD
4. Ambos parâmetros são opcionais - pode usar só from, só to, ou ambos
5. Exibir indicador visual na lista baseado em cash_difference:
   - Verde se = 0 (bateu)
   - Azul se > 0 (sobra)
   - Vermelho se < 0 (falta)
   - Cinza se null (caixa aberto)
```

---

### 2. Relatório Completo de Sessão de Caixa

**Novo Endpoint:** `GET /api/cash-sessions/{id}?companyId={companyId}`

**Descrição:**
Este é um endpoint completamente novo que retorna um relatório detalhado de uma sessão de caixa específica, incluindo análise financeira e conferência automática.

**Exemplo de chamada:**
```bash
curl -X GET "https://api.fingestor.com.br/api/cash-sessions/550e8400-e29b-41d4-a716-446655440000?companyId=xxx" \
  -H "Authorization: Bearer seu_token"
```

**O endpoint retorna:**

#### 📋 Dados da Sessão
```json
{
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "opening_amount": 100.00,
    "closing_amount": 850.50,
    "opening_date": "2024-02-08T08:00:00.000Z",
    "closing_date": "2024-02-08T18:00:00.000Z",
    "status": "closed"
  }
}
```

#### 💰 Resumo Financeiro com Análise
```json
{
  "summary": {
    "total_sales": 15,
    "total_sales_amount": 1520.00,
    "total_cash_sales": 750.50,
    "expected_cash_amount": 850.50,
    "informed_closing_amount": 850.50,
    "difference": 0,
    "balance_status": "balanced"
  }
}
```

**Campos do Summary:**
- `total_sales`: Quantidade de vendas realizadas
- `total_sales_amount`: Valor total de todas as vendas (todos os métodos)
- `total_cash_sales`: Valor apenas das vendas em dinheiro
- `expected_cash_amount`: Quanto deveria ter no caixa (abertura + vendas em dinheiro)
- `informed_closing_amount`: Quanto o operador informou que tinha
- `difference`: Diferença entre informado e esperado
- `balance_status`: Status da conferência
  - `"balanced"` - Bateu certinho (diferença = 0)
  - `"surplus"` - Sobrou dinheiro (diferença > 0)
  - `"shortage"` - Faltou dinheiro (diferença < 0)
  - `null` - Caixa ainda está aberto

#### 📊 Totais por Método de Pagamento
```json
{
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
  ]
}
```

#### 🧾 Lista Completa de Vendas
```json
{
  "sales": [
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "sale_number": "VD-001",
      "customer_name": "João Silva",
      "total_amount": 150.00,
      "paid_amount": 150.00,
      "payment_status": "paid",
      "payment_method": "Dinheiro",
      "sale_date": "2024-02-08T09:30:00.000Z"
    }
  ]
}
```

---

## 🎯 COMO O FRONTEND DEVE USAR

### Tela de Histórico de Caixas

**Adicionar:**
1. Filtros de período (data inicial e final)
2. Ao aplicar filtro, chamar a API com parâmetros `from` e `to`
3. Na lista de caixas, adicionar botão "Ver Relatório" em cada item
4. **Indicador visual de diferença**: mostrar `cash_difference` em cada linha

**Exemplo de lista:**
```
╔═══════════════════════════════════════════════════════════╗
║ Data       │ Abertura │ Fechamento │ Diferença │ Ações   ║
╠═══════════════════════════════════════════════════════════╣
║ 08/02/2024 │ R$ 100   │ R$ 850,50  │ ✅ R$ 0   │ [Ver]   ║
║ 07/02/2024 │ R$ 50    │ R$ 720,00  │ ❌ -R$ 5  │ [Ver]   ║
║ 06/02/2024 │ R$ 100   │ R$ 920,00  │ 📈 +R$ 10 │ [Ver]   ║
╚═══════════════════════════════════════════════════════════╝
```

**Exemplo de implementação:**
```typescript
// Buscar caixas com filtro de data
const fetchCashSessions = async (from?: string, to?: string) => {
  let url = `/api/cash-sessions?companyId=${companyId}`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
};
```

### Tela de Relatório de Caixa

**Implementar nova tela que:**
1. Recebe o ID da sessão de caixa
2. Chama `GET /api/cash-sessions/{id}`
3. Exibe todas as informações do relatório

**Seções da Tela:**

#### 1. Cabeçalho
```
Relatório de Caixa #550e8400
Abertura: 08/02/2024 08:00 | Fechamento: 08/02/2024 18:00
Status: Fechado
```

#### 2. Resumo Financeiro (Destaque)
```
💵 CONFERÊNCIA DE CAIXA

Valor inicial no caixa: R$ 100,00
+ Vendas em dinheiro: R$ 750,50
= Esperado no caixa: R$ 850,50

Valor informado no fechamento: R$ 850,50

✅ Caixa Conferido - Diferença: R$ 0,00
```

**Indicadores Visuais:**
- Se `balance_status === "balanced"`: mostrar em verde com ✅
- Se `balance_status === "surplus"`: mostrar em azul com 📈 "Sobra de R$ X,XX"
- Se `balance_status === "shortage"`: mostrar em vermelho com 📉 "Falta de R$ X,XX"

#### 3. Resumo de Vendas
```
Total de vendas: 15
Valor total vendido: R$ 1.520,00
```

#### 4. Vendas por Método de Pagamento
Exibir tabela ou cards com:
- Nome do método
- Quantidade de vendas
- Valor total

Exemplo:
```
Dinheiro: 8 vendas - R$ 750,50
Cartão de Crédito: 5 vendas - R$ 620,00
PIX: 2 vendas - R$ 149,50
```

#### 5. Lista de Vendas
Tabela com todas as vendas do período:
- Número da venda
- Cliente
- Valor
- Método de pagamento
- Data/Hora

---

## 🔍 LÓGICA DE DETECÇÃO DE "DINHEIRO"

O backend identifica automaticamente vendas em dinheiro verificando se o nome do método de pagamento contém:
- "dinheiro" (case insensitive)
- "cash" (case insensitive)

**Importante:** 
- Configure o método de pagamento com nome contendo "Dinheiro" para que funcione corretamente
- Exemplos válidos: "Dinheiro", "Dinheiro em Espécie", "Cash"

---

## 📱 FLUXOS DE USO

### Fluxo 1: Gerente Quer Ver Relatório do Caixa de Ontem
```
1. Gerente acessa "Histórico de Caixas"
2. Filtra pela data de ontem (from e to = mesma data)
3. Lista mostra apenas caixa(s) de ontem
4. Clica em "Ver Relatório"
5. Sistema chama GET /api/cash-sessions/{id}
6. Exibe relatório completo com conferência automática
```

### Fluxo 2: Auditar Caixas do Mês
```
1. Gerente acessa "Histórico de Caixas"
2. Seleciona período (01/02 a 28/02)
3. Sistema lista todos os caixas do mês
4. Pode clicar em qualquer um para ver detalhes
5. Analisa conferências e identifica problemas
```

### Fluxo 3: Operador Fechou Caixa, Gerente Quer Conferir
```
1. Operador fecha o caixa informando valor
2. Sistema apenas registra (fechamento "às cegas")
3. Gerente depois acessa relatório do caixa
4. Sistema mostra:
   - Quanto tinha que ter
   - Quanto foi informado
   - Se bateu, sobrou ou faltou
5. Gerente pode tomar ações se necessário
```

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. Fechamento "Às Cegas"
- No momento do fechamento, o operador **NÃO** vê valores esperados
- Ele apenas informa quanto contou no caixa
- A conferência acontece **depois**, no relatório

### 2. Valores Esperados vs Informados
- `expected_cash_amount` = abertura + vendas em dinheiro
- `informed_closing_amount` = o que o operador informou
- `difference` = informado - esperado
- Frontend deve destacar visualmente quando houver diferença

### 3. Caixas Ainda Abertos
- Se chamar relatório de um caixa aberto:
  - `closing_amount` será `null`
  - `difference` será `null`
  - `balance_status` será `null`
- Mas ainda mostra vendas e totais por método

---

## 🎨 SUGESTÕES DE UI/UX

### Card de Resumo de Conferência
Sugerimos destacar o resumo com cores:

```jsx
<Card color={getBalanceColor(balance_status)}>
  <Title>Conferência de Caixa</Title>
  
  <Row>
    <Label>Esperado:</Label>
    <Value>R$ {expected_cash_amount}</Value>
  </Row>
  
  <Row>
    <Label>Informado:</Label>
    <Value>R$ {informed_closing_amount}</Value>
  </Row>
  
  <Divider />
  
  <Row highlight>
    <Label>Diferença:</Label>
    <Value>{difference > 0 ? '+' : ''}R$ {difference}</Value>
    <Icon>{getBalanceIcon(balance_status)}</Icon>
  </Row>
</Card>
```

### Tabela de Métodos de Pagamento
```
╔════════════════════╦══════════╦═══════════════╗
║ Método             ║ Vendas   ║ Total         ║
╠════════════════════╬══════════╬═══════════════╣
║ 💵 Dinheiro        ║ 8        ║ R$ 750,50     ║
║ 💳 Cartão Crédito  ║ 5        ║ R$ 620,00     ║
║ 📱 PIX             ║ 2        ║ R$ 149,50     ║
╠════════════════════╬══════════╬═══════════════╣
║ TOTAL              ║ 15       ║ R$ 1.520,00   ║
╚════════════════════╩══════════╩═══════════════╝
```

---

## 📄 POSSÍVEIS ERROS

### Erro 404 - Sessão não encontrada
```json
{
  "error": "Sessão de caixa não encontrada"
}
```
**Quando acontece:** ID inválido ou caixa de outra empresa

**Como tratar:** Mostrar mensagem e voltar para lista

### Erro 400 - Parâmetros faltando
```json
{
  "error": "companyId é obrigatório"
}
```
**Quando acontece:** Não passou companyId na query

**Como evitar:** Sempre incluir companyId na URL

---

## 💡 DICAS DE IMPLEMENTAÇÃO

### 1. Cache do Relatório
- Relatórios de caixas fechados não mudam
- Pode cachear localmente após primeira busca

### 2. Exportação
- Considere adicionar botão "Exportar PDF"
- Use os dados do relatório para gerar PDF no frontend

### 3. Comparação
- Útil ter tela para comparar múltiplos caixas
- Ex: comparar vendas desta semana vs semana passada

### 4. Notificações
- Se `balance_status === "shortage"`, considere criar notificação
- Alertar gerente sobre faltas no caixa

---

## 🔗 ENDPOINTS RELACIONADOS

Outros endpoints que você pode precisar:

- `GET /api/cash-sessions/current` - Ver caixa aberto agora
- `POST /api/cash-sessions/open` - Abrir novo caixa
- `POST /api/cash-sessions/close` - Fechar caixa atual
- `GET /api/payment-methods` - Listar métodos de pagamento configurados

---

## 📚 DOCUMENTAÇÃO COMPLETA

Para documentação completa de todos os endpoints, consulte:
[CASH-SESSIONS-API-DOCUMENTATION.md](./CASH-SESSIONS-API-DOCUMENTATION.md)
