const Campground = require('../../models/Campground');
const Booking = require('../../models/Booking');

const createCampgroundAndBooking = async (userId, overrides = {}) => {
  const campground = await Campground.create({
    name: overrides.campgroundName || 'Test Camp',
    address: '123 Test Road, Chiang Mai',
    tel: '0812345678',
    picture: 'https://example.com/img.jpg',
  });

  // Default to yesterday so the "review only after checkout" rule is satisfied
  const yesterday = new Date();
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);

  const booking = await Booking.create({
    bookingDate: overrides.bookingDate || yesterday,
    nights: overrides.nights || 2,
    user: userId,
    campground: campground._id,
  });

  return { campground, booking };
};

const createBooking = async (userId, campgroundId, overrides = {}) => {
  const yesterday = new Date();
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);

  return await Booking.create({
    bookingDate: overrides.bookingDate || yesterday,
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
