import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_IMAGE_PROMPT_API_KEY!,
});

type ImagePromptInput = {
  prompt: string;
  image: {
    mimeType: string;
    data: string;
  };
};

export async function askImagePrompt({
  prompt,
  image,
}: ImagePromptInput) {
  const result = await ai.models.generateContent({
    model: "gemini-3.6-flash",

    contents: [
      {
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      },
      {
        text: `
You are an expert AI prompt engineer.

Analyze the uploaded image carefully.

Create one extremely detailed AI image generation prompt based on the image.

Additional user request:
${prompt}

Return ONLY the final prompt.
`,
      },
    ],
  });

  return result.text ?? "";
}