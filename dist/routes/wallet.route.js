"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const wallet_controller_1 = require("../controllers/wallet.controller");
const router = express_1.default.Router();
router.get("/me", auth_middleware_1.protect, wallet_controller_1.getMyWalletWithLedger);
exports.default = router;
