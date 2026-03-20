"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const favorites_controller_1 = require("../controllers/favorites.controller");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.protect, favorites_controller_1.getMyFavorites);
router.post("/:postId", auth_middleware_1.protect, favorites_controller_1.toggleFavorite);
exports.default = router;
