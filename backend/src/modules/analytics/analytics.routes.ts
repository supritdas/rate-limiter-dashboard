import { Router } from "express";
import { AnalyticsController } from "./analytics.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();
const ctrl = new AnalyticsController();

router.use(authMiddleware);

router.get("/overview", asyncHandler(ctrl.overview.bind(ctrl)));
router.get("/timeseries", asyncHandler(ctrl.timeSeries.bind(ctrl)));
router.get("/top-keys", asyncHandler(ctrl.topKeys.bind(ctrl)));
router.get("/top-ips", asyncHandler(ctrl.topIPs.bind(ctrl)));
router.get("/latency", asyncHandler(ctrl.latency.bind(ctrl)));

export default router;
