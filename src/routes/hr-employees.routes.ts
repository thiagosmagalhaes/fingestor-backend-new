import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { hrEmployeesController } from '../controllers/hr-employees.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res) => hrEmployeesController.list(req, res));
router.get('/:id', (req, res) => hrEmployeesController.getById(req, res));
router.post('/', (req, res) => hrEmployeesController.create(req, res));
router.put('/:id', (req, res) => hrEmployeesController.update(req, res));
router.post('/:id/deactivate', (req, res) => hrEmployeesController.deactivate(req, res));
router.post('/:id/invite', (req, res) => hrEmployeesController.invite(req, res));
router.post('/:id/portal-access', (req, res) => hrEmployeesController.createPortalAccess(req, res));

export default router;
