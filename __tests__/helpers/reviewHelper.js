const Campground = require('../../models/Campground');
const Booking = require('../../models/Booking');

const createCampgroundAndBooking = async (userId, overrides = {}) => {
  const campground = await Campground.create({
    name: overrides.campgroundName || 'Test Camp',
    address: '123 Test Road, Chiang Mai',
    tel: '0812345678',
    picture: 'https://example.com/img.jpg',
  });

  const booking = await Booking.create({
    bookingDate: overrides.bookingDate || new Date(),
    nights: overrides.nights || 2,
    user: userId,
    campground: campground._id,
  });

  return { campground, booking };
};

const createBooking = async (userId, campgroundId, overrides = {}) => {
  return await Booking.create({
    bookingDate: overrides.bookingDate || new Date(),
    nights: overrides.nights || 2,
    user: userId,
    campground: campgroundId,
  });
};

const buildReviewPayload = (bookingId, overrides = {}) => ({
  rating: 4,
  comment: 'Great stay, very peaceful and clean.',
  booking: bookingId,
  ...overrides,
});

module.exports = { createCampgroundAndBooking, createBooking, buildReviewPayload };
