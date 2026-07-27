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

function extractToken(req: Request): string | undefined {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  return req.cookies?.token || bearerToken;
}

export async function checkUser(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: "Non authentifié" });
  }

  try {
    const payload = verifyJWT<{ id: number }>(token);
    const user = await User.findOneBy({ id: payload.id });
    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Token invalide" });
  }
}

// Renseigne req.user si un token valide est présent, sans jamais bloquer la requête.
// Utile pour les routes publiques qui adaptent leur réponse selon l'utilisateur.
export async function optionalUser(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return next();
  }

  try {
    const payload = verifyJWT<{ id: number }>(token);
    const user = await User.findOneBy({ id: payload.id });
    if (user) {
      req.user = user;
    }
  } catch {
    // token invalide → on continue en anonyme
  }
  next();
}
