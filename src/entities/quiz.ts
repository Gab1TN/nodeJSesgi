import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Length, ValidateNested } from "class-validator";
import { Media } from "./media";
import { Question } from "./question";
import { User } from "./user";

@Entity("quizzes")
export class Quiz extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Length(3, 120, { message: "Le titre doit contenir entre 3 et 120 caractères" })
  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  author: User;

  @ManyToOne(() => Media, { nullable: true, eager: true })
  image?: Media;

  @ValidateNested({ each: true })
  @OneToMany(() => Question, (question) => question.quiz, { cascade: true, eager: true })
  questions: Question[];

  @CreateDateColumn()
  createdAt: Date;
}
