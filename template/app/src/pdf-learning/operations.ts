import OpenAI from 'openai';
import { HttpError } from 'wasp/server';
import type { User } from 'wasp/entities';
import type {
  GenerateLearningQuestions,
  GenerateContentSummary,
  EnrichTechnicalContent
} from 'wasp/server/operations';
import * as z from 'zod';
import { SubscriptionStatus } from '../payment/plans';
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation';

// Reuse existing OpenAI setup from demo-ai-app
const openAi = setUpOpenAi();
function setUpOpenAi(): OpenAI {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } else {
    throw new Error('OpenAI API key is not set');
  }
}

// Enhanced learning questions generation for PDF content
const generateQuestionsSchema = z.object({
  content: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  questionCount: z.number().min(1).max(20).optional(),
  questionTypes: z.array(z.enum(['multiple-choice', 'true-false', 'open-ended', 'fill-blank'])).optional()
});

export const generateLearningQuestions: GenerateLearningQuestions<
  z.infer<typeof generateQuestionsSchema>,
  {
    questions: Array<{
      id: string;
      question: string;
      type: string;
      options?: string[];
      correctAnswer?: number | string;
      explanation?: string;
    }>;
    difficulty: string;
    totalQuestions: number;
  }
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const args = ensureArgsSchemaOrThrowHttpError(generateQuestionsSchema, rawArgs);

  // Check subscription status for AI features
  if (!isUserSubscribed(context.user) && context.user.credits <= 0) {
    throw new HttpError(402, 'User has not paid or is out of credits');
  }

  try {
    const completion = await openAi.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert educational content creator. Generate ${args.questionCount || 5} learning questions based on the provided content. 
          Create questions of difficulty level: ${args.difficulty || 'medium'}.
          Include a mix of question types: multiple-choice, true-false, and open-ended questions.
          For multiple-choice questions, provide 4 options and indicate the correct answer.
          For true-false questions, indicate the correct answer.
          Include brief explanations for the correct answers.`
        },
        {
          role: 'user',
          content: `Generate learning questions for this content:\n\n${args.content}`
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'generateQuestions',
            description: 'Generate structured learning questions',
            parameters: {
              type: 'object',
              properties: {
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      question: { type: 'string' },
                      type: { type: 'string', enum: ['multiple-choice', 'true-false', 'open-ended', 'fill-blank'] },
                      options: { type: 'array', items: { type: 'string' } },
                      correctAnswer: { type: ['number', 'string'] },
                      explanation: { type: 'string' }
                    },
                    required: ['id', 'question', 'type']
                  }
                }
              },
              required: ['questions']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'generateQuestions' } },
      temperature: 0.7
    });

    const result = completion.choices[0]?.message?.tool_calls?.[0]?.function.arguments;
    const parsedResult = result ? JSON.parse(result) : { questions: [] };

    // Decrement credits for non-subscribed users
    if (!isUserSubscribed(context.user)) {
      await context.entities.User.update({
        where: { id: context.user.id },
        data: { credits: { decrement: 1 } }
      });
    }

    return {
      questions: parsedResult.questions || [],
      difficulty: args.difficulty || 'medium',
      totalQuestions: parsedResult.questions?.length || 0
    };
  } catch (error) {
    console.error('Error generating learning questions:', error);
    throw new HttpError(500, 'Failed to generate learning questions');
  }
};

// Enhanced content summary generation
const generateSummarySchema = z.object({
  content: z.string().min(1),
  maxLength: z.number().positive().optional(),
  includeKeyPoints: z.boolean().optional(),
  includeLearningObjectives: z.boolean().optional()
});

export const generateContentSummary: GenerateContentSummary<
  z.infer<typeof generateSummarySchema>,
  {
    summary: string;
    keyPoints: string[];
    learningObjectives?: string[];
    wordCount: number;
  }
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const args = ensureArgsSchemaOrThrowHttpError(generateSummarySchema, rawArgs);

  // Check subscription status
  if (!isUserSubscribed(context.user) && context.user.credits <= 0) {
    throw new HttpError(402, 'User has not paid or is out of credits');
  }

  try {
    const completion = await openAi.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert content summarizer for educational materials. 
          Create a concise summary of the provided content (max ${args.maxLength || 300} words).
          ${args.includeKeyPoints ? 'Extract 5-7 key points.' : ''}
          ${args.includeLearningObjectives ? 'Identify 3-5 learning objectives.' : ''}
          Focus on the most important concepts and actionable insights.`
        },
        {
          role: 'user',
          content: `Summarize this content:\n\n${args.content}`
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'generateSummary',
            description: 'Generate structured content summary',
            parameters: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                keyPoints: { type: 'array', items: { type: 'string' } },
                learningObjectives: { type: 'array', items: { type: 'string' } }
              },
              required: ['summary', 'keyPoints']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'generateSummary' } },
      temperature: 0.5
    });

    const result = completion.choices[0]?.message?.tool_calls?.[0]?.function.arguments;
    const parsedResult = result ? JSON.parse(result) : { summary: '', keyPoints: [] };

    // Decrement credits for non-subscribed users
    if (!isUserSubscribed(context.user)) {
      await context.entities.User.update({
        where: { id: context.user.id },
        data: { credits: { decrement: 1 } }
      });
    }

    return {
      summary: parsedResult.summary || '',
      keyPoints: parsedResult.keyPoints || [],
      learningObjectives: parsedResult.learningObjectives,
      wordCount: parsedResult.summary?.split(' ').length || 0
    };
  } catch (error) {
    console.error('Error generating content summary:', error);
    throw new HttpError(500, 'Failed to generate content summary');
  }
};

