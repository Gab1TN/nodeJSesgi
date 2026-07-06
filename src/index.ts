import express from "express";
import { usersRouter } from "./routes/users";

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use("/api/users", usersRouter);

app.use ((req, res) => {
  res.status(404).json({ message: "Not Found" });
});




app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
