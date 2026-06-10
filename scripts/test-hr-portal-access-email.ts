import { EmailService } from '../src/services/email.service';
import * as dotenv from 'dotenv';

dotenv.config();

const emailService = new EmailService();

async function runPortalAccessEmailTest() {
  const to = 'thiagodeipanema@gmail.com';
  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
  const portalUrl = `${frontendUrl}/portal-colaborador`;

  console.log('\n========================================');
  console.log('🚀 Teste de Email de Acesso ao Portal');
  console.log('========================================');
  console.log('📧 Destinatário:', to);
  console.log('🔗 Portal URL:', portalUrl);

  if (!process.env.RESEND_API_KEY) {
    console.log('\n⚠️  AVISO: RESEND_API_KEY não configurada.');
    console.log('O envio será simulado pelo EmailService (modo dev).');
  }

  const result = await emailService.sendEmployeePortalAccessEmail({
    to,
    employeeName: 'Thiago de Ipanema',
    companyName: 'Empresa Teste Fingestor',
    portalUrl,
    loginEmail: to,
    temporaryPassword: 'SenhaTeste@123',
  });

  if (result.success) {
    console.log('\n✅ Email de teste enviado com sucesso!');
    console.log('📨 Message ID:', result.messageId);
  } else {
    console.log('\n❌ Falha ao enviar email de teste.');
    console.log('Detalhes:', result.error);
    process.exitCode = 1;
  }

  console.log('========================================\n');
}

runPortalAccessEmailTest().catch((error) => {
  console.error('\n❌ Erro inesperado ao executar teste de email:', error);
  process.exitCode = 1;
});
