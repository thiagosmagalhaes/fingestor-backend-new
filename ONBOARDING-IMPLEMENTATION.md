# Onboarding Card - Guia de Implementação Frontend

## Componente OnboardingCard

Este componente exibe um card de progresso no dashboard para guiar o usuário nas primeiras configurações do sistema.

---

## Exemplo de Implementação React

### 1. Hook customizado para buscar status

```typescript
// hooks/useSetupStatus.ts
import { useState, useEffect } from 'react';
import api from '../lib/api';

export interface SetupStatus {
  hasCompany: boolean;
  hasCategories: boolean;
  hasCreditCards: boolean;
  hasTransactions: boolean;
}

export function useSetupStatus() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/dashboard/setup-status');
      setStatus(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching setup status:', err);
      setError(err.response?.data?.error || 'Erro ao buscar status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Calcular progresso (4 etapas agora)
  const completedSteps = status 
    ? [status.hasCompany, status.hasCategories, status.hasCreditCards, status.hasTransactions].filter(Boolean).length 
    : 0;
  
  const totalSteps = 4;
  const isComplete = completedSteps === totalSteps;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return {
    status,
    loading,
    error,
    completedSteps,
    totalSteps,
    isComplete,
    progressPercentage,
    refetch: fetchStatus,
  };
}
```

---

### 2. Componente OnboardingCard

```typescript
// components/OnboardingCard.tsx
import { useNavigate } from 'react-router-dom';
import { useSetupStatus } from '../hooks/useSetupStatus';
import { CheckCircle, Circle, X } from 'lucide-react';
import { useState } from 'react';

interface OnboardingCardProps {
  companyId: string;
}

interface Step {
  // Não precisa mais de companyId como prop
}

interface Step {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  route: string;
}

export function OnboardingCard({}: OnboardingCardProps) {
  const navigate = useNavigate();
  const { status, loading, completedSteps, totalSteps, isComplete } = useSetupStatus(
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Se não há status ou card foi dispensado, não exibir
  if (!status || isDismissed) return null;

  // Se todas etapas estão completas, mostrar mensagem de conclusão (opcional)
  if (isComplete) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg shadow p-6 relative">
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-4 right-4 text-green-600 hover:text-green-800"
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle size={24} className="text-green-600" />
          <h3 className="text-lg font-semibold text-green-900">
            Configuração concluída! 🎉
          </h3>
        </div>
        <p className="text-green-700">
          Você concluiu todas as etapas de configuração inicial. Agora você pode aproveitar todas as funcionalidades do sistema.
        </p>
      </div>
    );
  }

  // Definir etapas com base no status (4 etapas agora)
  const steps: Step[] = [
    {
      id: 'company',
      title: 'Criar sua empresa',
      description: 'Cadastre sua empresa para começar a usar o sistema.',
      isCompleted: status.hasCompany,
      route: '/companies/new',
    },
    {
      id: 'categories',
      title: 'Revisar categorias de receitas e despesas',
      description: 'Ajuste as categorias para combinar com o seu negócio.',
      isCompleted: status.hasCategories,
      route: '/categories',
    },
    {
      id: 'credit-cards',
      title: 'Cadastrar um cartão de crédito',
      description: 'Cadastre um cartão para acompanhar gastos e faturas.',
      isCompleted: status.hasCreditCards,
      route: '/credit-cards',
    },
    {
      id: 'transactions',
      title: 'Criar sua primeira transação',
      description: 'Cadastre sua primeira transação para começar a organizar suas finanças.',
      isCompleted: status.hasTransactions,
      route: '/transactions/new',
    },
  ];

  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            Vamos configurar seu sistema
          </h3>
          <p className="text-sm text-gray-600">
            Conclua as etapas abaixo para aproveitar melhor o sistema.
          </p>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-gray-400 hover:text-gray-600"
          title="Dispensar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progresso
          </span>
          <span className="text-sm font-semibold text-blue-600">
            {completedSteps}/{totalSteps} etapas
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={() => navigate(step.route)}
            className={`w-full text-left p-4 rounded-lg border transition-all ${
              step.isCompleted
                ? 'bg-white border-green-200 hover:border-green-300'
                : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {step.isCompleted ? (
                  <CheckCircle size={20} className="text-green-500" />
                ) : (
                  <Circle size={20} className="text-gray-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4
                  className={`font-medium ${
                    step.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                  }`}
                >
                  {step.title}
                </h4>
                <p
                  className={`text-sm mt-1 ${
                    step.isCompleted ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {step.description}
                </p>
              </div>

              {/* Arrow (only for incomplete steps) */}
              {!step.isCompleted && (
                <div className="flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

### 3. Uso no Dashboard

```typescript
// pages/Dashboard.tsx
import { OnboardingCard } from '../components/OnboardingCard';
import { useCompany } from '../hooks/useCom, não precisa mais de companyId */}
      <div className="mb-8">
        <OnboardingCard />
      </div> (
    <div className="container mx-auto px-4 py-8">
      {/* Onboarding Card - exibido no topo */}
      {selectedCompany && (
        <div className="mb-8">
          <OnboardingCard companyId={selectedCompany.id} />
        </div>
      )}

      {/* Resto do Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cards de métricas */}
      </div>

      {/* Gráficos e tabelas */}
    </div>
  );
}
```

---

### 4. Atualizar status após ações
);

const handleCreateCategory = async (data) => {
  await api.post('/api/categories', data);
  
  // Refetch setup status
  refetch();
};
```

Ou usando React Query:

```typescript
// hooks/useSetupStatus.ts com React Query
import { useQuery } from '@tanstack/react-query';

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setup-status'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/setup-status');
      return response.data;
    }atus', companyId],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/setup-status?companyId=${companyId}`);
      return response.data;
    },
    enabled: !!companyId,
  });
}

