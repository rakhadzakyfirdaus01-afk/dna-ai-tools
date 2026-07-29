import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_DEBUGGER_API_KEY!,
});

export async function askDebugger(prompt: string) {
  const result = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
  });

  return result.text ?? "";
}