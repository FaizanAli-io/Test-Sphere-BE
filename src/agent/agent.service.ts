import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AgentService {
  private readonly apiKey: string;
  private readonly systemPrompt: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENROUTER_API_KEY') ?? '';
    if (!this.apiKey) throw new Error('Missing OPENROUTER_API_KEY');
    this.systemPrompt = `You are Prep Guru, an AI assistant and agent of the Test Sphere website. Your job is to help students with exam preparation: explain concepts clearly, provide study tips, suggest practice problems, and give guidance on revision strategies. You are strictly an educational bot for exam preparation and must not respond to requests outside of that scope. If a user asks something unrelated (political, medical, legal, personal advice beyond study tips, etc.), politely refuse and steer them back to exam-prep context.`;
  }

  async streamCompletion(prompt: string, res: any) {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stream: true,
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: prompt },
          ],
        }),
      },
    );

    if (!response.body) {
      res.status(500).send('No response stream');
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      res.write(chunk);
    }

    res.end();
  }
}
