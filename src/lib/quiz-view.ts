import { Quiz } from "../entities/quiz";
import { Question } from "../entities/question";
import { Choice } from "../entities/choice";
import { User } from "../entities/user";

// Vue publique d'un auteur : jamais de password ni de verificationToken.
function toPublicUser(user?: User) {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar ?? null,
  };
}

function serializeChoice(choice: Choice, includeAnswers: boolean) {
  return {
    id: choice.id,
    label: choice.label,
    position: choice.position,
    // isCorrect uniquement pour l'auteur (vue édition)
    ...(includeAnswers ? { isCorrect: choice.isCorrect } : {}),
  };
}

function serializeQuestion(question: Question, includeAnswers: boolean) {
  const choices = (question.choices ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((choice) => serializeChoice(choice, includeAnswers));

  return {
    id: question.id,
    label: question.label,
    type: question.type,
    position: question.position,
    choices,
    // answer (réponse texte attendue) uniquement pour l'auteur
    ...(includeAnswers ? { answer: question.answer ?? null } : {}),
  };
}

// includeAnswers = true → vue AUTEUR (isCorrect + answer visibles)
// includeAnswers = false → vue JOUEUR (bonnes réponses masquées)
export function serializeQuiz(quiz: Quiz, includeAnswers: boolean) {
  const questions = (quiz.questions ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((question) => serializeQuestion(question, includeAnswers));

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description ?? null,
    image: quiz.image ?? null,
    author: toPublicUser(quiz.author),
    questions,
    createdAt: quiz.createdAt,
  };
}
