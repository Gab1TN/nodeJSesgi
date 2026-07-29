import { WebSocket } from "ws";
import { User } from "./entities/user";
import { Quiz } from "./entities/quiz";
import { QuestionType } from "./entities/question";
import { GameRoom, PlayerAnswer, generateRoomCode } from "./game-room";
import { serializeQuestion } from "./lib/quiz-view";

export class GameManager {
  private readonly rooms = new Map<string, GameRoom>();
  private readonly socketToRoom = new Map<WebSocket, string>();

  async createRoom(quizId: number, hostSocket: WebSocket, hostUser: User) {
    const quiz = await Quiz.findOne({ where: { id: quizId }, relations: { questions: { choices: true } } });
    if (!quiz) {
      this.sendTo(hostSocket, { type: "error", message: "Quiz introuvable", errors: ["Quiz introuvable"] });
      return;
    }

    const questions = quiz.questions.slice().sort((a, b) => a.position - b.position);
    if (questions.length === 0) {
      this.sendTo(hostSocket, { type: "error", message: "Ce quiz n'a aucune question", errors: ["Ce quiz n'a aucune question"] });
      return;
    }

    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const room: GameRoom = {
      code,
      quizId,
      hostSocket,
      hostUser,
      players: new Map(),
      questions,
      currentQuestionIndex: -1,
      answers: new Map(),
      status: "waiting",
    };

    this.rooms.set(code, room);
    this.socketToRoom.set(hostSocket, code);
    this.sendTo(hostSocket, { type: "room_created", code });
  }

  joinRoom(code: string, socket: WebSocket, user: User) {
    const room = this.rooms.get(code);
    if (!room) {
      this.sendTo(socket, { type: "error", message: "Room introuvable", errors: ["Room introuvable"] });
      return;
    }
    if (room.status !== "waiting") {
      this.sendTo(socket, { type: "error", message: "La partie a déjà commencé", errors: ["La partie a déjà commencé"] });
      return;
    }

    room.players.set(socket, { user, score: 0 });
    this.socketToRoom.set(socket, code);

    const player = toPublicPlayer(user);
    this.broadcastToRoom(room, { type: "player_joined", player, playerCount: room.players.size });
  }

  startGame(code: string, socket: WebSocket) {
    const room = this.rooms.get(code);
    if (!room) {
      this.sendTo(socket, { type: "error", message: "Room introuvable", errors: ["Room introuvable"] });
      return;
    }
    if (socket !== room.hostSocket) {
      this.sendTo(socket, { type: "error", message: "Seul le host peut lancer la partie", errors: ["Seul le host peut lancer la partie"] });
      return;
    }
    if (room.status !== "waiting") {
      this.sendTo(socket, { type: "error", message: "La partie a déjà commencé", errors: ["La partie a déjà commencé"] });
      return;
    }
    if (room.players.size === 0) {
      this.sendTo(socket, { type: "error", message: "Aucun joueur dans la room", errors: ["Aucun joueur dans la room"] });
      return;
    }

    room.status = "in_progress";
    this.broadcastToRoom(room, { type: "game_started" });
    this.sendNextQuestion(room);
  }

  submitAnswer(code: string, socket: WebSocket, questionId: number, answer: PlayerAnswer) {
    const room = this.rooms.get(code);
    if (!room) {
      this.sendTo(socket, { type: "error", message: "Room introuvable", errors: ["Room introuvable"] });
      return;
    }
    if (room.status !== "in_progress") {
      this.sendTo(socket, { type: "error", message: "La partie n'est pas en cours", errors: ["La partie n'est pas en cours"] });
      return;
    }

    const playerInfo = room.players.get(socket);
    if (!playerInfo) {
      this.sendTo(socket, { type: "error", message: "Vous n'êtes pas dans cette room", errors: ["Vous n'êtes pas dans cette room"] });
      return;
    }

    const currentQuestion = room.questions[room.currentQuestionIndex];
    if (!currentQuestion || currentQuestion.id !== questionId) {
      this.sendTo(socket, { type: "error", message: "Ce n'est pas la question en cours", errors: ["Ce n'est pas la question en cours"] });
      return;
    }

    if (room.answers.has(playerInfo.user.id)) {
      this.sendTo(socket, { type: "error", message: "Vous avez déjà répondu", errors: ["Vous avez déjà répondu"] });
      return;
    }

    room.answers.set(playerInfo.user.id, answer);

    if (this.isCorrectAnswer(currentQuestion, answer)) {
      playerInfo.score++;
    }

    if (room.answers.size === room.players.size) {
      this.endCurrentQuestion(room);
    }
  }

