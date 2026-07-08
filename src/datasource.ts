import "reflect-metadata";
import { DataSource } from "typeorm";
import { Media } from "./entities/media";
import { Quiz } from "./entities/quiz";
import { User } from "./entities/user";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "nodejsesgi",
  synchronize: true,
  logging: true,
  entities: [User, Quiz, Media],
});
