# Especificação de Tela - Sistema de Produtos e Serviços

## Visão Geral

Este documento descreve a interface e experiência do usuário para o módulo de Produtos e Serviços, incluindo controle de estoque, categorias e gestão completa do catálogo.

---

## 1. TELA PRINCIPAL - LISTAGEM DE PRODUTOS E SERVIÇOS

### 1.1. Cabeçalho da Página

**Posição:** Topo da tela

**Elementos:**
- **Título:** "Produtos e Serviços" (lado esquerdo, texto grande)
- **Botões de Ação:** (lado direito, em linha)
  - "+ Novo Produto" (botão primário)
    - Endpoint: `POST /api/products-services`
  - "+ Novo Serviço" (botão secundário)
    - Endpoint: `POST /api/products-services` (itemType: "service")
  - "Gerenciar Categorias" (botão terciário/texto)
    - Abre modal de gestão de categorias

### 1.2. Navegação por Abas

**Posição:** Logo abaixo do cabeçalho

**Abas:**
1. **Todos** (mostra produtos e serviços)
2. **Produtos** (apenas produtos)
3. **Serviços** (apenas serviços)
4. **Estoque Baixo** (produtos com estoque <= mínimo)
   - Badge vermelho com contador ao lado
   - Endpoint: `GET /api/products-services/low-stock`
5. **Inativos** (itens desativados)

### 1.3. Barra de Filtros e Busca

**Posição:** Abaixo das abas

**Elementos da Esquerda para Direita:**

1. **Campo de Busca** (40% da largura)
   - Placeholder: "Buscar por nome, SKU ou código de barras..."
   - Ícone de lupa à esquerda
   - Botão "X" para limpar (aparece quando há texto)
   - Busca em tempo real (debounce de 500ms)
   - Endpoint: `GET /api/products-services?search={termo}`

2. **Filtro de Categoria** (Dropdown)
   - Label: "Categoria"
   - Lista hierárquica (subcategorias indentadas)
   - Mostra cores das categorias
   - Opção "Todas as categorias" no topo
   - Opção "Sem categoria" no final

3. **Filtro de Status de Estoque** (Dropdown)
   - Label: "Estoque"
   - Opções:
     - Todos
     - Em estoque (> 0)
     - Estoque baixo (≤ mínimo)
     - Sem estoque (= 0)

4. **Ordenação** (Dropdown)
   - Label: "Ordenar por"
   - Opções:
     - Nome (A-Z)
     - Nome (Z-A)
     - Preço (menor primeiro)
     - Preço (maior primeiro)
     - Estoque (menor primeiro)
     - Mais recente
     - Mais antigo

5. **Visualização** (Toggle de ícones)
   - Grade (ícone de grid)
   - Lista (ícone de linhas)

6. **Botão "Limpar Filtros"** (texto secundário)

### 1.4. Cards de Resumo (Métricas)

**Posição:** Abaixo da barra de filtros

**Layout:** 4 cards lado a lado (responsivo)

**Cards:**

1. **Total de Produtos**
   - Número grande: quantidade total de produtos
   - Subtexto: "produtos ativos"

2. **Total de Serviços**
   - Número grande: quantidade total de serviços
   - Subtexto: "serviços ativos"

3. **Estoque Baixo**
   - Número grande: quantidade de produtos com estoque baixo
   - Cor: Vermelho se > 0
   - Subtexto: "requerem atenção"
   - Clicável: filtra para produtos com estoque baixo

4. **Valor Total em Estoque**
   - Número grande: R$ X.XXX,XX
   - Cálculo: Soma (quantidade × preço de custo)
   - Subtexto: "valor total do inventário"

### 1.5. Visualização em Grade (Cards)

**Posição:** Área principal central

**Layout:** Grid responsivo (4 colunas desktop, 3 tablet, 1-2 mobile)

**Card de Produto/Serviço:**

**Elementos (de cima para baixo):**

1. **Imagem** (topo do card, ratio 16:9)
   - Imagem principal do produto
   - Se múltiplas imagens: indicador de quantidade (ex: "+3")
   - Se sem imagem: ícone placeholder (caixa para produto, tag para serviço)
   - Hover: mostra botão "Ver galeria"