  handleDisconnect(socket: WebSocket) {
    const code = this.socketToRoom.get(socket);
    if (!code) return;

    this.socketToRoom.delete(socket);
    const room = this.rooms.get(code);
    if (!room) return;

    if (socket === room.hostSocket) {
      this.broadcastToRoom(room, { type: "error", message: "Le host a quitté, la partie est terminée", errors: ["Le host a quitté"] });
      for (const playerSocket of room.players.keys()) {
        this.socketToRoom.delete(playerSocket);
      }
      this.rooms.delete(code);
      return;
    }

    const playerInfo = room.players.get(socket);
    if (playerInfo) {
      room.players.delete(socket);
      this.broadcastToRoom(room, {
        type: "player_left",
        player: toPublicPlayer(playerInfo.user),
        playerCount: room.players.size,
      });

      if (room.status === "in_progress" && room.players.size > 0 && room.answers.size === room.players.size) {
        this.endCurrentQuestion(room);
      }

      if (room.players.size === 0 && room.status === "in_progress") {
        room.status = "finished";
        this.sendTo(room.hostSocket, { type: "game_finished", scores: [] });
        this.socketToRoom.delete(room.hostSocket);
        this.rooms.delete(code);
      }
    }
  }

  private isCorrectAnswer(question: { type: QuestionType; choices: { id: number; isCorrect: boolean }[]; answer?: string }, answer: PlayerAnswer): boolean {
    if (question.type === QuestionType.TEXT) {
      return question.answer?.toLowerCase().trim() === answer.textAnswer?.toLowerCase().trim();
    }

    const correctIds = new Set(question.choices.filter((c) => c.isCorrect).map((c) => c.id));
    const submittedIds = new Set(answer.choiceIds ?? []);

    if (correctIds.size !== submittedIds.size) return false;
    for (const id of correctIds) {
      if (!submittedIds.has(id)) return false;
    }
    return true;
  }

  private endCurrentQuestion(room: GameRoom) {
    const question = room.questions[room.currentQuestionIndex]!;
    const scores = this.buildScores(room);

    const result: Record<string, unknown> = { type: "question_result", scores };

    if (question.type === QuestionType.TEXT) {
      result.correctAnswer = question.answer;
    } else {
      result.correctChoiceIds = question.choices.filter((c) => c.isCorrect).map((c) => c.id);
    }

    this.broadcastToRoom(room, result);

    room.answers.clear();

    if (room.currentQuestionIndex < room.questions.length - 1) {
      this.sendNextQuestion(room);
    } else {
      room.status = "finished";
      this.broadcastToRoom(room, { type: "game_finished", scores });
      for (const playerSocket of room.players.keys()) {
        this.socketToRoom.delete(playerSocket);
      }
      this.socketToRoom.delete(room.hostSocket);
      this.rooms.delete(room.code);
    }
  }

  private sendNextQuestion(room: GameRoom) {
    room.currentQuestionIndex++;
    const question = room.questions[room.currentQuestionIndex]!;
    const serialized = serializeQuestion(question, false);

    this.broadcastToRoom(room, {
      type: "question",
      question: serialized,
      questionNumber: room.currentQuestionIndex + 1,
      totalQuestions: room.questions.length,
    });
  }

  private buildScores(room: GameRoom) {
    return Array.from(room.players.values())
      .map((p) => ({ userId: p.user.id, firstName: p.user.firstName, score: p.score }))
      .sort((a, b) => b.score - a.score);
  }

  private broadcastToRoom(room: GameRoom, data: Record<string, unknown>) {
    const message = JSON.stringify(data);
    this.sendRaw(room.hostSocket, message);
    for (const socket of room.players.keys()) {
      this.sendRaw(socket, message);
    }
  }

  private sendTo(socket: WebSocket, data: Record<string, unknown>) {
    this.sendRaw(socket, JSON.stringify(data));
  }

  private sendRaw(socket: WebSocket, message: string) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
}

function toPublicPlayer(user: User) {
  return { id: user.id, firstName: user.firstName, lastName: user.lastName };
}
