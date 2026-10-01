import { GoogleGenAI } from '@google/genai';

export class GeminiProvider {
  private ai: GoogleGenAI;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    
    // Default to the recommended production flash model
    this.modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateStructuredResponse(systemPrompt: string, userContent: string, schema: any) {
    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: userContent,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: schema,
          // Removed deprecated parameters: temperature, topP, topK per 3.8 Flash migration guide
        }
      });

      const responseText = response.text;
      if (!responseText) {
          throw new Error("Empty response from AI");
      }
      
      const parsed = JSON.parse(responseText);

      // Validate required schema structure (at least it should be an object containing 'overview')
      if (typeof parsed !== 'object' || parsed === null || typeof parsed.overview !== 'string') {
          throw new Error("AI returned malformed structured JSON");
      }

      return parsed;
    } catch (error) {
      console.error('Gemini Provider Error:', error);
      throw new Error('Failed to generate insights from AI provider');
    }
  }
}
