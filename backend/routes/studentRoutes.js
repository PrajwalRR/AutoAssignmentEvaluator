const express = require('express')
const router = express.Router()
const multer = require('../utils/multer')
const studentController = require('../controllers/studentController')

router.post('/upload', multer.single('assignment'), studentController.uploadAssignment)
router.get('/getResult', studentController.getAutogradeResponse)

module.exports = router
