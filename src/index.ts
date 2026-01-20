import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dashboardRoutes from './routes/dashboard.routes';
import authRoutes from './routes/auth.routes';
import companiesRoutes from './routes/companies.routes';
import categoriesRoutes from './routes/categories.routes';
import creditCardsRoutes from './routes/credit-cards.routes';
import transactionsRoutes from './routes/transactions.routes';
import { errorHandler, notFound } from './middleware/errorHandler';

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(express.json());
app.use(cors());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Caixa Mestra API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/credit-cards', creditCardsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🔐 Auth endpoints available at http://localhost:${PORT}/api/auth`);
  console.log(`🏢 Companies endpoints available at http://localhost:${PORT}/api/companies`);
  console.log(`🏷️  Categories endpoints available at http://localhost:${PORT}/api/categories`);
  console.log(`� Credit Cards endpoints available at http://localhost:${PORT}/api/credit-cards`);  console.log(`💰 Transactions endpoints available at http://localhost:${PORT}/api/transactions`);  console.log(`�📊 Dashboard endpoints available at http://localhost:${PORT}/api/dashboard`);
});

export default app;
