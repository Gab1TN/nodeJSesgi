import { Router, Request, Response } from "express";
import { validate } from "class-validator";
import { Quiz } from "../entities/quiz";
import { checkUser } from "../middleware/checkUser";

export const quizzesRouter = Router();

quizzesRouter.get("/", async (_req, res) => {
  const quizzes = await Quiz.find();
  res.json(quizzes);
});

quizzesRouter.post("/", checkUser, async (req: Request, res: Response) => {
  const { title, description } = req.body ?? {};
  if (!title) {
    return res.status(400).json({ message: "title requis" });
  }

  const quiz = new Quiz();
  quiz.title = title;
  quiz.description = description;
  quiz.author = req.user!;

  const errors = await validate(quiz);
  const validationErrors = errors.flatMap((error) =>
    error.constraints ? Object.values(error.constraints) : []
  );
  if (validationErrors.length) {
    return res.status(400).json({ message: "Validation failed", errors: validationErrors });
  }

  await quiz.save();
  res.status(201).json(quiz);
});
