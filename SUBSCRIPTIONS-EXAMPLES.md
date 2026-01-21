# Exemplos de Uso - API de Assinaturas

## Configuração Inicial

### 1. Aplicar Migration
```bash
# Se estiver usando Supabase local
supabase db reset

# Ou aplicar apenas a migration
supabase db push
```

### 2. Configurar Webhook no Stripe

No dashboard do Stripe (https://dashboard.stripe.com/webhooks):
1. Clique em "Add endpoint"
2. URL: `https://seu-dominio.com/api/subscriptions/webhook`
3. Eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copie o "Signing secret" e adicione ao `.env` como `STRIPE_WEBHOOK_SECRET`

### 3. Testar Webhooks Localmente
```bash
# Terminal 1: Iniciar o servidor
npm run dev

# Terminal 2: Usar Stripe CLI para forward webhooks
stripe listen --forward-to localhost:3001/api/subscriptions/webhook

# Copie o webhook secret que aparece e adicione ao .env como STRIPE_WEBHOOK_SECRET
# Exemplo: whsec_xxxxxxxxxxxxxxxxxxxxx
```

## Frontend - React/Next.js

### Criar Checkout Session
```typescript
// pages/pricing.tsx ou components/PricingPlans.tsx
import { useState } from 'react';

interface CheckoutResponse {
  sessionId: string;
  url: string;
}

export default function PricingPlans() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planType: 'mensal' | 'semestral' | 'anual') => {
    try {
      setLoading(planType);
      
      const accessToken = localStorage.getItem('access_token'); // ou de onde você pega o token
      
      const response = await fetch('http://localhost:3001/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ plan_type: planType })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data: CheckoutResponse = await response.json();
      
      // Redirecionar para o Stripe Checkout
      window.location.href = data.url;
      
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      alert('Erro ao iniciar assinatura. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="pricing-container">
      <h1>Escolha seu Plano</h1>
      
      <div className="plans">
        <div className="plan">
          <h2>Mensal</h2>
          <p className="price">R$ 29,90/mês</p>
          <button 
            onClick={() => handleSubscribe('mensal')}
            disabled={loading === 'mensal'}
          >
            {loading === 'mensal' ? 'Processando...' : 'Assinar Mensal'}
          </button>
        </div>

        <div className="plan">
          <h2>Semestral</h2>
          <p className="price">R$ 149,90/6 meses</p>
          <p className="discount">Economize 16%</p>
          <button 
            onClick={() => handleSubscribe('semestral')}
            disabled={loading === 'semestral'}
          >
            {loading === 'semestral' ? 'Processando...' : 'Assinar Semestral'}
          </button>
        </div>

        <div className="plan featured">
          <h2>Anual</h2>
          <p className="price">R$ 239,90/ano</p>
          <p className="discount">Economize 33%</p>
          <button 
            onClick={() => handleSubscribe('anual')}
            disabled={loading === 'anual'}
          >
            {loading === 'anual' ? 'Processando...' : 'Assinar Anual'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Página de Sucesso
```typescript
// pages/subscription/success.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  current_period_end: string;
}

