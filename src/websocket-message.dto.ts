import { IsEmail, IsIn, IsISO8601, IsString, Length } from "class-validator";

export class IncomingWebSocketMessage {
  @IsIn(["message"], { message: "Le type de message doit être 'message'" })
  type: string;

  @IsString({ message: "Le contenu doit être une chaîne de caractères" })
  @Length(1, 500, { message: "Le contenu doit contenir entre 1 et 500 caractères" })
  content: string;
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
