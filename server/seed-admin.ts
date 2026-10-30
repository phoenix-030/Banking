import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db';
const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password=process.env.ADMIN_PASSWORD;
const name=process.env.ADMIN_FULL_NAME?.trim()??'HHK Administrator';
const mobile=process.env.ADMIN_MOBILE?.trim()??'+910000000000';
if(!email||!password||password.length<12||Buffer.byteLength(password,'utf8')>72)throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters and at most 72 UTF-8 bytes) in .env first.');
const hash=await bcrypt.hash(password,12);
const client=await pool.connect();
try{await client.query('BEGIN');const found=await client.query('SELECT id,role FROM users WHERE email=$1 FOR UPDATE',[email]);if(found.rowCount){if(found.rows[0].role!=='admin')throw new Error('This email belongs to a non-admin account; refusing to change its role.');console.log('Admin account already exists; no changes made.');await client.query('COMMIT');}else{const user=(await client.query("INSERT INTO users(email,full_name,mobile,password_hash,role) VALUES($1,$2,$3,$4,'admin') RETURNING id",[email,name,mobile,hash])).rows[0];await client.query('INSERT INTO user_profiles(user_id) VALUES($1)',[user.id]);await client.query("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id) VALUES($1,'admin.seed','user',$1)",[user.id]);await client.query('COMMIT');console.log('First administrator created. Remove ADMIN_PASSWORD from .env after confirming access.');}}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
