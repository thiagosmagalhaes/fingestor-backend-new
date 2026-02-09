# 🧪 WhatsApp Webhook - Exemplos de Teste

## Endpoint

```
POST https://primary-production-0244.up.railway.app/webhook/fda1bd64-1411-4912-b410-105b419b618d
```

---

## 1. Teste Manual via cURL

### Welcome Message

```bash
curl -X POST \
  https://primary-production-0244.up.railway.app/webhook/fda1bd64-1411-4912-b410-105b419b618d \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+5511999999999",
    "message": "Oi! Aqui é o Thiago, do Fingestor 👋\n\nVi que você acabou de se cadastrar no sistema.\nO Fingestor foi feito pra organizar tanto finanças pessoais quanto de empresa, tudo no mesmo lugar, sem complicação.\n\nQualquer dúvida no começo, pode me chamar por aqui 😉"
  }'
```

### Create Account Message

```bash
curl -X POST \
  https://primary-production-0244.up.railway.app/webhook/fda1bd64-1411-4912-b410-105b419b618d \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+5511999999999",
    "message": "Passando só pra te dar uma dica rápida 👇\n\nO primeiro passo no Fingestor é criar uma conta:\n✔️ pode ser pessoal\n✔️ ou uma conta da empresa\n\nDepois disso, o sistema começa a fazer sentido de verdade."
  }'
```

### First Transaction Message

```bash
curl -X POST \
  https://primary-production-0244.up.railway.app/webhook/fda1bd64-1411-4912-b410-105b419b618d \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+5511999999999",
    "message": "Muita gente trava nessa parte, então já adianto:\nvocê não consegue \"estragar\" nada no Fingestor 😄\n\nPode lançar qualquer valor de teste, depois dá pra editar ou apagar.\nO importante é fazer o primeiro lançamento pra ver os relatórios funcionando."
  }'
```

### Micro Win Message

```bash
curl -X POST \
  https://primary-production-0244.up.railway.app/webhook/fda1bd64-1411-4912-b410-105b419b618d \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+5511999999999",
    "message": "Se quiser testar rapidinho, faz assim:\n\n👉 cria uma conta (se ainda não criou)\n👉 lança UMA entrada ou UMA despesa qualquer\n\nSó isso já libera visão de saldo, histórico e organização automática."
  }'
```

### Value Message

```bash
curl -X POST \
  https://primary-production-0244.up.railway.app/webhook/fda1bd64-1411-4912-b410-105b419b618d \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+5511999999999",
    "message": "A maioria das pessoas só percebe onde o dinheiro está indo\nquando começa a registrar as transações.\n\nMesmo quem \"acha que sabe\" se surpreende quando vê tudo organizado no Fingestor."
  }'
```

### Help Message

```bash
curl -X POST \
  https://primary-production-0244.up.railway.app/webhook/fda1bd64-1411-4912-b410-105b419b618d \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+5511999999999",
    "message": "Se você quiser, eu te explico em 2 minutos\nqual é a melhor forma de usar o Fingestor no seu caso\n(seja pessoal ou empresa).\n\nMe fala aqui como você pretende usar que eu te ajudo 👍"
  }'
```

---

## 2. Teste via Postman/Insomnia

### Request Configuration

**Method**: POST  
**URL**: `https://primary-production-0244.up.railway.app/webhook/fda1bd64-1411-4912-b410-105b419b618d`

**Headers**:
```
Content-Type: application/json
```

**Body (raw JSON)**:
```json
{
  "phone": "+5511999999999",
  "message": "Oi! Aqui é o Thiago, do Fingestor 👋\n\nVi que você acabou de se cadastrar no sistema.\nO Fingestor foi feito pra organizar tanto finanças pessoais quanto de empresa, tudo no mesmo lugar, sem complicação.\n\nQualquer dúvida no começo, pode me chamar por aqui 😉"
}
```

---

## 3. Teste via JavaScript (Node.js)

```javascript
const testWebhook = async () => {
  const response = await fetch(
    'https://primary-production-0244.up.railway.app/webhook/fda1bd64-1411-4912-b410-105b419b618d',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: '+5511999999999',
        message: `Oi! Aqui é o Thiago, do Fingestor 👋

Vi que você acabou de se cadastrar no sistema.
O Fingestor foi feito pra organizar tanto finanças pessoais quanto de empresa, tudo no mesmo lugar, sem complicação.

Qualquer dúvida no começo, pode me chamar por aqui 😉`
      })
    }
  );

  console.log('Status:', response.status);
  console.log('Response:', await response.text());
};

testWebhook();
```

---

## 4. Teste via Python

```python
import requests
import json

url = "https://primary-production-0244.up.railway.app/webhook/fda1bd64-1411-4912-b410-105b419b618d"

payload = {
    "phone": "+5511999999999",
    "message": """Oi! Aqui é o Thiago, do Fingestor 👋

Vi que você acabou de se cadastrar no sistema.
O Fingestor foi feito pra organizar tanto finanças pessoais quanto de empresa, tudo no mesmo lugar, sem complicação.

Qualquer dúvida no começo, pode me chamar por aqui 😉"""
}

headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, data=json.dumps(payload), headers=headers)

print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
```

---

## 5. Teste Completo de Todos os Templates

