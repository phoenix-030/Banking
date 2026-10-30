import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { pool } from './db';

declare module 'express-session' { interface SessionData { userId?: string; role?: 'student'|'admin' } }
export async function requireAuth(req:Request,res:Response,next:NextFunction){if(!req.session.userId)return res.status(401).json({error:'Authentication required.'});try{const user=await pool.query('SELECT role,is_active FROM users WHERE id=$1',[req.session.userId]);if(!user.rowCount||!user.rows[0].is_active){req.session.destroy(()=>{});return res.status(401).json({error:'Account unavailable.'});}req.session.role=user.rows[0].role;next();}catch(error){next(error);}}
export async function requireAdmin(req:Request,res:Response,next:NextFunction){if(!req.session.userId)return res.status(401).json({error:'Authentication required.'});try{const user=await pool.query('SELECT role,is_active FROM users WHERE id=$1',[req.session.userId]);if(!user.rowCount||!user.rows[0].is_active){req.session.destroy(()=>{});return res.status(401).json({error:'Account unavailable.'});}req.session.role=user.rows[0].role;if(user.rows[0].role!=='admin')return res.status(403).json({error:'Administrator access required.'});next();}catch(error){next(error);}}
export function validate<T>(schema:ZodType<T>,body:unknown):T{const parsed=schema.safeParse(body);if(!parsed.success)throw Object.assign(new Error(parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')),{status:400});return parsed.data;}
