import { Router } from "express";
import { deletePhoto } from "../controllers/imagekit.controller";

const router = Router();

router.delete("/:fileId", deletePhoto);

export default router;
