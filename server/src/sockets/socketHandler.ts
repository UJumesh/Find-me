import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';

let ioInstance: SocketIOServer | null = null;

export function initSocketHandler(io: SocketIOServer) {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    // Join rooms
    socket.on('join_booking', (bookingId: string) => {
      socket.join(`booking_${bookingId}`);
    });

    socket.on('join_provider', (providerId: string) => {
      socket.join(`provider_${providerId}`);
    });

    socket.on('join_customer', (customerId: string) => {
      socket.join(`customer_${customerId}`);
    });

    // Chat messaging
    socket.on('send_message', (data: {
      bookingId: string;
      senderId: string;
      senderName: string;
      senderRole: string;
      content: string;
    }) => {
      try {
        const messageId = 'msg-' + uuidv4().slice(0, 8);
        const createdAt = new Date().toISOString();

        db.prepare(`
          INSERT INTO messages (id, booking_id, sender_id, sender_name, sender_role, content, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(messageId, data.bookingId, data.senderId, data.senderName, data.senderRole, data.content, createdAt);

        const msgObj = {
          id: messageId,
          booking_id: data.bookingId,
          sender_id: data.senderId,
          sender_name: data.senderName,
          sender_role: data.senderRole,
          content: data.content,
          created_at: createdAt
        };

        io.to(`booking_${data.bookingId}`).emit('new_message', msgObj);
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });

    // Live provider location simulation
    socket.on('update_live_location', (data: {
      bookingId: string;
      latitude: number;
      longitude: number;
      etaMinutes?: number;
    }) => {
      io.to(`booking_${data.bookingId}`).emit('provider_location_changed', data);
    });

    // Typing status
    socket.on('typing', (data: { bookingId: string; senderName: string; isTyping: boolean }) => {
      socket.to(`booking_${data.bookingId}`).emit('user_typing', data);
    });
  });
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}
