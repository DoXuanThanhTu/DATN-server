import { Router } from "express";
import { checkAuth, protect } from "../middleware/auth.middleware";
import {
  getMyFavorites,
  toggleFavorite,
} from "../controllers/favorites.controller";

const router = Router();

router.get("/", checkAuth, getMyFavorites);
router.post("/:postId", checkAuth, toggleFavorite);
export default router;
