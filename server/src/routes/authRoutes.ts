import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';

export const authRoutes = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'find-me-secret-key-2026';

// Register User
authRoutes.post('/register', (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const userId = 'usr-' + uuidv4().slice(0, 8);
    const userRole = role === 'PROVIDER' || role === 'ADMIN' ? role : 'CUSTOMER';
    const passwordHash = bcrypt.hashSync(password, 8);

    db.prepare(`
      INSERT INTO users (id, name, email, phone, password_hash, role, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      name,
      email,
      phone || null,
      passwordHash,
      userRole,
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
    );

    // If provider, create base profile
    if (userRole === 'PROVIDER') {
      const profileId = 'prf-' + uuidv4().slice(0, 8);
      db.prepare(`
        INSERT INTO provider_profiles (id, user_id, bio, verification_status, is_available)
        VALUES (?, ?, ?, 'PENDING', 1)
      `).run(profileId, userId, 'New service provider');
    }

    const token = jwt.sign({ id: userId, email, role: userRole, name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: userId, name, email, phone, role: userRole }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Login User
authRoutes.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let providerProfile = null;
    if (user.role === 'PROVIDER') {
      providerProfile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(user.id);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatar_url,
        providerProfile
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List demo users for quick switcher in UI
authRoutes.get('/demo-users', (req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.avatar_url, p.id AS provider_profile_id, p.verification_status, p.is_available
    FROM users u
    LEFT JOIN provider_profiles p ON p.user_id = u.id
    ORDER BY u.role, u.name
  `).all();

  res.json({ users });
});
