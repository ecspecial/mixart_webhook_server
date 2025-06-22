const FormData = require('form-data');  // Import form-data library
const fetch = require('node-fetch');    // Import node-fetch for making HTTP requests

const CLO_GEN_URL = process.env.LORA_GEN_URL_LORA;
const IMAGE_API_KEY = process.env.IMAGE_API_KEY;
const CLO_WEBHOOK_URL = process.env.NEXT_PUBLIC_CLO_WEBHOOK_SKIN_DEFAULT_IMAGE; // update for new webhook

async function generateDefaultImageForModel({ id_gen, name_lora, gender }) {
    console.log('id_gen, name_lora, gender', id_gen, name_lora, gender)
  const form = new FormData();
  form.append("api_key", IMAGE_API_KEY);
  form.append("id_gen", id_gen);
  form.append("type_gen", "txt2img");
  form.append("type_user", "vip");
  form.append("webhook", CLO_WEBHOOK_URL);
  form.append("loras", `${name_lora}.safetensors:1`);
  form.append("prompt", "head profile looking forward, clear background, face in daylight.");
  form.append("resolution", "1280x1280");
  if (gender) {
    form.append('gender', gender);
  }

  try {
    const res = await fetch(CLO_GEN_URL, {
      method: "POST",
      headers: {
        ...form.getHeaders(),
        "api_key": IMAGE_API_KEY,
      },
      body: form,
    });

    const text = await res.text();
    console.log("📡 Default model image response:", res.status, text);

    if (!res.ok) {
      throw new Error(`Default model image gen failed: ${res.status} - ${text}`);
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      return { raw: text };
    }
  } catch (error) {
    console.error("❌ Error during image generation:", error);
    throw error;
  }
}

module.exports = { generateDefaultImageForModel };