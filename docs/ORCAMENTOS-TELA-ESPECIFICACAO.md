# Especificação de Tela - Sistema de Orçamentos

## Visão Geral

Este documento descreve a interface e experiência do usuário para o módulo de Orçamentos, incluindo layout, componentes, ações e fluxos de interação.

---

## 1. TELA PRINCIPAL - LISTAGEM DE ORÇAMENTOS

### 1.1. Cabeçalho da Página

**Posição:** Topo da tela

**Elementos:**
- **Título:** "Orçamentos" (lado esquerdo, texto grande e destacado)
- **Botão Principal:** "+ Novo Orçamento" (lado direito, cor primária/destaque)
  - Ação: Abre modal ou navega para tela de criação de orçamento
  - Endpoint: `POST /api/budgets`

### 1.2. Barra de Filtros e Busca

**Posição:** Logo abaixo do cabeçalho

**Elementos da Esquerda para Direita:**

1. **Campo de Busca** (30% da largura)
   - Placeholder: "Buscar por número, cliente..."
   - Ícone de lupa
   - Busca em tempo real (debounce de 500ms)
   - Filtra por: número do orçamento, nome do cliente, email

2. **Filtro de Status** (Dropdown)
   - Label: "Status"
   - Opções:
     - Todos
     - Rascunho
     - Enviado
     - Aprovado
     - Rejeitado
     - Vencido
     - Convertido
   - Endpoint: `GET /api/budgets?status={status}`

3. **Filtro de Período** (Date Range Picker)
   - Label: "Período"
   - Permite selecionar data inicial e final
   - Presets: "Hoje", "Esta semana", "Este mês", "Últimos 30 dias"
   - Endpoint: `GET /api/budgets?from={data}&to={data}`

4. **Filtro de Cliente** (Dropdown com busca)
   - Label: "Cliente"
   - Busca por nome do cliente
   - Endpoint: `GET /api/budgets?customerId={id}`

5. **Botão "Limpar Filtros"** (texto secundário)
   - Remove todos os filtros aplicados

### 1.3. Indicadores/Cards de Resumo

**Posição:** Abaixo da barra de filtros

**Layout:** 4 cards lado a lado (responsivo: 2x2 em tablets, empilhados em mobile)

**Cards:**

1. **Total de Orçamentos**
   - Número grande: quantidade total
   - Subtexto: "No período selecionado"

2. **Valor Total**
   - Número grande: R$ X.XXX,XX
   - Subtexto: "Soma dos orçamentos"

3. **Taxa de Conversão**
   - Número grande: XX%
   - Subtexto: "Orçamentos aprovados"
   - Opcional: Gráfico miniatura de tendência

4. **Ticket Médio**
   - Número grande: R$ X.XXX,XX
   - Subtexto: "Valor médio por orçamento"

### 1.4. Visualização em Kanban (Opcional/Alternativa)

**Posição:** Área principal central

**Colunas (Drag & Drop):**
- Rascunho
- Enviado
- Aprovado
- Rejeitado

**Cards dos Orçamentos:**
- Número do orçamento (destaque)
- Nome do cliente
- Valor total (R$)
- Data de criação
- Data de validade
- Tag de prioridade (se houver)

**Ação de Drag & Drop:**
- Arrastar card entre colunas atualiza o status automaticamente
- Endpoint: `PUT /api/budgets/:id` (body: {status: "novo_status"})

### 1.5. Visualização em Lista (Tabela)

**Posição:** Área principal central

**Cabeçalho da Tabela (Colunas):**

1. **Checkbox** (seleção múltipla)
2. **Número** (ordenável)
   - Formato: ORC-2026-00001
   - Link clicável para ver detalhes
3. **Cliente** (ordenável)
   - Nome do cliente
   - Subtexto: Email ou telefone
4. **Status** (filtável)
   - Badge colorido:
     - Rascunho: Cinza
     - Enviado: Azul
     - Aprovado: Verde
     - Rejeitado: Vermelho
     - Vencido: Laranja
     - Convertido: Roxo
5. **Data de Criação** (ordenável, padrão DESC)
6. **Validade** (ordenável)
   - Destaque em vermelho se vencido ou próximo de vencer (<3 dias)
7. **Valor** (ordenável)
   - Formato: R$ X.XXX,XX
   - Alinhado à direita
