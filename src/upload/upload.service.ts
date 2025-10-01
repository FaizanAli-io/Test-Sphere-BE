import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import pdfParse from 'pdf-parse';
import { OpenAI } from 'openai';
import csv from 'csv-parser';

export interface QuestionGenerationRequest {
  numberOfMultipleChoice: number;
  numberOfTrueFalse: number;
  numberOfShortAnswer: number;
}

export interface GeneratedQuestion {
  text: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options: string[];
  answer: string | boolean;
}

export interface ChatbotRequest {
  topic: string;
  number: number;
  types: {
    multipleChoice?: number;
    trueFalse?: number;
    shortAnswer?: number;
  };
}

@Injectable()
export class UploadService {
  private openaiClient?: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('OPENROUTER_API_KEY');
    if (apiKey) {
      this.openaiClient = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey,
      });
    }
  }

  async processPdfFile(
    filePath: string,
    questionRequest: QuestionGenerationRequest,
  ): Promise<GeneratedQuestion[]> {
    try {
      // Read and parse PDF
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      const text = data.text;

      // Generate questions using OpenAI
      const questions = await this.generateQuestionsWithOpenAI(
        text,
        questionRequest.numberOfMultipleChoice,
        questionRequest.numberOfTrueFalse,
        questionRequest.numberOfShortAnswer,
      );

      // Clean up uploaded file
      this.cleanupFile(filePath);

      return questions;
    } catch (error) {
      // Clean up file in case of error
      this.cleanupFile(filePath);
      throw new BadRequestException('Failed to process PDF file');
    }
  }

  private async generateQuestionsWithOpenAI(
    text: string,
    numberOfMultipleChoice: number,
    numberOfTrueFalse: number,
    numberOfShortAnswer: number,
  ): Promise<GeneratedQuestion[]> {
    if (!this.openaiClient) {
      throw new BadRequestException('OpenAI API key not configured');
    }

    try {
      const systemMessage = `
        You are an intelligent question generator for a student learning platform. 
        Generate questions based on the given text and the specified distribution of question types. 
        Provide the output in JSON format as an array of objects. 
        Each object should have:
        - "text": The question text.
        - "type": The type of the question ("multiple-choice", "true-false", "short-answer").
        - "options": An array of options (if type is "multiple-choice"), or an empty array for "true-false" and "short-answer").
        - "answer": The correct answer (true/false for true-false questions, correct option for multiple-choice, or a text answer for short-answer questions).
      `;

      const userMessage = `
        Generate questions based on the following text:\n\n${text}\n\n
        The distribution of question types should be:
        - ${numberOfMultipleChoice} multiple-choice questions
        - ${numberOfTrueFalse} true/false questions
        - ${numberOfShortAnswer} short-answer questions
      `;

      const completion = await this.openaiClient.chat.completions.create(
        {
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: [
            {
              role: 'system',
              content: systemMessage,
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        },
        {
          headers: {
            'HTTP-Referer': this.configService.get('YOUR_SITE_URL') || '',
            'X-Title': this.configService.get('YOUR_SITE_NAME') || '',
          },
        },
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      // Parse the JSON response
      const questions = JSON.parse(content);
      return questions as GeneratedQuestion[];
    } catch (error) {
      console.error('Error generating questions with OpenAI:', error);
      throw new BadRequestException('Failed to generate questions');
    }
  }

  async generateChatbotQuestions(
    request: ChatbotRequest,
  ): Promise<GeneratedQuestion[]> {
    if (!this.openaiClient) {
      throw new BadRequestException('OpenAI API key not configured');
    }

    if (!request.topic || !request.number || !request.types) {
      throw new BadRequestException('Topic, number, and types are required');
    }

    try {
      console.log(
        'Sending request to the chatbot with topic:',
        request.topic,
        'number:',
        request.number,
        'and types:',
        request.types,
      );

      const systemMessage = `
        You are an intelligent question generator for a student learning platform. 
        Generate questions based on the given topic and question type distribution. 
        Provide the output in JSON format as an array of objects. 
        Each object should have:
        - "text": The question text.
        - "type": The type of the question ("multiple-choice", "true-false", "short-answer").
        - "options": An array of options (if type is "multiple-choice"), or an empty array for "true-false" and "short-answer").
        - "answer": The correct answer (true/false for true-false questions, correct option for multiple-choice, or a text answer for short-answer questions).
      `;

      const userMessage = `
        Generate questions about the topic: "${request.topic}". 
        The distribution of question types is as follows:
        - ${request.types.multipleChoice || 0} multiple-choice questions
        - ${request.types.trueFalse || 0} true/false questions
        - ${request.types.shortAnswer || 0} short-answer questions
      `;

      const completion = await this.openaiClient.chat.completions.create(
        {
          model: 'deepseek/deepseek-r1:free',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 20000,
          temperature: 0.7,
          top_p: 0.9,
          frequency_penalty: 0.2,
          presence_penalty: 0.2,
        },
        {
          headers: {
            'HTTP-Referer': this.configService.get('YOUR_SITE_URL') || '',
            'X-Title': this.configService.get('YOUR_SITE_NAME') || '',
          },
        },
      );

      console.log('Response from chatbot:', completion);

      const rawData = completion.choices[0]?.message?.content;
      if (!rawData) {
        throw new Error('No content received from chatbot');
      }

      let jsonString: string;

      if (rawData.startsWith('```json') && rawData.endsWith('```')) {
        jsonString = rawData.slice(7, -3).trim();
      } else if (rawData.startsWith('```') && rawData.endsWith('```')) {
        jsonString = rawData.slice(3, -3).trim();
      } else {
        jsonString = rawData;
      }

      const questions = JSON.parse(jsonString);

      if (!Array.isArray(questions)) {
        throw new Error(
          'Invalid response format from the chatbot. Expected an array of questions.',
        );
      }

      const formattedQuestions = questions.map((question, index) => ({
        questionNumber: index + 1,
        text: question.text || `Question ${index + 1} is incomplete.`,
        type: question.type || 'short-answer',
        options: question.options || [],
        answer:
          question.type === 'multiple-choice'
            ? question.answer
            : question.type === 'true-false'
              ? question.answer.toString()
              : question.answer || 'No answer provided.',
      }));

      console.log('Formatted response being sent to frontend:', {
        questions: formattedQuestions,
      });
      return formattedQuestions;
    } catch (error) {
      console.error('Error communicating with the chatbot:', error);
      throw new BadRequestException(
        `Error communicating with the chatbot: ${error.message}`,
      );
    }
  }

  async processCsvFile(filePath: string): Promise<GeneratedQuestion[]> {
    const questions: GeneratedQuestion[] = [];
    let processingError: Error | null = null;

    try {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            try {
              const question: GeneratedQuestion = {
                text: row.question || row.text,
                type: (row.type || 'multiple_choice') as
                  | 'multiple-choice'
                  | 'true-false'
                  | 'short-answer',
                options: row.options
                  ? typeof row.options === 'string'
                    ? JSON.parse(row.options)
                    : row.options
                  : [],
                answer: row.answer,
              };
              questions.push(question);
            } catch (parseError) {
              processingError = parseError as Error;
              reject(parseError);
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // Clean up uploaded file
      this.cleanupFile(filePath);

      return questions;
    } catch (error) {
      // Clean up file in case of error
      this.cleanupFile(filePath);

      const errorMessage = processingError
        ? 'Invalid CSV format'
        : 'Failed to process CSV file';

      throw new BadRequestException(
        `${errorMessage}: ${(processingError || error).message}`,
      );
    }
  }

  async parseQuestionsFromPdf(filePath: string): Promise<GeneratedQuestion[]> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      const questions = this.parseQuestionsFromText(data.text);

      // Clean up uploaded file
      this.cleanupFile(filePath);

      return questions;
    } catch (error) {
      // Clean up file in case of error
      this.cleanupFile(filePath);
      throw new BadRequestException('Failed to process PDF file');
    }
  }

  private parseQuestionsFromText(text: string): GeneratedQuestion[] {
    const questions: GeneratedQuestion[] = [];
    const questionBlocks = text.split(/\n\s*\n/);

    questionBlocks.forEach((block) => {
      if (block.trim()) {
        const lines = block.split('\n').filter((line) => line.trim());
        if (lines.length > 0) {
          const question: GeneratedQuestion = {
            text: lines[0],
            type: this.detectQuestionType(lines),
            options: this.extractOptions(lines),
            answer: this.extractAnswer(lines),
          };
          questions.push(question);
        }
      }
    });

    return questions;
  }

  private detectQuestionType(
    lines: string[],
  ): 'multiple-choice' | 'true-false' | 'short-answer' {
    if (lines.some((line) => line.includes('True') || line.includes('False'))) {
      return 'true-false';
    } else if (lines.length > 2) {
      return 'multiple-choice';
    }
    return 'short-answer';
  }

  private extractOptions(lines: string[]): string[] {
    if (lines.length <= 2) return [];
    return lines
      .slice(1, -1)
      .map((line) => line.replace(/^[a-zA-Z]\)\s*/, '').trim());
  }

  private extractAnswer(lines: string[]): string {
    const lastLine = lines[lines.length - 1];
    if (lastLine.startsWith('Answer:')) {
      return lastLine.replace('Answer:', '').trim();
    }
    return lastLine.trim();
  }

  private cleanupFile(filePath: string): void {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
      } else {
        console.log('File deleted successfully.');
      }
    });
  }

  async extractQuestionsFromPdf(file: any) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    try {
      const questions = await this.parseQuestionsFromPdf(file.path);
      this.cleanupFile(file.path);
      return { success: true, questions };
    } catch (error) {
      this.cleanupFile(file.path);
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  async extractQuestionsFromCsv(file: any) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    try {
      const questions = await this.processCsvFile(file.path);
      this.cleanupFile(file.path);
      return { success: true, questions };
    } catch (error) {
      this.cleanupFile(file.path);
      throw new Error(`CSV processing failed: ${error.message}`);
    }
  }
}
