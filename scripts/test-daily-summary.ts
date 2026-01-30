/**
 * Script para testar o job de resumo diário
 * 
 * Uso: npx ts-node scripts/test-daily-summary.ts
 */

import { runDailySummaryJobNow } from '../src/jobs/daily-summary.job';

async function main() {
  console.log('🧪 Testando job de resumo diário...\n');
  console.log('⏳ Buscando usuários e transações...\n');
  
  await runDailySummaryJobNow();
  
  console.log('\n✅ Teste concluído!');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro durante o teste:', error);
  process.exit(1);
});
