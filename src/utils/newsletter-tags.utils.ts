/**
 * Processa tags personalizadas no HTML da newsletter
 */
export function processNewsletterTags(html: string): string {
  let processed = html;

  // TAG_INFO: Caixa de informação (azul)
  processed = processed.replace(
    /\{TAG_INFO\}([\s\S]*?)\{\/TAG_INFO\}/g,
    (_, content) => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr>
          <td style="background-color:#dbeafe;border-left:4px solid #3b82f6;padding:16px;border-radius:8px;">
            <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.6;">
              <strong style="display:block;margin-bottom:4px;">ℹ️ Informação</strong>
              ${content.trim()}
            </p>
          </td>
        </tr>
      </table>
    `
  );

  // TAG_SUCCESS: Caixa de sucesso (verde)
  processed = processed.replace(
    /\{TAG_SUCCESS\}([\s\S]*?)\{\/TAG_SUCCESS\}/g,
    (_, content) => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr>
          <td style="background-color:#dcfce7;border-left:4px solid #22c55e;padding:16px;border-radius:8px;">
            <p style="margin:0;color:#166534;font-size:14px;line-height:1.6;">
              <strong style="display:block;margin-bottom:4px;">✅ Sucesso</strong>
              ${content.trim()}
            </p>
          </td>
        </tr>
      </table>
    `
  );

  // TAG_WARNING: Caixa de aviso (amarelo)
  processed = processed.replace(
    /\{TAG_WARNING\}([\s\S]*?)\{\/TAG_WARNING\}/g,
    (_, content) => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr>
          <td style="background-color:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;">
            <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">
              <strong style="display:block;margin-bottom:4px;">⚠️ Atenção</strong>
              ${content.trim()}
            </p>
          </td>
        </tr>
      </table>
    `
  );

  // TAG_BUTTON: Botão call-to-action
  processed = processed.replace(
    /\{TAG_BUTTON\|(.*?)\}([\s\S]*?)\{\/TAG_BUTTON\}/g,
    (_, url, text) => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:25px 0;">
        <tr>
          <td align="center">
            <a href="${url.trim()}" 
               style="display:inline-block;background-color:#8b5cf6;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
              ${text.trim()}
            </a>
          </td>
        </tr>
      </table>
    `
  );

  // TAG_DIVIDER: Separador horizontal
  processed = processed.replace(
    /\{TAG_DIVIDER\}/g,
    `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
        <tr>
          <td style="border-top:1px solid #e5e7eb;"></td>
        </tr>
      </table>
    `
  );

  // TAG_SPACE: Espaçamento vertical
  processed = processed.replace(
    /\{TAG_SPACE\|(\d+)\}/g,
    (_, pixels) => `
      <div style="height:${pixels}px;"></div>
    `
  );

  // TAG_FEATURES: Lista de features
  processed = processed.replace(
    /\{TAG_FEATURES_START\|(.*?)\}([\s\S]*?)\{\/TAG_FEATURES_END\}/g,
    (_, title, content) => {
      // Processar items individuais
      const items = content.match(/\{TAG_FEATURE_ITEM\|(.*?)\}([\s\S]*?)\{\/TAG_FEATURE_ITEM\}/g) || [];
      
      const featuresHtml = items.map((item: string) => {
        const match = item.match(/\{TAG_FEATURE_ITEM\|(.*?)\}([\s\S]*?)\{\/TAG_FEATURE_ITEM\}/);
        if (!match) return '';
        
        const [, itemTitle, itemDesc] = match;
        return `
          <tr>
            <td style="padding:12px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="24" valign="top" style="padding-right:12px;">
                    <div style="width:20px;height:20px;background-color:#8b5cf6;border-radius:50%;"></div>
                  </td>
                  <td valign="top">
                    <p style="margin:0 0 4px 0;font-weight:600;font-size:15px;color:#111827;">
                      ${itemTitle.trim()}
                    </p>
                    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">
                      ${itemDesc.trim()}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      }).join('');

      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:25px 0;">
          <tr>
            <td>
              <h3 style="margin:0 0 16px 0;font-size:18px;color:#111827;">${title.trim()}</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${featuresHtml}
              </table>
            </td>
          </tr>
        </table>
      `;
    }
  );

  return processed;
}

export default { processNewsletterTags };
