const Teacher = require('../models/TeacherSolution')
const axios = require('axios')
const StudentAssignment = require('../models/StudentAssignment')

exports.uploadReference = async (req, res) => {
  try {
    const { subject,question,solution } = req.body
    if(!subject || !question || !solution) {
      return res.status(400).json({ error: 'Subject, question and solution are required' })
    }
    const upload = new Teacher({ subject, question,code:solution})
    await upload.save()
    res.status(201).json({ message: 'Reference uploaded!', upload })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.getAssignmentsForStudents = async (req, res) => {
  try {
    const { subject } = req.query;
    if(!subject) {
      return res.status(400).json({ error: 'Subject is required' })
    }
    const result = await Teacher.find({ subject }).select('question subject live');
    res.status(201).json({ message: 'Fetched Successfully!', result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.get = async (req, res) => {
  try {
    const { subject } = req.query;
    if(!subject) {
      return res.status(400).json({ error: 'Subject is required' })
    }
    const result = await Teacher.find({ subject }).select('question subject live');
    res.status(201).json({ message: 'Fetched Successfully!', result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}



exports.getAssignmentsForTeacher = async (req, res) => {
  try {
    const { subject, question, classId } = req.query;

    if (!subject || !question || !classId) {
      return res.status(400).json({ error: 'Subject, question, and classId are required' });
    }

    // 1. Get students from classId via external API
    const studentRes = await axios.get(`http://localhost:5000/Sclass/Students/${classId}`);
    const students = studentRes.data; // ✅ FIXED: data is the array itself

    console.log('Fetched students:', students);

    // 2. Get assignment submissions for this question
    const submissions = await StudentAssignment.find({question});

    console.log('Fetched submissions:', submissions);

    const submittedNames = new Set(submissions.map(s => s.name)); // assuming you're storing name

    // 3. Attach submission flag
    const enrichedStudents = students.map(student => ({
      name: student.name,
      roll_no: student.rollNum, // ✅ your API returns `rollNum`, not `roll_no`
      submission: submittedNames.has(student.name)
    }));

    const totalStudents = enrichedStudents.length;
    const submittedCount = enrichedStudents.filter(s => s.submission).length;

    res.status(200).json({
      message: 'Fetched successfully!',
      question,
      subject,
      totalStudents,
      submittedCount,
      students: enrichedStudents
    });

  } catch (err) {
    console.error('❌ Error fetching assignments for teacher:', err.message);
    res.status(500).json({ error: 'Failed to fetch assignment status' });
  }
};