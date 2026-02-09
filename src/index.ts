import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dashboardRoutes from "./routes/dashboard.routes";
import authRoutes from "./routes/auth.routes";
import companiesRoutes from "./routes/companies.routes";
import categoriesRoutes from "./routes/categories.routes";
import creditCardsRoutes from "./routes/credit-cards.routes";
import transactionsRoutes from "./routes/transactions.routes";
import subscriptionsRoutes from "./routes/subscriptions.routes";
import notificationsRoutes from "./routes/notifications.routes";
import ideasRoutes from "./routes/ideas.routes";
import supportRoutes from "./routes/support.routes";
import newsletterRoutes from "./routes/newsletter.routes";
import unsubscribeRoutes from "./routes/unsubscribe.routes";
import metadataRoutes from "./routes/metadata.routes";
import productCategoriesRoutes from "./routes/product-categories.routes";
import productsServicesRoutes from "./routes/products-services.routes";
import inventoryRoutes from "./routes/inventory.routes";
import customersRoutes from "./routes/customers.routes";
import budgetsRoutes from "./routes/budgets.routes";
import publicBudgetsRoutes from "./routes/public-budgets.routes";
import followupRoutes from "./routes/followup.routes";
import salesRoutes from "./routes/sales.routes";
import paymentMethodsRoutes from "./routes/payment-methods.routes";
import cashSessionsRoutes from "./routes/cash-sessions.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { startNotificationsCron } from "./jobs/notifications.job";
import { startWhatsAppJobs } from "./jobs/whatsapp.job";
import { startTrialExpiringJob } from "./jobs/trial-expiring.job";
import { startDailySummaryJob } from "./jobs/daily-summary.job";
import { startRecurringTransactionsJob } from "./jobs/recurring-transactions.job";

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.set("trust proxy", 1);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Fingestor API is running" });
});

// IMPORTANTE: Webhook do Stripe DEVE ser registrado ANTES do express.json()
// porque precisa do raw body para validar a assinatura
import { handleStripeWebhook } from "./controllers/subscriptions.controller";
app.post(
  "/api/subscriptions/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

// Agora sim podemos usar o parser JSON para outras rotas
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Routes
// Public routes (sem autenticação)
app.use("/public/budgets", publicBudgetsRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/credit-cards", creditCardsRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/ideas", ideasRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/unsubscribe", unsubscribeRoutes);
app.use("/api/metadata", metadataRoutes);
app.use("/api/product-categories", productCategoriesRoutes);
app.use("/api/products-services", productsServicesRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/budgets", budgetsRoutes);
app.use("/api/followup", followupRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/payment-methods", paymentMethodsRoutes);
app.use("/api/cash-sessions", cashSessionsRoutes);

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
  console.log(`📦 Product Categories endpoints available at /api/product-categories`);
  console.log(`🏪 Products/Services endpoints available at /api/products-services`);
  console.log(`📊 Inventory endpoints available at /api/inventory`);
  console.log(`👥 Customers endpoints available at /api/customers`);
  console.log(`📋 Budgets endpoints available at /api/budgets`);
  console.log(`📞 Follow-up endpoints available at /api/followup`);
  console.log(`� Payment Methods endpoints available at /api/payment-methods`);
  console.log(`�💰 Sales endpoints available at /api/sales`);
  console.log(`📊 Dashboard endpoints available at /api/dashboard`);
  console.log(`💎 Subscriptions endpoints available at /api/subscriptions`);
  console.log(`🔔 Notifications endpoints available at /api/notifications`);
  console.log(`💡 Ideas endpoints available at /api/ideas`);
  console.log(`🎟️  Support endpoints available at /api/support`);
  console.log(`📧 Newsletter endpoints available at /api/newsletter`);
  console.log(`⚙️  Metadata endpoints available at /api/metadata`);
  if (process.env.NODE_ENV === "production") {
    // Iniciar cron job de notificações
    startNotificationsCron();

    // Iniciar cron jobs de WhatsApp
    startWhatsAppJobs();

    // Iniciar cron job de trial expirando
    startTrialExpiringJob();

    // Iniciar cron job de resumo diário
    startDailySummaryJob();
    
    // Iniciar cron job de transações recorrentes
    startRecurringTransactionsJob();
  }
});

export default app;
