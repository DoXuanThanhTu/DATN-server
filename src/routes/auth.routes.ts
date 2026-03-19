import { AuthRequest } from "src/middleware/auth.middleware";
import express from "express";
import { register, login } from "../controllers/auth.controller";
import { authorize, protect } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", protect, (req: AuthRequest, res) => {
  res.status(200).json({ status: "success", data: { user: req.user } });
});

router.get(
  "/admin/users",
  protect,
  authorize("admin"),
  async (_req: AuthRequest, res) => {
    res.json({ message: "Chào Admin, đây là danh sách user." });
  },
);

export default router;
