const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  bookingDate: {
    type: Date,
    required: [true, "Please add a booking date"],
  },
  nights: {
    type: Number,
    required: [true, "Please add number of nights"],
    min: 1,
    max: 3,
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
});

module.exports = mongoose.model("Booking", BookingSchema);
