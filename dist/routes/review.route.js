"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const reviews_controller_1 = require("../controllers/reviews.controller");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.protect, reviews_controller_1.getMySentReviews);
router.post("/", auth_middleware_1.protect, reviews_controller_1.createReview);
exports.default = router;
