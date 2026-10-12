import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';

export const paymentRoutes = Router();

// Process checkout / payment
paymentRoutes.post('/checkout', (req: Request, res: Response) => {
  try {
    const { bookingId, paymentMethod = 'UPI', amount } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const payAmount = amount || booking.final_price || booking.estimated_price;
    const commission = Math.round(payAmount * 0.15);
    const providerEarnings = payAmount - commission;
    const paymentId = 'pay-' + uuidv4().slice(0, 8);
    const txnRef = 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);

    const existing = db.prepare('SELECT id FROM payments WHERE booking_id = ?').get(bookingId);
    if (existing) {
      db.prepare(`
        UPDATE payments 
        SET amount = ?, platform_commission = ?, provider_earnings = ?, status = 'RELEASED', payment_method = ?, transaction_ref = ?
        WHERE booking_id = ?
      `).run(payAmount, commission, providerEarnings, paymentMethod, txnRef, bookingId);
    } else {
      db.prepare(`
        INSERT INTO payments (id, booking_id, amount, platform_commission, provider_earnings, status, payment_method, transaction_ref)
        VALUES (?, ?, ?, ?, ?, 'RELEASED', ?, ?)
      `).run(paymentId, bookingId, payAmount, commission, providerEarnings, paymentMethod, txnRef);
    }

    res.json({
      message: 'Payment completed successfully',
      payment: {
        id: paymentId,
        bookingId,
        amount: payAmount,
        platformCommission: commission,
        providerEarnings,
        paymentMethod,
        transactionRef: txnRef,
        status: 'PAID'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