### Bash Script

```bash
#!/bin/bash

WEBHOOK_URL="https://primary-production-0244.up.railway.app/webhook/fda1bd64-1411-4912-b410-105b419b618d"
PHONE="+5511999999999"  # SUBSTITUIR AQUI

# Array de mensagens
declare -a messages=(
  "Oi! Aqui é o Thiago, do Fingestor 👋\n\nVi que você acabou de se cadastrar no sistema.\nO Fingestor foi feito pra organizar tanto finanças pessoais quanto de empresa, tudo no mesmo lugar, sem complicação.\n\nQualquer dúvida no começo, pode me chamar por aqui 😉"
  
  "Passando só pra te dar uma dica rápida 👇\n\nO primeiro passo no Fingestor é criar uma conta:\n✔️ pode ser pessoal\n✔️ ou uma conta da empresa\n\nDepois disso, o sistema começa a fazer sentido de verdade."
  
  "Muita gente trava nessa parte, então já adianto:\nvocê não consegue \"estragar\" nada no Fingestor 😄\n\nPode lançar qualquer valor de teste, depois dá pra editar ou apagar.\nO importante é fazer o primeiro lançamento pra ver os relatórios funcionando."
  
  "Se quiser testar rapidinho, faz assim:\n\n👉 cria uma conta (se ainda não criou)\n👉 lança UMA entrada ou UMA despesa qualquer\n\nSó isso já libera visão de saldo, histórico e organização automática."
  
  "A maioria das pessoas só percebe onde o dinheiro está indo\nquando começa a registrar as transações.\n\nMesmo quem \"acha que sabe\" se surpreende quando vê tudo organizado no Fingestor."
  
  "Se você quiser, eu te explico em 2 minutos\nqual é a melhor forma de usar o Fingestor no seu caso\n(seja pessoal ou empresa).\n\nMe fala aqui como você pretende usar que eu te ajudo 👍"
)

# Enviar cada mensagem com delay
for i in "${!messages[@]}"; do
  echo "Enviando mensagem $((i+1))/6..."
  
  curl -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$PHONE\",\"message\":\"${messages[$i]}\"}"
  
  echo -e "\n"
  sleep 2  # Delay de 2 segundos entre mensagens
done

echo "Todas as mensagens foram enviadas!"
```

Para executar:
```bash
chmod +x test-webhook.sh
./test-webhook.sh
```

---

## 6. Validação de Resposta

### Respostas Esperadas

**Sucesso (2xx)**:
```
Status: 200 OK
Body: (depende do webhook, pode ser vazio ou JSON com confirmação)
```

**Erro (4xx/5xx)**:
```
Status: 400/500/etc
Body: Mensagem de erro
```

### Checklist de Validação

Ao testar o webhook, verificar:

- [ ] Request foi enviado com sucesso (sem erro de rede)
- [ ] Status code 2xx retornado
- [ ] Mensagem chegou no WhatsApp do destinatário
- [ ] Texto da mensagem está correto (sem caracteres estranhos)
- [ ] Emojis foram preservados
- [ ] Quebras de linha funcionam corretamente

---

## 7. Troubleshooting

### Erro: Connection refused

**Possíveis causas**:
- Webhook está offline
- URL incorreta
- Firewall bloqueando

**Solução**:
- Verificar se o serviço no Railway está rodando
- Confirmar URL do webhook

### Erro: 400 Bad Request

**Possíveis causas**:
- Payload malformado
- Telefone em formato inválido
- Mensagem vazia

**Solução**:
- Validar JSON do payload
- Verificar formato do telefone: `+[código país][número]`
- Verificar que mensagem não está vazia

### Erro: 500 Internal Server Error

**Possíveis causas**:
- Erro no servidor do webhook
- Telefone inválido/bloqueado

**Solução**:
- Verificar logs do Railway
- Tentar com outro número de telefone
- Contactar suporte do serviço de webhook

### Mensagem não chega no WhatsApp

**Possíveis causas**:
- Número não tem WhatsApp
- Número bloqueou o remetente
- Delay na entrega

**Solução**:
- Confirmar que número tem WhatsApp ativo
- Aguardar alguns minutos
- Testar com outro número

---

## 8. Logs de Debug

### Ativar logs detalhados no controller

Em `src/controllers/whatsapp.controller.ts`, adicionar:

```typescript
static async sendMessage(message: WhatsAppMessage): Promise<boolean> {
  const webhookUrl = 'https://primary-production-0244.up.railway.app/webhook/fda1bd64-1411-4912-b410-105b419b618d';
  
  const payload: WebhookPayload = {
    phone: message.phone,
    message: message.message_body
  };

  console.log('[WhatsApp] Sending message:', {
    message_key: message.message_key,
    phone: message.phone,
    payload: JSON.stringify(payload)
  });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('[WhatsApp] Response status:', response.status);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[WhatsApp] Error response:', errorBody);
      return false;
    }

    const responseBody = await response.text();
    console.log('[WhatsApp] Success response:', responseBody);
    return true;
  } catch (error) {
    console.error('[WhatsApp] Exception:', error);
    return false;
  }
}
```

---

**IMPORTANTE**: Lembre-se de substituir `+5511999999999` pelo número real ao testar!
