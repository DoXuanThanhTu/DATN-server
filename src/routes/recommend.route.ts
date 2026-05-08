import express from "express";
import {
  getCollaborativeRecommend,
  getContentBasedRecommend,
  getForYouRecommend,
  getHybridRecommend,
  getSearchBasedRecommend,
} from "../controllers/recommend.controller";
import { checkAuth, protect } from "../middleware/auth.middleware";

const router = express.Router();
router.get("/content/:id", getContentBasedRecommend);

router.get("/collaborative/:id", getCollaborativeRecommend);

router.get("/search/:id", getSearchBasedRecommend);

router.get("/hybrid/:id", getHybridRecommend);
router.get("/for-user", checkAuth, getForYouRecommend);
export default router;