// Invalidar após ação
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const handleCreateCategory = async (data) => {
  await api.post('/api/categories', data);
  
  // Invalidate setup status
  queryClient.invalidateQueries(['setup-status', companyId]);
};
```

---

## Variantes de Design

### Card Compacto

```typescript
// Para dashboard com pouco espaço
<div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="font-medium text-gray-900">
        Complete sua configuração ({completedSteps}/{totalSteps})
      </p>
      <p className="text-sm text-gray-600">
        Aproveite melhor o sistema
      </p>
    </div>
    <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
      Continuar
    </button>
  </div>
</div>
```

### Modal de Boas-vindas (Primeira vez)

```typescript
// Exibir modal na primeira vez que o usuário acessa
const [showWelcome, setShowWelcome] = useState(
  !localStorage.getItem('welcomed')
);

if (showWelcome && !isComplete) {
  return (
    <Modal onClose={() => {
      setShowWelcome(false);
      localStorage.setItem('welcomed', 'true');
    }}>
      <h2>Bem-vindo ao Sistema! 👋</h2>
      <p>Vamos configurar sua conta em 3 passos simples.</p>
      <OnboardingCard companyId={companyId} />
    </Modal>
  );
}
```

---

## Personalização

### Adicionar mais etapas

Basta editar o array `steps` e adicionar a verificação correspondente no backend:
ompany: boolean;
  hasC
```typescript
// Backend - adicionar no SetupStatus
export interface SetupStatus {
  hasCategories: boolean;
  hasCreditCards: boolean;
  hasTransactions: boolean;
  hasTeamMembers: boolean; // Nova etapa
}

// Frontend - adicionar no array de steps
{
  id: 'team',
  title: 'Convidar membros da equipe',
  description: 'Adicione colaboradores ao seu time.',
  isCompleted: status.hasTeamMembers,
  route: '/team/invite',
}
```

---

## Boas Práticas

1. **Performance**: Use React Query ou SWR para cache inteligente
2. **UX**: Permita que usuário dispense o card (mas salve no localStorage, não no backend)
3. **Acessibilidade**: Use semântica correta e suporte teclado
4. **Mobile**: Garanta que o card seja responsivo
5. **Feedback**: Mostre celebração quando completar todas etapas
6. **Não bloqueie**: Usuário pode usar o sistema normalmente mesmo sem completar

---

## Testes com curl

```bash
# Verificar status de um usuário novo
curl -X GET "http://localhost:3001/api/dashboard/setup-status?companyId=YOUR_COMPANY_ID" \
  -H "Authorization: Bearer YOUR_TOKE (não precisa mais de companyId)
curl -X GET "http://localhost:3001/api/dashboard/setup-status" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Resposta esperada para novo usuário:
# {"hasCompany":false,