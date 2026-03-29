import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

type SiteRow = {
  id: string;
  name: string;
  code: string;
  created_at: string;
};

const createSiteSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(12),
});

export const siteRoutes = Router();

siteRoutes.get('/sites', authenticate, async (_req, res, next) => {
  try {
    const result = await query<SiteRow>(
      'SELECT id, name, code, created_at FROM sites ORDER BY name ASC',
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

siteRoutes.post('/sites', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const parsed = createSiteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    const { name, code } = parsed.data;
    const result = await query<SiteRow>(
      `INSERT INTO sites (name, code)
       VALUES ($1, $2)
       RETURNING id, name, code, created_at`,
      [name, code.toUpperCase()],
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});
