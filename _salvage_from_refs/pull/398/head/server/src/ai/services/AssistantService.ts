import axios from 'axios';

export interface AssistantContext {
  workspace?: string;
  alerts?: any[];
  pinnedEntities?: any[];
}

export default class AssistantService {
  private apiKey: string;
  private baseUrl: string;

  constructor(
    apiKey: string = process.env.OPENAI_API_KEY || '',
    baseUrl: string = 'https://api.openai.com/v1'
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async chat(message: string, context: AssistantContext) {
    const systemPrompt =
      'You are the Intelgraph Analyst Assistant. Use the provided context to help the analyst.\n' +
      `Context: ${JSON.stringify(context)}`;

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.2
      },
      {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      }
    );

    return response.data?.choices?.[0]?.message?.content || '';
  }
}

