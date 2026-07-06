import "reflect-metadata";
import express from "express";
import cookieParser from "cookie-parser";
import { AppDataSource } from "./datasource";
import { usersRouter } from "./routes/users";
import { quizzesRouter } from "./routes/quizzes";

const app = express();
const port = 3000;

app.use(express.json());
app.use(cookieParser());

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
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("DB init error", err);
    process.exit(1);
  });
