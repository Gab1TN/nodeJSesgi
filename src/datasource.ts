import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/user";
import { Quiz } from "./entities/quiz";

export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: "db.sqlite",
  synchronize: true,
  logging: true,
  entities: [User, Quiz],
});
