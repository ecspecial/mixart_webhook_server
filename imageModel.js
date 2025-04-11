const mongoose = require('mongoose');
const { Schema, model, models } = mongoose;

const ImageSchema = new Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type_gen: { type: String, required: true },
  model: { type: String, required: true },
  steps: { type: Number, required: true },
  cfg: { type: Number, required: true },
  denoise: { type: Number, required: true },
  weights_interpretator: { type: String, required: true },
  upscale: { type: String, required: true },
  facelock_weight: { type: Number, required: true },
  facelock_type: { type: String, required: true },
  pose_weight: { type: Number, required: true },
  inpaint_what: { type: String, required: true },
  prompt: { type: String, required: true },
  size: { type: String, required: true },
  host_gen: { type: String, default: null },
  time_gen: { type: String, default: null },
  age: { type: String, default: null },
  gender: { type: String, default: null },
  ethnicity: { type: String, default: null },
  style: { type: String, required: true },
  tool: { type: String, required: true },
  pipeline: { type: String, required: true },
  neg_prompt: { type: String, default: null },
  loras: { type: String, required: true },
  res_image: { type: String, default: null },
  favorite: { type: Boolean, default: false },
  cost: { type: Number },
  user_shared_settings: { type: Boolean, default: false },
  shared_gallery: { type: Boolean, default: false },
  gallery_image_likes: { type: Number, default: 0 },
  category: { type: String, default: null },
  status: { type: String, default: null },
}, {
  timestamps: true
});

const Image = models.Image || model('Image', ImageSchema);
module.exports = Image;