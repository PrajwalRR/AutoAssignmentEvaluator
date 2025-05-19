const mongoose = require("mongoose");

const studentAssignmentSchema = new mongoose.Schema({
  name: String,
  filePath: String,
  question: String,
  score: Number, // 💥 For grading
  feedback: String,
  grade: String,
  subject: String,
  evaluated: { type: Boolean, default: false }, // 💥 For grading
});

module.exports = mongoose.model("StudentAssignment", studentAssignmentSchema);
