import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { IsEmail, IsEnum, Length } from "class-validator";

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

@Entity("users")
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsEmail({}, { message: "L'adresse email n'est pas valide" })
  email: string;

  @Column()
  @Length(6, 100, { message: "Le mot de passe doit contenir entre 6 et 100 caractères" })
  password: string;

  @Column({ nullable: true })
  @Length(1, 50, { message: "Le prénom doit contenir entre 1 et 50 caractères" })
  firstName?: string;

  @Column({ nullable: true })
  @Length(1, 50, { message: "Le nom doit contenir entre 1 et 50 caractères" })
  lastName?: string;

  @Column({ type: "text", default: UserRole.USER })
  @IsEnum(UserRole, { message: "Le rôle doit être user ou admin" })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  verificationToken?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
