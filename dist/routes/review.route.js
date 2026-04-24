"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const reviews_controller_1 = require("../controllers/reviews.controller");
const router = express_1.default.Router();
router.post("/", auth_middleware_1.protect, reviews_controller_1.createReview);
router.get("/me", auth_middleware_1.protect, reviews_controller_1.getMyReviews);
router.get("/user/:userId", reviews_controller_1.getUserReviews);
// Route chỉnh sửa đánh giá cụ thể
router.patch("/:reviewId", auth_middleware_1.protect, reviews_controller_1.updateReview);
exports.default = router;
