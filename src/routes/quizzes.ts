import { Router, Request, Response } from "express";
import { validate, ValidationError } from "class-validator";
import { Choice } from "../entities/choice";
import { MediaType } from "../entities/media";
import { Question, QuestionType } from "../entities/question";
import { Quiz } from "../entities/quiz";
import { deleteMediaFile, saveImage, uploadImage } from "../lib/media";
import { serializeQuiz } from "../lib/quiz-view";
import { checkUser, optionalUser } from "../middleware/checkUser";

export const quizzesRouter = Router();

// Aplati les contraintes class-validator, y compris les erreurs imbriquées (questions/choix).
function flattenErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...(error.constraints ? Object.values(error.constraints) : []),
    ...(error.children ? flattenErrors(error.children) : []),
  ]);
}

type ChoiceInput = { label?: string; isCorrect?: boolean };
type QuestionInput = { label?: string; type?: string; answer?: string; choices?: ChoiceInput[] };

// Construit les questions/choix depuis le payload et vérifie les règles par type.
// Retourne les questions prêtes à sauvegarder, ou la liste des erreurs métier.
function buildQuestions(input: unknown): { questions: Question[]; errors: string[] } {
  const errors: string[] = [];
  const questions: Question[] = [];

  if (input === undefined) {
    return { questions, errors };
  }
  if (!Array.isArray(input)) {
    return { questions, errors: ["Le champ questions doit être un tableau"] };
  }

  input.forEach((raw: QuestionInput, index) => {
    const position = index + 1;
    const question = new Question();
    question.label = raw?.label ?? "";
    question.type = raw?.type as QuestionType;
    question.position = position;
    question.choices = [];

    const choicesInput = Array.isArray(raw?.choices) ? raw.choices : [];

    if (raw?.type === QuestionType.SINGLE || raw?.type === QuestionType.MULTIPLE) {
      if (choicesInput.length < 2) {
        errors.push(`Question ${position} : au moins 2 choix sont requis`);
      }
      const correctCount = choicesInput.filter((c) => c?.isCorrect).length;
      if (raw.type === QuestionType.SINGLE && correctCount !== 1) {
        errors.push(`Question ${position} : un choix unique doit avoir exactement 1 bonne réponse`);
      }
      if (raw.type === QuestionType.MULTIPLE && correctCount < 1) {
        errors.push(`Question ${position} : un choix multiple doit avoir au moins 1 bonne réponse`);
      }
      question.choices = choicesInput.map((c, i) => {
        const choice = new Choice();
        choice.label = c?.label ?? "";
        choice.isCorrect = Boolean(c?.isCorrect);
        choice.position = i + 1;
        return choice;
      });
    } else if (raw?.type === QuestionType.TEXT) {
      if (choicesInput.length > 0) {
        errors.push(`Question ${position} : une réponse texte ne doit pas avoir de choix`);
      }
      if (!raw?.answer) {
        errors.push(`Question ${position} : une réponse texte est requise`);
      }
      question.answer = raw?.answer;
    } else {
      errors.push(`Question ${position} : type invalide (single, multiple ou text)`);
    }

    questions.push(question);
  });

  return { questions, errors };
}

quizzesRouter.get("/", async (_req, res) => {
  const quizzes = await Quiz.find({
    order: {
      id: "DESC",
    },
  });

  // Liste publique : toujours la vue joueur (bonnes réponses masquées).
  res.json(quizzes.map((quiz) => serializeQuiz(quiz, false)));
});

quizzesRouter.get("/:id", optionalUser, async (req: Request, res: Response) => {
  const quizId = Number(req.params.id);
  if (Number.isNaN(quizId)) {
    return res.status(400).json({ message: "Identifiant invalide" });
  }

  const quiz = await Quiz.findOne({ where: { id: quizId } });
  if (!quiz) {
    return res.status(404).json({ message: "Quiz introuvable" });
  }

  // L'auteur voit les bonnes réponses (édition) ; les autres ont la vue joueur.
  const isAuthor = req.user?.id === quiz.author?.id;
  res.json(serializeQuiz(quiz, isAuthor));
});

quizzesRouter.post("/", checkUser, async (req: Request, res: Response) => {
  const { title, description, questions } = req.body ?? {};
  if (!title) {
    return res.status(400).json({ message: "Titre requis" });
  }

  const { questions: builtQuestions, errors: questionErrors } = buildQuestions(questions);

  const quiz = new Quiz();
  quiz.title = title;
  quiz.description = description;
  quiz.author = req.user!;
  quiz.questions = builtQuestions;

  const errors = await validate(quiz, { validationError: { target: false } });
  const allErrors = [...flattenErrors(errors), ...questionErrors];
  if (allErrors.length) {
    return res.status(400).json({ message: "Erreur de validation", errors: allErrors });
  }

  await quiz.save();
  // L'auteur récupère sa vue complète (avec isCorrect / answer).
  res.status(201).json(serializeQuiz(quiz, true));
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
