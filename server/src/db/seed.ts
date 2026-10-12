import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, initDatabase } from './database';

export function seedDatabase() {
  initDatabase();

  console.log('🌱 Seeding Find Me database with categories, providers, and demo accounts...');

  const passwordHash = bcrypt.hashSync('password123', 8);
  const adminHash = bcrypt.hashSync('admin123', 8);

  // 1. Clear existing records safely
  const tables = ['disputes', 'reviews', 'payments', 'messages', 'bookings', 'provider_categories', 'provider_profiles', 'categories', 'users'];
  for (const table of tables) {
    db.exec(`DELETE FROM ${table};`);
  }

  // 2. Insert Admin & Customers
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, phone, password_hash, role, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const adminId = 'usr-admin-01';
  insertUser.run(adminId, 'Platform Admin (Umesh)', 'admin@findme.com', '+91 9876543210', adminHash, 'ADMIN', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');

  const cust1Id = 'usr-cust-uma';
  insertUser.run(cust1Id, 'Urgent Uma', 'uma@example.com', '+91 9811223344', passwordHash, 'CUSTOMER', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150');

  const cust2Id = 'usr-cust-priya';
  insertUser.run(cust2Id, 'Planner Priya', 'priya@example.com', '+91 9822334455', passwordHash, 'CUSTOMER', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150');

  const cust3Id = 'usr-cust-rahul';
  insertUser.run(cust3Id, 'Rahul Verma', 'rahul@example.com', '+91 9833445566', passwordHash, 'CUSTOMER', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150');

  // 3. Insert Service Categories
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, name, slug, icon, description, base_price, price_unit, urgency_multiplier, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const categories = [
    {
      id: 'cat-ac-repair',
      name: 'AC Repair & Servicing',
      slug: 'ac-repair',
      icon: '❄️',
      description: 'Cooling issues, gas refilling, filter deep cleaning, compressor repair, and installation.',
      base_price: 499,
      price_unit: 'service',
      urgency_multiplier: 1.4,
      tags: 'ac,air conditioner,cooling,compressor,gas refill,filter cleaning,servicing,water dripping'
    },
    {
      id: 'cat-plumbing',
      name: 'Plumbing & Water Leakage',
      slug: 'plumbing',
      icon: '🔧',
      description: 'Pipe leaks, tap fixing, bathroom fittings, drain unblocking, and water heater setup.',
      base_price: 349,
      price_unit: 'visit',
      urgency_multiplier: 1.5,
      tags: 'plumber,plumbing,leak,pipe,tap,water,sink,drain,toilet,faucet,burst pipe,clogged'
    },
    {
      id: 'cat-electrical',
      name: 'Electrical & Wiring',
      slug: 'electrical',
      icon: '⚡',
      description: 'Short circuit fixing, switchboard repair, fan/light installation, wiring inspection.',
      base_price: 299,
      price_unit: 'visit',
      urgency_multiplier: 1.4,
      tags: 'electrician,electrical,power,spark,short circuit,switch,wiring,light,fan,fuse,mcb,tripping'
    },
    {
      id: 'cat-cleaning',
      name: 'Home Deep Cleaning',
      slug: 'cleaning',
      icon: '✨',
      description: 'Full home sanitization, deep kitchen/bathroom cleaning, sofa & carpet shampooing.',
      base_price: 799,
      price_unit: 'room/package',
      urgency_multiplier: 1.2,
      tags: 'cleaning,deep clean,maid,maid service,kitchen cleaning,bathroom cleaning,sofa cleaning,dusting'
    },
    {
      id: 'cat-appliance-repair',
      name: 'Appliance & TV Repair',
      slug: 'appliance-repair',
      icon: '📺',
      description: 'Washing machine, refrigerator, microwave oven, television, and water purifier repair.',
      base_price: 399,
      price_unit: 'service',
      urgency_multiplier: 1.3,
      tags: 'appliance,refrigerator,fridge,washing machine,tv,microwave,geyser,oven,water purifier,ro'
    },
    {
      id: 'cat-carpentry',
      name: 'Carpentry & Furniture',
      slug: 'carpentry',
      icon: '🪚',
      description: 'Custom woodworking, door lock repair, furniture assembly, hinges, and wooden partitions.',
      base_price: 449,
      price_unit: 'visit',
      urgency_multiplier: 1.25,
      tags: 'carpenter,carpentry,wood,furniture,door,lock,cupboard,bed,table,hinges,assembly'
    },
    {
      id: 'cat-pest-control',
      name: 'Pest Control & Sanitization',
      slug: 'pest-control',
      icon: '🐜',
      description: 'Cockroach management, termite treatment, bedbug extermination, and rodent control.',
      base_price: 699,
      price_unit: 'session',
      urgency_multiplier: 1.2,
      tags: 'pest,pest control,cockroach,termite,bedbugs,mosquitoes,rats,insects,disinfection'
    },
    {
      id: 'cat-painting',
      name: 'Painting & Waterproofing',
      slug: 'painting',
      icon: '🎨',
      description: 'Interior & exterior wall painting, damp proofing, touch-ups, and texture coating.',
      base_price: 999,
      price_unit: 'day',
      urgency_multiplier: 1.15,
      tags: 'painter,painting,wall,distemper,waterproofing,whitewash,texture,dampness'
    }
  ];

  for (const cat of categories) {
    insertCategory.run(cat.id, cat.name, cat.slug, cat.icon, cat.description, cat.base_price, cat.price_unit, cat.urgency_multiplier, cat.tags);
  }

  // 4. Insert Providers (Users + Profiles + Category Mappings)
  const insertProfile = db.prepare(`
    INSERT INTO provider_profiles (
      id, user_id, bio, experience_years, id_proof_url, certification_url, verification_status,
      is_available, rating, review_count, latitude, longitude, address, service_radius_km, hourly_rate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProviderCategory = db.prepare(`
    INSERT INTO provider_categories (id, provider_id, category_id, custom_price)
    VALUES (?, ?, ?, ?)
  `);

  const providers = [
    {
      userId: 'usr-prov-suresh',
      profileId: 'prf-suresh-plumb',
      name: 'Suresh Kumar',
      email: 'suresh@findme.com',
      phone: '+91 9845012345',
      avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
      bio: 'Certified Master Plumber with 8+ years experience in rapid leak detection, sanitary piping, and bathroom fixtures. Available 24/7 for emergency water disasters.',
      experienceYears: 8,
      verificationStatus: 'VERIFIED',
      isAvailable: 1,
      rating: 4.9,
      reviewCount: 142,
      latitude: 12.9784, // Indiranagar, Bengaluru
      longitude: 77.6408,
      address: '100ft Road, Indiranagar, Bengaluru',
      serviceRadiusKm: 12.0,
      hourlyRate: 350,
      categories: [{ catId: 'cat-plumbing', price: 350 }]
    },
    {
      userId: 'usr-prov-rajesh',
      profileId: 'prf-rajesh-ac',
      name: 'Rajesh Sharma',
      email: 'rajesh@findme.com',
      phone: '+91 9845023456',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      bio: 'HVAC technician specializing in Daikin, Voltas, LG & Samsung split/window AC servicing, PCB diagnostics, and rapid cooling restores.',
      experienceYears: 6,
      verificationStatus: 'VERIFIED',
      isAvailable: 1,
      rating: 4.8,
      reviewCount: 98,
      latitude: 12.9352, // Koramangala, Bengaluru
      longitude: 77.6245,
      address: '5th Block, Koramangala, Bengaluru',
      serviceRadiusKm: 15.0,
      hourlyRate: 480,
      categories: [{ catId: 'cat-ac-repair', price: 480 }, { catId: 'cat-appliance-repair', price: 450 }]
    },
    {
      userId: 'usr-prov-ramesh',
      profileId: 'prf-ramesh-elec',
      name: 'Ramesh Gowda',
      email: 'ramesh@findme.com',
      phone: '+91 9845034567',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      bio: "Licensed 'A' Grade Electrical Contractor. Expert in power tripping, short circuits, high-load appliance lines, and smart home lighting.",
      experienceYears: 10,
      verificationStatus: 'VERIFIED',
      isAvailable: 1,
      rating: 4.9,
      reviewCount: 215,
      latitude: 12.9121, // HSR Layout, Bengaluru
      longitude: 77.6446,
      address: 'Sector 2, HSR Layout, Bengaluru',
      serviceRadiusKm: 14.0,
      hourlyRate: 320,
      categories: [{ catId: 'cat-electrical', price: 320 }]
    },
    {
      userId: 'usr-prov-sanjana',
      profileId: 'prf-sanjana-clean',
      name: 'Sanjana Shine Cleaning',
      email: 'sanjana@findme.com',
      phone: '+91 9845045678',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      bio: 'Founder of 6-member deep cleaning crew. Hospital-grade sanitization, robotic single-disc floor scrubbing, and upholstery dry cleaning.',
      experienceYears: 5,
      verificationStatus: 'VERIFIED',
      isAvailable: 1,
      rating: 4.7,
      reviewCount: 88,
      latitude: 12.9856, // MG Road / Central Bengaluru
      longitude: 77.6057,
      address: 'MG Road, Bengaluru',
      serviceRadiusKm: 20.0,
      hourlyRate: 750,
      categories: [{ catId: 'cat-cleaning', price: 750 }, { catId: 'cat-pest-control', price: 650 }]
    },
    {
      userId: 'usr-prov-amit',
      profileId: 'prf-amit-appliance',
      name: 'Amit Patil',
      email: 'amit@findme.com',
      phone: '+91 9845056789',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      bio: 'Master appliance engineer with factory certification from Whirlpool & IFB. Same-day repair for washing machines, fridges, and microwave ovens.',
      experienceYears: 7,
      verificationStatus: 'VERIFIED',
      isAvailable: 1,
      rating: 4.8,
      reviewCount: 76,
      latitude: 12.9698, // Domlur / Old Airport Road
      longitude: 77.6499,
      address: 'Domlur Layout, Bengaluru',
      serviceRadiusKm: 12.0,
      hourlyRate: 420,
      categories: [{ catId: 'cat-appliance-repair', price: 420 }]
    },
    {
      userId: 'usr-prov-imran',
      profileId: 'prf-imran-carpenter',
      name: 'Imran Khan',
      email: 'imran@findme.com',
      phone: '+91 9845067890',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      bio: 'Precision woodworker and modular furniture installer. Door hinge realignment, godrej locks, and custom shelving.',
      experienceYears: 9,
      verificationStatus: 'VERIFIED',
      isAvailable: 1,
      rating: 4.9,
      reviewCount: 110,
      latitude: 13.0033, // Malleshwaram, Bengaluru
      longitude: 77.5692,
      address: '8th Cross, Malleshwaram, Bengaluru',
      serviceRadiusKm: 16.0,
      hourlyRate: 450,
      categories: [{ catId: 'cat-carpentry', price: 450 }]
    },
    {
      userId: 'usr-prov-deepak',
      profileId: 'prf-deepak-pest',
      name: 'Deepak Varma (GreenPest)',
      email: 'deepak@findme.com',
      phone: '+91 9845078901',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      bio: 'Eco-friendly odorless pest eradication using organic herbal gel and child/pet safe chemicals. 6-month warranty on cockroach & termite treatments.',
      experienceYears: 4,
      verificationStatus: 'VERIFIED',
      isAvailable: 1,
      rating: 4.6,
      reviewCount: 52,
      latitude: 12.9081, // JP Nagar, Bengaluru
      longitude: 77.5855,
      address: '3rd Phase, JP Nagar, Bengaluru',
      serviceRadiusKm: 18.0,
      hourlyRate: 600,
      categories: [{ catId: 'cat-pest-control', price: 600 }]
    },
    {
      userId: 'usr-prov-vikas',
      profileId: 'prf-vikas-new',
      name: 'Vikas Nair',
      email: 'vikas@findme.com',
      phone: '+91 9845089012',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      bio: 'Young dynamic electrician & lighting installer looking to expand clientele.',
      experienceYears: 2,
      verificationStatus: 'PENDING',
      isAvailable: 0,
      rating: 5.0,
      reviewCount: 0,
      latitude: 12.9716,
      longitude: 77.5946,
      address: 'Shivajinagar, Bengaluru',
      serviceRadiusKm: 10.0,
      hourlyRate: 280,
      categories: [{ catId: 'cat-electrical', price: 280 }]
    }
  ];

  for (const prov of providers) {
    insertUser.run(prov.userId, prov.name, prov.email, prov.phone, passwordHash, 'PROVIDER', prov.avatarUrl);
    insertProfile.run(
      prov.profileId,
      prov.userId,
      prov.bio,
      prov.experienceYears,
      'https://via.placeholder.com/600x400.png?text=Govt+ID+Proof',
      'https://via.placeholder.com/600x400.png?text=Skill+Certificate',
      prov.verificationStatus,
      prov.isAvailable,
      prov.rating,
      prov.reviewCount,
      prov.latitude,
      prov.longitude,
      prov.address,
      prov.serviceRadiusKm,
      prov.hourlyRate
    );

    for (const cat of prov.categories) {
      insertProviderCategory.run(uuidv4(), prov.profileId, cat.catId, cat.price);
    }
  }

  // 5. Insert sample completed bookings and payments
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      id, customer_id, provider_id, category_id, description, raw_prompt, urgency, status, address,
      latitude, longitude, estimated_price, final_price, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPayment = db.prepare(`
    INSERT INTO payments (id, booking_id, amount, platform_commission, provider_earnings, status, payment_method, transaction_ref, created_at)
    VALUES (?, ?, ?, ?, ?, 'RELEASED', 'UPI', ?, ?)
  `);

  const demoBookings = [
    {
      id: 'bk-demo-01',
      customerId: cust1Id,
      providerId: 'prf-suresh-plumb',
      categoryId: 'cat-plumbing',
      description: 'Emergency burst pipe leaking under bathroom sink',
      rawPrompt: 'Pipe burst under sink urgently need plumber',
      urgency: 'URGENT',
      address: 'Indiranagar 12th Main, Bengaluru',
      lat: 12.9784,
      lon: 77.6408,
      price: 450,
      date: '2026-08-20 10:45:00'
    },
    {
      id: 'bk-demo-02',
      customerId: cust2Id,
      providerId: 'prf-rajesh-ac',
      categoryId: 'cat-ac-repair',
      description: 'Master bedroom split AC not cooling & gas refilling',
      rawPrompt: 'AC not cooling need service today',
      urgency: 'MEDIUM',
      address: 'Koramangala 4th Block, Bengaluru',
      lat: 12.9352,
      lon: 77.6245,
      price: 650,
      date: '2026-08-21 13:00:00'
    },
    {
      id: 'bk-demo-03',
      customerId: cust3Id,
      providerId: 'prf-ramesh-elec',
      categoryId: 'cat-electrical',
      description: 'Main MCB tripping repeatedly on heavy load',
      rawPrompt: 'Power tripping continuously need electrician',
      urgency: 'URGENT',
      address: 'HSR Layout Sector 1, Bengaluru',
      lat: 12.9121,
      lon: 77.6446,
      price: 380,
      date: '2026-08-21 16:30:00'
    }
  ];

  for (const b of demoBookings) {
    insertBooking.run(b.id, b.customerId, b.providerId, b.categoryId, b.description, b.rawPrompt, b.urgency, b.address, b.lat, b.lon, b.price, b.price, b.date, b.date);
    const comm = Math.round(b.price * 0.15);
    insertPayment.run('pay-' + b.id, b.id, b.price, comm, b.price - comm, 'TXN-' + Math.floor(10000000 + Math.random() * 90000000), b.date);
  }

  // 6. Insert sample past reviews
  const insertReview = db.prepare(`
    INSERT INTO reviews (id, booking_id, customer_id, provider_id, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const demoReviews = [
    {
      id: 'rev-01',
      bookingId: 'bk-demo-01',
      customerId: cust1Id,
      providerId: 'prf-suresh-plumb',
      rating: 5,
      comment: 'Suresh arrived within 15 minutes! He fixed the burst main valve quickly without any mess. Absolute lifesaver!',
      createdAt: '2026-08-20 11:30:00'
    },
    {
      id: 'rev-02',
      bookingId: 'bk-demo-02',
      customerId: cust2Id,
      providerId: 'prf-rajesh-ac',
      rating: 5,
      comment: 'Very professional and clean work. AC cooling like brand new now. Transparent pricing and no hidden costs.',
      createdAt: '2026-08-21 14:15:00'
    },
    {
      id: 'rev-03',
      bookingId: 'bk-demo-03',
      customerId: cust3Id,
      providerId: 'prf-ramesh-elec',
      rating: 5,
      comment: 'Diagnosed a tricky short circuit behind the wall within 10 minutes. Highly recommended master electrician.',
      createdAt: '2026-08-21 17:45:00'
    }
  ];

  for (const r of demoReviews) {
    insertReview.run(r.id, r.bookingId, r.customerId, r.providerId, r.rating, r.comment, r.createdAt);
  }

  console.log('✅ Find Me database seeded successfully with 8 categories, 8 providers, 3 demo users, and reviews!');
}

if (require.main === module) {
  seedDatabase();
}
