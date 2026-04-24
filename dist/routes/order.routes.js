"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const order_controller_1 = require("../controllers/order.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// Tất cả các route order đều cần đăng nhập
router.use(auth_middleware_1.protect);
router.post("/", order_controller_1.createOrder);
router.get("/me", order_controller_1.getMyOrders);
router.patch("/:orderId/status", order_controller_1.updateOrderStatus);
exports.default = router;
