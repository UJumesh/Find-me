import { Router, Request, Response } from 'express';
import { db } from '../db/database';

export const categoryRoutes = Router();

// Get all service categories with active provider counts
categoryRoutes.get('/', (req: Request, res: Response) => {
  try {
    const categories = db.prepare(`
      SELECT 
        c.*,
        COUNT(DISTINCT pc.provider_id) AS total_providers,
        SUM(CASE WHEN p.is_available = 1 AND p.verification_status = 'VERIFIED' THEN 1 ELSE 0 END) AS available_providers
      FROM categories c
      LEFT JOIN provider_categories pc ON pc.category_id = c.id
      LEFT JOIN provider_profiles p ON p.id = pc.provider_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();

    res.json({ categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single category with services & top providers
categoryRoutes.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = db.prepare('SELECT * FROM categories WHERE id = ? OR slug = ?').get(id, id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const providers = db.prepare(`
      SELECT 
        p.*,
        u.name,
        u.email,
        u.phone,
        u.avatar_url,
        COALESCE(pc.custom_price, p.hourly_rate) AS service_price
      FROM provider_profiles p
      JOIN users u ON u.id = p.user_id
      JOIN provider_categories pc ON pc.provider_id = p.id
      WHERE pc.category_id = ? AND p.verification_status = 'VERIFIED'
      ORDER BY p.rating DESC, p.review_count DESC
    `).all((category as any).id);

    res.json({ category, providers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
