import express from "express";
import { protect, authorize } from "../middleware/auth.middleware";
import {
  getMyLedger,
  getAllLedger,
  createLedger,
} from "../controllers/ledger.controller";

const router = express.Router();

router.get("/me", protect, getMyLedger);

router.get("/all", protect, authorize("admin"), getAllLedger);
router.post("/", protect, authorize("admin"), createLedger);

export default router;
