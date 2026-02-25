import axios from "axios";

export const analyzeFashionWithGroq = async (caption) => {

  try {

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",

        temperature: 0.1,

        response_format: { type: "json_object" },

        messages: [
          {
            role: "system",
            content:
`You are a fashion expert AI.

Extract attributes and return ONLY JSON:

type
color
material
pattern
sleeve
neckline
fit
gender
occasion
confidence`
          },
          {
            role: "user",
            content: caption
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return JSON.parse(
      response.data.choices[0].message.content
    );

  } catch {

    return {};

  }

};
