import { Request, Response } from "express";
import { ApiKeyService } from "./apikey.service";
import { createApiKeySchema, updateApiKeySchema } from "./apikey.schema";

const apiKeyService = new ApiKeyService();

export class ApiKeyController {
  async create(req: Request, res: Response) {
    const parsed = createApiKeySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const userId = req.user!.id;
    const result = await apiKeyService.createApiKey(userId, parsed.data);
    return res.status(201).json({
      message: "API key created. Save the rawKey — it won't be shown again.",
      data: result,
    });
  }

  async list(req: Request, res: Response) {
    const keys = await apiKeyService.listApiKeys(req.user!.id);
    return res.json({ data: keys });
  }

  async getOne(req: Request, res: Response) {
    const key = await apiKeyService.getApiKeyById(req.params.id, req.user!.id);
    if (!key) return res.status(404).json({ error: "Not found" });
    return res.json({ data: key });
  }

  async update(req: Request, res: Response) {
    const parsed = updateApiKeySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const updated = await apiKeyService.updateApiKey(
      req.params.id,
      req.user!.id,
      parsed.data
    );
    return res.json({ data: updated });
  }

  async revoke(req: Request, res: Response) {
    const result = await apiKeyService.revokeApiKey(req.params.id, req.user!.id);
    return res.json(result);
  }

  async getStats(req: Request, res: Response) {
    const stats = await apiKeyService.getKeyStats(req.params.id, req.user!.id);
    return res.json({ data: stats });
  }
}
