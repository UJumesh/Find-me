-- Schema for Find Me Hyperlocal Service Marketplace

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('CUSTOMER', 'PROVIDER', 'ADMIN')) NOT NULL DEFAULT 'CUSTOMER',
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT NOT NULL,
    description TEXT NOT NULL,
    base_price REAL NOT NULL DEFAULT 299,
    price_unit TEXT NOT NULL DEFAULT 'visit',
    urgency_multiplier REAL NOT NULL DEFAULT 1.3,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provider_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    bio TEXT,
    experience_years INTEGER DEFAULT 2,
    id_proof_url TEXT,
    certification_url TEXT,
    verification_status TEXT CHECK(verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')) NOT NULL DEFAULT 'PENDING',
    is_available INTEGER NOT NULL DEFAULT 1,
    rating REAL DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    latitude REAL NOT NULL DEFAULT 12.9716,
    longitude REAL NOT NULL DEFAULT 77.5946,
    address TEXT NOT NULL DEFAULT 'Bengaluru, India',
    service_radius_km REAL NOT NULL DEFAULT 15.0,
    hourly_rate REAL NOT NULL DEFAULT 350,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS provider_categories (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    custom_price REAL,
    FOREIGN KEY(provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(provider_id, category_id)
);

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    provider_id TEXT,
    category_id TEXT NOT NULL,
    description TEXT NOT NULL,
    raw_prompt TEXT,
    urgency TEXT CHECK(urgency IN ('LOW', 'MEDIUM', 'URGENT')) NOT NULL DEFAULT 'MEDIUM',
    status TEXT CHECK(status IN ('REQUESTED', 'MATCHING', 'OFFERED', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED')) NOT NULL DEFAULT 'REQUESTED',
    address TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    scheduled_at DATETIME,
    estimated_price REAL NOT NULL,
    final_price REAL,
    sla_expires_at DATETIME,
    cancellation_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES users(id),
    FOREIGN KEY(provider_id) REFERENCES provider_profiles(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    booking_id TEXT UNIQUE NOT NULL,
    amount REAL NOT NULL,
    platform_commission REAL NOT NULL,
    provider_earnings REAL NOT NULL,
    status TEXT CHECK(status IN ('HELD', 'RELEASED', 'REFUNDED')) NOT NULL DEFAULT 'HELD',
    payment_method TEXT NOT NULL DEFAULT 'UPI',
    transaction_ref TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    booking_id TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY(customer_id) REFERENCES users(id),
    FOREIGN KEY(provider_id) REFERENCES provider_profiles(id)
);

CREATE TABLE IF NOT EXISTS disputes (
    id TEXT PRIMARY KEY,
    booking_id TEXT UNIQUE NOT NULL,
    raised_by_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT CHECK(status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')) NOT NULL DEFAULT 'OPEN',
    resolution_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY(raised_by_id) REFERENCES users(id)
);
