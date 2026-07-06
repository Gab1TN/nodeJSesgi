import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { validate } from "class-validator";
import { randomBytes } from "crypto";
import { User, UserRole } from "../entities/user";
import { signJWT } from "../lib/jwt";
import { sendVerificationEmail } from "../lib/mailer";
import { checkUser } from "../middleware/checkUser";

export const usersRouter = Router();

usersRouter.post("/register", async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ message: "email et password requis" });
  }

  const existing = await User.findOneBy({ email });
  if (existing) {
    return res.status(409).json({ message: "Email deja utilise" });
  }

  const user = new User();
  user.email = email;
  user.password = password;
  user.firstName = firstName;
  user.lastName = lastName;
  user.role = UserRole.USER;
  user.verificationToken = randomBytes(32).toString("hex");
  user.emailVerified = false;

  const errors = await validate(user);
  const validationErrors = errors.flatMap((error) =>
    error.constraints ? Object.values(error.constraints) : []
  );
  if (validationErrors.length) {
    return res.status(400).json({ message: "Validation failed", errors: validationErrors });
  }

  user.password = await bcrypt.hash(password, 10);
  const verificationLink = await sendVerificationEmail(user.email, user.verificationToken);
  await user.save();

  const { password: _, verificationToken: __, ...safe } = user;
  res.status(201).json({
    ...safe,
    message: "Compte cree, verifiez votre email",
    ...(verificationLink ? { verificationLink } : {}),
  });
});

usersRouter.get("/verify", async (req: Request, res: Response) => {
  const token = String(req.query.token || "");
  if (!token) {
    return res.status(400).json({ message: "token requis" });
  }

  const user = await User.findOneBy({ verificationToken: token });
  if (!user) {
    return res.status(400).json({ message: "Token invalide" });
  }

  user.emailVerified = true;
  user.verificationToken = undefined;
  await user.save();
  res.json({ message: "Email verifie" });
});

usersRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  const user = await User.findOneBy({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Identifiants invalides" });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ message: "Email non verifie" });
  }

  const token = signJWT({ id: user.id });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ message: "Connecte", userId: user.id, token });
});

usersRouter.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ message: "Deconnecte" });
});

usersRouter.get("/public", (_req, res) => {
  res.json({ message: "Route publique - pas besoin d etre connecte" });
});

usersRouter.get("/me", checkUser, (req, res) => {
  const { password: _, verificationToken: __, ...safe } = req.user!;
  res.json(safe);
});
