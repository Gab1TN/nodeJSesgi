import { NextFunction, Request, Response } from "express";
import { User } from "../entities/user";
import { verifyJWT } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function checkUser(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Non authentifié" });
  }
  try {
    const payload = verifyJWT<{ id: number }>(token);
    const user = await User.findOneBy({ id: payload.id });
    if (!user) return res.status(401).json({ message: "Utilisateur introuvable" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Token invalide" });
  }
}
