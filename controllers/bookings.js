const Booking = require("../models/Booking");
const Campground = require("../models/Campground");

// @desc    Get all bookings
// @route   GET /api/v1/bookings
// @route   GET /api/v1/campgrounds/:campgroundId/bookings
// @access  Private
exports.getBookings = async (req, res) => {
  try {
    let query;

    // admin เห็นทุกคน, user เห็นแค่ของตัวเอง
    if (req.user.role === "admin") {
      if (req.params.campgroundId) {
        query = Booking.find({ campground: req.params.campgroundId });
      } else {
        query = Booking.find();
      }
    } else {
      if (req.params.campgroundId) {
        query = Booking.find({
          campground: req.params.campgroundId,
          user: req.user.id,
        });
      } else {
        query = Booking.find({ user: req.user.id });
      }
    }

    const bookings = await query
      .populate({ path: "campground", select: "name address tel" })
      .populate({ path: "user", select: "name email tel" });

    res
      .status(200)
      .json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({ path: "campground", select: "name address tel" })
      .populate({ path: "user", select: "name email tel" });

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, msg: `No booking with id ${req.params.id}` });
    }

    if (
      req.user.role !== "admin" &&
      booking.user._id.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ success: false, msg: "Not authorized to view this booking" });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

exports.addBooking = async (req, res) => {
  try {
    req.body.campground = req.params.campgroundId;
    req.body.user = req.user.id;

    //check มี camp ไหม
    const campground = await Campground.findById(req.params.campgroundId);
    if (!campground) {
      return res
        .status(404)
        .json({ success: false, msg: "Can't find Campground" });
    }

    //check จองยัง (แอดมินจองซ้ำได้)
    const duplicate = await Booking.findOne({
      user: req.user.id,
      campground: req.params.campgroundId,
      bookingDate: { $gte: new Date() }
    });
    if (duplicate && req.user.role != "admin") {
      return res.status(400).json({
        success: false,
        msg: "You have already booked this campground",
      });
    }

    //check ควบคุมจำนวนครั้งการจอง (เว้นแอดมิน)
   const existing = await Booking.find({ 
    user: req.user.id,
    bookingDate: { $gte: new Date() }
});
if (existing.length >= 3 && req.user.role != "admin") {
    return res.status(400).json({
        success: false,
        msg: "Can't add your booking, hit the limit",
    });
}

    const booking = await Booking.create(req.body);

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    res.status(400).json({ success: false, msg: err.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, msg: `No booking with id ${req.params.id}` });
    }

    if (req.user.role !== "admin" && booking.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, msg: "Not authorized to update this booking" });
    }

    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(400).json({ success: false, msg: err.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, msg: `No booking with id ${req.params.id}` });
    }

    if (req.user.role !== "admin" && booking.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, msg: "Not authorized to delete this booking" });
    }

    await booking.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};
