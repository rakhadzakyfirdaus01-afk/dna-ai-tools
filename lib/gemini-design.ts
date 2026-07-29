import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_AI_DESIGN_API_KEY!,
});

export async function askDesign(prompt: string) {
  const interaction = await ai.interactions.create({
    model: "models/gemini-3.1-flash-lite-image",

    input: prompt,

    generation_config: {
  temperature: 1,
  max_output_tokens: 65536,
  top_p: 0.95,
  thinking_level: "low",
},

    response_modalities: [
      "image",
      "text",
    ],
  });

  let image: string | null = null;
  let text = "";

  if (interaction.steps) {
    for (const step of interaction.steps) {
      if (
        step.type === "model_output" &&
        step.content
      ) {
        for (const part of step.content) {
          if (part.type === "text") {
            text += part.text ?? "";
          }

          if (part.type === "image") {
            image = part.data ?? null;
          }
        }
      }
    }
  }

  return {
    image,
    text,
  };
}