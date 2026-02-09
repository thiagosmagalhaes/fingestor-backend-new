# API de Cartões de Crédito - Documentação

Endpoints para gerenciar cartões de crédito das empresas.

**Base URL**: `/api/credit-cards`

**Autenticação**: Todas as rotas requerem token JWT no header `Authorization: Bearer <token>`

---

## Endpoints

### 1. Listar Cartões de Crédito
**GET** `/api/credit-cards?companyId={companyId}`

Lista todos os cartões de crédito de uma empresa específica, ordenados por nome.

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Respostas:

**200 OK**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Nubank",
    "brand": "mastercard",
    "closing_day": 10,
    "due_day": 17,
    "credit_limit": 5000.00,
    "created_at": "2026-01-20T10:00:00Z",
    "updated_at": "2026-01-20T10:00:00Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Santander SX",
    "brand": "visa",
    "closing_day": 5,
    "due_day": 15,
    "credit_limit": 10000.00,
    "created_at": "2026-01-20T10:00:00Z",
    "updated_at": "2026-01-20T10:00:00Z"
  }
]
```

**400 Bad Request**
```json
{
  "error": "companyId é obrigatório"
}
```

#### Exemplo cURL:
```bash
curl -X GET "http://localhost:3000/api/credit-cards?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Obter Cartão Específico
**GET** `/api/credit-cards/:id?companyId={companyId}`

Retorna os detalhes de um cartão de crédito específico.

#### Path Parameters:
- `id` (string, obrigatório) - ID do cartão

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Respostas:

**200 OK**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Nubank",
  "brand": "mastercard",
  "closing_day": 10,
  "due_day": 17,
  "credit_limit": 5000.00,
  "created_at": "2026-01-20T10:00:00Z",
  "updated_at": "2026-01-20T10:00:00Z"
}
```

**404 Not Found**
```json
{
  "error": "Cartão de crédito não encontrado"
}
```

#### Exemplo cURL:
```bash
curl -X GET "http://localhost:3000/api/credit-cards/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Criar Cartão de Crédito
**POST** `/api/credit-cards`

Cria um novo cartão de crédito para uma empresa.

#### Body (JSON):
```json
{
  "companyId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "C6 Bank",
  "brand": "mastercard",
  "closingDay": 8,
  "dueDay": 15,
  "creditLimit": 8000.00
}
```

#### Campos:
- `companyId` (string, obrigatório) - ID da empresa
- `name` (string, obrigatório) - Nome do cartão (mínimo 2 caracteres)
- `brand` (string, obrigatório) - Bandeira: `visa`, `mastercard`, `elo`, `amex`, `hipercard`, `diners`, `discover`, `other`
- `closingDay` (number, obrigatório) - Dia de fechamento da fatura (1-31)
- `dueDay` (number, obrigatório) - Dia de vencimento da fatura (1-31)
- `creditLimit` (number, opcional) - Limite de crédito (deve ser ≥ 0)

#### Validações:
- ✅ Nome deve ter pelo menos 2 caracteres
- ✅ Bandeira deve ser uma das opções válidas
- ✅ Dias devem estar entre 1 e 31
- ✅ Limite não pode ser negativo
- ✅ Não pode existir cartão com mesmo nome na empresa
- ✅ A empresa deve existir e pertencer ao usuário

#### Respostas:

**201 Created**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "C6 Bank",
  "brand": "mastercard",
  "closing_day": 8,
  "due_day": 15,
  "credit_limit": 8000.00,
  "created_at": "2026-01-20T12:30:00Z",
  "updated_at": "2026-01-20T12:30:00Z"
}
```

**400 Bad Request**
```json
{
  "error": "Dia de fechamento deve estar entre 1 e 31"
}
```

**404 Not Found**
```json
{
  "error": "Empresa não encontrada ou você não tem permissão"
}
```

**409 Conflict**
```json
{
  "error": "Já existe um cartão com este nome"
}
```

#### Exemplo cURL:
```bash
curl -X POST "http://localhost:3000/api/credit-cards" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "C6 Bank",
    "brand": "mastercard",
    "closingDay": 8,
    "dueDay": 15,
    "creditLimit": 8000.00
  }'
