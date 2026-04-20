const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: [true, "Please add a rating"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must not exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be an integer",
      },
    },
    comment: {
      type: String,
      required: [true, "Please add a comment"],
      minlength: [1, "Comment must be at least 1 character"],
      maxlength: [1000, "Comment must not exceed 1000 characters"],
      trim: true,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    campground: {
      type: mongoose.Schema.ObjectId,
      ref: "Campground",
      required: true,
    },
    booking: {
      type: mongoose.Schema.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Review", ReviewSchema);
