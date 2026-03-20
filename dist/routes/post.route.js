"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const post_controller_1 = require("./../controllers/post.controller");
const express_1 = __importDefault(require("express"));
const post_controller_2 = require("../controllers/post.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/", auth_middleware_1.protect, post_controller_2.createProduct);
router.get("/me", auth_middleware_1.protect, post_controller_1.getMyPosts);
router.get("/", auth_middleware_1.checkAuth, post_controller_2.getProducts);
router.get("/related/:id", post_controller_1.getRelatedProducts);
router.patch("/update/:id", auth_middleware_1.protect, post_controller_1.updateProduct);
router.get("/:identity", post_controller_2.getProductDetail);
// router.use(authorize("admin"));
router.post("/admin/:id/approve", auth_middleware_1.protect, (0, auth_middleware_1.authorize)("admin"), post_controller_1.approvePost); // duyệt tin
router.post("/admin/:id/hide", auth_middleware_1.protect, (0, auth_middleware_1.authorize)("admin"), post_controller_1.hidePost); // ẩn tin
router.post("/admin/:id/reject", auth_middleware_1.protect, (0, auth_middleware_1.authorize)("admin"), post_controller_1.rejectPost); // từ chối duyệt tin
router.delete("/admin/:id", auth_middleware_1.protect, (0, auth_middleware_1.authorize)("admin"), post_controller_1.deletePost);
exports.default = router;