2. **Badge de Categoria** (sobreposto à imagem, canto superior esquerdo)
   - Nome da categoria
   - Cor de fundo da categoria
   - Pequeno e arredondado

3. **Badge de Status** (sobreposto à imagem, canto superior direito)
   - "Estoque Baixo" (vermelho) se ≤ mínimo
   - "Sem Estoque" (vermelho escuro) se = 0
   - Apenas para produtos com track_inventory

4. **Área de Conteúdo:**

   a. **Nome do Produto/Serviço** (destaque, 2 linhas máximo)
      - Truncado com "..." se muito longo
      - Tooltip com nome completo no hover

   b. **SKU** (texto pequeno, cinza)
      - Formato: "SKU: PROD-001"
      - Apenas se existir

   c. **Descrição** (texto secundário, 2 linhas máximo)
      - Truncada com "..."
      - Opcional

   d. **Indicadores de Estoque** (apenas para produtos)
      - Ícone de caixa + quantidade atual
      - Unidade de medida (un, kg, etc)
      - Barra de progresso: atual/máximo
      - Cor da barra:
        - Verde: estoque normal (> mínimo)
        - Amarelo: estoque baixo (≤ mínimo e > 0)
        - Vermelho: sem estoque (= 0)

   e. **Preços** (destaque)
      - Preço de Venda: R$ X.XXX,XX (grande, negrito)
      - Preço de Custo: R$ X.XXX,XX (menor, cinza)
      - Margem: XX% (verde se positiva, vermelha se negativa)

5. **Rodapé do Card - Ações:**
   - **Botão "Ver Detalhes"** (secundário, largura total)
   - **Menu de ações** (3 pontos, canto inferior direito)
     - Editar
     - Duplicar
     - Adicionar Estoque (apenas produtos)
     - Ajustar Estoque (apenas produtos)
     - Ativar/Desativar
     - Excluir

### 1.6. Visualização em Lista (Tabela)

**Posição:** Área principal central

**Cabeçalho da Tabela (Colunas):**

1. **Checkbox** (seleção múltipla)
2. **Imagem** (thumbnail pequeno, 40x40px)
3. **Nome** (ordenável)
   - Nome do produto/serviço
   - Subtexto: SKU e categoria
4. **Tipo** (filtável)
   - Badge: "Produto" (azul) ou "Serviço" (verde)
5. **Estoque** (ordenável, apenas produtos)
   - Quantidade atual / Mínimo
   - Ícone de alerta se baixo
   - Unidade de medida
   - N/A para serviços ou produtos sem controle
6. **Preço de Custo** (ordenável)
   - R$ X.XXX,XX
   - Alinhado à direita
7. **Preço de Venda** (ordenável)
   - R$ X.XXX,XX
   - Alinhado à direita
8. **Margem** (ordenável)
   - XX%
   - Verde se > 0, vermelho se < 0
9. **Status** (filtável)
   - Badge: "Ativo" (verde) ou "Inativo" (cinza)
10. **Ações** (coluna fixa à direita)

**Ações por Linha:**

1. **Visualizar Detalhes**
   - Ícone: Olho
   - Abre modal de detalhes
   - Endpoint: `GET /api/products-services/:id`

2. **Editar**
   - Ícone: Lápis
   - Abre modal de edição
   - Endpoint: `PUT /api/products-services/:id`

3. **Duplicar**
   - Ícone: Copiar
   - Cria cópia com "-Cópia" no nome
   - Endpoint: `POST /api/products-services`

4. **Gerenciar Estoque** (apenas produtos)
   - Ícone: Caixa/Pacote
   - Submenu:
     - Adicionar Estoque
     - Ajustar Estoque
     - Ver Movimentações
   - Endpoints: `POST /api/inventory/add-stock` ou `POST /api/inventory/adjust-stock`

5. **Ativar/Desativar**
   - Ícone: Toggle/Switch
   - Alterna status ativo/inativo
   - Endpoint: `PUT /api/products-services/:id`

