export async function analyzeIssueImage(base64Image: string, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('MOCK_KEY')) {
    throw new Error('Valid Gemini API key is missing. Please add it to your .env file.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "You are an expert civic infrastructure inspector. Analyze this image of a reported issue in a city. \n\n1. Identify the most accurate category from: Road Damage, Waste Issue, Street Light, Vandalism, Water Leak, Other Issue.\n2. Create a concise, professional title for the report.\n3. Provide a detailed, objective description of the damage or issue observed.\n4. Estimate the severity (Low, Moderate, Critical) based on public safety and infrastructure impact.\n\nReturn the analysis STRICTLY as a raw JSON object.",
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: "object",
            properties: {
              category: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              severity: { type: "string" },
            },
            required: ["category", "title", "description", "severity"],
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API Error:", errorText);
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return JSON.parse(rawText);
}
