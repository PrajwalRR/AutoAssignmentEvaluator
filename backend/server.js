const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
const natural = require('natural');
const StudentRoutes = require('./routes/studentRoutes');
const TeacherRoutes = require('./routes/teacherRoutes');

const { OpenAI } = require("openai");
// require("dotenv").config(); // if not already

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load env variables
dotenv.config();

// Models
const StudentAssignment = require('./models/StudentAssignment');
const TeacherSolution = require('./models/TeacherSolution');

// Express app setup
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.use('/api/students', StudentRoutes);
app.use('/api/teachers', TeacherRoutes);

// Custom cosine similarity function
function cosineSimilarity(text1, text2) {
  const tfidf = new natural.TfIdf();
  tfidf.addDocument(text1);
  tfidf.addDocument(text2);

  const vector1 = tfidf.documents[0];
  const vector2 = tfidf.documents[1];

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  const allKeys = new Set([...Object.keys(vector1), ...Object.keys(vector2)]);

  for (let key of allKeys) {
    const val1 = vector1[key] || 0;
    const val2 = vector2[key] || 0;
    dotProduct += val1 * val2;
    magnitude1 += val1 * val1;
    magnitude2 += val2 * val2;
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
}

app.post('/auto-grade', async (req, res) => {
  try {
    const { subject, question } = req.query;
    const assignments = await StudentAssignment.find({ question, subject, evaluated: false });
    const assignmentLength = assignments.length;
    let count = 0;

    for (let assignment of assignments) {
      const codeContent = fs.readFileSync(assignment.filePath, 'utf8');
      const questionText = assignment.question;

      const referenceDoc = await TeacherSolution.findOne({ question: questionText, live: true });

      let plagiarismScore = 0;
      if (referenceDoc?.code) {
        plagiarismScore = cosineSimilarity(codeContent, referenceDoc.code);
      }

      const evalResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: `You are a strict and precise programming assignment evaluator. Use the following rubric to score the code:

- Correctness (50 pts)
- Logic (20 pts)
- Code Quality (15 pts)
- Error Handling (15 pts)

Return a score out of 100, a letter grade, and concise feedback. Be strict — do not reward incorrect or incomplete code.`
            },
            {
              role: 'user',
              content: `### Assignment Question:\n${questionText}\n\n### Student's Code:\n${codeContent}\n\nEvaluate the code and return:\n\n**Final Score:**  \n**Grade:**  \n**Feedback:**`
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const evalText = evalResponse.data.choices?.[0]?.message?.content || 'No evaluation available';

      let score = 0;
      let grade = 'F';
      let feedback = '';

      const scoreMatch = evalText.match(/Final Score:\s*(\d+)/i);
      const gradeMatch = evalText.match(/Grade:\s*([ABCDF])/i);

      if (scoreMatch && gradeMatch) {
        score = parseInt(scoreMatch[1]);
        grade = gradeMatch[1];
        feedback = evalText;
      } else {
        if (evalText.toLowerCase().includes('correct') || evalText.toLowerCase().includes('valid')) {
          if (plagiarismScore < 0.5) {
            score = 90;
            grade = 'A';
            feedback = '✅ Code logic is correct and plagiarism is low.';
          } else if (plagiarismScore < 0.8) {
            score = 75;
            grade = 'B';
            feedback = '⚠️ Code logic is correct, but moderate plagiarism detected.';
          } else {
            score = 60;
            grade = 'C';
            feedback = '❗ Code logic is correct, but high plagiarism detected.';
          }
        } else {
          score = 40;
          grade = 'D';
          if (plagiarismScore > 0.7) {
            feedback = '❌ Code logic is incorrect and heavily plagiarized.';
          } else {
            feedback = '❌ Code logic is incorrect.';
          }
        }
        feedback += `\n\n📜 LLM Evaluation: ${evalText}`;
      }

      assignment.score = score;
      assignment.grade = grade;
      assignment.feedback = feedback;
      assignment.evaluated = true;
      await assignment.save();

      count++;
      if (count === assignmentLength && referenceDoc) {
        referenceDoc.live = false;
        await referenceDoc.save();
      }
    }

    console.log('✅ Auto grading completed successfully');
    res.json({ message: 'Auto grading completed successfully ✅' });

  } catch (error) {
    console.error('❌ Error during auto grading:', error.response?.data || error.message);
    res.status(500).json({ error: 'Auto grading failed' });
  }
});


// Connect to Mongo
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ MongoDB Connected');
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

