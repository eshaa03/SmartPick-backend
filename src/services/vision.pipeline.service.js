import axios from "axios";
import { Buffer } from "buffer";

const HF_API_KEY = process.env.HF_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL;

export const detectFashionPipeline = async (imageDataUrl) => {

  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const response = await axios.post(
    "https://api-inference.huggingface.co/models/Salesforce/blip2-flan-t5-xl",
    buffer,
    {
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/octet-stream"
      },
      params: {
        wait_for_model: true
      },
      timeout: 30000
    }
  );

  // ✅ SAFE CAPTION EXTRACTION
  let caption = "";

  if (Array.isArray(response.data) && response.data.length > 0) {
    caption = String(response.data[0]?.generated_text || "");
  }
  else if (typeof response.data === "object") {
    caption = String(response.data?.generated_text || "");
  }

  caption = caption.toLowerCase().trim();

  console.log("PIPELINE CAPTION:", caption);

  // ✅ FALLBACK if caption empty
  if (!caption || caption.length < 3) {
    caption = "product";
  }

  // ✅ EXPANDED PRODUCT TYPE DETECTION
  let type = "product";
  if (/\b(shoe|shoes|sneaker|sneakers|trainer|trainers|boot|boots|sandal|sandals|heel|heels)\b/.test(caption))
    type = "shoes";
  else if (/\b(dress|gown|frock|maxi|midi)\b/.test(caption))
    type = "dress";
  else if (/\b(shirt|blouse|top|t-?shirt|tee|hoodie|jacket|kurti|tunic)\b/.test(caption))
    type = "top";
  else if (/\b(bag|bags|handbag|handbags|backpack|backpacks|purse|tote|wallet|clutch)\b/.test(caption))
    type = "bag";
  else if (/\b(phone|iphone|mobile|smartphone|android)\b/.test(caption))
    type = "phone";
  else if (/\b(laptop|notebook|macbook)\b/.test(caption))
    type = "laptop";
  else if (/\b(watch|smartwatch)\b/.test(caption))
    type = "watch";
  else if (/\b(headphone|headphones|earphone|earphones|earbud|earbuds|airpods|headset)\b/.test(caption))
    type = "headphones";
  else if (/\b(tablet|ipad)\b/.test(caption))
    type = "tablet";
  else if (/\b(camera|dslr|mirrorless)\b/.test(caption))
    type = "camera";
  else if (/\b(keyboard|mouse)\b/.test(caption))
    type = "accessory";


  // ✅ EXPANDED COLOR DETECTION
  const color =
    caption.match(
      /\b(black|white|blue|red|green|pink|yellow|grey|gray|brown|orange|purple|beige|silver|gold)\b/
    )?.[0] || "";


  // ✅ GENDER DETECTION
  let gender = "unisex";

  if (/women|woman|female|girl|lady/.test(caption))
    gender = "women";

  else if (/men|man|male|boy|gentleman/.test(caption))
    gender = "men";


  return {
    caption,
    fashion: {
      type,
      color,
      gender,
      raw_caption: caption
    }
  };

};
