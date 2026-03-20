"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const imagekit_controller_1 = require("../controllers/imagekit.controller");
const router = (0, express_1.Router)();
router.delete("/:fileId", imagekit_controller_1.deletePhoto);
exports.default = router;
