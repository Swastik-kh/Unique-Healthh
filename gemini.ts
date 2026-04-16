import { GoogleGenAI } from "@google/genai";

/**
 * Gemini AI Interaction logic.
 * Strictly adheres to @google/genai initialization rules using process.env.API_KEY.
 */
export const askGemini = async (prompt: string) => {
  // Use new GoogleGenAI({ apiKey: process.env.API_KEY }) as per system requirements.
  // The value is injected/mapped via the vite.config.ts 'define' block.
  // @ts-ignore - handled by vite define
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Access .text property directly as per latest SDK guidelines
    return response.text || "No response received.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI सँग जडान हुन सकेन। कृपया इन्टरनेट र सेटिङ जाँच गर्नुहोस्।";
  }
};