```

---

### 4. Atualizar Cartão de Crédito
**PUT** `/api/credit-cards/:id?companyId={companyId}`

Atualiza um cartão de crédito existente. Todos os campos são opcionais.

#### Path Parameters:
- `id` (string, obrigatório) - ID do cartão

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Body (JSON):
```json
{
  "name": "Nubank Ultravioleta",
  "creditLimit": 15000.00,
  "closingDay": 12
}
```

#### Campos (todos opcionais):
- `name` (string) - Nome do cartão (mínimo 2 caracteres)
- `brand` (string) - Bandeira: `visa`, `mastercard`, `elo`, `amex`, `hipercard`, `diners`, `discover`, `other`
- `closingDay` (number) - Dia de fechamento (1-31)
- `dueDay` (number) - Dia de vencimento (1-31)
- `creditLimit` (number) - Limite de crédito (≥ 0)

#### Validações:
- ✅ Nome deve ter pelo menos 2 caracteres (se fornecido)
- ✅ Bandeira deve ser válida (se fornecido)
- ✅ Dias devem estar entre 1 e 31 (se fornecidos)
- ✅ Limite não pode ser negativo (se fornecido)
- ✅ Não pode criar duplicata de nome
- ✅ Pelo menos um campo deve ser fornecido

#### Respostas:

**200 OK**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Nubank Ultravioleta",
  "brand": "mastercard",
  "closing_day": 12,
  "due_day": 17,
  "credit_limit": 15000.00,
  "created_at": "2026-01-20T10:00:00Z",
  "updated_at": "2026-01-20T13:00:00Z"
}
```

**400 Bad Request**
```json
{
  "error": "Nenhum campo para atualizar"
}
```

**404 Not Found**
```json
{
  "error": "Cartão de crédito não encontrado ou você não tem permissão"
}
```

**409 Conflict**
```json
{
  "error": "Já existe um cartão com este nome"
}
```

#### Exemplo cURL:
```bash
curl -X PUT "http://localhost:3000/api/credit-cards/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nubank Ultravioleta",
    "creditLimit": 15000.00
  }'
```

---

### 5. Deletar Cartão de Crédito
**DELETE** `/api/credit-cards/:id?companyId={companyId}`

Deleta um cartão de crédito. ⚠️ **ATENÇÃO**: Transações associadas terão o campo `credit_card_id` definido como NULL (ON DELETE SET NULL).

#### Path Parameters:
- `id` (string, obrigatório) - ID do cartão

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Respostas:

**200 OK**
```json
{
  "message": "Cartão de crédito deletado com sucesso"
}
```

**400 Bad Request**
```json
{
  "error": "companyId é obrigatório"
}
```

