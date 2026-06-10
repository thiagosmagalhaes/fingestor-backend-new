import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { hrPayrollController, hrPortalController } from '../controllers/hr-payroll.controller';

const router = Router();

// Store uploaded PDF in memory (buffer) — max 50 MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
});

// ── Public employee portal auth ─────────────────────────────
router.post('/portal/login', (req, res) => hrPortalController.login(req, res));

router.use(authMiddleware);

// ── Manager: payroll batch management ───────────────────────
router.get('/batches', (req, res) => hrPayrollController.listBatches(req, res));
router.get('/batches/:id', (req, res) => hrPayrollController.getBatch(req, res));
router.post('/batches/upload', upload.single('pdf'), (req, res) => hrPayrollController.uploadBatch(req, res));
router.get('/batches/:id/payslips', (req, res) => hrPayrollController.listBatchPayslips(req, res));
router.post('/batches/:id/confirm', (req, res) => hrPayrollController.confirmBatch(req, res));

// ── Manager: individual payslip operations ───────────────────
router.patch('/payslips/:id/assign', (req, res) => hrPayrollController.assignPayslip(req, res));
router.get('/payslips/:id/url', (req, res) => hrPayrollController.getPayslipUrl(req, res));

// ── Employee portal ──────────────────────────────────────────
router.get('/portal/payslips', (req, res) => hrPortalController.listMyPayslips(req, res));
router.get('/portal/payslips/monthly', (req, res) => hrPortalController.listMyPayslipsMonthly(req, res));
router.get('/portal/payslips/:id/url', (req, res) => hrPortalController.getMyPayslipUrl(req, res));

export default router;