6. **Excluir**
   - Ícone: Lixeira
   - Cor vermelha
   - Confirmação: "Tem certeza? Esta ação não pode ser desfeita."
   - Endpoint: `DELETE /api/products-services/:id`

**Expansão de Linha:** (clique na linha)
- Mostra mais informações:
  - Descrição completa
  - Código de barras
  - Atributos customizados (metadata)
  - Histórico de movimentações (últimas 5)

### 1.7. Ações em Lote

**Posição:** Barra flutuante quando itens selecionados

**Elementos:**
- Texto: "X itens selecionados"
- Botões:
  - **Ativar Selecionados**
  - **Desativar Selecionados**
  - **Exportar Selecionados** (CSV/Excel)
  - **Excluir Selecionados** (com confirmação)
  - **Atualizar Categoria** (abre modal para escolher nova categoria)
  - **Cancelar Seleção**

### 1.8. Paginação

**Posição:** Rodapé da lista/grade

**Elementos:**
- Dropdown "Itens por página": 12, 24, 48, 96 (para grade) ou 10, 25, 50, 100 (para lista)
- Informação: "Mostrando 1-24 de 350 produtos"
- Navegação: Primeira | Anterior | 1 2 3 4 5 | Próxima | Última

---

## 2. MODAL/TELA - CRIAR/EDITAR PRODUTO

### 2.1. Cabeçalho

**Elementos:**
- **Título:** "Novo Produto" ou "Editar Produto: [Nome]"
- **Botão "X":** Fechar modal
- **Tabs:** (para facilitar navegação em formulário longo)
  - Informações Básicas
  - Preços e Estoque
  - Imagens e Multimídia
  - Informações Adicionais

### 2.2. Tab 1: Informações Básicas

**Campos:**

1. **Tipo** (obrigatório, apenas na criação)
   - Radio buttons: "Produto" ou "Serviço"
   - Ícones para cada opção
   - Desabilitado na edição

2. **Nome** (obrigatório)
   - Input de texto
   - Contador: 0/255 caracteres
   - Validação em tempo real

3. **SKU** (opcional)
   - Input de texto
   - Auto-gerado sugerido: gerar baseado em categoria + contador
   - Botão "Gerar SKU" ao lado
   - Validação: único por empresa

4. **Código de Barras** (opcional)
   - Input de texto
   - Botão "Escanear" (se dispositivo suportar)
   - Preview visual do código de barras abaixo

5. **Categoria** (recomendado)
   - Dropdown com busca
   - Lista hierárquica (subcategorias indentadas)
   - Mostra cor da categoria
   - Botão "+ Nova Categoria" inline
     - Abre mini-formulário:
       - Nome (obrigatório)
       - Cor (picker)
       - Tipo: Produto, Serviço ou Ambos
       - Categoria Pai (opcional)
     - Endpoint: `POST /api/product-categories`

6. **Descrição** (opcional)
   - Textarea com editor rich text simples
   - Formatação: negrito, itálico, listas
   - Contador: 0/1000 caracteres
   - Preview em tempo real

### 2.3. Tab 2: Preços e Estoque

**Seção de Preços:**

1. **Preço de Custo** (recomendado)
   - Input de moeda (R$)
   - Tooltip: "Quanto você paga pelo produto"

2. **Preço de Venda** (obrigatório)
   - Input de moeda (R$)
   - Destaque visual

3. **Margem de Lucro** (calculado automaticamente)
   - Somente leitura
   - Fórmula: ((Venda - Custo) / Custo) × 100
   - Cor: Verde se positiva, vermelho se negativa
   - Formato: XX% (R$ XXX,XX)

4. **Impostos** (opcional)
   - Input numérico (%)
   - Label: "Percentual de impostos"

5. **Comissão** (opcional)
   - Input numérico (%)
   - Label: "Comissão sobre vendas"

**Seção de Estoque:** (apenas para Produtos)

1. **Controlar Estoque?** (toggle switch)
   - Default: ON para produtos, OFF para serviços
   - Ao ativar: mostra campos de estoque
   - Ao desativar: oculta e limpa campos

