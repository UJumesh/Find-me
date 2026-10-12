import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { matchAndRankProviders } from '../ai/matchingEngine';
import { getIO } from '../sockets/socketHandler';

export const bookingRoutes = Router();

// Create new booking request
bookingRoutes.post('/', (req: Request, res: Response) => {
  try {
    const {
      customerId,
      providerId,
      categoryId,
      description,
      rawPrompt,
      urgency = 'MEDIUM',
      address,
      latitude = 12.9716,
      longitude = 77.5946,
      scheduledAt,
      estimatedPrice
    } = req.body;

    if (!customerId || !categoryId || !description) {
      return res.status(400).json({ error: 'customerId, categoryId, and description are required' });
    }

    const bookingId = 'bk-' + uuidv4().slice(0, 8);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId) as any;
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    let assignedProviderId = providerId || null;
    let finalEstPrice = estimatedPrice || category.base_price;

    // If no provider selected, auto-match top ranked provider
    if (!assignedProviderId) {
      const matches = matchAndRankProviders(categoryId, latitude, longitude, urgency);
      if (matches.length > 0) {
        assignedProviderId = matches[0].providerId;
        finalEstPrice = matches[0].servicePrice;
      }
    }

    // SLA timer: 90 seconds for urgent, 300 seconds for medium/low
    const slaSeconds = urgency === 'URGENT' ? 90 : 300;
    const slaExpiresAt = new Date(Date.now() + slaSeconds * 1000).toISOString();
    const status = assignedProviderId ? 'OFFERED' : 'MATCHING';

    db.prepare(`
      INSERT INTO bookings (
        id, customer_id, provider_id, category_id, description, raw_prompt,
        urgency, status, address, latitude, longitude, scheduled_at,
        estimated_price, sla_expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      bookingId,
      customerId,
      assignedProviderId,
      categoryId,
      description,
      rawPrompt || null,
      urgency,
      status,
      address || 'Current Location, Bengaluru',
      latitude,
      longitude,
      scheduledAt || null,
      finalEstPrice,
      slaExpiresAt
    );

    const booking = db.prepare(`
      SELECT 
        b.*,
        c.name AS category_name,
        c.icon AS category_icon,
        u.name AS customer_name,
        u.phone AS customer_phone,
        u.email AS customer_email,
        pu.name AS provider_name,
        pu.phone AS provider_phone,
        pu.avatar_url AS provider_avatar,
        p.rating AS provider_rating,
        p.latitude AS provider_latitude,
        p.longitude AS provider_longitude
      FROM bookings b
      JOIN categories c ON c.id = b.category_id
      JOIN users u ON u.id = b.customer_id
      LEFT JOIN provider_profiles p ON p.id = b.provider_id
      LEFT JOIN users pu ON pu.id = p.user_id
      WHERE b.id = ?
    `).get(bookingId);

    // Notify provider via WebSockets
    try {
      const io = getIO();
      if (io && assignedProviderId) {
        io.to(`provider_${assignedProviderId}`).emit('new_lead', {
          booking,
          slaSeconds
        });
        io.emit('booking_created', booking);
      }
    } catch (e) {
      console.warn('Socket broadcast failed (non-fatal):', e);
    }

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
      slaSeconds
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Match providers for given criteria
bookingRoutes.post('/match', (req: Request, res: Response) => {
  try {
    const { categoryId, latitude = 12.9716, longitude = 77.5946, urgency = 'MEDIUM' } = req.body;

    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId is required' });
    }

    const matches = matchAndRankProviders(categoryId, latitude, longitude, urgency);
    res.json({ matches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Provider accepts booking offer
bookingRoutes.post('/:id/accept', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { providerId } = req.body;

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any;
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'OFFERED' && booking.status !== 'REQUESTED') {
      return res.status(400).json({ error: `Cannot accept booking in ${booking.status} status` });
    }

    db.prepare(`
      UPDATE bookings 
      SET status = 'ACCEPTED', provider_id = COALESCE(?, provider_id), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(providerId || booking.provider_id, id);

    const updated = db.prepare(`
      SELECT 
        b.*,
        c.name AS category_name,
        c.icon AS category_icon,
        u.name AS customer_name,
        u.phone AS customer_phone,
        pu.name AS provider_name,
        pu.phone AS provider_phone,
        pu.avatar_url AS provider_avatar,
        p.rating AS provider_rating
      FROM bookings b
      JOIN categories c ON c.id = b.category_id
      JOIN users u ON u.id = b.customer_id
      LEFT JOIN provider_profiles p ON p.id = b.provider_id
      LEFT JOIN users pu ON pu.id = p.user_id
      WHERE b.id = ?
    `).get(id);

    try {
      const io = getIO();
      if (io) {
        io.to(`booking_${id}`).emit('booking_status_updated', {
          bookingId: id,
          status: 'ACCEPTED',
          booking: updated
        });
        io.emit('marketplace_event', { type: 'BOOKING_ACCEPTED', bookingId: id });
      }
    } catch (e) {}

    res.json({ message: 'Booking accepted', booking: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update booking status (e.g., EN_ROUTE, IN_PROGRESS, COMPLETED)
bookingRoutes.post('/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, finalPrice } = req.body;

    const allowed = ['ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any;
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const price = finalPrice || booking.final_price || booking.estimated_price;

    db.prepare(`
      UPDATE bookings
      SET status = ?, final_price = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, price, id);

    // If COMPLETED, record payment if not already created
    if (status === 'COMPLETED') {
      const existingPayment = db.prepare('SELECT id FROM payments WHERE booking_id = ?').get(id);
      if (!existingPayment) {
        const commissionRate = 0.15; // 15% platform commission
        const commission = Math.round(price * commissionRate);
        const providerEarnings = price - commission;
        db.prepare(`
          INSERT INTO payments (id, booking_id, amount, platform_commission, provider_earnings, status, payment_method, transaction_ref)
          VALUES (?, ?, ?, ?, ?, 'RELEASED', 'UPI', ?)
        `).run('pay-' + uuidv4().slice(0, 8), id, price, commission, providerEarnings, 'TXN-' + Date.now());
      }
    }

    const updated = db.prepare(`
      SELECT 
        b.*,
        c.name AS category_name,
        c.icon AS category_icon,
        u.name AS customer_name,
        u.phone AS customer_phone,
        pu.name AS provider_name,
        pu.phone AS provider_phone,
        pu.avatar_url AS provider_avatar,
        p.rating AS provider_rating
      FROM bookings b
      JOIN categories c ON c.id = b.category_id
      JOIN users u ON u.id = b.customer_id
      LEFT JOIN provider_profiles p ON p.id = b.provider_id
      LEFT JOIN users pu ON pu.id = p.user_id
      WHERE b.id = ?
    `).get(id);

    try {
      const io = getIO();
      if (io) {
        io.to(`booking_${id}`).emit('booking_status_updated', {
          bookingId: id,
          status,
          booking: updated
        });
        io.emit('marketplace_event', { type: `BOOKING_${status}`, bookingId: id });
      }
    } catch (e) {}

    res.json({ message: `Status updated to ${status}`, booking: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel booking
bookingRoutes.post('/:id/cancel', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    db.prepare(`
      UPDATE bookings
      SET status = 'CANCELLED', cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason || 'Customer cancelled', id);

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);

    try {
      const io = getIO();
      if (io) {
        io.to(`booking_${id}`).emit('booking_status_updated', {
          bookingId: id,
          status: 'CANCELLED',
          booking: updated
        });
      }
    } catch (e) {}

    res.json({ message: 'Booking cancelled', booking: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single booking by ID
bookingRoutes.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = db.prepare(`
      SELECT 
        b.*,
        c.name AS category_name,
        c.icon AS category_icon,
        u.name AS customer_name,
        u.phone AS customer_phone,
        u.email AS customer_email,
        u.avatar_url AS customer_avatar,
        pu.name AS provider_name,
        pu.phone AS provider_phone,
        pu.email AS provider_email,
        pu.avatar_url AS provider_avatar,
        p.rating AS provider_rating,
        p.review_count AS provider_reviews,
        p.latitude AS provider_latitude,
        p.longitude AS provider_longitude,
        p.address AS provider_address,
        pay.amount AS payment_amount,
        pay.status AS payment_status,
        pay.transaction_ref
      FROM bookings b
      JOIN categories c ON c.id = b.category_id
      JOIN users u ON u.id = b.customer_id
      LEFT JOIN provider_profiles p ON p.id = b.provider_id
      LEFT JOIN users pu ON pu.id = p.user_id
      LEFT JOIN payments pay ON pay.booking_id = b.id
      WHERE b.id = ?
    `).get(id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const messages = db.prepare('SELECT * FROM messages WHERE booking_id = ? ORDER BY created_at ASC').all(id);
    const review = db.prepare('SELECT * FROM reviews WHERE booking_id = ?').get(id);

    res.json({ booking, messages, review });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get bookings for a customer
bookingRoutes.get('/customer/:customerId', (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const bookings = db.prepare(`
      SELECT 
        b.*,
        c.name AS category_name,
        c.icon AS category_icon,
        pu.name AS provider_name,
        pu.avatar_url AS provider_avatar,
        p.rating AS provider_rating
      FROM bookings b
      JOIN categories c ON c.id = b.category_id
      LEFT JOIN provider_profiles p ON p.id = b.provider_id
      LEFT JOIN users pu ON pu.id = p.user_id
      WHERE b.customer_id = ?
      ORDER BY b.created_at DESC
    `).all(customerId);

    res.json({ bookings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get bookings for a provider (active leads + history)
bookingRoutes.get('/provider/:providerId', (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const bookings = db.prepare(`
      SELECT 
        b.*,
        c.name AS category_name,
        c.icon AS category_icon,
        u.name AS customer_name,
        u.phone AS customer_phone,
        u.avatar_url AS customer_avatar
      FROM bookings b
      JOIN categories c ON c.id = b.category_id
      JOIN users u ON u.id = b.customer_id
      WHERE b.provider_id = ?
      ORDER BY b.created_at DESC
    `).all(providerId);

    res.json({ bookings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
