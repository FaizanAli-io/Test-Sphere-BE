import OpenAI from 'openai';

export interface GeneratedQuestion {
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER';
  options?: string[]; // Only for MULTIPLE_CHOICE
  correctAnswer?: number; // Index for MCQs or 0/1 for TRUE_FALSE
  maxMarks?: number;
}

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: 'https://openrouter.ai/api/v1',
});

/**
 * Generate structured test questions using ChatGPT (OpenRouter).
 * Matches GeneratedQuestion interface (without testId).
 *
 * @param {string} prompt - The topic or instructions for the questions.
 * @returns {Promise<GeneratedQuestion[]>} Structured question list.
 */
export async function generateStructuredQuestions(
  prompt: string,
): Promise<GeneratedQuestion[]> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an educational content generator for a school testing platform.
Output valid JSON ONLY that follows the provided schema strictly.
Rules:
- Include 'options' ONLY for MULTIPLE_CHOICE questions.
- 'correctAnswer' is an index. For MCQs it starts at 0, TRUE_FALSE: 0 for False, 1 for True.
- Include 'correctAnswer' ONLY for MULTIPLE_CHOICE and TRUE_FALSE questions. 
- LONG_ANSWER and SHORT_ANSWER questions do NOT have options or correctAnswer.
- Each question must be realistic and suitable for academic testing.`,
      },
      {
        role: 'user',
        content: `${prompt}.
Return your response as a JSON object under { "questions": [...] }`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'generated_questions',
        schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: [
                      'MULTIPLE_CHOICE',
                      'TRUE_FALSE',
                      'SHORT_ANSWER',
                      'LONG_ANSWER',
                    ],
                  },
                  options: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  correctAnswer: { type: 'integer' },
                  maxMarks: { type: 'integer' },
                  image: { type: 'string' },
                },
                required: ['text', 'type'],
                additionalProperties: false,
              },
            },
          },
          required: ['questions'],
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No content returned from OpenAI response.');

  const structured = JSON.parse(content) as { questions: GeneratedQuestion[] };
  return structured.questions;
}
