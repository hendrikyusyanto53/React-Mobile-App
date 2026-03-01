import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateCourseContent() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a structured e-learning course content for "Pengembangan Aplikasi Mobile dengan React" for XII SMK students. 
    Include 5 modules with titles and markdown content. 
    Also include a final exam with 10 multiple-choice questions.
    Format the output as a JSON object with the following structure:
    {
      "courseTitle": "Pengembangan Aplikasi Mobile dengan React",
      "modules": [
        { "id": "m1", "title": "...", "content": "markdown content..." },
        ...
      ],
      "exam": [
        { "id": "q1", "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0 },
        ...
      ]
    }`,
    config: {
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text || "{}");
}