2. **Estoque Inicial** (se controla estoque)
   - Input numérico
   - Apenas na criação
   - Na edição: usar botão "Adicionar Estoque"

3. **Estoque Mínimo** (recomendado)
   - Input numérico
   - Tooltip: "Você será alertado quando o estoque atingir este nível"

4. **Unidade de Medida** (obrigatório se controla estoque)
   - Dropdown com opções comuns:
     - un (unidade)
     - kg (quilograma)
     - g (grama)
     - l (litro)
     - ml (mililitro)
     - m (metro)
     - m² (metro quadrado)
     - cx (caixa)
     - pct (pacote)
   - Campo de texto livre para unidade customizada

5. **Estoque Atual** (apenas na edição, somente leitura)
   - Mostra quantidade atual
   - Botão "Gerenciar Estoque" ao lado
     - Abre modal de movimentações

### 2.4. Tab 3: Imagens e Multimídia

**Área de Upload de Imagens:**

**Layout:** Grid de uploads + preview

**Elementos:**

1. **Zona de Upload Principal**
   - Drag & drop area grande
   - Texto: "Arraste imagens aqui ou clique para selecionar"
   - Botão "Selecionar Arquivos"
   - Formatos aceitos: JPG, PNG, WebP
   - Tamanho máximo: 5MB por imagem
   - Máximo de imagens: 10

2. **Previews das Imagens**
   - Grid de thumbnails (150x150px)
   - Primeira imagem tem badge "Principal"
   - Cada imagem tem:
     - Preview
     - Botão "X" para remover
     - Handle de arrastar para reordenar
     - Botão "Definir como Principal"
   - Reordenação por drag & drop

3. **Indicadores:**
   - "Imagem 1 de 10"
   - Barra de progresso no upload
   - Status: "Enviando...", "Processando...", "Concluído"

**Nota Informativa:** 
- "A primeira imagem será exibida como destaque"
- "Recomendamos imagens quadradas (1:1) para melhor visualização"

### 2.5. Tab 4: Informações Adicionais

**Campos Dinâmicos/Customizados:**

1. **Atributos Personalizados**
   - Lista de campos customizados
   - Botão "+ Adicionar Atributo"
   - Cada atributo tem:
     - Nome (ex: "Peso", "Dimensões", "Cor", "Garantia")
     - Valor
     - Tipo: Texto, Número, Data, Lista
     - Botão "Remover"
   - Salvos em metadata (JSON)

2. **Tags** (opcional)
   - Input com autocomplete
   - Chips/badges para cada tag adicionada
   - Útil para buscas e filtros
   - Ex: "novidade", "promoção", "destaque"

3. **Status** (toggle)
   - Switch: Ativo / Inativo
   - Default: Ativo
   - Tooltip: "Produtos inativos não aparecem na listagem padrão"

4. **Notas Internas** (opcional)
   - Textarea
   - Placeholder: "Observações internas sobre este item..."
   - Não visível para clientes

### 2.6. Rodapé do Modal - Ações

**Botões (da direita para esquerda):**

1. **Salvar e Criar Novo** (botão secundário)
   - Salva e abre novo formulário em branco
   - Útil para cadastro em massa

2. **Salvar** (botão primário)
   - Salva e fecha modal
   - Endpoint: `POST /api/products-services` (criar) ou `PUT /api/products-services/:id` (editar)

3. **Cancelar** (botão terciário/texto)
   - Fecha modal
   - Se houver alterações não salvas: pede confirmação

### 2.7. Validações e Feedback

**Validações em Tempo Real:**
- Nome obrigatório: borda vermelha + mensagem
- Preço de venda obrigatório: borda vermelha + mensagem
- SKU duplicado: alerta laranja abaixo do campo
- Imagens muito grandes: mensagem de erro ao fazer upload

**Feedback de Sucesso:**
- Toast: "Produto '[Nome]' criado com sucesso!"
- Ação opcional: "Ver detalhes" ou "Criar outro"

**Feedback de Erro:**
- Toast vermelho: "Erro ao salvar: {mensagem}"
- Campos com erro destacados

---

