import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();
const ctrl = new AuthController();

router.post("/register", asyncHandler(ctrl.register.bind(ctrl)));
router.post("/login", asyncHandler(ctrl.login.bind(ctrl)));
router.get("/me", authMiddleware, asyncHandler(ctrl.me.bind(ctrl)));

export default router;
