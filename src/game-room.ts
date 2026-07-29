import { WebSocket } from "ws";
import { User } from "./entities/user";
import { Question } from "./entities/question";

export type RoomStatus = "waiting" | "in_progress" | "finished";

export interface PlayerAnswer {
  choiceIds?: number[];
  textAnswer?: string;
}

export interface PlayerInfo {
  user: User;
  score: number;
}

export interface GameRoom {
  code: string;
  quizId: number;
  hostSocket: WebSocket;
  hostUser: User;
  players: Map<WebSocket, PlayerInfo>;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Map<number, PlayerAnswer>;
  status: RoomStatus;
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
