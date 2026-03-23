import OpenAI from 'openai';

export interface GeneratedQuestion {
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER';
  options?: string[];
  correctAnswer?: number;
  maxMarks?: number;
  image?: string;
}

export async function generateStructuredQuestions(
  apiKey: string,
  prompt: string,
): Promise<GeneratedQuestion[]> {
  const client = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' });

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional academic question generator. 
          Follow the user prompt exactly regarding count and topic.
          
          SCHEMA RULES:
          1. MULTIPLE_CHOICE: Requires 'options' and 'correctAnswer' (index).
          2. TRUE_FALSE: 'options' must be ["False", "True"]. 'correctAnswer' is 0 or 1.
          3. SHORT/LONG_ANSWER: Omit 'options' and 'correctAnswer'.
          4. All JSON must strictly follow the provided schema.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'generated_questions',
          strict: true,
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
                      enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER'],
                    },
                    options: {
                      type: ['array', 'null'],
                      items: { type: 'string' },
                    },
                    correctAnswer: { type: ['integer', 'null'] },
                    maxMarks: { type: 'integer' },
                    image: { type: 'string' },
                  },
                  required: ['text', 'type', 'options', 'correctAnswer', 'maxMarks', 'image'],
                  additionalProperties: false,
                },
              },
            },
            required: ['questions'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('AI returned an empty response.');

    const parsed = JSON.parse(content) as { questions: GeneratedQuestion[] };
    return processQuestions(parsed.questions);
  } catch (error) {
    console.error('Failed to generate questions:', error);
    throw new Error('Validation failed for generated questions.');
  }
}

export function processQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const typeOrder = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER'];

  const sortedQuestions = [...questions].sort((a, b) => {
    return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
  });

  return sortedQuestions.map((q) => {
    return q.type === 'MULTIPLE_CHOICE' && q.options && q.correctAnswer !== undefined
      ? shuffleMCQ(q)
      : q;
  });
}

function shuffleMCQ(question: GeneratedQuestion): GeneratedQuestion {
  const options = [...(question.options || [])];
  const correctValue = options[question.correctAnswer!];

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const newCorrectIndex = options.indexOf(correctValue);

  return { ...question, options, correctAnswer: newCorrectIndex };
}
