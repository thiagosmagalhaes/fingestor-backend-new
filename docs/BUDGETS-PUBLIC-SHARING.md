# Compartilhamento Público de Orçamentos

## Visão Geral

Esta funcionalidade permite que você compartilhe orçamentos com seus clientes através de uma URL pública, sem que eles precisem fazer login ou ter acesso ao sistema.

## Como Funciona

### 1. Token de Compartilhamento

Cada orçamento possui um `share_token` único que é gerado automaticamente quando o orçamento é criado. Este token é um hash de 64 caracteres que garante segurança e unicidade.

### 2. URL Pública

Para compartilhar um orçamento, você pode usar a seguinte URL:

```
https://api.fingestor.com/public/budgets/{share_token}
```

Exemplo:
```
https://api.fingestor.com/public/budgets/a1b2c3d4e5f6...
```

## Endpoint da API

### GET /public/budgets/:shareToken

**Autenticação:** Não requerida  
**Parâmetros:**
- `shareToken` (URL) - Token único do orçamento

**Resposta:**
```json
{
  "id": "uuid",
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
  "is_expired": false,
  "notes": "...",
  "terms": "...",
  "budget_items": [...],
  "companies": {
    "id": "uuid-empresa",
    "name": "Sua Empresa",
    "cnpj": "12.345.678/0001-90"
  }
}
```

## Implementação no Frontend

### 1. Obter o Share Token

Quando você lista ou cria um orçamento, o campo `share_token` estará presente na resposta:

```javascript
// Ao criar ou buscar um orçamento
const budget = await api.get('/api/budgets/uuid123');
const shareToken = budget.data.share_token;
```

### 2. Gerar a URL de Compartilhamento

```javascript
const generateShareUrl = (shareToken) => {
  return `${window.location.origin}/orcamentos/compartilhado/${shareToken}`;
};

const shareUrl = generateShareUrl(budget.share_token);
```

### 3. Página Pública de Visualização

Crie uma rota pública no seu frontend (Next.js, React, etc.):

```javascript
// pages/orcamentos/compartilhado/[shareToken].tsx (Next.js)
export default function PublicBudgetPage({ budget }) {
  if (budget.is_expired) {
    return <ExpiredBudgetMessage />;
  }

  return (
    <div>
      <CompanyHeader company={budget.companies} />
      <BudgetDetails budget={budget} />
      <BudgetItems items={budget.budget_items} />
      <BudgetTotal budget={budget} />
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const { shareToken } = params;
  
  try {
    const response = await fetch(
      `${process.env.API_URL}/public/budgets/${shareToken}`
    );
    
    if (!response.ok) {
      return { notFound: true };
    }
    
    const budget = await response.json();
    return { props: { budget } };
  } catch (error) {
    return { notFound: true };
  }
}
```

### 4. Funcionalidades Sugeridas

#### Copiar Link
```javascript
const copyShareLink = (shareToken) => {
  const url = generateShareUrl(shareToken);
  navigator.clipboard.writeText(url);
  toast.success('Link copiado para a área de transferência!');
};
```

#### Compartilhar via WhatsApp
```javascript
const shareViaWhatsApp = (budget) => {
  const url = generateShareUrl(budget.share_token);
  const message = `Olá! Segue o orçamento ${budget.budget_number}: ${url}`;
  const whatsappUrl = `https://wa.me/${budget.customer_phone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};
```

#### Compartilhar via Email
```javascript
const shareViaEmail = (budget) => {
  const url = generateShareUrl(budget.share_token);
  const subject = `Orçamento ${budget.budget_number}`;
  const body = `Olá,\n\nSegue o orçamento solicitado:\n${url}\n\nAtenciosamente,\n${budget.companies.name}`;
  window.location.href = `mailto:${budget.customer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
```

#### Gerar QR Code
```javascript
import QRCode from 'qrcode';

const generateQRCode = async (shareToken) => {
  const url = generateShareUrl(shareToken);
  const qrCodeDataUrl = await QRCode.toDataURL(url);
  return qrCodeDataUrl;
};
```

## Segurança

✅ **O que é exposto:**
- Dados do orçamento (valores, itens, datas)
- Informações básicas da empresa (nome, CNPJ)
- Informações do cliente (nome, email, telefone)

❌ **O que NÃO é exposto:**
- Dados de acesso e autenticação
- Informações de outros orçamentos
- Dados de usuários do sistema
- Informações financeiras internas da empresa
- Detalhes de contato adicional (email, telefone, endereço da empresa)

## Expiração

O sistema verifica automaticamente se o orçamento está expirado baseado na `expiry_date`:
- `is_expired: true` - Orçamento expirado
- `is_expired: false` - Orçamento válido

Você pode exibir uma mensagem diferente para orçamentos expirados no frontend.

## Exemplo de UI

```jsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <h2>Orçamento {budget.budget_number}</h2>
        <p className="text-sm text-gray-500">
          Emitido em: {formatDate(budget.issue_date)}
        </p>
      </div>
      {budget.is_expired && (
        <Badge variant="destructive">Expirado</Badge>
      )}
    </div>
  </CardHeader>
  
  <CardContent>
    <div className="space-y-4">
      {/* Informações da empresa */}
      <div className="flex items-center gap-3">
        <div>
          <h3 className="font-semibold">{budget.companies.name}</h3>
          {budget.companies.cnpj && (
            <p className="text-sm text-gray-600">CNPJ: {budget.companies.cnpj}</p>
          )}
        </div>
      </div>
      
      {/* Itens do orçamento */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Qtd</TableHead>
            <TableHead>Preço Unit.</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {budget.budget_items.map(item => (
            <TableRow key={item.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>{formatCurrency(item.unit_price)}</TableCell>
              <TableCell>{formatCurrency(item.total_amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Totais */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(budget.subtotal)}</span>
        </div>
        {budget.discount_amount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Desconto ({budget.discount_percentage}%):</span>
            <span>- {formatCurrency(budget.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg">
          <span>Total:</span>
          <span>{formatCurrency(budget.total_amount)}</span>
        </div>
      </div>
      
      {/* Termos e notas */}
      {budget.terms && (
        <div>
          <h4 className="font-semibold mb-2">Termos e Condições</h4>
          <p className="text-sm text-gray-600">{budget.terms}</p>
        </div>
      )}
    </div>
  </CardContent>
</Card>
```

## Rastreamento e Analytics

Você pode adicionar rastreamento para monitorar quantas vezes um orçamento foi visualizado:

```javascript
// No backend, adicionar endpoint para registrar visualizações
POST /public/budgets/:shareToken/view

// No frontend
useEffect(() => {
  trackBudgetView(shareToken);
}, [shareToken]);
```

## Próximos Passos

1. Implementar página pública no frontend
2. Adicionar botões de compartilhamento
3. Implementar rastreamento de visualizações
4. Adicionar opção de aceitar/rejeitar orçamento
5. Enviar notificações quando o orçamento for visualizado
