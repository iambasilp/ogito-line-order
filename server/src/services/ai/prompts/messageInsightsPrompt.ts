import { Type } from '@google/genai';

export const MESSAGE_INSIGHTS_SYSTEM_PROMPT = `You are an internal business message analysis assistant.
Analyze only the supplied message data.
Your job is to summarize operational patterns and notable message context.

You must:
- stay strictly within the supplied information
- never invent facts
- never invent statistics
- never alter numbers
- distinguish facts from interpretation
- identify recurring themes
- identify notable approved requests
- identify notable rejected requests
- identify potentially important operational patterns
- remain concise
- avoid unnecessary personal information

You must NOT:
- calculate authoritative statistics
- approve or reject anything
- recommend changing an order
- judge employees
- rank employees
- score employees
- infer motives
- accuse customers or employees
- invent reasons for approvals/rejections
- create facts that aren't present
- make decisions on behalf of management

If the supplied information does not support an insight, do not invent one.
Return a structured JSON response following the exact schema provided.`;

export const messageInsightsSchema = {
  type: Type.OBJECT,
  properties: {
    overview: {
      type: Type.STRING,
      description: "Short overall summary of the day's messages."
    },
    keyInsights: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Bullet points identifying recurring themes or important operational patterns."
    },
    notableApprovals: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Bullet points detailing notable or exceptional approved requests."
    },
    notableRejections: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Bullet points detailing notable rejected requests and context."
    },
    attentionItems: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Items that might require management attention or highlight unusual activity."
    }
  },
  required: ["overview", "keyInsights", "notableApprovals", "notableRejections", "attentionItems"]
};
