import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, validate } from "../middleware";
import { emailSchema, loginSchema, registerSchema } from "../schemas";

export const authRouter = Router();
const limiterOptions = {
  standardHeaders: "draft-8" as const,
  legacyHeaders: false,
};
const registerLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  ...limiterOptions,
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  ...limiterOptions,
});
const forgotLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  ...limiterOptions,
});
const resetLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  ...limiterOptions,
});

const failedLoginMap = new Map<string, { attempts: number; lockedUntil?: number }>();

function getLockoutStatus(email: string): { locked: boolean; waitMinutes?: number } {
  const key = email.toLowerCase();
  const record = failedLoginMap.get(key);
  if (!record || !record.lockedUntil) return { locked: false };
  const now = Date.now();
  if (now > record.lockedUntil) {
    failedLoginMap.delete(key);
    return { locked: false };
  }
  const waitMinutes = Math.ceil((record.lockedUntil - now) / 60000);
  return { locked: true, waitMinutes };
}

function handleFailedLogin(email: string) {
  const key = email.toLowerCase();
  const now = Date.now();
  const record = failedLoginMap.get(key) ?? { attempts: 0 };
  record.attempts += 1;
  if (record.attempts >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000;
  }
  failedLoginMap.set(key, record);
}

function handleSuccessfulLogin(email: string) {
  failedLoginMap.delete(email.toLowerCase());
}

const userFields = "id,email,full_name,mobile,role,created_at";
const publicUser = (u: any) => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name,
  mobile: u.mobile,
  role: u.role,
  createdAt: u.created_at,
});
const regen = (req: any) =>
  new Promise<void>((resolve, reject) =>
    req.session.regenerate((err: Error) => (err ? reject(err) : resolve())),
  );
const save = (req: any) =>
  new Promise<void>((resolve, reject) =>
    req.session.save((err: Error) => (err ? reject(err) : resolve())),
  );

