# Layout Global de Newsletter - Fingestor

## 📋 Visão Geral

Este é o template base para todas as newsletters do Fingestor. O layout foi desenvolvido seguindo as melhores práticas de email marketing e mantém a identidade visual do sistema.

## 🎨 Identidade Visual

### Cores Principais
- **Primary Blue**: `#3b82f6` (Azul principal)
- **Primary Dark**: `#2563eb` (Azul escuro para gradientes)
- **Background**: `#f9fafb` (Cinza claro)
- **Text Dark**: `#111827` (Títulos)
- **Text Medium**: `#6b7280` (Subtítulos)
- **Text Light**: `#9ca3af` (Rodapé)

### Tipografia
- **Font Family**: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif
- **Título**: 28px, bold
- **Subtítulo**: 16px, regular
- **Conteúdo**: 15px, regular
- **Rodapé**: 14px, regular

## 📂 Estrutura do Template

### 1. Header (Cabeçalho)
- Logo do Fingestor com ícone `$`
- Fundo gradiente azul
- **NÃO EDITAR** - Mantém consistência visual

### 2. Content (Conteúdo Editável)
Esta é a seção onde você deve fazer todas as alterações:

#### Elementos disponíveis:

**Título Principal**
```html
<h1 class="title">
  Seu título aqui
</h1>
```

**Subtítulo**
```html
<p class="subtitle">
  Seu subtítulo aqui
</p>
```

**Texto de Conteúdo**
```html
<p class="text-content">
  Seu parágrafo aqui
</p>
```

**Box Informativo (Azul)**
```html
<div class="info-box">
  <p>
    <strong>💡 Dica:</strong> Sua dica aqui
  </p>
</div>
```

**Box de Sucesso (Verde)**
```html
<div class="success-box">
  <p>
    <strong>✓ Sucesso:</strong> Sua mensagem aqui
  </p>
</div>
```

**Box de Aviso (Amarelo)**
```html
<div class="warning-box">
  <p>
    <strong>⚠️ Atenção:</strong> Seu aviso aqui
  </p>
</div>
```

**Lista de Features**
```html
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding-bottom:16px;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:top; padding-right:12px;">
            <span class="feature-icon">✓</span>
          </td>
          <td>
            <p class="feature-text">
              <strong>Título:</strong> Descrição
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

**Botão Call-to-Action**
```html
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:24px 0;">
      <a href="SUA-URL" class="button">
        TEXTO DO BOTÃO
      </a>
    </td>
  </tr>
</table>
```

### 3. Footer (Rodapé)
- Informações da empresa
- Links úteis (Sobre, Ajuda, Contato)
- Link de descadastro
- Copyright
- **NÃO EDITAR** - Mantém consistência e conformidade legal

## ✏️ Como Usar

### Passo 1: Copiar o Template
```bash
cp templates/newsletter-layout.html templates/newsletter-[nome-da-campanha].html
```

### Passo 2: Editar Apenas a Seção de Conteúdo
Procure os comentários:
```html
<!-- INÍCIO DO CONTEÚDO EDITÁVEL -->
...
<!-- FIM DO CONTEÚDO EDITÁVEL -->
```

### Passo 3: Substituir os Placeholders
Busque e substitua todos os textos entre `[colchetes]`:

- `[TÍTULO DA NEWSLETTER]` → Título real
- `[Subtítulo ou descrição breve]` → Subtítulo real
- `[URL-DO-LINK]` → URL real
- `[TEXTO DO BOTÃO]` → Texto real do CTA
- `[URL-DESCADASTRAR]` → URL de descadastro

### Passo 4: Remover Elementos Opcionais
Se não precisar de algum elemento, delete-o completamente:
- Boxes informativos
- Lista de features
- Parágrafos extras

## 🚫 O Que NÃO Fazer

❌ **NÃO altere:**
- O header (logo e gradiente)
- O footer (informações legais e links)
- Classes CSS existentes
- Estrutura de tabelas

❌ **NÃO adicione:**
- JavaScript
- CSS externo (`<link>`)
- Flexbox ou Grid CSS
- Iframes
- Vídeos embarcados
- Fontes personalizadas externas

❌ **NÃO use:**
- `position: fixed` ou `absolute`
- `transform`
- `animation`
- `hover` complexos (pode não funcionar)

## ✅ Boas Práticas

### Texto
- ✓ Mantenha títulos curtos e impactantes (máx. 60 caracteres)
- ✓ Use parágrafos curtos (2-3 linhas)
- ✓ Destaque palavras-chave com `<strong>`
- ✓ Use emojis com moderação (1-2 por box)

### Call-to-Action
- ✓ Apenas 1 CTA principal por newsletter
- ✓ Texto claro e direto ("Acessar Dashboard", "Ver Novidades")
- ✓ Evite "Clique Aqui"

### Imagens (se usar)
- ✓ Sempre adicione atributo `alt`
- ✓ Largura máxima: 600px
- ✓ Use imagens otimizadas (< 200KB)
- ✓ Hospede em CDN/servidor confiável

### Links
- ✓ Use URLs absolutas (https://...)
- ✓ Teste todos os links antes de enviar
- ✓ Adicione parâmetros UTM para tracking

## 📧 Testando o Template

### Testes Obrigatórios:
1. **Gmail** (Desktop e Mobile)
2. **Outlook** (Desktop)
3. **Apple Mail** (iOS)
4. **Yahoo Mail**

### Ferramentas de Teste:
- [Litmus](https://litmus.com/)
- [Email on Acid](https://www.emailonacid.com/)
- [Mail Tester](https://www.mail-tester.com/)

### Checklist de Envio:
- [ ] Todos os placeholders foram substituídos
- [ ] Links testados e funcionando
- [ ] Link de descadastro configurado
- [ ] Preview text definido
- [ ] Assunto do email atrativo
- [ ] Teste em dispositivos móveis
- [ ] Revisão ortográfica
- [ ] Aprovação do time

## 📐 Especificações Técnicas

### Largura do Container
- Desktop: 600px
- Mobile: 100% (responsivo)

### Margens e Espaçamentos
- Padding do conteúdo: 40px 30px
- Padding mobile: 30px 20px
- Espaçamento entre elementos: 16-24px

### Compatibilidade
- ✅ Gmail
- ✅ Outlook 2007-2021
- ✅ Apple Mail
- ✅ Yahoo Mail
- ✅ Mobile (iOS/Android)
- ✅ Thunderbird

## 🔗 Links Úteis

- [Documentação NEWSLETTER.md](../NEWSLETTER.md)
- [Can I Email](https://www.caniemail.com/) - Verificar suporte CSS
- [Really Good Emails](https://reallygoodemails.com/) - Inspiração

## 💡 Exemplos de Uso

### Newsletter de Boas-Vindas
```html
<h1 class="title">Bem-vindo ao Fingestor!</h1>
<p class="subtitle">Estamos felizes em ter você conosco</p>
<p class="text-content">
  Agora você tem acesso completo a todas as ferramentas...
</p>
```

### Newsletter de Novidades
```html
<h1 class="title">Novidades de Janeiro 2025</h1>
<p class="subtitle">Confira as melhorias que fizemos para você</p>
<!-- Lista de features -->
```

### Newsletter de Lembretes
```html
<h1 class="title">Não esqueça de registrar suas transações</h1>
<div class="warning-box">
  <p><strong>⏰ Lembrete:</strong> Você tem 5 transações pendentes</p>
</div>
```

---

**Dúvidas?** Entre em contato com o time de produto.
