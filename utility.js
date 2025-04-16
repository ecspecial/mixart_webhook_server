
const FormData = require('form-data');
const fetch = require('node-fetch');

app.get('/service/internal/generate-model-images', async (req, res) => {
    console.log('🚀 Triggering default image generation for ready models with missing model_image');
  
    try {
      const users = await User.find({ 'modelMap.status': 'ready' });
  
      let triggered = 0;
  
      for (const user of users) {
        for (const model of user.modelMap) {
          if (model.status === 'ready' && !model.model_image) {
            const form = new FormData();
            form.append("api_key", '123321');
            form.append("id_gen", model.id_gen);
            form.append("type_gen", "txt2img");
            form.append("type_user", user.subscription === 'Free' ? 'free' : 'vip');
            form.append("webhook", 'https://mixart.ai/service/webhook/skin/default/image');
            form.append("loras", `${model.name_lora}.safetensors:1`);
            form.append("prompt", "head profile looking forward, clear background, face in day light.");
            form.append("resolution", "1280x1280");
  
            try {
              const response = await fetch('http://141.95.126.33:28030/image/gen', {
                method: 'POST',
                headers: { "api_key": '123321' },
                body: form
              });
  
              const text = await response.text();
              console.log(`📡 Sent model ${model.id_gen}: ${response.status} — ${text}`);
  
              if (response.ok) triggered++;
            } catch (err) {
              console.error(`❌ Failed to trigger model ${model.id_gen}:`, err.message);
            }
          }
        }
      }
  
      res.status(200).json({ message: `✅ Triggered ${triggered} model images.` });
    } catch (err) {
      console.error('❌ Error scanning users:', err);
      res.status(500).json({ error: err.message });
    }
});