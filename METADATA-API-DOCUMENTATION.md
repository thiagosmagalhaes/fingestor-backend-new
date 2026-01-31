# Metadata API Documentation

## Visão Geral

A API de Metadata permite armazenar e consultar informações personalizadas do usuário na coluna `metadata` (JSONB) da tabela `profiles`. Isso inclui preferências de configuração, estado do onboarding e outras informações relevantes.

### Estrutura do Metadata
```json
{
  "onboarding_completed": true,
  "settings": {
    "theme": "dark",
    "view_mode": "projected"
  }
}
```

**Modos de Visualização:**
- `current`: Exibe apenas valores já realizados (transações pagas ou recebidas)
- `projected`: Inclui valores pendentes do mês (transações agendadas mas ainda não pagas/recebidas)

---

## 1. Obter Todo o Metadata

Retorna todo o objeto metadata do perfil do usuário.

```bash
curl -X GET http://localhost:3001/api/metadata \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Possíveis Outputs:**

✅ **Sucesso (200):**
```json
{
  "metadata": {
    "onboarding_completed": true,
    "settings": {
      "theme": "dark",
      "view_mode": "projected"
    }
  }
}
```

❌ **Não autenticado (401):**
```json
{
  "error": "Usuário não autenticado"
}
```

---

## 3. Atualizar ou Inserir Valor(es)

Atualiza ou insere um ou múltiplos valores no metadata. Se o valor for `null`, o campo será removido.

### 3.1. Atualização Simples (Single)

```bash
# Marcar onboarding como concluído
curl -X PUT http://localhost:3001/api/metadata \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "onboarding_completed",
    "value": true
  }'
```

```bash
# Definir tema escuro
curl -X PUT http://localhost:3001/api/metadata \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "settings.theme",
    "value": "dark"
  }'
```

```bash
# Definir modo de visualização como projetado
curl -X PUT http://localhost:3001/api/metadata \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "settings.view_mode",
    "value": "projected"
  }'
```

```bash
# Remover um campo (passar null como value)
curl -X PUT http://localhost:3001/api/metadata \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "settings.theme",
    "value": null
  }'
```

### 3.2. Atualização Múltipla (Batch)

```bash
# Atualizar múltiplos campos de uma vez
curl -X PUT http://localhost:3001/api/metadata \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      { "path": "onboarding_completed", "value": true },
      { "path": "settings.theme", "value": "dark" },
      { "path": "settings.view_mode", "value": "projected" }
    ]
  }'
```

```bash
# Configurar settings completo
curl -X PUT http://localhost:3001/api/metadata \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      { "path": "settings.theme", "value": "light" },
      { "path": "settings.view_mode", "value": "current" }
    ]
  }'
```

**Possíveis Outputs:**

✅ **Sucesso - Single (200):**
```json
{
  "message": "Metadata atualizado com sucesso",
  "metadata": {
    "onboarding_completed": true,
    "settings": {
      "theme": "dark",
      "view_mode": "projected"
    }
  },
  "updated_count": 1
}
```

✅ **Sucesso - Batch (200):**
```json
{
  "message": "3 campos atualizados com sucesso",
  "metadata": {
    "onboarding_completed": true,
    "settings": {
      "theme": "dark",
      "view_mode": "projected"
    }
  },
  "updated_count": 3
}
```

❌ **Nenhuma atualização fornecida (400):**
```json
{
  "error": "Nenhuma atualização fornecida"
}
```

❌ **Path faltando em update (400):**
```json
{
  "error": "Todos os updates devem ter um path"
}
```

❌ **Não autenticado (401):**
```json
{
  "error": "Usuário não autenticado"
}
```

---

## 4. Deletar Campo

Remove completamente um campo do metadata.

```bash
# Remover tema
curl -X DELETE http://localhost:3001/api/metadata/settings.theme \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

```bash
# Remover onboarding_completed
curl -X DELETE http://localhost:3001/api/metadata/onboarding_completed \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

```bash
# Remover modo de visualização
curl -X DELETE http://localhost:3001/api/metadata/settings.view_mode \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Possíveis Outputs:**

✅ **Sucesso (200):**
```json
{
  "message": "Campo removido com sucesso",
  "metadata": {
    "onboarding_completed": true,
    "settings": {
      "view_mode": "projected"
    }
  }
}
```

❌ **Path não fornecido (400):**
```json
{
  "error": "Path é obrigatório"
}
```

---

## Códigos de Status

| Código | Descrição |
|--------|-----------|
| 200    | Operação realizada com sucesso |
| 400    | Path não fornecido ou inválido |
| 401    | Token de autenticação ausente ou inválido |
| 500    | Erro interno do servidor |

---

## Notas

- **Path Notation**: Use ponto (`.`) para acessar propriedades aninhadas (ex: `settings.theme`)
- **Valores aceitos para view_mode**: `"light" | "dark" | "system"`
- Todas as operações são atômicas e isoladas por usuário
