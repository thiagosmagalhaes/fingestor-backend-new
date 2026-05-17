# Sistema de Fornecedores – Guia de Integração Frontend

**Data:** 17 de maio de 2026  
**Feature:** Cadastro de Fornecedores em Pedidos de Compra

---

## 📋 Resumo da Mudança

Foi adicionado o cadastro de **fornecedores** ao sistema de pedidos de compra. Agora cada pedido pode ter um fornecedor associado (opcional), identificado por nome e CNPJ.

### Comportamento Implementado (Backend):
- **Criação automática**: Se o frontend enviar apenas `supplierName` (e opcionalmente `supplierCnpj`), o backend busca um fornecedor existente com esses dados. Se não encontrar, cria automaticamente.
- **Reutilização**: Fornecedores criados ficam salvos permanentemente e aparecem em buscas futuras.
- **Opcional**: Pedidos podem ser criados sem fornecedor (`supplier_id` será `null`).

---

## 🆕 Novos Endpoints Disponíveis

### 1. Buscar Fornecedores (Autocomplete)

```
GET /api/purchase-suppliers/search?companyId={uuid}&search={texto}&onlyActive=true
```

**Query Parameters:**
| Parâmetro | Obrigatório | Padrão | Descrição |
|-----------|-------------|--------|-----------|
| `companyId` | Sim | – | UUID da empresa |
| `search` | Não | `""` | Texto para buscar no nome ou CNPJ |
| `onlyActive` | Não | `true` | `false` para incluir inativos |

**Response 200:**
```json
[
  {
    "id": "f8e1d290-...",
    "company_id": "YOUR_COMPANY_ID",
    "name": "Distribuidora ABC",
    "cnpj": "12.345.678/0001-90",
    "is_active": true,
    "created_at": "2026-05-01T10:00:00Z",
    "updated_at": "2026-05-01T10:00:00Z"
  }
]
```

**Uso recomendado:**  
Campo de autocomplete que busca enquanto o usuário digita (debounce de 300ms).

---

### 2. Listar Todos os Fornecedores

```
GET /api/purchase-suppliers/list?companyId={uuid}
```

**Response 200:** Array de fornecedores (mesmo schema acima).

**Uso recomendado:**  
Dropdown/select para escolher fornecedor em formulários.

---

## 🔄 Endpoints Modificados

### 1. Criar Pedido (POST /api/purchase-orders)

**Antes:**
```json
{
  "companyId": "...",
  "orderDate": "2026-05-16",
  "notes": "Pedido semanal",
  "items": [...]
}
```

**Agora (novo campo opcional):**
```json
{
  "companyId": "...",
  "orderDate": "2026-05-16",
  "notes": "Pedido semanal",
  "supplier": {
    "supplierId": "UUID_FORNECEDOR_EXISTENTE"
  },
  "items": [...]
}
```

**OU com auto-criação:**
```json
{
  "companyId": "...",
  "supplier": {
    "supplierName": "Distribuidora ABC",
    "supplierCnpj": "12.345.678/0001-90"  // opcional
  },
  "items": [...]
}
```

**Regras do campo `supplier`:**
- **Totalmente opcional** – pode omitir completamente
- Se fornecer `supplierId` → usa fornecedor existente
- Se fornecer apenas `supplierName` → backend busca por nome (e CNPJ se fornecido)
  - Se encontrar → reutiliza
  - Se não encontrar → cria novo automaticamente
- `supplierCnpj` é sempre opcional (mas ajuda na identificação)

---

### 2. Atualizar Pedido (PUT /api/purchase-orders/:id)

**Novos campos aceitos:**
```json
{
  "orderDate": "...",
  "notes": "...",
  "status": "...",
  "supplier": {
    "supplierId": "...",
    // OU
    "supplierName": "...",
    "supplierCnpj": "..."
  },
  "items": [...]
}
```

Mesmo comportamento de auto-criação do endpoint de criar.

---

### 3. Listar/Buscar Pedidos

