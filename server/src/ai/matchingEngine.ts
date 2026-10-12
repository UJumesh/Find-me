import { db } from '../db/database';

export interface ProviderMatch {
  providerId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  bio: string;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  verificationStatus: string;
  isAvailable: boolean;
  latitude: number;
  longitude: number;
  address: string;
  distanceKm: number;
  estimatedEtaMinutes: number;
  hourlyRate: number;
  servicePrice: number;
  matchScore: number; // 0 to 100
  scoreBreakdown: {
    distanceScore: number;
    qualityScore: number;
    verificationScore: number;
    priceScore: number;
  };
  badges: string[];
}

export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export function matchAndRankProviders(
  categoryId: string,
  customerLat: number,
  customerLon: number,
  urgency: 'LOW' | 'MEDIUM' | 'URGENT' = 'MEDIUM'
): ProviderMatch[] {
  // 1. Fetch providers that offer this category
  const query = `
    SELECT 
      p.id AS profile_id,
      p.user_id,
      u.name,
      u.email,
      u.phone,
      u.avatar_url,
      p.bio,
      p.experience_years,
      p.verification_status,
      p.is_available,
      p.rating,
      p.review_count,
      p.latitude,
      p.longitude,
      p.address,
      p.service_radius_km,
      p.hourly_rate,
      COALESCE(pc.custom_price, p.hourly_rate) AS service_price,
      c.base_price,
      c.urgency_multiplier
    FROM provider_profiles p
    JOIN users u ON p.user_id = u.id
    JOIN provider_categories pc ON pc.provider_id = p.id
    JOIN categories c ON c.id = pc.category_id
    WHERE pc.category_id = ?
      AND p.verification_status = 'VERIFIED'
      AND p.is_available = 1
  `;

  const rows = db.prepare(query).all(categoryId) as Array<{
    profile_id: string;
    user_id: string;
    name: string;
    email: string;
    phone: string;
    avatar_url: string;
    bio: string;
    experience_years: number;
    verification_status: string;
    is_available: number;
    rating: number;
    review_count: number;
    latitude: number;
    longitude: number;
    address: string;
    service_radius_km: number;
    hourly_rate: number;
    service_price: number;
    base_price: number;
    urgency_multiplier: number;
  }>;

  const matches: ProviderMatch[] = [];

  for (const row of rows) {
    const distanceKm = calculateHaversineDistance(customerLat, customerLon, row.latitude, row.longitude);

    // Distance Score (0 - 40 pts)
    let distanceScore = 0;
    if (distanceKm <= 2.0) distanceScore = 40;
    else if (distanceKm <= 5.0) distanceScore = 34;
    else if (distanceKm <= 10.0) distanceScore = 26;
    else if (distanceKm <= row.service_radius_km) distanceScore = 15;
    else distanceScore = Math.max(0, 10 - (distanceKm - row.service_radius_km));

    // Quality & Reviews Score (0 - 30 pts)
    const ratingRatio = (row.rating || 4.5) / 5.0;
    const reviewBonus = Math.min(10, Math.log10((row.review_count || 1) + 1) * 4);
    const qualityScore = Number((ratingRatio * 20 + reviewBonus).toFixed(1));

    // Verification & Experience Score (0 - 15 pts)
    let verificationScore = 10; // Already verified
    if (row.experience_years >= 5) verificationScore += 5;
    else if (row.experience_years >= 3) verificationScore += 3;

    // Price Competitiveness Score (0 - 15 pts)
    const multiplier = urgency === 'URGENT' ? row.urgency_multiplier : 1.0;
    const finalPrice = Math.round(row.service_price * multiplier);
    const priceDiff = (row.base_price - row.service_price) / row.base_price;
    const priceScore = Math.max(5, Math.min(15, Math.round(10 + priceDiff * 10)));

    const totalScore = Math.min(99, Math.round(distanceScore + qualityScore + verificationScore + priceScore));

    // Calculate dynamic ETA (10 min prep + 3 min per km + urgency speedup)
    const speedFactor = urgency === 'URGENT' ? 2.5 : 3.0;
    const estimatedEtaMinutes = Math.max(12, Math.round(8 + distanceKm * speedFactor));

    const badges: string[] = [];
    if (row.rating >= 4.8) badges.push('Top Rated ⭐');
    if (distanceKm <= 3.0) badges.push('Nearby 📍');
    if (row.experience_years >= 7) badges.push('Master Pro 🛠️');
    if (urgency === 'URGENT') badges.push('Fast Dispatch ⚡');

    matches.push({
      providerId: row.profile_id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      experienceYears: row.experience_years,
      rating: row.rating,
      reviewCount: row.review_count,
      verificationStatus: row.verification_status,
      isAvailable: Boolean(row.is_available),
      latitude: row.latitude,
      longitude: row.longitude,
      address: row.address,
      distanceKm,
      estimatedEtaMinutes,
      hourlyRate: row.hourly_rate,
      servicePrice: finalPrice,
      matchScore: totalScore,
      scoreBreakdown: {
        distanceScore,
        qualityScore,
        verificationScore,
        priceScore
      },
      badges
    });
  }

  // Sort descending by match score
  matches.sort((a, b) => b.matchScore - a.matchScore);

  return matches;
}
