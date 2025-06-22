const mongoose = require('mongoose');
const crypto = require('crypto');
const { Schema, model, models } = mongoose;

const UserSchema = new Schema({
  email: {
    type: String,
    unique: true,
    required: [true, "Email is required"],
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email is invalid"],
  },
  password: {
    type: String,
    select: false,
    minLength: [8, "Password must be at least 8 characters long"],
  },
  name: {
    type: String,
    required: [true, "Fullname is required"],
  },
  authMethod: {
    type: String,
    required: true,
    enum: ["google", "email"],
  },
  subscription: {
    type: String,
    required: [true, "Subscription type is required"],
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailToken: {
    type: String,
    default: null,
  },
  credits: {
    type: Number,
    default: null,
  },
  favorites: {
    type: [String],
    default: [],
  },
  favoriteModels: {
    type: [String],
    default: [],
  },
  referralCode: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(8).toString("hex"),
  },
  referredBy: {
    type: String,
    default: null,
  },
  referredByTime: {
    type: Date,
    default: null,
  },
  referrals: {
    type: [String],
    default: [],
  },
  referralsTime: {
    type: [Date],
    default: [],
  },
  visitedSocials: {
    type: [String],
    default: [],
  },
  feedbackSubmitted: {
    type: Boolean,
    default: false,
  },
  feedbackSubmittedTime: {
    type: Date,
    default: null,
  },
  feedbackRating: {
    type: Number,
    default: null,
  },
  feedback1: {
    type: String,
    default: null,
  },
  feedback2: {
    type: String,
    default: null,
  },
  serviceModalShown: {
    type: Boolean,
    default: false,
  },
  subscriptionId: {
    type: String,
    default: null,
  },
  subscriptionEndDate: {
    type: Date,
    default: null,
  },
  stripeSubscription: {
    type: Boolean,
    default: false,
  },
  stripeSubscriptionId: {
    type: String,
    default: null,
  },
  stripeCustomerId: {
    type: String,
    default: null,
  },
  subscriptionGtmSent: {
    type: Boolean,
    default: false,
  },
  registrationGtmSent: {
    type: Boolean,
    default: false,
  },
  stripe_payment_validation_in_process: {
    type: Boolean,
    default: false,
  },
  promotionTokensReceived: {
    type: Boolean,
    default: false,
  },
  fingerprintId: {
    type: String,
    default: null,
  },

  // ✅ LoRA modelMap with model_image field
  modelMap: {
    type: [
      {
        name: { type: String, required: true },
        id_gen: { type: String, required: true },
        name_lora: { type: String, required: true },
        gender: { type: String, required: true },
        status: {
          type: String,
          enum: ["generating", "ready"],
          required: true,
          default: "generating",
        },
        model_image: { type: String, default: null }, // ✅ model preview path
      },
    ],
    default: [],
  }
}, {
  timestamps: true,
});

const User = models.User || model('User', UserSchema);
module.exports = User;