**Response modificado** – agora inclui dados do fornecedor:

```json
[
  {
    "id": "...",
    "company_id": "...",
    "order_date": "2026-05-16",
    "status": "saved",
    "notes": "Pedido semanal",
    "supplier_id": "f8e1d290-...",
    "created_at": "...",
    "updated_at": "...",
    "purchase_suppliers": {
      "id": "f8e1d290-...",
      "name": "Distribuidora ABC",
      "cnpj": "12.345.678/0001-90",
      "is_active": true
    },
    "purchase_order_items": [...]
  }
]
```

**Notas:**
- Se `supplier_id` for `null`, o campo `purchase_suppliers` também será `null`
- CNPJ pode ser `null` mesmo com fornecedor cadastrado

---

### 4. Marcar Pedido como Completo/Cancelado

**Novos endpoints de ação:**

```
POST /api/purchase-orders/:id/complete
POST /api/purchase-orders/:id/cancel
```

**Request Body (ambos):**
```json
{
  "companyId": "YOUR_COMPANY_ID"
}
```

**Response 200:** Pedido atualizado com novo status.

**Uso recomendado:**  
Botões de ação na listagem ou detalhes do pedido para marcar como recebido (completo) ou cancelar.

---

## ✅ Checklist de Ajustes no Frontend

### 1. Formulário de Criar Pedido

- [ ] Adicionar campo de **busca/autocomplete de fornecedor** (opcional)
  - Usar endpoint `GET /api/purchase-suppliers/search`
  - Mostrar nome + CNPJ (quando disponível) no resultado
  - Debounce de 300ms para não sobrecarregar API
  
- [ ] Permitir **criar fornecedor inline**
  - Caso usuário digite nome não encontrado, mostrar opção "Criar novo fornecedor"
  - Mostrar campo opcional para CNPJ
  - Backend cria automaticamente ao salvar pedido

- [ ] Adaptar payload enviado para incluir `supplier` (se preenchido):
  ```typescript
  interface CreateOrderPayload {
    companyId: string;
    orderDate?: string;
    notes?: string;
    supplier?: {
      supplierId?: string;      // Se selecionou existente
      supplierName?: string;    // Se digitou novo
      supplierCnpj?: string;    // Opcional
    };
    items: OrderItem[];
  }
  ```

### 2. Formulário de Editar Pedido

- [ ] Adicionar mesmo campo de fornecedor do criar
- [ ] Pre-popular com fornecedor atual (se houver)
  - Ler de `purchase_suppliers` no response
- [ ] Permitir alterar ou remover fornecedor

### 3. Listagem de Pedidos

- [ ] Exibir nome do fornecedor em cada pedido (se houver)
  - Ler de `purchase_suppliers.name`
  - Mostrar "-" ou "Sem fornecedor" se `supplier_id` for `null`
  
- [ ] Adicionar filtro por fornecedor (opcional)
  - Usar dropdown com `GET /api/purchase-suppliers/list`

- [ ] Adicionar botões de ação por pedido:
  - **Marcar como Completo**: `POST /api/purchase-orders/:id/complete`
  - **Cancelar**: `POST /api/purchase-orders/:id/cancel`
  - Mostrar apenas para pedidos com status `saved` ou `draft`

### 4. Visualização de Pedido (Detalhes)

- [ ] Mostrar informações do fornecedor:
  ```
  Fornecedor: Distribuidora ABC
  CNPJ: 12.345.678/0001-90
  ```
- [ ] Se não tiver fornecedor, mostrar "-" ou ocultar seção

- [ ] Adicionar botões de ação:
  - **Marcar como Completo**: `POST /api/purchase-orders/:id/complete` (se status = `saved`)
  - **Cancelar**: `POST /api/purchase-orders/:id/cancel` (se status != `canceled`)

### 5. Componente de Autocomplete de Fornecedor (Reutilizável)

**Sugestão de implementação:**

