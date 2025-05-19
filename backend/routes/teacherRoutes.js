const express = require('express')
const router = express.Router()
const multer = require('../utils/multer')
const teacherController = require('../controllers/teacherController')

router.post('/upload', multer.single(''), teacherController.uploadReference)
router.get('/getAssignmentsForStudents', teacherController.getAssignmentsForStudents)
router.get('/getAssignmentsForTeacher', teacherController.getAssignmentsForTeacher)
router.get('/get', teacherController.get)

module.exports = router
