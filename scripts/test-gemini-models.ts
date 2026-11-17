import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { GoogleGenAI } from '@google/genai';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  console.log('Using API key:', apiKey ? `${apiKey.slice(0, 8)}...` : 'NONE');
  const ai = new GoogleGenAI({ apiKey: apiKey! });

  const candidates = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite-preview',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-3.5-flash-lite',
  ];

  for (const m of candidates) {
    try {
      console.log(`Starting test for ${m}...`);
      const res = await ai.models.generateContent({
        model: m,
        contents: 'Ping',
      });
      console.log(`[SUCCESS] ${m}:`, res.text?.trim().slice(0, 40));
    } catch (e: any) {
      console.log(`[FAIL] ${m}:`, e.message?.slice(0, 80));
    }
  }
}

main().catch(console.error);
