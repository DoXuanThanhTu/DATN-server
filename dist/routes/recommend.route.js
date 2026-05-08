"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const recommend_controller_1 = require("../controllers/recommend.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.get("/content/:id", recommend_controller_1.getContentBasedRecommend);
router.get("/collaborative/:id", recommend_controller_1.getCollaborativeRecommend);
router.get("/search/:id", recommend_controller_1.getSearchBasedRecommend);
router.get("/hybrid/:id", recommend_controller_1.getHybridRecommend);
router.get("/for-user", auth_middleware_1.checkAuth, recommend_controller_1.getForYouRecommend);
exports.default = router;