## 3. MODAL/TELA - CRIAR/EDITAR SERVIÇO

**Layout:** Similar ao de Produto, mas simplificado

**Diferenças:**

1. **Sem seção de Estoque**
   - Oculta todos os campos de estoque
   - Sem controle de quantidade

2. **Campos mais simples:**
   - Foco em: Nome, Descrição, Preço
   - Categoria opcional mas recomendada

3. **Atributos comuns para serviços:**
   - Duração (ex: 1h, 2h, 30min)
   - Termos de garantia
   - Pré-requisitos

---

## 4. MODAL - GESTÃO DE CATEGORIAS

### 4.1. Estrutura

**Título:** "Gerenciar Categorias"

**Layout:** Split view (lista à esquerda, formulário à direita)

### 4.2. Lista de Categorias (Lado Esquerdo)

**Elementos:**

1. **Campo de Busca**
   - Placeholder: "Buscar categoria..."

2. **Botão "+ Nova Categoria"** (topo)

3. **Lista Hierárquica**
   - Categorias pai em nível 1
   - Subcategorias indentadas
   - Para cada categoria:
     - Ícone de cor (círculo colorido)
     - Nome
     - Contador de produtos (entre parênteses)
     - Botões de ação:
       - Editar (lápis)
       - Adicionar subcategoria (+ dentro)
       - Excluir (lixeira)
   - Drag & drop para reordenar

4. **Endpoint:** `GET /api/product-categories`

### 4.3. Formulário de Categoria (Lado Direito)

**Modo: Criar ou Editar**

**Campos:**

1. **Nome** (obrigatório)
   - Input de texto
   - Validação: único por empresa

2. **Descrição** (opcional)
   - Textarea
   - 2-3 linhas

3. **Cor** (obrigatório)
   - Color picker
   - Paleta de cores sugeridas
   - Input manual de HEX

4. **Tipo** (obrigatório)
   - Radio buttons:
     - Produtos
     - Serviços
     - Ambos

5. **Categoria Pai** (opcional)
   - Dropdown
   - Apenas categorias do mesmo tipo
   - Opção "Nenhuma (categoria raiz)"

6. **Status**
   - Toggle: Ativa / Inativa

**Botões:**
- "Salvar Categoria" (primário)
  - Endpoint: `POST /api/product-categories` (criar) ou `PUT /api/product-categories/:id` (editar)
- "Cancelar" (secundário)

**Validação:**
- Ao tentar excluir categoria com produtos: 
  - Alerta: "Esta categoria tem X produtos. Você pode:"
    - Mover produtos para outra categoria
    - Excluir categoria e deixar produtos sem categoria
    - Cancelar

---

## 5. MODAL - GERENCIAR ESTOQUE

### 5.1. Abas Principais

1. **Adicionar Estoque** (entrada)
2. **Ajustar Estoque** (correção)
3. **Histórico de Movimentações** (visualização)

### 5.2. Tab 1: Adicionar Estoque

**Uso:** Para entradas de mercadorias (compras, devoluções)

**Campos:**

1. **Produto** (somente leitura)
   - Mostra: Nome, SKU, Estoque atual

2. **Quantidade a Adicionar** (obrigatório)
   - Input numérico grande
   - Botões +10, +50, +100 para atalhos
   - Unidade de medida exibida

3. **Número de Referência** (opcional)
   - Input de texto
   - Label: "Ex: número da nota fiscal"
   - Placeholder: "NF-12345"

4. **Data da Entrada** (opcional)
   - Date picker
   - Default: hoje

5. **Observações** (opcional)
   - Textarea
   - Placeholder: "Ex: Fornecedor XYZ, lote 123..."

**Preview:**
- "Estoque atual: 50 un"
- "Novo estoque: 150 un" (em verde, maior)
- Diferença: "+100 un"

**Botões:**
- "Adicionar Estoque" (primário, verde)
  - Endpoint: `POST /api/inventory/add-stock`
- "Cancelar"

### 5.3. Tab 2: Ajustar Estoque

**Uso:** Para correções, inventários, perdas

**Campos:**

1. **Produto** (somente leitura)
   - Mostra: Nome, SKU, Estoque atual

