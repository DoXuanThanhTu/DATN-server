"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const history_controller_1 = require("../controllers/history.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.protect, history_controller_1.getMyHistory);
exports.default = router;
