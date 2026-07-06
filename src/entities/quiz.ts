import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Length } from "class-validator";
import { User } from "./user";

@Entity("quizzes")
export class Quiz extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Length(3, 120)
  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  author: User;

  @CreateDateColumn()
  createdAt: Date;
}