// Enhanced technical content enrichment
const enrichContentSchema = z.object({
  content: z.string().min(1),
  domain: z.string().optional(),
  enrichmentTypes: z.array(z.enum(['definitions', 'examples', 'analogies', 'context'])).optional()
});

export const enrichTechnicalContent: EnrichTechnicalContent<
  z.infer<typeof enrichContentSchema>,
  {
    enrichedContent: string;
    additions: Array<{
      type: string;
      term?: string;
      definition?: string;
      title?: string;
      content?: string;
      position?: number;
    }>;
    domain: string;
    enrichmentCount: number;
  }
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const args = ensureArgsSchemaOrThrowHttpError(enrichContentSchema, rawArgs);

  // Check subscription status
  if (!isUserSubscribed(context.user) && context.user.credits <= 0) {
    throw new HttpError(402, 'User has not paid or is out of credits');
  }

  try {
    const completion = await openAi.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert technical content enhancer. 
          Analyze the provided content and add helpful enrichments such as:
          - Definitions for technical terms
          - Practical examples
          - Analogies for complex concepts
          - Additional context for better understanding
          Domain: ${args.domain || 'general'}
          Focus on making the content more accessible and educational.`
        },
        {
          role: 'user',
          content: `Enrich this technical content:\n\n${args.content}`
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'enrichContent',
            description: 'Enrich technical content with educational additions',
            parameters: {
              type: 'object',
              properties: {
                enrichedContent: { type: 'string' },
                additions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['definition', 'example', 'analogy', 'context'] },
                      term: { type: 'string' },
                      definition: { type: 'string' },
                      title: { type: 'string' },
                      content: { type: 'string' },
                      position: { type: 'number' }
                    },
                    required: ['type', 'content']
                  }
                }
              },
              required: ['enrichedContent', 'additions']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'enrichContent' } },
      temperature: 0.6
    });

    const result = completion.choices[0]?.message?.tool_calls?.[0]?.function.arguments;
    const parsedResult = result ? JSON.parse(result) : { enrichedContent: args.content, additions: [] };

    // Decrement credits for non-subscribed users
    if (!isUserSubscribed(context.user)) {
      await context.entities.User.update({
        where: { id: context.user.id },
        data: { credits: { decrement: 1 } }
      });
    }

    return {
      enrichedContent: parsedResult.enrichedContent || args.content,
      additions: parsedResult.additions || [],
      domain: args.domain || 'general',
      enrichmentCount: parsedResult.additions?.length || 0
    };
  } catch (error) {
    console.error('Error enriching technical content:', error);
    throw new HttpError(500, 'Failed to enrich technical content');
  }
};

// Note: Additional operations like processPDFToModule and getUserDashboardData
// can be added to main.wasp when needed. For now, we focus on the core AI operations
// that enhance the existing PDF processing and learning module functionality.

// Helper function to check subscription status (reused from demo-ai-app)
function isUserSubscribed(user: User) {
  return (
    user.subscriptionStatus === SubscriptionStatus.Active ||
    user.subscriptionStatus === SubscriptionStatus.CancelAtPeriodEnd
  );
}