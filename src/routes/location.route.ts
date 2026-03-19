import { Router } from "express";
import { getLocationsGroupedByProvince } from "../controllers/location.controller";

const router = Router();

router.get("/by-province", getLocationsGroupedByProvince);

export default router;
