import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';

export const providerRoutes = Router();

// List providers with filtering
providerRoutes.get('/', (req: Request, res: Response) => {
  try {
    const { categoryId, availableOnly, verifiedOnly = 'true' } = req.query;

    let query = `
      SELECT 
        p.*,
        u.name,
        u.email,
        u.phone,
        u.avatar_url
      FROM provider_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (verifiedOnly === 'true') {
      query += ` AND p.verification_status = 'VERIFIED'`;
    }
    if (availableOnly === 'true') {
      query += ` AND p.is_available = 1`;
    }

    const providers = db.prepare(query).all(...params);
    res.json({ providers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get provider profile & statistics
providerRoutes.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const provider = db.prepare(`
      SELECT 
        p.*,
        u.name,
        u.email,
        u.phone,
        u.avatar_url
      FROM provider_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = ? OR p.user_id = ?
    `).get(id, id) as any;

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const categories = db.prepare(`
      SELECT c.*, pc.custom_price
      FROM categories c
      JOIN provider_categories pc ON pc.category_id = c.id
      WHERE pc.provider_id = ?
    `).all(provider.id);

    const reviews = db.prepare(`
      SELECT r.*, u.name AS customer_name, u.avatar_url AS customer_avatar
      FROM reviews r
      JOIN users u ON u.id = r.customer_id
      WHERE r.provider_id = ?
      ORDER BY r.created_at DESC
    `).all(provider.id);

    res.json({ provider, categories, reviews });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle availability (Online/Offline)
providerRoutes.patch('/:id/availability', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const val = isAvailable ? 1 : 0;
    db.prepare('UPDATE provider_profiles SET is_available = ? WHERE id = ? OR user_id = ?').run(val, id, id);

    const updated = db.prepare('SELECT id, user_id, is_available FROM provider_profiles WHERE id = ? OR user_id = ?').get(id, id);
    res.json({ message: `Provider is now ${val ? 'ONLINE' : 'OFFLINE'}`, provider: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get earnings summary and ledger
providerRoutes.get('/:id/earnings', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const provider = db.prepare('SELECT id FROM provider_profiles WHERE id = ? OR user_id = ?').get(id, id) as any;
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const stats = db.prepare(`
      SELECT 
        COUNT(b.id) AS total_jobs,
        SUM(CASE WHEN b.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_jobs,
        SUM(CASE WHEN b.status = 'COMPLETED' THEN COALESCE(pay.provider_earnings, b.final_price * 0.85, 0) ELSE 0 END) AS total_earnings,
        SUM(CASE WHEN b.status = 'COMPLETED' THEN COALESCE(pay.platform_commission, b.final_price * 0.15, 0) ELSE 0 END) AS total_commission
      FROM bookings b
      LEFT JOIN payments pay ON pay.booking_id = b.id
      WHERE b.provider_id = ?
    `).get(provider.id) as any;

    const recentPayouts = db.prepare(`
      SELECT 
        pay.*,
        b.description,
        b.created_at AS booking_date
      FROM payments pay
      JOIN bookings b ON b.id = pay.booking_id
      WHERE b.provider_id = ?
      ORDER BY pay.created_at DESC
      LIMIT 10
    `).all(provider.id);

    res.json({
      summary: {
        totalJobs: stats.total_jobs || 0,
        completedJobs: stats.completed_jobs || 0,
        totalEarnings: Math.round(stats.total_earnings || 0),
        totalCommission: Math.round(stats.total_commission || 0),
        pendingPayout: Math.round((stats.total_earnings || 0) * 0.7) // Simulated pending balance
      },
      recentPayouts
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
