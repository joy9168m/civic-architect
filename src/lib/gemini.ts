import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeIssueImage(base64Image: string, mimeType: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: "You are an expert civic infrastructure inspector. Analyze this image of a reported issue in a city. \n\n1. Identify the most accurate category from: Road Damage, Waste Issue, Street Light, Vandalism, Water Leak, Other Issue.\n2. Create a concise, professional title for the report.\n3. Provide a detailed, objective description of the damage or issue observed.\n4. Estimate the severity (Low, Moderate, Critical) based on public safety and infrastructure impact.\n\nReturn the analysis in JSON format.",
          },
        ],
      },
    ],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["Low", "Moderate", "Critical"] },
        },
        required: ["category", "title", "description", "severity"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}
