import { WebSocket, WebSocketServer } from "ws";
import type { Server } from "http";

export class WebSocketManager {
  private readonly wss: WebSocketServer;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.handleConnections();
  }

  private handleConnections() {
    this.wss.on("connection", (socket) => {
      console.log("Client WS connected");

      socket.on("message", (message) => {
        this.broadcast(message.toString(), socket);
      });

      socket.on("close", () => {
        console.log("Client WS disconnected");
      });
    });
  }

  private broadcast(message: string, sender: WebSocket) {
    this.wss.clients.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}
