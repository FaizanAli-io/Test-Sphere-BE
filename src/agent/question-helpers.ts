import OpenAI from 'openai';

export interface GeneratedQuestion {
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER';
  options?: string[]; // Only for MULTIPLE_CHOICE
  correctAnswer?: number; // Index for MCQs or 0/1 for TRUE_FALSE
  maxMarks?: number;
  image?: string;
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
        content: `
You are a professional academic question generator for a school testing system.

### OBJECTIVE:
Generate questions that follow the user's prompt *exactly* and do not deviate in:
- Number of questions
- Question type(s)
- Topic or subject
- Mark allocation
- Formatting or numbering (if specified)

### RULES:
1. **Follow the user's prompt literally.**  
   - If they ask for 4 MCQs, generate 4 MCQs only — not any other type.
   - If they specify marks, include them exactly as stated.
   - If they specify question numbering or a topic, match it precisely.

2. **Never add your own interpretation** or variety unless explicitly requested.
3. **Output JSON ONLY** following the schema strictly — no text, no explanations.
4. **Include "options" only for MULTIPLE_CHOICE.**
5. **Include "correctAnswer" only for MULTIPLE_CHOICE and TRUE_FALSE.**
6. **For TRUE_FALSE:** correctAnswer = 0 (False) or 1 (True).
7. **For SHORT_ANSWER / LONG_ANSWER:** omit "options" and "correctAnswer".
8. Each question must be clear, realistic, and academically relevant.
9. If the prompt mentions images or diagrams, include an image URL field (may be empty string if unspecified).

### OUTPUT FORMAT:
Return valid JSON strictly under this structure:
{
  "questions": [
    {
      "text": string,
      "type": "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER",
      "options"?: string[],
      "correctAnswer"?: number,
      "maxMarks"?: number,
      "image"?: string
    }
  ]
}
        `,
      },
      {
        role: 'user',
        content: `USER PROMPT: ${prompt}`,
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
