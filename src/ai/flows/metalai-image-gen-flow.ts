'use server';
/**
 * @fileOverview A MetalAI agent that generates images from text prompts.
 *
 * - metalAIImageGenerate - A function that handles image generation.
 * - MetalAIImageGenerateInput - The input type for the function.
 * - MetalAIImageGenerateOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MetalAIImageGenerateInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from.'),
});
export type MetalAIImageGenerateInput = z.infer<typeof MetalAIImageGenerateInputSchema>;

const MetalAIImageGenerateOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated image as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."),
  error: z.string().optional().describe("Error message if image generation failed."),
});
export type MetalAIImageGenerateOutput = z.infer<typeof MetalAIImageGenerateOutputSchema>;

export async function metalAIImageGenerate(input: MetalAIImageGenerateInput): Promise<MetalAIImageGenerateOutput> {
  return metalAIImageGenFlow(input);
}

const metalAIImageGenFlow = ai.defineFlow(
  {
    name: 'metalAIImageGenFlow',
    inputSchema: MetalAIImageGenerateInputSchema,
    outputSchema: MetalAIImageGenerateOutputSchema,
  },
  async (input) => {
    try {
      const {media, finishReason, usage} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // IMPORTANT: Specific model for image generation
        prompt: input.prompt,
        config: {
          responseModalities: ['IMAGE', 'TEXT'], // Must include TEXT even if only IMAGE is primary
           safetySettings: [ // Example safety settings, adjust as needed
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ]
        },
      });

      if (media?.url) {
        return { imageDataUri: media.url };
      } else if (finishReason === 'SAFETY') {
         return { imageDataUri: '', error: "Image generation was blocked due to safety settings." };
      }
      return { imageDataUri: '', error: "Failed to generate image. No media URL returned." };
    } catch (err) {
      console.error("Error in image generation flow:", err);
      return { imageDataUri: '', error: (err instanceof Error ? err.message : "An unknown error occurred during image generation.") };
    }
  }
);