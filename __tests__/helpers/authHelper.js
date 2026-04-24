const jwt = require('jsonwebtoken');
const User = require('../../models/User');

/**
 * Create a test user and return a signed JWT token
 */
const createUserAndToken = async (role = 'user') => {
  const user = await User.create({
    name: `Test ${role}`,
    email: `${role}@test.com`,
    password: 'password123',
    tel: '0812345678',
    role,
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'test_secret', {
    expiresIn: '1h',
  });

  return { user, token };
};

module.exports = { createUserAndToken };
