# Estrutura HTML para E-mail Marketing / Newsletter

E-mails HTML **não funcionam como sites comuns**. Clientes de e-mail (Gmail, Outlook, Apple Mail, Yahoo etc.) usam motores antigos e **bloqueiam vários recursos** por segurança.  
Por isso, a estrutura precisa ser **simples, robusta e compatível**.

---

## 1. Princípios fundamentais

- Usar **HTML + CSS inline**
- Layout baseado em **tabelas**
- Evitar JavaScript (não funciona)
- Evitar CSS moderno (grid, flex, animações)
- Tudo precisa funcionar mesmo sem imagens

---

## 2. Estrutura básica do HTML

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Newsletter</title>
  </head>

  <body style="margin:0; padding:0; background-color:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          
          <!-- Container principal -->
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;">
            
            <!-- Header -->
            <tr>
              <td style="padding:20px; text-align:center;">
                <img src="logo.png" alt="Logo" width="150" style="display:block; margin:0 auto;">
              </td>
            </tr>

            <!-- Conteúdo -->
            <tr>
              <td style="padding:20px; font-family:Arial, sans-serif; color:#333333;">
                <h1 style="margin:0 0 10px;">Título da Newsletter</h1>
                <p style="margin:0 0 15px;">
                  Texto principal do e-mail. Sempre claro e direto.
                </p>

                <a href="#" style="
                  display:inline-block;
                  padding:12px 20px;
                  background:#2463EB;
                  color:#ffffff;
                  text-decoration:none;
                  border-radius:4px;
                  font-weight:bold;
                ">
                  Chamada para ação
                </a>
              </td>
            </tr>

            <!-- Rodapé -->
            <tr>
              <td style="padding:15px; font-size:12px; color:#777777; text-align:center;">
                Você recebeu este e-mail porque se cadastrou no nosso site.<br>
                <a href="#" style="color:#777777;">Descadastrar</a>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
  </body>
</html>


3. Elementos HTML permitidos e seguros
Estrutura

<table>, <tr>, <td>

<tbody>

<div> (uso limitado)

<span>

Texto

<p>

<strong>

<b>

<em>

<i>

<h1> até <h4>

Links e mídia

<a>

<img> (sempre com alt)

Quebras e separadores

<br>

<hr> (simples)

4. CSS permitido (com limitações)
Funciona bem

color

background-color

font-family (Arial, Verdana, Georgia)

font-size

font-weight

line-height

padding

margin (nem todos os clientes respeitam)

border

border-radius (parcial)

text-align

Deve ser inline
<p style="font-size:14px; line-height:1.6; color:#333;">

5. O que NÃO usar em e-mails

❌ JavaScript
❌ <script>
❌ <iframe>
❌ CSS externo (<link>)
❌ CSS moderno:

flexbox

grid

position: fixed

hover complexo

animation

video (quase sempre bloqueado)

6. Boas práticas de newsletter

Largura padrão: 600px

Texto mínimo sem imagem

Botões feitos com <a> estilizado

Sempre incluir:

Identificação da empresa

Link de descadastro

Testar em:

Gmail

Outlook

Mobile

7. Estrutura mental de uma boa newsletter

Cabeçalho (logo)

Título forte

Dor ou benefício claro

Conteúdo curto

CTA único

Rodapé legal