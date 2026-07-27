import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Length } from "class-validator";
import { Question } from "./question";

@Entity("choices")
export class Choice extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Length(1, 255, { message: "Le choix doit contenir entre 1 et 255 caractères" })
  @Column()
  label: string;

  @Column({ default: false })
  isCorrect: boolean;

  @Column({ default: 0 })
  position: number;

  @ManyToOne(() => Question, (question) => question.choices, { onDelete: "CASCADE" })
  question: Question;
}
