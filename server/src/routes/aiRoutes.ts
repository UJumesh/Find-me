import { Router, Request, Response } from 'express';
import { parseCustomerIntent } from '../ai/intentEngine';
import { matchAndRankProviders } from '../ai/matchingEngine';

export const aiRoutes = Router();

// Parse natural language service prompt
aiRoutes.post('/parse-intent', (req: Request, res: Response) => {
  try {
    const { prompt, latitude, longitude } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Valid prompt string is required' });
    }

    const intent = parseCustomerIntent(prompt);

    // If location is provided and a category is matched, also return top ranked providers
    let matchedProviders: any[] = [];
    if (intent.matchedCategoryId) {
      const lat = typeof latitude === 'number' ? latitude : 12.9716; // Default to Bengaluru center
      const lon = typeof longitude === 'number' ? longitude : 77.5946;
      matchedProviders = matchAndRankProviders(intent.matchedCategoryId, lat, lon, intent.urgency);
    }

    res.json({
      intent,
      matchedProviders
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clarify ambiguous intent with additional answers
aiRoutes.post('/clarify', (req: Request, res: Response) => {
  try {
    const { originalPrompt, answers, latitude, longitude } = req.body;

    const combinedPrompt = `${originalPrompt || ''} ${Array.isArray(answers) ? answers.join(' ') : (answers || '')}`.trim();
    const intent = parseCustomerIntent(combinedPrompt);

    const lat = typeof latitude === 'number' ? latitude : 12.9716;
    const lon = typeof longitude === 'number' ? longitude : 77.5946;

    let matchedProviders: any[] = [];
    if (intent.matchedCategoryId) {
      matchedProviders = matchAndRankProviders(intent.matchedCategoryId, lat, lon, intent.urgency);
    }

    res.json({
      combinedPrompt,
      intent,
      matchedProviders
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
