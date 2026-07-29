import { IsEmail, IsIn, IsISO8601, IsString, IsInt, IsOptional, IsArray, Length } from "class-validator";

export const GAME_MESSAGE_TYPES = ["create_room", "join_room", "start_game", "submit_answer"] as const;
export const ALL_MESSAGE_TYPES = ["message", ...GAME_MESSAGE_TYPES] as const;

export class IncomingWebSocketMessage {
  @IsIn([...ALL_MESSAGE_TYPES], { message: `Le type de message doit être parmi : ${ALL_MESSAGE_TYPES.join(", ")}` })
  type: string;

  @IsOptional()
  @IsString({ message: "Le contenu doit être une chaîne de caractères" })
  @Length(1, 500, { message: "Le contenu doit contenir entre 1 et 500 caractères" })
  content?: string;

  @IsOptional()
  @IsInt({ message: "quizId doit être un entier" })
  quizId?: number;

  @IsOptional()
  @IsString({ message: "code doit être une chaîne de caractères" })
  @Length(6, 6, { message: "Le code de room doit contenir 6 caractères" })
  code?: string;

  @IsOptional()
  @IsInt({ message: "questionId doit être un entier" })
  questionId?: number;

  @IsOptional()
  @IsArray({ message: "choiceIds doit être un tableau" })
  @IsInt({ each: true, message: "Chaque choiceId doit être un entier" })
  choiceIds?: number[];

  @IsOptional()
  @IsString({ message: "textAnswer doit être une chaîne de caractères" })
  textAnswer?: string;
}

export class OutgoingWebSocketMessage {
  @IsIn(["message"], { message: "Le type de message doit être 'message'" })
  type: string;

  @IsString({ message: "Le contenu doit être une chaîne de caractères" })
  @Length(1, 500, { message: "Le contenu doit contenir entre 1 et 500 caractères" })
  content: string;

  @IsEmail({}, { message: "L'email de l'expéditeur doit être valide" })
  senderEmail: string;

  @IsISO8601({}, { message: "La date d'envoi doit être au format ISO 8601" })
  sentAt: string;
}

export class ErrorWebSocketMessage {
  @IsIn(["error"], { message: "Le type de message doit être 'error'" })
  type: string;

  @IsString({ message: "Le message d'erreur doit être une chaîne de caractères" })
  message: string;

  @IsString({ each: true, message: "Les erreurs doivent être des chaînes de caractères" })
  errors: string[];
}
