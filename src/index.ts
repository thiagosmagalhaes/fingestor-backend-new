import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dashboardRoutes from './routes/dashboard.routes';
import authRoutes from './routes/auth.routes';
import companiesRoutes from './routes/companies.routes';
import categoriesRoutes from './routes/categories.routes';
import creditCardsRoutes from './routes/credit-cards.routes';
import transactionsRoutes from './routes/transactions.routes';
import subscriptionsRoutes from './routes/subscriptions.routes';
import notificationsRoutes from './routes/notifications.routes';
import ideasRoutes from './routes/ideas.routes';
import supportRoutes from './routes/support.routes';
import newsletterRoutes from './routes/newsletter.routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { startNotificationsCron } from './jobs/notifications.job';
import { startWhatsAppJobs } from './jobs/whatsapp.job';
import { startTrialExpiringJob } from './jobs/trial-expiring.job';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));

app.set('trust proxy', 1);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Caixa Mestra API is running' });
});

// IMPORTANTE: Webhook do Stripe DEVE ser registrado ANTES do express.json()
// porque precisa do raw body para validar a assinatura
import { handleStripeWebhook } from './controllers/subscriptions.controller';
app.post('/api/subscriptions/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Agora sim podemos usar o parser JSON para outras rotas
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/credit-cards', creditCardsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/newsletter', newsletterRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running`);
  console.log(`🔐 Auth endpoints available at /api/auth`);
  console.log(`🏢 Companies endpoints available at /api/companies`);
  console.log(`🏷️  Categories endpoints available at /api/categories`);
  console.log(`💳 Credit Cards endpoints available at /api/credit-cards`);
  console.log(`💰 Transactions endpoints available at /api/transactions`);
  console.log(`📊 Dashboard endpoints available at /api/dashboard`);
  console.log(`💎 Subscriptions endpoints available at /api/subscriptions`);
  console.log(`🔔 Notifications endpoints available at /api/notifications`);
  console.log(`💡 Ideas endpoints available at /api/ideas`);
  console.log(`🎟️  Support endpoints available at /api/support`);
  console.log(`📧 Newsletter endpoints available at /api/newsletter`);
  
  // Iniciar cron job de notificações
  startNotificationsCron();
  
  // Iniciar cron jobs de WhatsApp
  startWhatsAppJobs();
  
  // Iniciar cron job de trial expirando
  startTrialExpiringJob();
});

export default app;
