import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { getIO } from '../sockets/socketHandler';

export const adminRoutes = Router();

// Platform KPI Metrics & Real-Time Marketplace Health
adminRoutes.get('/metrics', (req: Request, res: Response) => {
  try {
    const bookingStats = db.prepare(`
      SELECT 
        COUNT(id) AS total_bookings,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_bookings,
        SUM(CASE WHEN status IN ('REQUESTED', 'MATCHING', 'OFFERED', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS') THEN 1 ELSE 0 END) AS active_bookings,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_bookings,
        SUM(CASE WHEN status = 'DISPUTED' THEN 1 ELSE 0 END) AS disputed_bookings,
        SUM(CASE WHEN status = 'COMPLETED' THEN COALESCE(final_price, estimated_price, 0) ELSE 0 END) AS total_gmv
      FROM bookings
    `).get() as any;

    const providerStats = db.prepare(`
      SELECT 
        COUNT(id) AS total_providers,
        SUM(CASE WHEN verification_status = 'VERIFIED' THEN 1 ELSE 0 END) AS verified_providers,
        SUM(CASE WHEN verification_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_verifications,
        SUM(CASE WHEN is_available = 1 AND verification_status = 'VERIFIED' THEN 1 ELSE 0 END) AS online_providers
      FROM provider_profiles
    `).get() as any;

    const userStats = db.prepare(`
      SELECT 
        COUNT(id) AS total_users,
        SUM(CASE WHEN role = 'CUSTOMER' THEN 1 ELSE 0 END) AS total_customers
      FROM users
    `).get() as any;

    const totalBookings = bookingStats.total_bookings || 0;
    const completedBookings = bookingStats.completed_bookings || 0;
    const liquidityRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 92;
    const totalGmv = Math.round(bookingStats.total_gmv || 0);
    const platformRevenue = Math.round(totalGmv * 0.15); // 15% commission

    res.json({
      metrics: {
        totalGmv,
        platformRevenue,
        totalBookings,
        activeBookings: bookingStats.active_bookings || 0,
        completedBookings,
        cancelledBookings: bookingStats.cancelled_bookings || 0,
        disputedBookings: bookingStats.disputed_bookings || 0,
        liquidityRate,
        avgMatchTimeSeconds: 2.1,
        totalCustomers: userStats.total_customers || 0,
        totalProviders: providerStats.total_providers || 0,
        verifiedProviders: providerStats.verified_providers || 0,
        pendingVerifications: providerStats.pending_verifications || 0,
        onlineProviders: providerStats.online_providers || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Provider verification queue
adminRoutes.get('/verifications', (req: Request, res: Response) => {
  try {
    const queue = db.prepare(`
      SELECT 
        p.*,
        u.name,
        u.email,
        u.phone,
        u.avatar_url,
        u.created_at AS user_registered_at
      FROM provider_profiles p
      JOIN users u ON u.id = p.user_id
      ORDER BY 
        CASE WHEN p.verification_status = 'PENDING' THEN 0 ELSE 1 END,
        p.created_at DESC
    `).all();

    res.json({ queue });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve or Reject Provider Verification
adminRoutes.post('/verifications/:id/decision', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, reason } = req.body; // 'VERIFIED' or 'REJECTED'

    if (!['VERIFIED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be VERIFIED or REJECTED' });
    }

    db.prepare(`
      UPDATE provider_profiles 
      SET verification_status = ?, is_available = CASE WHEN ? = 'VERIFIED' THEN 1 ELSE 0 END
      WHERE id = ? OR user_id = ?
    `).run(decision, decision, id, id);

    const updated = db.prepare('SELECT * FROM provider_profiles WHERE id = ? OR user_id = ?').get(id, id);

    try {
      const io = getIO();
      if (io) {
        io.emit('provider_verification_updated', { providerId: id, status: decision });
      }
    } catch (e) {}

    res.json({ message: `Provider verification status set to ${decision}`, provider: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List Disputes
adminRoutes.get('/disputes', (req: Request, res: Response) => {
  try {
    const disputes = db.prepare(`
      SELECT 
        d.*,
        b.description AS booking_description,
        b.final_price,
        b.estimated_price,
        cu.name AS customer_name,
        cu.email AS customer_email,
        pu.name AS provider_name,
        pu.email AS provider_email
      FROM disputes d
      JOIN bookings b ON b.id = d.booking_id
      JOIN users cu ON cu.id = b.customer_id
      LEFT JOIN provider_profiles p ON p.id = b.provider_id
      LEFT JOIN users pu ON pu.id = p.user_id
      ORDER BY d.created_at DESC
    `).all();

    res.json({ disputes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve Dispute
adminRoutes.post('/disputes/:id/resolve', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, resolutionNotes } = req.body; // action: 'REFUND_CUSTOMER' | 'RELEASE_PAYOUT' | 'REJECT'

    const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(id) as any;
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const newDisputeStatus = action === 'REJECT' ? 'REJECTED' : 'RESOLVED';
    const paymentStatus = action === 'REFUND_CUSTOMER' ? 'REFUNDED' : 'RELEASED';

    db.prepare(`
      UPDATE disputes 
      SET status = ?, resolution_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newDisputeStatus, resolutionNotes || 'Resolved by Platform Operator', id);

    db.prepare(`
      UPDATE payments
      SET status = ?
      WHERE booking_id = ?
    `).run(paymentStatus, dispute.booking_id);

    res.json({ message: 'Dispute resolved successfully', disputeId: id, action, paymentStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Users & Providers
adminRoutes.get('/users', (req: Request, res: Response) => {
  try {
    const users = db.prepare(`
      SELECT 
        u.*,
        p.id AS provider_id,
        p.verification_status,
        p.rating,
        p.review_count
      FROM users u
      LEFT JOIN provider_profiles p ON p.user_id = u.id
      ORDER BY u.created_at DESC
    `).all();

    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
