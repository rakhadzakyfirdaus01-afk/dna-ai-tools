import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


export async function generateAnimation(
  prompt: string
) {
  const result =
    await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
Create an animation prompt based on:

${prompt}
              `,
            },
          ],
        },
      ],
    });


  return result.text ?? "";
}