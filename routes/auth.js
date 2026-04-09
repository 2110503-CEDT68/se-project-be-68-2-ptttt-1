const express = require('express');
const {
    register,
    login,
    getMe,
    logout,
    changePassword,
    deleteUser
} = require('../controllers/auth');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/logout', logout);
router.put('/changePassword', protect, changePassword);
router.delete('/delete/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
