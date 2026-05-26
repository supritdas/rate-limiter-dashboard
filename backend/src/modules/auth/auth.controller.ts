import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { registerSchema, loginSchema } from "./auth.schema";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    try {
      const result = await authService.register(parsed.data);
      return res.status(201).json({ data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      return res.status(409).json({ error: message });
    }
  }

  async login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    try {
      const result = await authService.login(parsed.data);
      return res.json({ data: result });
    } catch {
      return res.status(401).json({ error: "Invalid credentials" });
    }
  }

  async me(req: Request, res: Response) {
    const user = await authService.getProfile(req.user!.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ data: user });
  }
}
