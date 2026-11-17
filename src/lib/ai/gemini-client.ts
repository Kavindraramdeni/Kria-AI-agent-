import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

/**
 * Server-Side Gemini AI Client Wrapper
 * Strictly guarded against browser-side exposure.
 */
export function getGeminiClient(): GoogleGenAI {
  if (typeof window !== 'undefined') {
    throw new Error('FATAL: Gemini AI Client cannot be initialized or accessed in browser context.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('placeholder')) {
    throw new Error('GEMINI_API_KEY is missing or unconfigured. Server-side AI model invocation cannot proceed.');
  }

  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

export interface GenerateStructuredParams<T> {
  prompt: string;
  systemInstruction?: string;
  schema: z.ZodType<T>;
  model?: string;
}

export interface GeminiStructuredResult<T> {
  data: T;
  model: string;
  rawJson: string;
}

/**
 * Invokes Gemini with strict JSON Mode and validates the response using Zod.
 * Never returns simulated fallbacks on error.
 */
export async function generateStructuredWithGemini<T>(
  params: GenerateStructuredParams<T>
): Promise<GeminiStructuredResult<T>> {
  const client = getGeminiClient();
  const modelName = params.model || 'gemini-3.5-flash-lite';

  try {
    const response = await client.models.generateContent({
      model: modelName,
      contents: params.prompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: params.systemInstruction,
      },
    });

    const rawText = response.text || '';
    if (!rawText.trim()) {
      throw new Error(`Gemini model '${modelName}' returned an empty response.`);
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (parseErr: any) {
      throw new Error(`Failed to parse model response as JSON: ${parseErr.message}. Raw text: ${rawText.slice(0, 150)}...`);
    }

    // Validate structured output strictly against Zod schema
    const validatedData = params.schema.parse(parsedJson);

    return {
      data: validatedData,
      model: modelName,
      rawJson: rawText,
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const issueDetails = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Gemini response failed schema validation: ${issueDetails}`);
    }
    // Re-throw raw provider errors with explicit context
    throw new Error(`Gemini AI invocation failed (${modelName}): ${error.message || 'Unknown provider error'}`);
  }
}
