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

    // Grade calculator
    function calculateFinalGrade(score) {
      if (score >= 90) return 'A+';
      if (score >= 80) return 'A';
      if (score >= 70) return 'B+';
      if (score >= 60) return 'B';
      if (score >= 50) return 'C';
      if (score >= 40) return 'D';
      return 'F';
    }

    for (let assignment of assignments) {
      const codeContent = fs.readFileSync(assignment.filePath, 'utf8');
      const questionText = assignment.question;

      const referenceDoc = await TeacherSolution.findOne({ question: questionText, live: true });

      let plagiarismScore = 0;
      let plagiarismComponent = 0;

      if (referenceDoc?.code) {
        plagiarismScore = cosineSimilarity(codeContent, referenceDoc.code); // value: 0.0 to 1.0
        plagiarismComponent = Math.round(plagiarismScore * 15); // Max 15 marks
      }

      // LLM grading prompt
      const evalResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: `You are a programming assignment evaluator. Score the code out of 85 points using this rubric:
- Correctness (50 pts)
- Logic (20 pts)
- Code Quality (15 pts)
- Error Handling (15 pts)

Return ONLY:
**Score (out of 85):**
**Feedback:**`
            },
            {
              role: 'user',
              content: `Question:\n${questionText}\n\nStudent Code:\n${codeContent}`
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

      const evalText = evalResponse.data.choices?.[0]?.message?.content || 'No feedback generated';

      // Extract numeric LLM score
      let llmScore = 0;
const match = evalText.match(/\*\*Score\s*\(out of 85\):\*\*\s*(\d+)/i) ||
              evalText.match(/Score\s*\(out of 85\):\s*(\d+)/i);
      if (match) {
        llmScore = parseInt(match[1]);
      }

      // Final calculations
      const finalScore = llmScore + plagiarismComponent;
      const finalGrade = calculateFinalGrade(finalScore);

      // Format full feedback message
      const feedback = `📘 Code Evaluation Feedback:\n${evalText}\n\n📚 Plagiarism Score: ${(plagiarismScore * 100).toFixed(1)}% → ${plagiarismComponent}/15\n\n🧮 Final Score (LLM + Plagiarism): ${finalScore}/100\n\n🎓 Final Grade: ${finalGrade}`;

      // Save in MongoDB
      assignment.score = finalScore;
      assignment.grade = finalGrade;
      assignment.feedback = feedback;
      assignment.evaluated = true;
      await assignment.save();

      count++;
      if (count === assignmentLength && referenceDoc) {
        referenceDoc.live = false;
        await referenceDoc.save();
      }
    }

    console.log('✅ Auto grading completed');
    res.json({ message: 'Auto grading completed ✅' });

  } catch (error) {
    console.error('❌ Error in auto grading:', error.response?.data || error.message);
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

