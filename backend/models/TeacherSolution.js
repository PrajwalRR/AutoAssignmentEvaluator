const mongoose = require("mongoose");

const teacherSolutionSchema = new mongoose.Schema({
  subject: String,
  question: String,
  code: String, // store code as string
  live : { type: Boolean, default: true }, // for live status
});

module.exports = mongoose.model("TeacherSolution", teacherSolutionSchema);
