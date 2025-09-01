import axios from 'axios';
export default class AssistantService {
    constructor(apiKey = process.env.OPENAI_API_KEY || '', baseUrl = 'https://api.openai.com/v1') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    async chat(message, context) {
        const systemPrompt = 'You are the Intelgraph Analyst Assistant. Use the provided context to help the analyst.\n' +
            `Context: ${JSON.stringify(context)}`;
        const response = await axios.post(`${this.baseUrl}/chat/completions`, {
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            temperature: 0.2
        }, {
            headers: { Authorization: `Bearer ${this.apiKey}` }
        });
        return response.data?.choices?.[0]?.message?.content || '';
    }
}
//# sourceMappingURL=AssistantService.js.map