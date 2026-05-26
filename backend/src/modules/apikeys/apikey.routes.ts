import { Router } from "express";
import { ApiKeyController } from "./apikey.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();
const ctrl = new ApiKeyController();

router.use(authMiddleware);

router.post("/", asyncHandler(ctrl.create.bind(ctrl)));
router.get("/", asyncHandler(ctrl.list.bind(ctrl)));
router.get("/:id", asyncHandler(ctrl.getOne.bind(ctrl)));
router.patch("/:id", asyncHandler(ctrl.update.bind(ctrl)));
router.delete("/:id", asyncHandler(ctrl.revoke.bind(ctrl)));
router.get("/:id/stats", asyncHandler(ctrl.getStats.bind(ctrl)));

export default router;