8. **Ações** (coluna fixa à direita)

**Ações por Linha (Menu de 3 pontos):**

1. **Visualizar**
   - Ícone: Olho
   - Abre modal ou navega para tela de detalhes
   - Endpoint: `GET /api/budgets/:id`

2. **Editar**
   - Ícone: Lápis
   - Disponível apenas para status: Rascunho e Enviado
   - Abre modal ou navega para tela de edição
   - Endpoint: `PUT /api/budgets/:id`

3. **Duplicar**
   - Ícone: Copiar
   - Cria uma cópia do orçamento em rascunho
   - Endpoint: `POST /api/budgets` (baseado nos dados do original)

4. **Enviar ao Cliente** (se status = Rascunho)
   - Ícone: Envelope
   - Atualiza status para "Enviado"
   - Opcional: Integração com email/WhatsApp
   - Endpoint: `PUT /api/budgets/:id` (body: {status: "sent"})

5. **Converter em Venda** (se status = Aprovado)
   - Ícone: Carrinho
   - Navega para tela de criação de venda com dados pré-preenchidos
   - Endpoint: `POST /api/sales/convert-from-budget`

6. **Histórico de Status**
   - Ícone: Relógio
   - Abre modal mostrando todas as mudanças de status
   - Endpoint: `GET /api/budgets/:budgetId/status-history`

7. **Imprimir/Exportar PDF**
   - Ícone: Impressora
   - Gera PDF do orçamento

8. **Excluir**
   - Ícone: Lixeira
   - Cor vermelha
   - Pede confirmação: "Tem certeza que deseja excluir este orçamento?"
   - Endpoint: `DELETE /api/budgets/:id`

### 1.6. Ações em Lote (Quando itens selecionados)

**Posição:** Barra flutuante no topo ou rodapé da tabela

**Elementos:**
- Texto: "X orçamentos selecionados"
- Botões de ação:
  - **Marcar como Enviado** (apenas para rascunhos)
  - **Excluir Selecionados** (com confirmação)
  - **Exportar** (PDF ou CSV)
  - **Cancelar Seleção**

### 1.7. Paginação

**Posição:** Rodapé da tabela

**Elementos:**
- Dropdown "Itens por página": 10, 25, 50, 100
- Informação: "Mostrando 1-25 de 150 orçamentos"
- Botões: Primeira | Anterior | 1 2 3 4 5 | Próxima | Última

---

## 2. MODAL/TELA - CRIAR NOVO ORÇAMENTO

### 2.1. Cabeçalho do Modal

**Elementos:**
- Título: "Novo Orçamento"
- Botão "X" para fechar (canto superior direito)
- Subtexto: "Preencha os dados abaixo para criar um orçamento"

### 2.2. Formulário - Seção 1: Informações do Cliente

**Layout:** Card ou seção destacada

**Campos:**

1. **Selecionar Cliente** (obrigatório)
   - Dropdown com busca
   - Preview: Nome, Email, Telefone
   - Botão secundário ao lado: "+ Novo Cliente"
     - Abre sub-modal para cadastro rápido de cliente
     - Endpoint: `POST /api/customers`

2. **Data do Orçamento** (obrigatório)
   - Date picker
   - Valor padrão: Data atual

3. **Validade** (obrigatório)
   - Date picker ou campo numérico "Válido por X dias"
   - Valor padrão: Data atual + 15 dias
   - Mostra data final calculada

4. **Observações para o Cliente** (opcional)
   - Textarea
   - Placeholder: "Informações que aparecerão no orçamento..."
   - Contador de caracteres

5. **Observações Internas** (opcional)
   - Textarea
   - Placeholder: "Anotações internas (não aparece no orçamento)..."
   - Ícone de info: "Visível apenas para sua equipe"

### 2.3. Formulário - Seção 2: Itens do Orçamento

**Layout:** Lista editável + Botão de adicionar

**Botão Principal:** "+ Adicionar Item" (topo da seção)
- Abre linha/card de item para preenchimento

**Para cada item:**

**Layout:** Card ou linha expansível

**Campos:**

1. **Produto/Serviço** (obrigatório)
   - Dropdown com busca
   - Mostra: Nome, SKU, Preço, Estoque (se produto)
   - Preview rápido com imagem (se disponível)
   - Endpoint de busca: `GET /api/products-services?search={termo}`

