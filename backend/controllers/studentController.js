const Student = require('../models/StudentAssignment')
const StudentAssignment = require('../models/StudentAssignment')

exports.uploadAssignment = async (req, res) => {
  try {
    console.log(req.body)
    const { name,question,subject } = req.body
    const filePath = req.file.path;
    console.log(filePath);
    if(name && question && subject) {
      const student = await Student.findOne({ name, question, subject })
      if (student) {
        return res.status(409).json({ error: 'Assignment already exists' })
      }
    }
    if (!name || !filePath) {
      return res.status(400).json({ error: 'Name and file are required' })
    }
    const student = new Student({ subject,question,name, filePath: filePath })
    await student.save()
    res.status(201).json({ message: 'Assignment uploaded!', student })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.getAutogradeResponse = async (req, res) => {
  try {
    const { subject,currentUser,question } = req.query;

    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    // Fetch all evaluated assignments for this subject
    const result = await StudentAssignment.findOne({ subject,question ,name:currentUser,evaluated: true })
      .select('question score grade subject evaluated');

    console.log(result)  

    if (!result) {
      return res.status(404).json({ error: 'No evaluated assignment found' });
    }
    res.status(200).json({
      message: 'Fetched Successfully!',
      count: result.length,
      data: result
    });
  } catch (err) {
    console.error('❌ Error fetching auto-graded responses:', err.message);
    res.status(500).json({ error: 'Failed to fetch auto-graded responses' });
  }
};