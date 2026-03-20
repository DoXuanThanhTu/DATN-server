"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const user_controller_1 = require("../controllers/user.controller");
const router = (0, express_1.Router)();
router.post("/status", auth_middleware_1.protect, user_controller_1.updateStatus);
router.get("/all", auth_middleware_1.protect, user_controller_1.getAllUsers);
exports.default = router;