2. **Quantidade** (obrigatório)
   - Input numérico
   - Botões +/- para incrementar/decrementar
   - Validação: Se produto, verificar estoque disponível
   - Alerta se quantidade > estoque

3. **Preço Unitário** (obrigatório)
   - Input de moeda (R$)
   - Valor padrão: Preço de venda do produto
   - Permite edição

4. **Desconto** (opcional)
   - Toggle entre "R$" e "%"
   - Input numérico
   - Mostra subtotal com desconto aplicado

5. **Observações do Item** (opcional)
   - Input de texto curto
   - Placeholder: "Ex: Cor azul, entrega em 10 dias..."

6. **Botões de Ação:**
   - Ícone de lixeira: Remove item
   - Ícone de arrastar: Reordenar itens (drag handle)

**Cálculos Visíveis (atualizados em tempo real):**
- **Subtotal do Item:** (Quantidade × Preço) - Desconto
- Total exibido à direita de cada linha

### 2.4. Formulário - Seção 3: Resumo Financeiro

**Posição:** Lado direito ou card destacado

**Layout:** Card com fundo diferenciado

**Campos:**

1. **Subtotal**
   - Somente leitura
   - Soma de todos os itens sem desconto

2. **Desconto Geral** (opcional)
   - Toggle entre "R$" e "%"
   - Input numérico
   - Aplica sobre o subtotal

3. **Total Geral**
   - Destaque visual (número grande, negrito)
   - Valor final após descontos
   - Formato: R$ X.XXX,XX

**Observação Visual:**
Se houver desconto: mostrar valor original riscado e valor com desconto em verde

### 2.5. Rodapé do Modal - Ações

**Posição:** Parte inferior do modal

**Botões (da direita para esquerda):**

1. **Salvar como Rascunho** (botão secundário)
   - Salva orçamento com status "draft"
   - Endpoint: `POST /api/budgets` (body: {status: "draft"})

2. **Salvar e Enviar** (botão primário)
   - Salva orçamento com status "sent"
   - Cria automaticamente tarefa de follow-up
   - Endpoint: `POST /api/budgets` (body: {status: "sent"})
   - Opcional: Abre modal de envio (email/WhatsApp)

3. **Cancelar** (botão terciário/texto)
   - Fecha modal
   - Se houver dados preenchidos, pede confirmação

### 2.6. Validações e Feedback

**Validações em Tempo Real:**
- Cliente obrigatório: mensagem de erro abaixo do campo
- Pelo menos 1 item: mensagem de alerta
- Quantidade inválida: borda vermelha no campo
- Estoque insuficiente: ícone de alerta amarelo

**Feedback de Sucesso:**
- Toast/Snackbar no topo: "Orçamento #ORC-2026-00123 criado com sucesso!"
- Ação: Link para "Visualizar orçamento"
- Auto-fecha em 5 segundos

**Feedback de Erro:**
- Toast/Snackbar vermelho: "Erro ao criar orçamento: {mensagem}"
- Mantém modal aberto com dados preenchidos

---

## 3. MODAL/TELA - VISUALIZAR ORÇAMENTO

### 3.1. Cabeçalho

**Elementos:**
- **Número do orçamento:** ORC-2026-00001 (destaque, grande)
- **Status:** Badge colorido (mesmo padrão da listagem)
- **Botão "X":** Fechar modal
- **Menu de ações:** (3 pontos, canto superior direito)
  - Editar
  - Duplicar
  - Imprimir
  - Excluir

### 3.2. Informações do Cliente

**Layout:** Card no topo

**Elementos:**
- **Nome do Cliente** (destaque)
- **Email:** com ícone clicável (abre cliente de email)
- **Telefone:** com ícone clicável (faz ligação)
- **Endereço:** (se cadastrado)
- **Botão:** "Ver Histórico do Cliente"
  - Abre modal com todas as interações e orçamentos deste cliente

### 3.3. Informações do Orçamento

**Layout:** Grid 2 ou 3 colunas (responsivo)

**Campos:**
- **Data de Criação:** 07/02/2026
- **Validade:** 22/02/2026 (se vencido: texto vermelho + ícone de alerta)
- **Criado por:** Nome do usuário
- **Última atualização:** Data e hora
- **Desconto aplicado:** 10% ou R$ 500,00 (se houver)

