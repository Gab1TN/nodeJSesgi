import "reflect-metadata";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { AppDataSource } from "./datasource";
import { usersRouter } from "./routes/users";
import { quizzesRouter } from "./routes/quizzes";
import { WebSocketManager } from "./websocket-manager";

const app = express();
const server = createServer(app);
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(cookieParser());
app.use("/assets", express.static(path.join(process.cwd(), "assets")));

app.get("/", (_req, res) => {
  res.send("Hello, World!");
});

app.use("/api/users", usersRouter);
app.use("/api/quizzes", quizzesRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Not Found" });
});

AppDataSource.initialize()
  .then(() => {
    new WebSocketManager(server);

    server.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("DB init error", err);
    process.exit(1);
  });
