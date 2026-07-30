const express = require('express');
const { 
  addUser, deleteUser, 
  getFacultyRequests, approveFaculty, rejectFaculty,
  getStudentRequests, approveStudent, rejectStudent
} = require('../controllers/adminController');

const router = express.Router();

router.post('/add-user', addUser);
router.delete('/delete-user/:uid', deleteUser);
router.get('/faculty-requests', getFacultyRequests);
router.post('/approve-faculty', approveFaculty);
router.post('/reject-faculty', rejectFaculty);

router.get('/student-requests', getStudentRequests);
router.post('/approve-student', approveStudent);
router.post('/reject-student', rejectStudent);

module.exports = router;
