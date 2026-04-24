import express from "express";
import { protect } from "../middleware/auth.middleware";
import { getMyWalletWithLedger } from "../controllers/wallet.controller";

const router = express.Router();

router.get("/me", protect, getMyWalletWithLedger);

export default router;
