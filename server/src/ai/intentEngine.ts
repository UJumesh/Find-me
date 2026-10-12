import { db } from '../db/database';

export interface IntentResult {
  rawPrompt: string;
  matchedCategoryId: string | null;
  categoryName: string | null;
  confidence: number;
  urgency: 'LOW' | 'MEDIUM' | 'URGENT';
  urgencyReason: string;
  extractedKeywords: string[];
  estimatedPrice: {
    min: number;
    max: number;
    currency: string;
    unit: string;
  };
  needsClarification: boolean;
  clarificationQuestions?: string[];
  suggestedAction: string;
}

export function parseCustomerIntent(prompt: string): IntentResult {
  const normalized = prompt.toLowerCase().trim();
  
  // 1. Detect Urgency signals
  const urgentKeywords = ['urgent', 'emergency', 'asap', 'now', 'immediately', 'burst', 'flooding', 'spark', 'short circuit', 'fire', 'leaking heavily', 'stuck', 'today', 'right now'];
  const lowUrgencyKeywords = ['next week', 'this weekend', 'later', 'quote', 'estimate', 'sometime', 'planning', 'scheduled'];
  
  let urgency: 'LOW' | 'MEDIUM' | 'URGENT' = 'MEDIUM';
  let urgencyReason = 'Standard priority requested';

  if (urgentKeywords.some(w => normalized.includes(w))) {
    urgency = 'URGENT';
    urgencyReason = 'Emergency/Urgent indicators detected in query';
  } else if (lowUrgencyKeywords.some(w => normalized.includes(w))) {
    urgency = 'LOW';
    urgencyReason = 'Advance planning or flexible schedule detected';
  }

  // 2. Query categories from DB
  const categories = db.prepare('SELECT * FROM categories').all() as Array<{
    id: string;
    name: string;
    slug: string;
    icon: string;
    description: string;
    base_price: number;
    price_unit: string;
    urgency_multiplier: number;
    tags: string;
  }>;

  // 3. Score categories against prompt
  let bestCategory: typeof categories[0] | null = null;
  let bestScore = 0;
  const matchedKeywords: string[] = [];

  for (const cat of categories) {
    const tags = (cat.tags || '').split(',').map(t => t.trim().toLowerCase());
    let score = 0;

    for (const tag of tags) {
      if (normalized.includes(tag)) {
        score += tag.includes(' ') ? 3 : 1.5; // multi-word tag gets higher weight
        if (!matchedKeywords.includes(tag)) {
          matchedKeywords.push(tag);
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  // Check if query is too vague or generic
  const vaguePrompts = ['help', 'fix', 'repair', 'someone', 'work', 'service', 'worker', 'need help', 'fix something'];
  const isTooVague = bestScore === 0 || (normalized.split(' ').length < 3 && vaguePrompts.includes(normalized));

  if (isTooVague || !bestCategory) {
    return {
      rawPrompt: prompt,
      matchedCategoryId: null,
      categoryName: null,
      confidence: 0.2,
      urgency: urgency,
      urgencyReason: urgencyReason,
      extractedKeywords: matchedKeywords,
      estimatedPrice: { min: 250, max: 600, currency: 'INR', unit: 'visit' },
      needsClarification: true,
      clarificationQuestions: [
        'Could you specify the exact problem or appliance that needs attention (e.g., AC cooling, pipe leak, fan repair, or home cleaning)?',
        'Do you require an immediate on-demand technician today or prefer scheduling for a later date?',
        'What is your approximate area/neighborhood?'
      ],
      suggestedAction: 'Prompt customer for clarification'
    };
  }

  const confidence = Math.min(0.98, Math.max(0.65, 0.5 + bestScore * 0.15));
  const basePrice = bestCategory.base_price;
  const multiplier = urgency === 'URGENT' ? bestCategory.urgency_multiplier : (urgency === 'LOW' ? 0.95 : 1.0);
  
  const calculatedBase = Math.round(basePrice * multiplier);
  const minPrice = Math.round(calculatedBase * 0.9);
  const maxPrice = Math.round(calculatedBase * 1.35);

  return {
    rawPrompt: prompt,
    matchedCategoryId: bestCategory.id,
    categoryName: bestCategory.name,
    confidence: Number(confidence.toFixed(2)),
    urgency,
    urgencyReason,
    extractedKeywords: matchedKeywords,
    estimatedPrice: {
      min: minPrice,
      max: maxPrice,
      currency: 'INR',
      unit: bestCategory.price_unit
    },
    needsClarification: confidence < 0.7,
    clarificationQuestions: confidence < 0.7 ? [
      `We matched this to "${bestCategory.name}". Is this accurate?`,
      'Would you like a diagnostic visit or direct repair service?'
    ] : undefined,
    suggestedAction: `Match with verified providers in ${bestCategory.name}`
  };
}