export default function SubscriptionSuccess() {
  const router = useRouter();
  const { session_id } = router.query;
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const accessToken = localStorage.getItem('access_token');
        
        const response = await fetch('http://localhost:3001/api/subscriptions/status', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (error) {
        console.error('Erro ao buscar assinatura:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session_id) {
      // Aguardar um pouco para o webhook processar
      setTimeout(fetchSubscription, 2000);
    }
  }, [session_id]);

  if (loading) {
    return <div>Processando sua assinatura...</div>;
  }

  return (
    <div className="success-container">
      <h1>✅ Assinatura Ativada!</h1>
      {subscription && (
        <div>
          <p>Plano: <strong>{subscription.plan_type}</strong></p>
          <p>Status: <strong>{subscription.status}</strong></p>
          <p>Válida até: {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</p>
        </div>
      )}
      <button onClick={() => router.push('/dashboard')}>
        Ir para Dashboard
      </button>
    </div>
  );
}
```

### Verificar Status da Assinatura
```typescript
// hooks/useSubscription.ts
import { useEffect, useState } from 'react';

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('access_token');
      
      const response = await fetch('http://localhost:3001/api/subscriptions/status', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
        setError(null);
      } else if (response.status === 404) {
        // Usuário não tem assinatura
        setSubscription(null);
        setError(null);
      } else {
        throw new Error('Erro ao buscar assinatura');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';

  return {
    subscription,
    loading,
    error,
    hasActiveSubscription,
    refetch: fetchSubscription
  };
}

// Uso no componente
function Dashboard() {
  const { subscription, loading, hasActiveSubscription } = useSubscription();

  if (loading) return <div>Carregando...</div>;

  if (!hasActiveSubscription) {
    return (
      <div>
        <h2>Assinatura Necessária</h2>
        <p>Você precisa de uma assinatura ativa para acessar esta página.</p>
        <a href="/pricing">Ver Planos</a>
      </div>
    );
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Plano atual: {subscription?.plan_type}</p>
      {/* Conteúdo do dashboard */}
    </div>
  );
}
```

### Gerenciar Assinatura
```typescript
// components/SubscriptionManager.tsx
import { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';

export default function SubscriptionManager() {
  const { subscription, refetch } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura? Ela permanecerá ativa até o fim do período atual.')) {
      return;
    }

    try {
      setLoading(true);
      const accessToken = localStorage.getItem('access_token');
      
      const response = await fetch('http://localhost:3001/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        alert('Assinatura cancelada com sucesso!');
        refetch();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      alert('Erro ao cancelar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('access_token');
      
      const response = await fetch('http://localhost:3001/api/subscriptions/reactivate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        alert('Assinatura reativada com sucesso!');
        refetch();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Erro ao reativar:', error);
      alert('Erro ao reativar assinatura');
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) return null;

  return (
    <div className="subscription-manager">
      <h2>Gerenciar Assinatura</h2>
      
      <div className="subscription-info">
        <p><strong>Plano:</strong> {subscription.plan_type}</p>
        <p><strong>Status:</strong> {subscription.status}</p>
        <p>
          <strong>Período:</strong>{' '}
          {new Date(subscription.current_period_start).toLocaleDateString('pt-BR')} até{' '}
          {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
        </p>
        
        {subscription.cancel_at_period_end && (
          <p className="warning">
            ⚠️ Sua assinatura será cancelada em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>

      <div className="actions">
        {subscription.cancel_at_period_end ? (
          <button 
            onClick={handleReactivate} 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Processando...' : 'Reativar Assinatura'}
          </button>
        ) : (
          <button 
            onClick={handleCancel} 
            disabled={loading}
            className="btn-danger"
          >
            {loading ? 'Processando...' : 'Cancelar Assinatura'}
          </button>
        )}
      </div>
    </div>
  );
}
```

## Testes com cURL

### 1. Criar Checkout Session
```bash
curl -X POST http://localhost:3001/api/subscriptions/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{"plan_type":"mensal"}'
```

### 2. Verificar Status
```bash
curl -X GET http://localhost:3001/api/subscriptions/status \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 3. Cancelar Assinatura
```bash
curl -X POST http://localhost:3001/api/subscriptions/cancel \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 4. Reativar Assinatura
```bash
curl -X POST http://localhost:3001/api/subscriptions/reactivate \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 5. Testar Webhook (usando Stripe CLI)
```bash
# Simular checkout completo
stripe trigger checkout.session.completed

# Simular atualização de assinatura
stripe trigger customer.subscription.updated

# Simular falha de pagamento
stripe trigger invoice.payment_failed
```

## Middleware para Proteger Rotas

### Verificar Assinatura Ativa
```typescript
// middleware/subscription.ts
import { Response, NextFunction } from 'express';
import supabase from '../config/database';
import { AuthRequest } from './auth';

export const requireActiveSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário não autenticado',
      });
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .single();

    if (!subscription) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Assinatura ativa necessária para acessar este recurso',
      });
    }

    // Adicionar informações da assinatura ao request
    (req as any).subscription = subscription;

    next();
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro ao verificar assinatura',
    });
  }
};

// Uso nas rotas
import { requireActiveSubscription } from '../middleware/subscription';

router.get('/premium-feature', 
  authMiddleware, 
  requireActiveSubscription, 
  premiumController
);
```

## Consultas SQL Úteis

### Listar todas as assinaturas
```sql
SELECT 
  s.*,
  u.email
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
ORDER BY s.created_at DESC;
```

### Assinaturas ativas por plano
```sql
SELECT 
  plan_type,
  COUNT(*) as total
FROM subscriptions
WHERE status = 'active'
GROUP BY plan_type;
```

### MRR (Monthly Recurring Revenue)
```sql
SELECT 
  SUM(
    CASE 
      WHEN plan_type = 'mensal' THEN 29.90
      WHEN plan_type = 'semestral' THEN 24.98  -- 149.90 / 6
      WHEN plan_type = 'anual' THEN 19.99      -- 239.90 / 12
    END
  ) as mrr
FROM subscriptions
WHERE status = 'active';
```

### Assinaturas que vão cancelar
```sql
SELECT 
  s.*,
  u.email,
  s.current_period_end as cancels_at
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE s.cancel_at_period_end = true
  AND s.status = 'active'
ORDER BY s.current_period_end;
```