### 3.4. Lista de Itens

**Layout:** Tabela limpa e espaçada

**Colunas:**
1. **#** (número sequencial)
2. **Produto/Serviço**
   - Nome
   - SKU (texto menor)
3. **Quantidade**
4. **Preço Unit.**
5. **Desconto** (se houver)
6. **Total**

**Rodapé da tabela:**
- Subtotal
- Desconto geral (se houver)
- **Total Geral** (destaque, negrito, maior)

### 3.5. Observações

**Seções:**

1. **Observações para o Cliente** (se preenchido)
   - Card com fundo claro
   - Ícone de mensagem

2. **Observações Internas** (se preenchido)
   - Card com fundo diferente (ex: amarelo claro)
   - Ícone de cadeado
   - Texto: "Visível apenas para equipe"

### 3.6. Timeline de Status

**Posição:** Barra lateral direita ou seção abaixo

**Layout:** Linha do tempo vertical

**Elementos:**
- Data e hora de cada mudança
- Status anterior → Novo status
- Usuário responsável
- Observações (se houver)
- Endpoint: `GET /api/budgets/:budgetId/status-history`

### 3.7. Ações Rápidas

**Posição:** Rodapé fixo ou flutuante

**Botões Condicionais por Status:**

**Se status = Rascunho:**
- "Enviar ao Cliente" (primário)
- "Editar" (secundário)

**Se status = Enviado:**
- "Marcar como Aprovado" (verde)
- "Marcar como Rejeitado" (vermelho)
- "Editar" (secundário)

**Se status = Aprovado:**
- "Converter em Venda" (primário, verde)
  - Endpoint: `POST /api/sales/convert-from-budget`
- "Duplicar" (secundário)

**Se status = Rejeitado:**
- "Duplicar e Revisar" (primário)

**Sempre disponíveis:**
- "Imprimir/PDF"
- "Compartilhar" (copiar link, email, WhatsApp)

---

## 4. TELA - EDITAR ORÇAMENTO

**Layout:** Idêntico à tela de criação, mas com:

1. **Título:** "Editar Orçamento #ORC-2026-00001"
2. **Campos pré-preenchidos** com dados atuais
3. **Informação visual:** "Última edição: 07/02/2026 às 14:30 por João Silva"
4. **Botões do rodapé:**
   - "Cancelar" (descarta alterações)
   - "Salvar Alterações" (primário)
   - Endpoint: `PUT /api/budgets/:id`

**Restrição:**
- Se status = Aprovado, Rejeitado ou Convertido: Mostrar mensagem "Este orçamento não pode ser editado. Você pode duplicá-lo para criar um novo."

---

## 5. FLUXOS DE INTERAÇÃO

### 5.1. Fluxo de Criação de Orçamento Completo

1. Usuário clica em "+ Novo Orçamento"
2. Modal/tela abre
3. Seleciona ou cria cliente
4. Adiciona itens (produtos/serviços)
5. Revisa totais e aplica descontos
6. Decide: "Salvar como Rascunho" ou "Salvar e Enviar"
7. Sistema cria orçamento (gera número automaticamente)
8. Se "Salvar e Enviar": cria tarefa de follow-up automaticamente
9. Mostra mensagem de sucesso
10. Retorna para listagem ou visualização

### 5.2. Fluxo de Envio ao Cliente

1. Na listagem ou visualização, clica em "Enviar ao Cliente"
2. Sistema atualiza status para "Enviado"
3. Abre modal (opcional): "Como deseja enviar?"
   - Email (preenche automaticamente título e corpo)
   - WhatsApp (link direto com mensagem pré-formatada)
   - Copiar link público
4. Cria tarefa de follow-up automaticamente (3 dias após)
5. Registra interação com o cliente
6. Mostra confirmação

### 5.3. Fluxo de Aprovação

1. Cliente aprova o orçamento (externamente)
2. Usuário acessa orçamento no sistema
3. Clica em "Marcar como Aprovado"
4. Modal de confirmação: "Deseja converter este orçamento em venda?"
   - Sim: Redireciona para tela de venda pré-preenchida
   - Não: Apenas atualiza status
5. Status atualizado para "Aprovado"
6. Registra mudança no histórico

### 5.4. Fluxo de Conversão em Venda