```typescript
interface SupplierAutocompleteProps {
  companyId: string;
  value?: Supplier | null;
  onChange: (supplier: Supplier | null) => void;
  allowCreate?: boolean;  // Permitir criar inline
}

interface Supplier {
  id?: string;
  name: string;
  cnpj?: string;
}

// Lógica:
// 1. Buscar em /api/purchase-suppliers/search?companyId=...&search=...
// 2. Se allowCreate=true e nenhum resultado, mostrar opção de criar
// 3. onChange retorna { id } se selecionou existente
//    ou { name, cnpj } se criou novo
```

---

## 📊 Exemplos de Dados

### Fornecedor Completo
```json
{
  "id": "f8e1d290-1234-5678-90ab-cdef12345678",
  "company_id": "abc123...",
  "name": "Distribuidora ABC Ltda",
  "cnpj": "12.345.678/0001-90",
  "is_active": true,
  "created_at": "2026-05-10T10:00:00Z",
  "updated_at": "2026-05-10T10:00:00Z"
}
```

### Fornecedor Sem CNPJ
```json
{
  "id": "...",
  "name": "Fornecedor Local",
  "cnpj": null,
  "is_active": true,
  ...
}
```

### Pedido Com Fornecedor
```json
{
  "id": "...",
  "supplier_id": "f8e1d290-...",
  "purchase_suppliers": {
    "id": "f8e1d290-...",
    "name": "Distribuidora ABC",
    "cnpj": "12.345.678/0001-90"
  },
  ...
}
```

### Pedido Sem Fornecedor
```json
{
  "id": "...",
  "supplier_id": null,
  "purchase_suppliers": null,
  ...
}
```

---

## 🎨 Sugestões de UX

1. **Campo de Fornecedor**
   - Label: "Fornecedor (opcional)"
   - Placeholder: "Digite para buscar ou criar novo..."
   - Ícone de lupa ou edifício

2. **Autocomplete**
   - Mostrar resultado como: `Distribuidora ABC • 12.345.678/0001-90`
   - Se não tiver CNPJ: `Fornecedor Local`
   - Opção "Criar novo" no final da lista se nada encontrado

3. **Criar Inline**
   - Ao selecionar "Criar novo", mostrar campos:
     ```
     Nome do Fornecedor: [_________________]
     CNPJ (opcional):    [_________________]
     ```

4. **Validação**
   - CNPJ: Se preenchido, validar formato (14 dígitos)
   - Nome: Min 2 caracteres

5. **Listagem**
   - Coluna "Fornecedor" na tabela de pedidos
   - Badge ou texto cinza para "Sem fornecedor"

---

## ⚠️ Notas Importantes

1. **Retrocompatibilidade**: Pedidos antigos não têm fornecedor (`supplier_id: null`). Interface deve lidar com isso.

2. **CNPJ Único**: Backend garante que não haverá dois fornecedores com mesmo CNPJ na mesma empresa. Se frontend tentar criar duplicado, receberá erro 500.

3. **Busca Inteligente**: Endpoint de search busca tanto no nome quanto no CNPJ simultaneamente.

4. **Auto-criação**: Backend cria fornecedor automaticamente se não encontrar. Frontend não precisa chamar endpoint separado de criar.

5. **Fornecedores Inativos**: Por padrão, buscas só retornam ativos. Para incluir inativos, passar `onlyActive=false`.

---

## 🔗 Documentação Completa

Para detalhes técnicos completos e exemplos de cURL, consultar:
- [PURCHASE_ORDERS_API.md](./PURCHASE_ORDERS_API.md)

---

## 🚀 Próximos Passos

Após implementação frontend:
1. Testar criação de pedido COM fornecedor
2. Testar criação de pedido SEM fornecedor
3. Testar edição mudando fornecedor
4. Testar autocomplete com debounce
5. Validar exibição de CNPJ quando presente/ausente
6. Testar cenário de CNPJ duplicado (deve dar erro)

---

**Dúvidas?** Consulte a documentação completa ou entre em contato com o time de backend.