#### Exemplo cURL:
```bash
curl -X DELETE "http://localhost:3000/api/credit-cards/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Bandeiras de Cartão

| Bandeira | Valor | Descrição |
|----------|-------|-----------|
| Visa | `visa` | Cartões Visa |
| Mastercard | `mastercard` | Cartões Mastercard |
| Elo | `elo` | Cartões Elo (Brasil) |
| American Express | `amex` | Cartões Amex |
| Hipercard | `hipercard` | Cartões Hipercard (Brasil) |
| Diners Club | `diners` | Cartões Diners |
| Discover | `discover` | Cartões Discover |
| Outro | `other` | Outras bandeiras |

---

### 6. Obter Extrato do Cartão
**GET** `/api/credit-cards/:id/statement?companyId={companyId}&referenceDate={yyyy-mm-dd}`

Retorna o extrato do cartão de crédito para um mês específico, incluindo todas as transações do período da fatura e informações de pagamento.

#### Path Parameters:
- `id` (string, obrigatório) - ID do cartão

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa
- `referenceDate` (string, obrigatório) - Data de referência do mês (formato: YYYY-MM-DD, ex: 2026-01-01)

#### Lógica de Cálculo da Fatura:

O sistema calcula automaticamente o período correto da fatura:

1. **Data de fechamento**: Dia de fechamento do mês de referência
   - Ex: Se `closing_day = 10` e `referenceDate = 2026-01-01`, fechamento é `2026-01-10`

2. **Período de compras**: Do dia seguinte ao fechamento anterior até o fechamento atual
   - Ex: Compras de `2025-12-11` até `2026-01-10`

3. **Data de vencimento**: Dia de vencimento do cartão
   - Se vencimento ≤ fechamento: vencimento é no mês seguinte
   - Ex: Fecha dia 10, vence dia 17 → vence em `2026-01-17`
   - Ex: Fecha dia 25, vence dia 5 → vence em `2026-02-05`

#### Respostas:

**200 OK**
```json
{
  "transactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "description": "Mercado ABC",
      "amount": 250.50,
      "type": "expense",
      "categoryId": "660e8400-e29b-41d4-a716-446655440001",
      "companyId": "123e4567-e89b-12d3-a456-426614174000",
      "date": "2026-01-08T03:00:00.000Z",
      "status": "pending",
      "isInstallment": false,
      "installmentNumber": undefined,
      "totalInstallments": undefined,
      "isCreditCard": true,
      "creditCardId": "990e8400-e29b-41d4-a716-446655440004",
      "notes": undefined,
      "invoicePaidAt": undefined,
      "createdAt": "2026-01-08T10:00:00.000Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "description": "Netflix - Parcela 1/12",
      "amount": 55.90,
      "type": "expense",
      "categoryId": "880e8400-e29b-41d4-a716-446655440003",
      "companyId": "123e4567-e89b-12d3-a456-426614174000",
      "date": "2026-01-05T03:00:00.000Z",
      "status": "pending",
      "isInstallment": true,
      "installmentNumber": 1,
      "totalInstallments": 12,
      "isCreditCard": true,
      "creditCardId": "990e8400-e29b-41d4-a716-446655440004",
      "notes": "Assinatura anual",
      "invoicePaidAt": undefined,
      "createdAt": "2026-01-05T09:00:00.000Z"
    }
  ],
  "invoice": {
    "totalAmount": 306.40,
    "closingDate": "2026-01-10",
    "dueDate": "2026-01-17",
    "isPaid": false,
    "paidAt": null
  }
}
```

**Fatura Paga:**
```json
{
  "transactions": [...],
  "invoice": {
    "totalAmount": 1234.56,
    "closingDate": "2025-12-10",
    "dueDate": "2025-12-17",
    "isPaid": true,
    "paidAt": "2025-12-15T14:30:00Z"
  }
}
```

**400 Bad Request**
```json
{
  "error": "referenceDate é obrigatório (formato: YYYY-MM-DD)"
}
```

**404 Not Found**
```json
{
  "error": "Cartão de crédito não encontrado"
}
```

#### Exemplo cURL:
```bash
# Extrato de Janeiro/2026
curl -X GET "http://localhost:3000/api/credit-cards/990e8400-e29b-41d4-a716-446655440004/statement?companyId=123e4567-e89b-12d3-a456-426614174000&referenceDate=2026-01-01" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Extrato de Fevereiro/2026
curl -X GET "http://localhost:3000/api/credit-cards/990e8400-e29b-41d4-a716-446655440004/statement?companyId=123e4567-e89b-12d3-a456-426614174000&referenceDate=2026-02-01" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Exemplo React (com Axios):
```typescript
interface InvoiceStatement {
  transactions: Transaction[];
  invoice: {
    totalAmount: number;
    closingDate: string;
    dueDate: string;
    isPaid: boolean;
    paidAt: string | null;
  };
}

const getCardStatement = async (
  cardId: string,
  companyId: string,
  referenceDate: string // YYYY-MM-DD
): Promise<InvoiceStatement> => {
  const token = localStorage.getItem('access_token');
  
  try {
    const response = await axios.get(
      `/api/credit-cards/${cardId}/statement?companyId=${companyId}&referenceDate=${referenceDate}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Erro:', error.response?.data.error);
    }
    throw error;
  }
};

// Uso:
const statement = await getCardStatement(
  'card-id',
  'company-id',
  '2026-01-01'
);

