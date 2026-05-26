import { Router, Request, Response } from "express";
import { AdminService } from "./admin.service";
import { authMiddleware } from "../../middleware/auth.middleware";
import { adminMiddleware } from "../../middleware/admin.middleware";
import { asyncHandler } from "../../utils/asyncHandler";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const router = Router();
const adminService = new AdminService();

router.post("/create-admin", async (req, res) => {
  const { email, name, password, secretKey } = req.body;

  if (secretKey !== "setup_secret_2024") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: "User already exists" });

  const passwordHash = await bcrypt.hash(password, 12); // same salt rounds as auth.service.ts
  const admin = await prisma.user.create({
    data: { email, name, passwordHash, role: "admin" }
  });

  res.json({ success: true, id: admin.id, email: admin.email });
});


router.use(authMiddleware, adminMiddleware);

router.get("/stats", asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getSystemStats();
  return res.json({ data });
}));


router.get("/users", asyncHandler(async (req: Request, res: Response) => {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const data = await adminService.listUsers(parseInt(page), parseInt(limit));
  return res.json({ data });
}));

router.patch("/users/:id/role", asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body;
  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  const data = await adminService.setUserRole(req.params.id, role);
  return res.json({ data });
}));

router.get("/abuse-flags", asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getAbuseFlags();
  return res.json({ data });
}));

router.patch("/abuse-flags/:id/resolve", asyncHandler(async (req: Request, res: Response) => {
  const data = await adminService.resolveAbuseFlag(req.params.id);
  return res.json({ data });
}));

router.get("/logs", asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const data = await adminService.getRecentLogs(Math.min(limit, 500));
  return res.json({ data });
}));

export default router;