authRouter.post("/register", registerLimiter, async (req, res) => {
  const input = validate(registerSchema, req.body);
  const hash = await bcrypt.hash(input.password, 12);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO users(email,full_name,mobile,password_hash,role) VALUES($1,$2,$3,$4,'student') RETURNING ${userFields}`,
      [input.email, input.fullName, input.mobile, hash],
    );
    await client.query("INSERT INTO user_profiles(user_id) VALUES($1)", [
      inserted.rows[0].id,
    ]);
    await client.query("COMMIT");
    await regen(req);
    req.session.userId = inserted.rows[0].id;
    req.session.role = "student";
    await save(req);
    res.status(201).json({ user: publicUser(inserted.rows[0]) });
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error.code === "23505")
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    throw error;
  } finally {
    client.release();
  }
});
authRouter.post("/login", loginLimiter, async (req, res) => {
  const input = validate(loginSchema, req.body);
  const lockout = getLockoutStatus(input.email);
  if (lockout.locked) {
    return res.status(429).json({
      error: `Account temporarily locked due to multiple failed sign-in attempts. Please try again in ${lockout.waitMinutes} minutes.`,
    });
  }
  const result = await pool.query(
    `SELECT ${userFields},password_hash,is_active FROM users WHERE email=$1`,
    [input.email],
  );
  const u = result.rows[0];
  if (
    !u ||
    !u.is_active ||
    !(await bcrypt.compare(input.password, u.password_hash))
  ) {
    handleFailedLogin(input.email);
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  handleSuccessfulLogin(input.email);
  await regen(req);
  req.session.userId = u.id;
  req.session.role = u.role;
  await save(req);
  res.json({ user: publicUser(u) });
});
authRouter.get("/me", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT ${userFields} FROM users WHERE id=$1 AND is_active=true`,
    [req.session.userId],
  );
  if (!result.rowCount)
    return res.status(401).json({ error: "Account unavailable." });
  const profile = await pool.query(
    "SELECT target_exam_id,preparation_status,profile_picture_url FROM user_profiles WHERE user_id=$1",
    [req.session.userId],
  );
  res.json({
    user: publicUser(result.rows[0]),
    profile: profile.rows[0] ?? null,
  });
});
authRouter.post("/logout", requireAuth, async (req, res) => {
  await new Promise<void>((resolve, reject) =>
    req.session.destroy((err) => (err ? reject(err) : resolve())),
  );
  res.clearCookie("hhk.sid", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(204).end();
});
authRouter.post("/forgot-password", forgotLimiter, async (req, res) => {
  const { email } = validate(z.object({ email: emailSchema }), req.body);
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM)
    return res
      .status(503)
      .json({
        error:
          "Password reset email is not configured. Contact an administrator.",
      });
  const response = {
    message:
      "If an account exists for that email, password reset instructions will be sent.",
  };
  const user = await pool.query(
    "SELECT id,email,full_name FROM users WHERE email=$1 AND is_active=true",
    [email],
  );
  if (!user.rowCount) return res.json(response);
  const token = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  await pool.query(
    "UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL",
    [user.rows[0].id],
  );
  await pool.query(
    "INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 minutes')",
    [user.rows[0].id, hash],
  );
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  const base = (process.env.APP_URL ?? "http://localhost:5173").replace(
    /\/$/,
    "",
  );
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: user.rows[0].email,
    subject: "Reset your HHK password",
    text: `Hello ${user.rows[0].full_name},\n\nUse this link within 30 minutes to reset your password:\n${base}/?reset=${encodeURIComponent(token)}\n\nIf you did not request this, you can ignore this email.`,
  });
  res.json(response);
});
authRouter.post("/reset-password", resetLimiter, async (req, res) => {
  const input = validate(
    z
      .object({
        token: z.string().min(20).max(200),
        password: z
          .string()
          .min(6)
          .max(128)
          .refine((value) => new TextEncoder().encode(value).length <= 72, {
            message: "Password must be at most 72 UTF-8 bytes.",
          }),
        passwordConfirmation: z.string().min(6).max(128),
      })
      .refine((v) => v.password === v.passwordConfirmation, {
        path: ["passwordConfirmation"],
        message: "Passwords do not match.",
      }),
    req.body,
  );
  const tokenHash = crypto
    .createHash("sha256")
    .update(input.token)
    .digest("hex");
  const passwordHash = await bcrypt.hash(input.password, 12);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const token = await client.query(
      "SELECT id,user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
      [tokenHash],
    );
    if (!token.rowCount) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({
          error: "Reset link is invalid or expired. Request a new one.",
        });
    }
    await client.query(
      "UPDATE users SET password_hash=$2,updated_at=now() WHERE id=$1",
      [token.rows[0].user_id, passwordHash],
    );
    await client.query(
      "UPDATE password_reset_tokens SET used_at=now() WHERE id=$1",
      [token.rows[0].id],
    );
    await client.query("COMMIT");
    try {
      await pool.query("DELETE FROM user_sessions WHERE sess->>'userId'=$1", [
        token.rows[0].user_id,
      ]);
    } catch (error) {
      console.error(
        "Could not invalidate existing sessions after password reset.",
      );
    }
    res.json({
      message: "Password reset. You can sign in with your new password.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});
authRouter.patch("/profile", requireAuth, async (req, res) => {
  const input = validate(
    z.object({
      fullName: z.string().trim().min(2).max(100),
      mobile: z
        .string()
        .trim()
        .regex(/^\+?[0-9][0-9\s()-]{7,18}$/),
      targetExamId: z.string().uuid().nullable().optional(),
      preparationStatus: z
        .enum(["starting", "preparing", "revision"])
        .optional(),
    }),
    req.body,
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (Object.hasOwn(input, "targetExamId") && input.targetExamId) {
      const target = await client.query(
        "SELECT id FROM exams WHERE id=$1 AND status='published' FOR SHARE",
        [input.targetExamId],
      );
      if (!target.rowCount) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({
            error: "Choose a currently published examination as your target.",
          });
      }
    }
    await client.query(
      "UPDATE users SET full_name=$2,mobile=$3,updated_at=now() WHERE id=$1",
      [req.session.userId, input.fullName, input.mobile],
    );
    await client.query(
      "UPDATE user_profiles SET target_exam_id=CASE WHEN $2 THEN $3::uuid ELSE target_exam_id END,preparation_status=COALESCE($4,preparation_status),updated_at=now() WHERE user_id=$1",
      [
        req.session.userId,
        Object.hasOwn(input, "targetExamId"),
        input.targetExamId ?? null,
        input.preparationStatus ?? null,
      ],
    );
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});
export const forgotPasswordSchema = z.object({ email: emailSchema });