1. Orçamento com status "Aprovado"
2. Usuário clica em "Converter em Venda"
3. Sistema busca dados do orçamento
4. Abre tela de criação de venda com:
   - Cliente pré-selecionado
   - Itens já adicionados
   - Valores já calculados
5. Usuário complementa:
   - Forma de pagamento
   - Quantidade de parcelas
   - Data da venda
6. Confirma a venda
7. Sistema cria venda
8. Atualiza orçamento para status "Convertido"
9. Baixa estoque automaticamente (se produtos)

### 5.5. Fluxo de Follow-up

1. Sistema cria automaticamente tarefa de follow-up ao enviar orçamento
2. Tarefa aparece na área de "Tarefas Pendentes" (outra tela/widget)
3. Usuário recebe notificação quando tarefa vence
4. Ao completar tarefa:
   - Registra interação com cliente
   - Atualiza status da tarefa
   - Opcionalmente cria nova tarefa

---

## 6. ELEMENTOS VISUAIS E CORES

### 6.1. Códigos de Cores por Status

- **Rascunho:** Cinza (#6B7280)
- **Enviado:** Azul (#3B82F6)
- **Aprovado:** Verde (#10B981)
- **Rejeitado:** Vermelho (#EF4444)
- **Vencido:** Laranja (#F59E0B)
- **Convertido:** Roxo (#8B5CF6)

### 6.2. Ícones Sugeridos

- **Novo Orçamento:** Plus (+)
- **Editar:** Lápis/Pencil
- **Visualizar:** Olho/Eye
- **Excluir:** Lixeira/Trash
- **Duplicar:** Copiar/Copy
- **Enviar:** Envelope/Send
- **Converter:** Carrinho de compras/Shopping Cart
- **Histórico:** Relógio/Clock
- **Cliente:** Pessoa/User
- **Buscar:** Lupa/Search
- **Filtrar:** Funil/Filter
- **Imprimir:** Impressora/Printer

### 6.3. Estados de Interação

**Botões:**
- Hover: Escurece 10%
- Active: Escurece 20%
- Disabled: Opacidade 50%, cursor not-allowed

**Cards/Linhas:**
- Hover: Sombra leve elevada
- Selecionado: Borda azul + fundo azul claro (5% opacidade)
- Vencido: Borda vermelha pontilhada

---

## 7. RESPONSIVIDADE

### Desktop (> 1024px)
- Tabela completa com todas as colunas
- Modais em largura média (800px)
- Filtros em linha horizontal
- Kanban com 4 colunas visíveis

### Tablet (768px - 1024px)
- Tabela com colunas essenciais (oculta algumas colunas secundárias)
- Modais em largura quase total
- Filtros empilhados em 2 linhas
- Kanban com scroll horizontal

### Mobile (< 768px)
- Lista de cards ao invés de tabela
- Cada card mostra: número, cliente, status, valor, data
- Menu de ações em cada card
- Modais em tela cheia
- Filtros em sanfona/accordion
- Kanban com 1 coluna por vez (swipe)

---

## 8. ACESSIBILIDADE

- Todos os botões com aria-labels descritivos
- Navegação por teclado (Tab, Enter, Escape)
- Contraste adequado (WCAG AA mínimo)
- Foco visível em elementos interativos
- Mensagens de erro associadas aos campos (aria-describedby)
- Loading states com spinners + texto alternativo

---

## 9. PERFORMANCE E UX

### Loading States
- Skeleton screens na primeira carga
- Spinners em ações assíncronas
- Desabilitar botões durante processamento

### Debouncing
- Busca: 500ms
- Filtros: 300ms

### Cache
- Lista de produtos/serviços em memória
- Lista de clientes em memória
- Revalidar a cada 5 minutos

### Otimistic Updates
- Atualização de status: reflete imediatamente na UI
- Se falhar, reverte e mostra erro

---

## 10. INTEGAÇÕES RECOMENDADAS

### Notificações
- Push notification quando orçamento é aprovado/rejeitado
- Email quando orçamento está próximo de vencer
- WhatsApp para envio direto ao cliente

### Exportações
- PDF com logo e layout personalizado da empresa
- Excel/CSV para análise de dados
- Envio por email direto do sistema

### Relatórios
- Link para dashboard de orçamentos
- Métricas: taxa de conversão, tempo médio, valor total
- Gráficos de orçamentos por período, status e vendedor
