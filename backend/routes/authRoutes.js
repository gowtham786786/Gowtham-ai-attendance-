const express = require('express');
const { registerStudent, registerFaculty } = require('../controllers/authController');

const router = express.Router();

router.post('/register-student', registerStudent);
router.post('/register-faculty', registerFaculty);

module.exports = router;
