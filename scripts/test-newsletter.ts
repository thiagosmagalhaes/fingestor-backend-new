import { EmailService } from '../src/services/email.service';
import * as dotenv from 'dotenv';

dotenv.config();

const emailService = new EmailService();

async function testWelcomeNewsletter() {
  console.log('\n🧪 Testando Newsletter de Boas-Vindas...\n');
  
  const result = await emailService.sendWelcomeNewsletter(
    process.env.TEST_EMAIL!,
    'João Silva',
    'test-token-123'
  );

  if (result.success) {
    console.log('✅ Newsletter enviada com sucesso!');
    console.log('📧 Message ID:', result.messageId);
  } else {
    console.log('❌ Erro ao enviar:', result.error);
  }
}

async function testTrialExpiringNewsletter() {
  console.log('\n🧪 Testando Newsletter de Trial Expirando...\n');
  
  const result = await emailService.sendTrialExpiringNewsletter(
    process.env.TEST_EMAIL!,
    'Maria Santos',
    3,
    'test-token-456'
  );

  if (result.success) {
    console.log('✅ Newsletter enviada com sucesso!');
    console.log('📧 Message ID:', result.messageId);
  } else {
    console.log('❌ Erro ao enviar:', result.error);
  }
}

async function testSubscriptionConfirmedNewsletter() {
  console.log('\n🧪 Testando Newsletter de Assinatura Confirmada...\n');
  
  const result = await emailService.sendSubscriptionConfirmedNewsletter(
    process.env.TEST_EMAIL!,
    'Pedro Costa',
    'Plano Mensal',
    'test-token-789'
  );

  if (result.success) {
    console.log('✅ Newsletter enviada com sucesso!');
    console.log('📧 Message ID:', result.messageId);
  } else {
    console.log('❌ Erro ao enviar:', result.error);
  }
}

async function testUpdatesNewsletter() {
  console.log('\n🧪 Testando Newsletter de Atualizações...\n');
  
  const result = await emailService.sendUpdatesNewsletter(
    [process.env.TEST_EMAIL!],
    [
      {
        title: 'Dashboard renovado',
        description: 'Nova interface mais clara e intuitiva para melhor visualização dos dados'
      },
      {
        title: 'Exportação para Excel',
        description: 'Agora você pode exportar todos os seus relatórios em formato XLSX'
      },
      {
        title: 'Notificações por WhatsApp',
        description: 'Receba alertas importantes diretamente no seu celular'
      }
    ],
    'test-token-update'
  );

  if (result.success) {
    console.log('✅ Newsletter enviada com sucesso!');
    console.log('📧 Message ID:', result.messageId);
  } else {
    console.log('❌ Erro ao enviar:', result.error);
  }
}

async function testCustomNewsletter() {
  console.log('\n🧪 Testando Newsletter Customizada...\n');
  
  const result = await emailService.sendNewsletter(
    process.env.TEST_EMAIL!,
    {
      emailSubject: 'Teste de Newsletter Customizada',
      title: 'Newsletter de Teste',
      subtitle: 'Este é um teste completo do template',
      content: 'Estamos testando todos os componentes do template de newsletter do Fingestor.',
      additionalContent: 'Este é um segundo parágrafo opcional para adicionar mais conteúdo.',
      
      infoBox: 'Este é um box informativo azul para dicas e informações importantes',
      successBox: 'Este é um box de sucesso verde para mensagens positivas',
      warningBox: 'Este é um box de aviso amarelo para alertas importantes',
      
      featuresTitle: 'Recursos testados:',
      features: [
        { title: 'Box Informativo', description: 'Box azul para dicas' },
        { title: 'Box de Sucesso', description: 'Box verde para confirmações' },
        { title: 'Box de Aviso', description: 'Box amarelo para alertas' },
        { title: 'Lista de Features', description: 'Lista dinâmica com ícones' }
      ],
      
      ctaUrl: 'https://fingestor.com.br',
      ctaText: 'Testar Agora',
      
      closingText: 'Obrigado por testar o sistema de newsletter do Fingestor!',
      unsubscribeUrl: 'https://fingestor.com.br/unsubscribe?token=test'
    }
  );

  if (result.success) {
    console.log('✅ Newsletter enviada com sucesso!');
    console.log('📧 Message ID:', result.messageId);
  } else {
    console.log('❌ Erro ao enviar:', result.error);
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('🚀 Iniciando Testes de Newsletter');
  console.log('========================================');
  
  if (!process.env.RESEND_API_KEY) {
    console.log('\n⚠️  AVISO: RESEND_API_KEY não configurada');
    console.log('Os emails não serão realmente enviados (modo dev)');
  } else {
    console.log('\n✓ RESEND_API_KEY encontrada');
    console.log('✓ Email de teste:', process.env.TEST_EMAIL);
  }

  try {
    await testWelcomeNewsletter();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2s
    
    await testTrialExpiringNewsletter();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testSubscriptionConfirmedNewsletter();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testUpdatesNewsletter();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testCustomNewsletter();
    
    console.log('\n========================================');
    console.log('✅ Todos os testes concluídos!');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error);
  }
}

// Executar testes
runAllTests();
