import axios from "axios";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export const rerankWithGroq = async ({ query, products }) => {

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || !Array.isArray(products) || products.length === 0) {
    return products;
  }

  const model =
    process.env.GROQ_MODEL ||
    "llama-3.3-70b-versatile";

  const maxItems =
    Number(process.env.GROQ_RERANK_LIMIT || 12);

  const candidates =
    products
      .slice(0, maxItems)
      .map(p => ({
        id: p._id,
        title: p.title,
        price: p.price,
        rating: p.rating,
        reviews: p.reviews,
        platform: p.platform,
      }));

  const system =
    "You are an intelligent shopping assistant that ranks products based on how well they match the user's image description and intent. Return only JSON.";

  const user = [
    `User shopping intent derived from image or query: "${query || ""}"`,
    "",
    "Your task:",
    "- Rank products based on semantic similarity to the intent.",
    "- Consider product type, category, color, style, and purpose.",
    "- Rank across ALL product categories including fashion, electronics, gadgets, phones, laptops, accessories, bags, and more.",
    "",
    "Return STRICT JSON array format:",
    "[{\"id\": \"product_id\", \"score\": 0-100, \"reason\": \"short explanation\"}]",
    "",
    "Scoring rules:",
    "100 = perfect match",
    "80–99 = very strong match",
    "60–79 = good match",
    "40–59 = partial match",
    "0–39 = weak match",
    "",
    "Products:",
    JSON.stringify(candidates)
  ].join("\n");

  try {

    const response = await axios.post(
      GROQ_API_URL,
      {
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: system
          },
          {
            role: "user",
            content: user
          }
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const content =
      response?.data?.choices?.[0]?.message?.content || "";

    if (!content) {
      return products;
    }

    const jsonText =
      content
        .trim()
        .replace(/^```json/i, "")
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();

    let parsed;

    try {
      parsed = JSON.parse(jsonText);
    }
    catch {
      console.error("GROQ JSON PARSE FAILED");
      return products;
    }

    if (!Array.isArray(parsed)) {
      return products;
    }

    const scoreMap = new Map();
    const reasonMap = new Map();

    for (const item of parsed) {

      if (!item || item.id == null) continue;

      const score = Number(item.score);

      if (Number.isFinite(score)) {
        scoreMap.set(String(item.id), score);
      }

      if (typeof item.reason === "string") {
        reasonMap.set(String(item.id), item.reason);
      }

    }

    const merged =
      products.map(p => {

        const key = String(p._id);

        const score =
          scoreMap.get(key);

        const reason =
          reasonMap.get(key);

        return {
          ...p,

          aiScore:
            Number.isFinite(score)
              ? Math.max(1, Math.min(Math.round(score), 100))
              : p.aiScore,

          aiReason:
            reason || p.aiReason,
        };

      });

    return merged.sort(
      (a, b) =>
        (b.aiScore || 0) -
        (a.aiScore || 0)
    );

  }
  catch (err) {

    const status =
      err?.response?.status;

    const data =
      err?.response?.data;

    console.error(
      "GROQ RERANK ERROR:",
      status || err.message,
      data || ""
    );

    return products;

  }

};