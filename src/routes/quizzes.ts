import { Router, Request, Response } from "express";
import { validate } from "class-validator";
import { MediaType } from "../entities/media";
import { Quiz } from "../entities/quiz";
import { deleteMediaFile, saveImage, uploadImage } from "../lib/media";
import { checkUser } from "../middleware/checkUser";

export const quizzesRouter = Router();

quizzesRouter.get("/", async (_req, res) => {
  const quizzes = await Quiz.find({
    order: {
      id: "DESC",
    },
  });

  res.json(quizzes);
});

quizzesRouter.post("/", checkUser, async (req: Request, res: Response) => {
  const { title, description } = req.body ?? {};
  if (!title) {
    return res.status(400).json({ message: "Titre requis" });
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
    return res.status(400).json({ message: "Erreur de validation", errors: validationErrors });
  }

  await quiz.save();
  res.status(201).json(quiz);
});

quizzesRouter.post("/:id/image", checkUser, uploadImage.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Image requise" });
  }

  const quizId = Number(req.params.id);
  const quiz = await Quiz.findOne({
    where: { id: quizId },
    relations: {
      author: true,
      image: true,
    },
  });

  if (!quiz) {
    return res.status(404).json({ message: "Quiz introuvable" });
  }

  if (quiz.author.id !== req.user!.id) {
    return res.status(403).json({ message: "Vous ne pouvez pas modifier ce quiz" });
  }

  const media = await saveImage(req.file, MediaType.QUIZ, `quiz-${quiz.id}`, 1200, 1200, "inside");

  await deleteMediaFile(quiz.image);
  quiz.image = media;
  await quiz.save();

  res.status(201).json({
    message: "Image du quiz enregistrée",
    media,
  });
});
