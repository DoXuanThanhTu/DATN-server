"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const message_controller_1 = require("../controllers/message.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.protect);
router.post("/direct", message_controller_1.sendDirectMessage);
router.get("/:conversationId", message_controller_1.getMessages);
router.get("/inbox/all", message_controller_1.getConversations);
exports.default = router;
