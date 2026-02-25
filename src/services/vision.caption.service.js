import axios from "axios";
import { Buffer } from "buffer";

const HF_API =
"https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large";

export const generateCaption = async (imageDataUrl) => {

  try {

    const base64 = imageDataUrl.split(",")[1];

    const buffer = Buffer.from(base64, "base64");

    const response = await axios.post(
      HF_API,
      buffer,
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/octet-stream",
        },
        params: {
          wait_for_model: true
        },
        timeout: 30000
      }
    );

    // ✅ SAFE EXTRACTION (handles both response formats)
    let caption = "";

    if (Array.isArray(response.data) && response.data.length > 0) {
      caption = response.data[0]?.generated_text || "";
    }
    else if (typeof response.data === "object") {
      caption = response.data?.generated_text || "";
    }

    caption = String(caption).toLowerCase().trim();

    console.log("HF CAPTION:", caption);

    return caption;

  } catch (error) {

    console.log("HF CAPTION ERROR:", error.message);

    return "";

  }

};