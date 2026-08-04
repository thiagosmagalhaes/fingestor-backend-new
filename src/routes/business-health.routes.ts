import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import businessHealthController from "../controllers/business-health.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", (req, res) =>
  businessHealthController.getBusinessHealth(req, res),
);

export default router;
