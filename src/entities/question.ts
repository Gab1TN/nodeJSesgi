import { BaseEntity, Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { IsEnum, Length, ValidateNested } from "class-validator";
import { Choice } from "./choice";
import { Quiz } from "./quiz";

export enum QuestionType {
  SINGLE = "single",
  MULTIPLE = "multiple",
  TEXT = "text",
}

@Entity("questions")
export class Question extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Length(3, 255, { message: "La question doit contenir entre 3 et 255 caractères" })
  @Column()
  label: string;

  @IsEnum(QuestionType, { message: "Le type doit être single, multiple ou text" })
  @Column()
  type: QuestionType;

  @Column({ default: 0 })
  position: number;

  @Column({ nullable: true })
  answer?: string;

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: "CASCADE" })
  quiz: Quiz;

  @ValidateNested({ each: true })
  @OneToMany(() => Choice, (choice) => choice.question, { cascade: true, eager: true })
  choices: Choice[];
}
