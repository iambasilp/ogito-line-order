import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AuthRequest extends Request {
  user?: any;
}

export class AiController {
  static async getInsights(req: AuthRequest, res: Response) {
    try {
      const { analytics, viewMode } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Gemini API key is missing. Please add GEMINI_API_KEY to your server/.env file.' });
      }

      if (!analytics) {
        return res.status(400).json({ error: 'Analytics data is required for insights' });
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.replace(/['"]+/g, ''));
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `
        You are an expert business analyst for Ogito Foods, a wholesale food distributor.
        Analyze the following sales data for the selected timeframe (${viewMode}).
        
        Data:
        ${JSON.stringify(analytics, null, 2)}
        
        Provide a very brief, punchy summary of the business performance. 
        Focus on:
        1. The overall revenue trend (up/down).
        2. Best and worst performing routes or salesmen.
        3. One actionable recommendation.
        
        Format your response in Markdown using bullet points. Keep it strictly to 3-4 sentences total. Be encouraging but professional. Do not invent numbers, only use the provided data.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      res.json({ insights: responseText });
    } catch (error) {
      console.error('AI Insights error:', error);
      res.status(500).json({ error: 'Failed to generate AI insights' });
    }
  }
}