2. **Novo Estoque** (obrigatório)
   - Input numérico grande
   - Validação: não pode ser negativo

3. **Motivo do Ajuste** (obrigatório)
   - Dropdown:
     - Inventário físico
     - Correção de erro
     - Perda/Avaria
     - Roubo
     - Vencimento
     - Outros

4. **Observações** (recomendado)
   - Textarea
   - Placeholder: "Descreva o motivo do ajuste..."

**Preview Visual:**
- Estoque atual: 150 un
- Novo estoque: 120 un
- Diferença: -30 un (vermelho se redução, verde se aumento)
- Ícone de alerta se redução significativa (> 20%)

**Confirmação:**
- Se redução grande: "Você está reduzindo o estoque em X unidades. Confirma?"

**Botões:**
- "Ajustar Estoque" (primário, amarelo)
  - Endpoint: `POST /api/inventory/adjust-stock`
- "Cancelar"

### 5.4. Tab 3: Histórico de Movimentações

**Layout:** Lista/Timeline de movimentações

**Filtros:**
- Período (date range)
- Tipo de movimentação (todos, entradas, saídas, ajustes)
- Endpoint: `GET /api/inventory/movements?productId={id}`

**Cada Movimentação mostra:**

1. **Cabeçalho:**
   - Tipo de movimentação (badge colorido):
     - Compra/Entrada (verde)
     - Venda/Saída (vermelho)
     - Ajuste (amarelo)
     - Devolução (azul)
     - Perda (vermelho escuro)
   - Data e hora

2. **Detalhes:**
   - Quantidade: +100 un ou -50 un
   - Estoque anterior → Estoque novo
   - Número de referência (se houver)
   - Link para venda (se movimentação de venda)

3. **Rodapé:**
   - Usuário responsável
   - Observações (se houver)

**Paginação:** Últimas 50 movimentações, com "Carregar mais"

**Exportação:**
- Botão "Exportar" (Excel/CSV)
- Opção de período e tipo

---

## 6. MODAL - VISUALIZAR DETALHES DO PRODUTO

### 6.1. Layout Geral

**Estrutura:** Split view (imagens à esquerda, informações à direita)

### 6.2. Galeria de Imagens (Lado Esquerdo - 40%)

**Elementos:**

1. **Imagem Principal** (grande, 500x500px)
   - Zoom no hover
   - Clique: abre lightbox em tela cheia

2. **Miniaturas** (abaixo da principal)
   - Thumbnails clicáveis (80x80px)
   - Scroll horizontal se muitas imagens
   - Miniatura ativa destacada

3. **Se sem imagens:**
   - Placeholder grande com ícone
   - Botão "Adicionar Imagens"

### 6.3. Informações (Lado Direito - 60%)

**Seção 1: Cabeçalho**
- Nome do produto (grande, destaque)
- SKU (texto secundário)
- Badge de categoria (colorido)
- Badge de status: Ativo/Inativo

**Seção 2: Descrição**
- Descrição completa
- HTML renderizado (se rich text)

**Seção 3: Preços** (Card destacado)
- Preço de Venda (grande)
- Preço de Custo
- Margem de Lucro (%)
- Impostos (%)
- Comissão (%)

**Seção 4: Estoque** (Card, apenas produtos)
- Estoque Atual (grande, colorido)
- Estoque Mínimo
- Unidade de medida
- Indicador visual:
  - Verde: estoque normal
  - Amarelo: estoque baixo
  - Vermelho: sem estoque
- Botão "Gerenciar Estoque"

**Seção 5: Informações Adicionais**
- Código de Barras (com preview visual)
- Atributos customizados (lista)
- Tags
- Notas internas (destaque diferente)

**Seção 6: Metadados**
- Criado em: data
- Criado por: usuário
- Última atualização: data
- Atualizado por: usuário

### 6.4. Abas de Informação Extra (Opcional)

**Abas:**

1. **Histórico de Vendas**
   - Últimas vendas deste produto
   - Quantidade vendida
   - Valor total
   - Gráfico de vendas ao longo do tempo

