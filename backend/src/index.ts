import dotenv from 'dotenv';
dotenv.config();

console.log(`[STARTUP] dotenv loaded. SMTP_HOST defined: ${!!process.env.SMTP_HOST} (len: ${process.env.SMTP_HOST?.length || 0}), SMTP_USER defined: ${!!process.env.SMTP_USER} (len: ${process.env.SMTP_USER?.length || 0})`);

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import projectsRouter from './routes/projects.js';
import authRouter from './routes/auth.js';
import { requireAuth } from './middleware/requireAuth.js';
import { scopeToOwnProjects } from './middleware/scopeToOwnProjects.js';
import purchaseOrdersRouter from './routes/purchaseOrders.js';
import invoicesRouter from './routes/invoices.js';
import billDeskRouter from './routes/billDesk.js';
import taxInvoicesRouter from './routes/taxInvoices.js';
import pmSummaryRouter from './routes/pmSummary.js';
import dashboardRouter from './routes/dashboard.js';
import managersRouter from './routes/managers.js';
import exportsRouter from './routes/exports.js';
import noticesRouter from './routes/notices.js';
import auditLogsRouter from './routes/auditLogs.js';
import notificationsRouter from './routes/notifications.js';
import cron from 'node-cron';
import { runNotificationCheck } from './jobs/notificationCheck.js';

const app = express();
const port = process.env.PORT || 4000;

// Enable CORS for frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

// Routes registry
app.use('/api/auth', authRouter);
app.use('/api/projects', requireAuth, scopeToOwnProjects, projectsRouter);
app.use('/api/purchase-orders', requireAuth, scopeToOwnProjects, purchaseOrdersRouter);
app.use('/api/invoices', requireAuth, scopeToOwnProjects, invoicesRouter);
app.use('/api/bill-desk', requireAuth, scopeToOwnProjects, billDeskRouter);
app.use('/api/tax-invoices', requireAuth, scopeToOwnProjects, taxInvoicesRouter);
app.use('/api/pm-summary', requireAuth, scopeToOwnProjects, pmSummaryRouter);
app.use('/api/dashboard', requireAuth, scopeToOwnProjects, dashboardRouter);
app.use('/api/managers', requireAuth, managersRouter);
app.use('/api/exports', requireAuth, scopeToOwnProjects, exportsRouter);
app.use('/api/notices', requireAuth, noticesRouter);
app.use('/api/audit-logs', requireAuth, auditLogsRouter);
app.use('/api/notifications', requireAuth, notificationsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start Express Listener
app.listen(port, () => {
  console.log(`NPMS Backend Server listening on http://localhost:${port}`);
  
  // Start the periodic notification checker (on startup and every 30 minutes)
  runNotificationCheck().catch(err => console.error('Error running notification check on startup:', err));
  cron.schedule('*/30 * * * *', () => {
    runNotificationCheck().catch(err => console.error('Error running notification check cron:', err));
  });
});
