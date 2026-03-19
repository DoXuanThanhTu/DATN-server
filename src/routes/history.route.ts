import { Router } from "express";

import { getMyHistory } from "../controllers/history.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.get("/", protect, getMyHistory);
export default router;
