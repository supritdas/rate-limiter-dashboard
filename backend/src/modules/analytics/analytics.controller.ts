import { Request, Response } from "express";
import { AnalyticsService } from "./analytics.service";

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async overview(req: Request, res: Response) {
    const data = await analyticsService.getOverview(req.user!.id);
    return res.json({ data });
  }

  async timeSeries(req: Request, res: Response) {
    const hours = parseInt(req.query.hours as string) || 24;
    const apiKeyId = req.query.apiKeyId as string | undefined;
    const data = await analyticsService.getRequestsTimeSeries(
      req.user!.id,
      apiKeyId,
      hours
    );
    return res.json({ data });
  }

  async topKeys(req: Request, res: Response) {
    const data = await analyticsService.getTopApiKeys(req.user!.id);
    return res.json({ data });
  }

  async topIPs(req: Request, res: Response) {
    const data = await analyticsService.getTopIPs(req.user!.id);
    return res.json({ data });
  }

  async latency(req: Request, res: Response) {
    const apiKeyId = req.query.apiKeyId as string | undefined;
    const data = await analyticsService.getLatency(req.user!.id, apiKeyId);
    return res.json({ data });
  }
}
