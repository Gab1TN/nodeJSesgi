import "reflect-metadata";
import { DataSource } from "typeorm";
import { Media } from "./entities/media";
import { Quiz } from "./entities/quiz";
import { User } from "./entities/user";

export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: "db.sqlite",
  synchronize: true,
  logging: true,
  entities: [User, Quiz, Media],
});