console.log(`Total da fatura: R$ ${statement.invoice.totalAmount}`);
console.log(`Vencimento: ${statement.invoice.dueDate}`);
console.log(`Transações: ${statement.transactions.length}`);
```

#### Hook React para Extrato:
```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useCreditCardStatement = (
  cardId: string,
  companyId: string,
  referenceDate: string
) => {
  const [statement, setStatement] = useState<InvoiceStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatement = async () => {
    const token = localStorage.getItem('access_token');
    setLoading(true);
    
    try {
      const response = await axios.get(
        `/api/credit-cards/${cardId}/statement?companyId=${companyId}&referenceDate=${referenceDate}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      setStatement(response.data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar extrato');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cardId && companyId && referenceDate) {
      fetchStatement();
    }
  }, [cardId, companyId, referenceDate]);

  return {
    statement,
    loading,
    error,
    refetch: fetchStatement
  };
};

// Componente de exemplo
const CreditCardStatement: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('2026-01-01');
  const { statement, loading } = useCreditCardStatement(
    'card-id',
    'company-id',
    selectedMonth
  );

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h2>Extrato do Cartão</h2>
      
      <input
        type="month"
        value={selectedMonth.slice(0, 7)}
        onChange={(e) => setSelectedMonth(e.target.value + '-01')}
      />

      <div className="invoice-summary">
        <p>Fechamento: {statement?.invoice.closingDate}</p>
        <p>Vencimento: {statement?.invoice.dueDate}</p>
        <p>Total: R$ {statement?.invoice.totalAmount.toFixed(2)}</p>
        <p>Status: {statement?.invoice.isPaid ? 'Paga' : 'Em aberto'}</p>
      </div>

      <div className="transactions">
        {statement?.transactions.map(tx => (
          <div key={tx.id} className="transaction-item">
            <span>{new Date(tx.date).toLocaleDateString()}</span>
            <span>{tx.description}</span>
            {tx.isInstallment && (
              <span>{tx.installmentNumber}/{tx.totalInstallments}</span>
            )}
            <span>R$ {tx.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### Casos Especiais:

**1. Fechamento > Vencimento (ex: fecha dia 25, vence dia 5)**
```javascript
// Cartão: closing_day = 25, due_day = 5
// Referência: Janeiro/2026

// Período de compras: 26/12/2025 até 25/01/2026
// Vencimento: 05/02/2026 (mês seguinte ao fechamento)
```

**2. Parcelamentos**
```javascript
// Cada parcela entra na fatura do mês em que sua data cai no período
// Parcela 1: data = 15/01/2026 → Fatura de Janeiro
// Parcela 2: data = 15/02/2026 → Fatura de Fevereiro
```

**3. Status da Fatura**
```javascript
// Fatura é considerada "paga" se invoice_paid_at está preenchido
// em qualquer transação do período
// Quando paga, todas as transações do período recebem o mesmo invoice_paid_at
```

---

## Tipos TypeScript

```typescript
type CreditCardBrand = 
  | 'visa' 
  | 'mastercard' 
  | 'elo' 
  | 'amex' 
  | 'hipercard' 
  | 'diners' 
  | 'discover' 
  | 'other';

interface CreditCard {
  id: string;
  company_id: string;
  name: string;
  brand: CreditCardBrand;
  closing_day: number; // 1-31
  due_day: number; // 1-31
  credit_limit: number | null;
  created_at: string;
  updated_at: string;
}

interface CreateCreditCardData {
  companyId: string;
  name: string;
  brand: CreditCardBrand;
  closingDay: number;
  dueDay: number;
  creditLimit?: number;
}

interface UpdateCreditCardData {
  name?: string;
  brand?: CreditCardBrand;
  closingDay?: number;
  dueDay?: number;
  creditLimit?: number;
}
```

---

## Exemplo de Hook React Completo

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface CreditCard {
  id: string;
  company_id: string;
  name: string;
  brand: string;
  closing_day: number;
  due_day: number;
  credit_limit: number | null;
  created_at: string;
  updated_at: string;
}

export const useCreditCards = (companyId: string) => {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreditCards = async () => {
    const token = localStorage.getItem('access_token');
    setLoading(true);
    
    try {
      const response = await axios.get(
        `/api/credit-cards?companyId=${companyId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      setCreditCards(response.data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar cartões');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createCreditCard = async (data: Omit<CreditCard, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await axios.post(
        '/api/credit-cards',
        { ...data, companyId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setCreditCards([...creditCards, response.data]);
      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const updateCreditCard = async (id: string, updates: Partial<CreditCard>) => {
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await axios.put(
        `/api/credit-cards/${id}?companyId=${companyId}`,
        updates,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setCreditCards(creditCards.map(card => 
        card.id === id ? response.data : card
      ));
      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const deleteCreditCard = async (id: string) => {
    const token = localStorage.getItem('access_token');
    
    try {
      await axios.delete(
        `/api/credit-cards/${id}?companyId=${companyId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setCreditCards(creditCards.filter(card => card.id !== id));
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchCreditCards();
    }
  }, [companyId]);

  return {
    creditCards,
    loading,
    error,
    refetch: fetchCreditCards,
    createCreditCard,
    updateCreditCard,
    deleteCreditCard
  };
};
```

---

## Componente de Formulário React

```typescript
import { useState } from 'react';

interface CreditCardFormProps {
  companyId: string;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

export const CreditCardForm: React.FC<CreditCardFormProps> = ({
  companyId,
  onSubmit,
  initialData
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    brand: initialData?.brand || 'other',
    closingDay: initialData?.closing_day || 1,
    dueDay: initialData?.due_day || 1,
    creditLimit: initialData?.credit_limit || ''
  });

  const brands = [
    { value: 'visa', label: 'Visa' },
    { value: 'mastercard', label: 'Mastercard' },
    { value: 'elo', label: 'Elo' },
    { value: 'amex', label: 'American Express' },
    { value: 'hipercard', label: 'Hipercard' },
    { value: 'diners', label: 'Diners Club' },
    { value: 'discover', label: 'Discover' },
    { value: 'other', label: 'Outro' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await onSubmit({
        companyId,
        name: formData.name,
        brand: formData.brand,
        closingDay: Number(formData.closingDay),
        dueDay: Number(formData.dueDay),
        creditLimit: formData.creditLimit ? Number(formData.creditLimit) : undefined
      });
      
      // Reset form
      if (!initialData) {
        setFormData({
          name: '',
          brand: 'other',
          closingDay: 1,
          dueDay: 1,
          creditLimit: ''
        });
      }
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Nome do Cartão *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          minLength={2}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Ex: Nubank, C6 Bank..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Bandeira *
        </label>
        <select
          value={formData.brand}
          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
          required
          className="w-full px-3 py-2 border rounded-lg"
        >
          {brands.map(brand => (
            <option key={brand.value} value={brand.value}>
              {brand.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Dia de Fechamento *
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={formData.closingDay}
            onChange={(e) => setFormData({ ...formData, closingDay: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Dia de Vencimento *
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={formData.dueDay}
            onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Limite de Crédito (opcional)
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={formData.creditLimit}
          onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="0.00"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
      >
        {initialData ? 'Atualizar' : 'Criar'} Cartão
      </button>
    </form>
  );
};
```

---

## Fluxo de Uso Recomendado

1. **Cadastro Inicial**: Usuário cadastra cartões ao configurar a empresa
2. **Seleção em Transações**: Cartões aparecem como opção ao criar despesas
3. **Gestão de Faturas**: Use `closing_day` e `due_day` para calcular faturas
4. **Controle de Limite**: Compare soma de transações com `credit_limit`
5. **Atualização Rara**: Cartões geralmente são atualizados apenas quando mudam condições
6. **Deleção Cuidadosa**: Transações perdem referência ao cartão (SET NULL)

---

## Cálculo de Faturas

```typescript
// Exemplo de função para determinar a fatura de uma transação
function getInvoicePeriod(
  transactionDate: Date,
  closingDay: number,
  dueDay: number
) {
  const year = transactionDate.getFullYear();
  const month = transactionDate.getMonth();
  const day = transactionDate.getDate();

  // Se a transação foi após o fechamento, vai para próxima fatura
  let invoiceMonth = month;
  let invoiceYear = year;
  
  if (day > closingDay) {
    invoiceMonth++;
    if (invoiceMonth > 11) {
      invoiceMonth = 0;
      invoiceYear++;
    }
  }

  const invoiceClosing = new Date(invoiceYear, invoiceMonth, closingDay);
  const invoiceDue = new Date(invoiceYear, invoiceMonth, dueDay);

  // Se vencimento é antes do fechamento, vai para próximo mês
  if (dueDay < closingDay) {
    invoiceDue.setMonth(invoiceDue.getMonth() + 1);
  }

  return {
    closingDate: invoiceClosing,
    dueDate: invoiceDue,
    period: `${invoiceMonth + 1}/${invoiceYear}`
  };
}
```

---

## Segurança

- ✅ Todas as rotas requerem autenticação JWT
- ✅ Row Level Security (RLS) garante isolamento de dados
- ✅ Validação de propriedade da empresa
- ✅ Validação de duplicatas (nome único por empresa)
- ✅ Validações de range para dias (1-31)
- ✅ Limite de crédito não pode ser negativo
- ✅ Transações preservadas com SET NULL ao deletar cartão
