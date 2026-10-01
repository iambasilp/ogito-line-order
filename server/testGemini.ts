import dotenv from 'dotenv';
dotenv.config();

import { GeminiProvider } from './src/services/ai/providers/geminiProvider';
import { messageInsightsSchema, MESSAGE_INSIGHTS_SYSTEM_PROMPT } from './src/services/ai/prompts/messageInsightsPrompt';

async function testWithRetry(retries = 10) {
  const provider = new GeminiProvider();
  console.log("Provider created successfully. Model:", provider['modelName']);
  
  const dummyMessages = [
    {
      customer: "Test Bakery",
      salesman: "admin",
      status: "approved",
      message: "Need extra bread tomorrow."
    },
    {
      customer: "Supermarket A",
      salesman: "naseef",
      status: "rejected",
      message: "Can you deliver at 3 AM?"
    }
  ];
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Sending request (Attempt ${i + 1}/${retries})...`);
      const result = await provider.generateStructuredResponse(
        MESSAGE_INSIGHTS_SYSTEM_PROMPT,
        JSON.stringify(dummyMessages),
        messageInsightsSchema
      );
      console.log("Result received successfully!");
      console.log(JSON.stringify(result, null, 2));
      return true;
    } catch (err: any) {
      console.error(`Attempt ${i + 1} failed.`);
      if (i < retries - 1) {
        const waitTime = Math.pow(2, i) * 1000;
        console.log(`Waiting ${waitTime}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error("All retries failed.");
        throw err;
      }
    }
  }
}

testWithRetry().catch(() => process.exit(1));