2. **Movimentações de Estoque**
   - Últimas movimentações
   - Link para ver histórico completo

3. **Produtos Relacionados**
   - Outros produtos da mesma categoria
   - Sugestões de produtos complementares

### 6.5. Ações do Modal

**Rodapé fixo com botões:**
- "Editar" (primário)
- "Duplicar" (secundário)
- "Imprimir Etiqueta" (secundário)
- "Excluir" (vermelho, alinhado à esquerda)
- "Fechar" (texto)

---

## 7. ALERTAS E NOTIFICAÇÕES

### 7.1. Estoque Baixo

**Trigger:** Quando produto atinge estoque mínimo

**Exibição:**
1. **Notificação toast** (canto superior direito)
   - Ícone de alerta
   - Mensagem: "Atenção: [Produto] está com estoque baixo!"
   - Ação: "Ver produto" (clique abre modal)

2. **Badge no menu/header**
   - Ícone de sino com contador
   - Lista de alertas ao clicar

3. **Widget no Dashboard** (se disponível)
   - Card "Estoque Baixo"
   - Lista dos produtos críticos
   - Link: redireciona para aba "Estoque Baixo"

### 7.2. Produto Sem Estoque

**Exibição:**
- Badge "Sem Estoque" em vermelho no card/linha
- Ao tentar adicionar em orçamento/venda: alerta bloqueante
- Sugestão: "Adicionar estoque agora?"

---

## 8. FLUXOS DE INTERAÇÃO

### 8.1. Fluxo de Cadastro de Produto Completo

1. Usuário clica "+ Novo Produto"
2. Modal abre na Tab 1 (Informações Básicas)
3. Preenche nome e categoria (mínimo)
4. Avança para Tab 2 (Preços e Estoque)
5. Define preço de venda (obrigatório)
6. Define estoque inicial se controla estoque
7. Avança para Tab 3 (Imagens)
8. Faz upload de 1 ou mais imagens
9. (Opcional) Avança para Tab 4 (Adicionais)
10. Clica "Salvar"
11. Sistema valida e cria produto
12. Toast de sucesso
13. Produto aparece na listagem

### 8.2. Fluxo de Gestão de Estoque Rápida

1. Na listagem, clica no menu do produto
2. Seleciona "Gerenciar Estoque" → "Adicionar Estoque"
3. Modal abre direto na aba de adicionar
4. Digita quantidade a adicionar
5. (Opcional) Adiciona número de NF e observações
6. Clica "Adicionar Estoque"
7. Sistema atualiza estoque e cria movimentação
8. Toast: "Estoque atualizado com sucesso!"
9. Modal fecha, lista atualiza automaticamente

### 8.3. Fluxo de Organização por Categorias

1. Usuário clica "Gerenciar Categorias"
2. Modal abre com lista de categorias existentes
3. Clica "+ Nova Categoria"
4. Preenche: Nome, Cor, Tipo
5. Salva
6. Categoria aparece na lista
7. Arrasta e solta produtos na nova categoria (na listagem principal)
8. Sistema atualiza automaticamente

### 8.4. Fluxo de Busca e Filtro

1. Usuário digita no campo de busca
2. Sistema busca em tempo real (debounce)
3. Resultados filtrados aparecem instantaneamente
4. Usuário aplica filtro de categoria
5. Lista refina ainda mais
6. Usuário aplica filtro de estoque baixo
7. Mostra apenas produtos críticos
8. Usuário clica "Limpar Filtros"
9. Lista volta ao estado inicial

### 8.5. Fluxo de Alerta de Estoque Baixo

1. Sistema detecta produto com estoque ≤ mínimo
2. Notificação aparece no sino de alertas
3. Usuário clica no alerta
4. Modal do produto abre
5. Botão "Gerenciar Estoque" destacado
6. Usuário clica e adiciona estoque
7. Alerta é marcado como resolvido
8. Remover da lista de pendentes

---

## 9. ELEMENTOS VISUAIS E DESIGN

### 9.1. Cores por Contexto

