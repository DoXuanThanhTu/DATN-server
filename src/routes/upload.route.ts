import express from "express";
import { getAuth } from "../controllers/upload.controller";

const router = express.Router();

router.get("/auth", getAuth);

export default router;
