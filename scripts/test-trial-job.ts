import { runTrialExpiringJobNow } from '../src/jobs/trial-expiring.job';
import * as dotenv from 'dotenv';

dotenv.config();

console.log('\n========================================');
console.log('🧪 Teste Manual do Job de Trial Expirando');
console.log('========================================\n');

if (!process.env.RESEND_API_KEY) {
  console.log('⚠️  AVISO: RESEND_API_KEY não configurada');
  console.log('Os emails não serão realmente enviados (modo dev)\n');
} else {
  console.log('✓ RESEND_API_KEY encontrada\n');
}

runTrialExpiringJobNow()
  .then(() => {
    console.log('\n========================================');
    console.log('✅ Teste concluído!');
    console.log('========================================\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro durante o teste:', error);
    process.exit(1);
  });
