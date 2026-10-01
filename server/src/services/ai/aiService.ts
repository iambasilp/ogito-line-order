import { GeminiProvider } from './providers/geminiProvider';
import { MESSAGE_INSIGHTS_SYSTEM_PROMPT, messageInsightsSchema } from './prompts/messageInsightsPrompt';

export interface MessageDTO {
  customer: string;
  salesman: string;
  status: string;
  message: string;
}

export class AiService {
  private provider: GeminiProvider;

  constructor() {
    this.provider = new GeminiProvider();
  }

  async generateMessageSummary(messages: MessageDTO[]) {
    // If there are no messages, we shouldn't have been called, but handle it gracefully
    if (!messages || messages.length === 0) {
      return {
        overview: "No messages to summarize.",
        keyInsights: [],
        notableApprovals: [],
        notableRejections: [],
        attentionItems: []
      };
    }

    const userContent = JSON.stringify(messages, null, 2);
    
    return await this.provider.generateStructuredResponse(
      MESSAGE_INSIGHTS_SYSTEM_PROMPT,
      userContent,
      messageInsightsSchema
    );
  }
}

// Export singleton instance
export const aiService = new AiService();
