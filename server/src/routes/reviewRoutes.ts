import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { getIO } from '../sockets/socketHandler';

export const reviewRoutes = Router();

// Submit review & rating
reviewRoutes.post('/', (req: Request, res: Response) => {
  try {
    const { bookingId, customerId, rating, comment } = req.body;

    if (!bookingId || !customerId || !rating) {
      return res.status(400).json({ error: 'bookingId, customerId, and rating are required' });
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.customer_id !== customerId) {
      return res.status(403).json({ error: 'Only the booking customer can submit a review' });
    }

    const existing = db.prepare('SELECT id FROM reviews WHERE booking_id = ?').get(bookingId);
    if (existing) {
      return res.status(409).json({ error: 'Review already submitted for this booking' });
    }

    const reviewId = 'rev-' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT INTO reviews (id, booking_id, customer_id, provider_id, rating, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(reviewId, bookingId, customerId, booking.provider_id, rating, comment || '');

    // Recalculate provider rating & count
    const stats = db.prepare(`
      SELECT AVG(rating) AS avg_rating, COUNT(id) AS total_count
      FROM reviews
      WHERE provider_id = ?
    `).get(booking.provider_id) as any;

    if (stats) {
      const newRating = Number((stats.avg_rating || 5.0).toFixed(1));
      const newCount = stats.total_count || 1;
      db.prepare(`
        UPDATE provider_profiles
        SET rating = ?, review_count = ?
        WHERE id = ?
      `).run(newRating, newCount, booking.provider_id);
    }

    try {
      const io = getIO();
      if (io) {
        io.to(`provider_${booking.provider_id}`).emit('new_review_received', {
          bookingId,
          rating,
          comment
        });
      }
    } catch (e) {}

    res.status(201).json({
      message: 'Review submitted successfully',
      review: { id: reviewId, bookingId, rating, comment }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
