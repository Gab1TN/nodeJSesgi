import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum MediaType {
  AVATAR = "avatar",
  QUIZ = "quiz",
}

@Entity("media")
export class Media extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  originalName: string;

  @Column()
  fileName: string;

  @Column()
  mimeType: string;

  @Column()
  path: string;

  @Column()
  url: string;

  @Column({ type: "text" })
  type: MediaType;

  @Column()
  width: number;

  @Column()
  height: number;

  @Column()
  size: number;

  @CreateDateColumn()
  createdAt: Date;
}
