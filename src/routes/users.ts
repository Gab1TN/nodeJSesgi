import express from "express";
import { User } from "../entities/user";

export async function createUser(req: express.Request, res: express.Response) {
    const newUser = new User();
    Object.assign(newUser, req.body);
    
    res.status(201).json(newUser);
}