**Status de Estoque:**
- Verde (#10B981): Estoque normal
- Amarelo (#F59E0B): Estoque baixo
- Vermelho (#EF4444): Sem estoque

**Tipos:**
- Azul (#3B82F6): Produto
- Verde (#10B981): Serviço

**Ações:**
- Verde: Adicionar, Criar, Salvar
- Azul: Editar, Visualizar
- Amarelo: Ajustar, Alertas
- Vermelho: Excluir, Perda

### 9.2. Ícones

**Navegação:**
- Produto: Caixa/Box
- Serviço: Tag/Label
- Categoria: Pasta/Folder
- Estoque: Pacote/Package

**Ações:**
- Adicionar: Plus (+)
- Editar: Lápis/Pencil
- Excluir: Lixeira/Trash
- Buscar: Lupa/Search
- Filtrar: Funil/Filter
- Grid: Grade/Grid
- Lista: Linhas/List
- Upload: Nuvem com seta/Cloud-upload
- Estoque: Caixa/Archive
- Alerta: Sino/Bell

### 9.3. Estados

**Cards/Linhas:**
- Normal: Fundo branco, borda cinza clara
- Hover: Sombra, borda azul clara
- Selecionado: Fundo azul claro (5%), borda azul
- Inativo: Opacidade 60%, texto cinza

**Botões:**
- Default: Cor sólida
- Hover: Escurece 10%
- Active: Escurece 20%
- Disabled: Opacidade 50%, cursor not-allowed
- Loading: Spinner + texto "Processando..."

---

## 10. RESPONSIVIDADE

### Desktop (> 1280px)
- Grade: 4 colunas
- Tabela: todas as colunas visíveis
- Modais: 900px de largura
- Split views: 40/60

### Desktop Pequeno (1024px - 1280px)
- Grade: 3 colunas
- Tabela: oculta colunas secundárias (margem, impostos)
- Modais: 800px de largura

### Tablet (768px - 1024px)
- Grade: 2 colunas
- Tabela: apenas colunas essenciais (imagem, nome, estoque, preço, ações)
- Modais: 90% da largura
- Split views: empilhados

### Mobile (< 768px)
- Grade: 1 coluna
- Lista de cards ao invés de tabela
- Cards mostram: imagem, nome, categoria, estoque, preço, ações
- Modais: tela cheia
- Tabs horizontais com scroll
- Filtros em sanfona/accordion

---

## 11. ACESSIBILIDADE

- Labels descritivos em todos os campos
- Navegação por teclado (Tab, Enter, Escape, Arrow keys)
- Foco visível em elementos interativos
- Contraste de cores conforme WCAG AA
- Textos alternativos em imagens
- Mensagens de erro associadas aos campos (aria-describedby)
- Loading states com aria-live
- Modais trapam foco
- Escape fecha modais

---

## 12. PERFORMANCE

### Otimizações

1. **Lazy Loading:**
   - Imagens carregam apenas quando visíveis (viewport)
   - Paginação com scroll infinito (opcional)

2. **Cache:**
   - Lista de categorias em memória (revalida a cada 10 min)
   - Imagens em thumbnails otimizadas (WebP)

3. **Debouncing:**
   - Busca: 500ms
   - Filtros: 300ms

4. **Optimistic Updates:**
   - Ações rápidas (ativar/desativar) refletem imediatamente
   - Se falhar, reverte e mostra erro

5. **Skeleton Screens:**
   - Primeira carga mostra placeholders
   - Evita tela em branco

---

## 13. INTEGRAÇÕES SUGERIDAS

### Código de Barras
- Leitura via webcam ou scanner
- Geração automática de código de barras EAN-13
- Impressão de etiquetas

### Importação/Exportação
- Importar planilha CSV/Excel (cadastro em massa)
- Exportar catálogo completo
- Template de importação pré-formatado

### Imagens
- Upload para Supabase Storage
- Otimização automática (resize, compressão)
- Suporte para drag & drop múltiplo

### Relatórios
- Produtos mais vendidos
- Giro de estoque
- Margem de lucro por categoria
- Valor total do inventário

### Notificações
- Email quando estoque baixo
- Push notification para gerentes
- WhatsApp para alertas críticos
