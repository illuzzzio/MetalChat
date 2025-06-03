
'use server';
/**
 * @fileOverview A MetalAI agent that responds to user chat messages.
 *
 * - metalAIChat - A function that handles the chat interaction.
 * - MetalAIChatInput - The input type for the metalAIChat function.
 * - MetalAIChatOutput - The return type for the metalAIChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MetalAIChatInputSchema = z.object({
  userInput: z.string().describe('The user message to which MetalAI should respond.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({ text: z.string() })),
  })).optional().describe('Previous conversation history if any.')
});
export type MetalAIChatInput = z.infer<typeof MetalAIChatInputSchema>;

const MetalAIChatOutputSchema = z.object({
  aiResponse: z.string().describe('The text response from MetalAI.'),
});
export type MetalAIChatOutput = z.infer<typeof MetalAIChatOutputSchema>;

export async function metalAIChat(input: MetalAIChatInput): Promise<MetalAIChatOutput> {
  return metalAIChatFlow(input);
}

const metalAIChatFlow = ai.defineFlow(
  {
    name: 'metalAIChatFlow',
    inputSchema: MetalAIChatInputSchema,
    outputSchema: MetalAIChatOutputSchema,
  },
  async (input) => {
    const model = ai.getModel('googleai/gemini-2.0-flash'); // Uses the default model from genkit.ts

    const history = input.chatHistory || [];
    const messages = [
      ...history,
      { role: 'user' as const, parts: [{ text: input.userInput }] },
    ];
    
    const response = await model.generate({
        messages: messages,
        config: {
            // You can add safety settings or other config here if needed
        }
    });

    const aiResponse = response.text ?? "Sorry, I couldn't generate a response.";
    return { aiResponse };
  }
);
