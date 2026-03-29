import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authenticate } from '../middleware/authenticate.js';
import { comparePassword, signToken } from '../services/auth.js';
import { UserRole } from '../types/auth.js';

type UserRecord = {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: UserRole;
  site_id: string | null;
};

type MeRecord = Omit<UserRecord, 'password_hash'>;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authRoutes = Router();

authRoutes.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    const { email, password } = parsed.data;
    const result = await query<UserRecord>(
      `SELECT id, email, full_name, password_hash, role, site_id
       FROM users
       WHERE email = $1 AND is_active = TRUE
       LIMIT 1`,
      [email.toLowerCase()],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken({
      sub: user.id,
      role: user.role,
      siteId: user.site_id,
      email: user.email,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        siteId: user.site_id,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRoutes.get('/users/me', authenticate, async (req, res, next) => {
  try {
    const result = await query<MeRecord>(
      `SELECT id, email, full_name, role, site_id
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.user!.id],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      siteId: user.site_id,
    });
  } catch (err) {
    next(err);
  }
});
