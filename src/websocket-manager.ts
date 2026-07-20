import { RawData, WebSocket, WebSocketServer } from "ws";
import { validate } from "class-validator";
import type { IncomingMessage, Server } from "http";
import type { Duplex } from "stream";
import { User } from "./entities/user";
import { verifyJWT } from "./lib/jwt";
import {
  ErrorWebSocketMessage,
  IncomingWebSocketMessage,
  OutgoingWebSocketMessage,
} from "./websocket-message.dto";

export class WebSocketManager {
  private readonly wss: WebSocketServer;
  private readonly users = new WeakMap<WebSocket, User>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ noServer: true });
    this.handleUpgrade(server);
    this.handleConnections();
  }

  private handleUpgrade(server: Server) {
    server.on("upgrade", async (req, socket, head) => {
      const user = await this.authenticate(req);

      if (!user) {
        this.rejectUnauthorized(socket);
        return;
      }

      this.wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        this.users.set(ws, user);
        this.wss.emit("connection", ws, req);
      });
    });
  }

  private handleConnections() {
    this.wss.on("connection", (socket: WebSocket) => {
      const user = this.users.get(socket);
      console.log(`Client WS connected: ${user?.email}`);

      socket.on("message", async (message: RawData) => {
        await this.handleMessage(message, socket, user);
      });

      socket.on("close", () => {
        console.log("Client WS disconnected");
      });
    });
  }

  private async handleMessage(message: RawData, socket: WebSocket, user?: User) {
    if (!user) {
      await this.sendError(socket, ["Utilisateur non authentifié"]);
      return;
    }

    const input = await this.parseAndValidateInput(message);
    if (!input.valid) {
      await this.sendError(socket, input.errors);
      return;
    }

    const output = new OutgoingWebSocketMessage();
    output.type = "message";
    output.content = input.message.content;
    output.senderEmail = user.email;
    output.sentAt = new Date().toISOString();

    const outputErrors = await this.validateMessage(output);
    if (outputErrors.length) {
      await this.sendError(socket, outputErrors);
      return;
    }

    this.broadcast(JSON.stringify(output), socket);
  }

  private async parseAndValidateInput(message: RawData) {
    let body: unknown;

    try {
      body = JSON.parse(message.toString());
    } catch {
      return {
        valid: false as const,
        errors: ["Le message doit être un JSON valide"],
      };
    }

    const input = new IncomingWebSocketMessage();
    input.type = typeof body === "object" && body !== null ? (body as IncomingWebSocketMessage).type : undefined!;
    input.content =
      typeof body === "object" && body !== null ? (body as IncomingWebSocketMessage).content : undefined!;

    const errors = await this.validateMessage(input);
    if (errors.length) {
      return {
        valid: false as const,
        errors,
      };
    }

    return {
      valid: true as const,
      message: input,
    };
  }

  private async validateMessage(message: object) {
    const errors = await validate(message);
    return errors.flatMap((error) => (error.constraints ? Object.values(error.constraints) : []));
  }

  private async sendError(socket: WebSocket, errors: string[]) {
    const errorMessage = new ErrorWebSocketMessage();
    errorMessage.type = "error";
    errorMessage.message = "Message WebSocket invalide";
    errorMessage.errors = errors;

    const outputErrors = await this.validateMessage(errorMessage);
    if (outputErrors.length || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(errorMessage));
  }

  private async authenticate(req: IncomingMessage) {
    const token = this.getToken(req);
    if (!token) {
      return null;
    }

    try {
      const payload = verifyJWT<{ id: number }>(token);
      return await User.findOneBy({ id: payload.id });
    } catch {
      return null;
    }
  }

  private getToken(req: IncomingMessage) {
    const authorization = req.headers.authorization;
    const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
    const cookieToken = req.headers.cookie
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("token="))
      ?.slice("token=".length);

    return cookieToken || bearerToken;
  }

  private rejectUnauthorized(socket: Duplex) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
  }

  private broadcast(message: string, sender: WebSocket) {
    this.wss.clients.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}
