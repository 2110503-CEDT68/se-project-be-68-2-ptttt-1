const jwt = require('jsonwebtoken');
const User = require('../../models/User');

const createUserAndToken = async (role = 'user') => {
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const user = await User.create({
    name: `Test ${role} ${unique}`,
    email: `${role}_${unique}@test.com`,
    password: 'password123',
    tel: `0${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    role,
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'test_secret', {
    expiresIn: '1h',
  });

  return { user, token };
};

module.exports = { createUserAndToken };
