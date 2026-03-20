"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/category.route.ts
const express_1 = require("express");
const category_controller_1 = require("../controllers/category.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get("/", category_controller_1.getCategories);
router.post("/", auth_middleware_1.protect, category_controller_1.createCategory);
exports.default = router;
