"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const ledger_controller_1 = require("../controllers/ledger.controller");
const router = express_1.default.Router();
router.get("/me", auth_middleware_1.protect, ledger_controller_1.getMyLedger);
router.get("/all", auth_middleware_1.protect, (0, auth_middleware_1.authorize)("admin"), ledger_controller_1.getAllLedger);
router.post("/", auth_middleware_1.protect, (0, auth_middleware_1.authorize)("admin"), ledger_controller_1.createLedger);
exports.default = router;
