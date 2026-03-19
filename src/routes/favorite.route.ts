import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
  getMyFavorites,
  toggleFavorite,
} from "../controllers/favorites.controller";

const router = Router();

router.get("/", protect, getMyFavorites);
router.post("/:postId", protect, toggleFavorite);
export default router;
