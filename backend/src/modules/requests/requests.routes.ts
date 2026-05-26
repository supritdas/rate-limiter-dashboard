import { Router, Request, Response } from "express";
import { getRequestLogs } from "../../services/logger.service";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();
router.use(authMiddleware);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      apiKeyId,
      blocked,
      from,
      to,
      page = "1",
      limit = "50",
    } = req.query as Record<string, string>;

    const data = await getRequestLogs(req.user!.id, apiKeyId, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 200),
      blocked: blocked !== undefined ? blocked === "true" : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });

    return res.json({ data });
  })
);

export default router;
