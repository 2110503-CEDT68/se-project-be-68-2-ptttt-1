const mongoose = require("mongoose");

const CampgroundSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      unique: true,
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Please add an address"],
      trim: true,
    },
    tel: {
      type: String,
      required: [true, "Please add a telephone number"],
      trim: true,
    },
    picture: {
      type: String,
      required: [true, "Please add a picture"],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: (v) => Math.round(v * 100) / 100,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Reverse populate with virtuals
CampgroundSchema.virtual("bookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "campground",
  justOne: false,
});

CampgroundSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "campground",
  justOne: false,
});

module.exports = mongoose.model("Campground", CampgroundSchema);
