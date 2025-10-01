const fs = require('fs');
const pkg = require('pg');
const cors = require('cors');
const JSZip = require('jszip');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const multer = require('multer');
const OpenAI = require('openai');
const csv = require('csv-parser');
const ExcelJS = require('exceljs');
const express = require('express');
const jwt = require('jsonwebtoken');
const pdfParse = require('pdf-parse');
const nodemailer = require('nodemailer');

dotenv.config();
const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 5000;
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
});

pool.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    return;
  }

  console.log('Database connection successful');
});

app.get('/api/health', async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    res.status(200).json({ status: 'OK', message: 'API is healthy!' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'ERROR', message: 'API is not healthy.' });
  }
});

app.post('/api/signup', async (req, res) => {
  const { name, email, password, role, uniqueIdentifier } = req.body;

  if (!name || !email || !password || !role || !uniqueIdentifier) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!['student', 'teacher'].includes(role)) {
    return res
      .status(400)
      .json({ error: "Invalid role. Choose 'student' or 'teacher'." });
  }

  if (!/^[a-z0-9-]{6,20}$/i.test(uniqueIdentifier)) {
    return res.status(400).json({
      error: 'Unique ID must be 6-20 alphanumeric characters (hyphens allowed)',
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const client = await pool.connect();

  try {
    const lowerCaseIdentifier = uniqueIdentifier.toLowerCase();

    const existingUser = await client.query(
      `SELECT * FROM users WHERE email = $1 OR LOWER(unique_identifier) = $2`,
      [email, lowerCaseIdentifier],
    );

    if (existingUser.rows.length > 0) {
      const conflictField =
        existingUser.rows[0].email === email ? 'Email' : 'Unique ID';
      return res.status(400).json({
        error: `${conflictField} already in use`,
      });
    }

    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (name, email, password, role, unique_identifier)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name`,
      [name, email, hashedPassword, role, uniqueIdentifier],
    );

    const userId = userResult.rows[0].id;
    const userName = userResult.rows[0].name;

    if (role === 'teacher') {
      await client.query(
        `UPDATE classes
         SET teacher_name = $1
         WHERE teacher_id = $2`,
        [userName, userId],
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'User created successfully',
      user: { name, email, role, uniqueIdentifier },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Signup error:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        error:
          'Email or Unique ID already exists (case insensitive comparison)',
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

const signupOtps = new Map();

app.post('/api/sendsignupotp', async (req, res) => {
  const { email } = req.body;
  let client;

  try {
    client = await pool.connect();

    const userResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    if (userResult.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    signupOtps.set(email, {
      otp,
      expiry: otpExpiry,
      attempts: 0,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Account Verification OTP',
      text: `Your OTP for account verification is: ${otp}. This OTP is valid for 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: 'OTP sent to your email.',
    });
  } catch (err) {
    console.error('Error in /api/sendsignupotp:', err);
    res
      .status(500)
      .json({ error: 'Something went wrong. Please try again later.' });
  } finally {
    if (client) client.release();
  }
});

app.post('/api/verifysignupotp', async (req, res) => {
  const { email, code, userData } = req.body;
  let client;

  try {
    client = await pool.connect();

    const storedOtp = signupOtps.get(email);
    if (!storedOtp) {
      return res
        .status(400)
        .json({ error: 'OTP expired or not found. Please request a new one.' });
    }

    if (new Date() > storedOtp.expiry) {
      signupOtps.delete(email);
      return res
        .status(400)
        .json({ error: 'OTP expired. Please request a new one.' });
    }

    if (code !== storedOtp.otp) {
      storedOtp.attempts += 1;
      signupOtps.set(email, storedOtp);

      if (storedOtp.attempts >= 3) {
        signupOtps.delete(email);
        return res
          .status(400)
          .json({
            error: 'Maximum attempts reached. Please request a new OTP.',
          });
      }

      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const result = await client.query(
      'INSERT INTO users (name, email, password, role, unique_identifier) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        userData.name,
        userData.email,
        hashedPassword,
        userData.role,
        userData.uniqueIdentifier,
      ],
    );

    signupOtps.delete(email);

    const token = jwt.sign(
      {
        userId: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' },
    );

    res.status(201).json({
      message: 'Account created successfully!',
      user: result.rows[0],
      token,
    });
  } catch (err) {
    console.error('Error in /api/verify-signup-otp:', err);
    res
      .status(500)
      .json({ error: 'Something went wrong. Please try again later.' });
  } finally {
    if (client) client.release();
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const client = await pool.connect();

  try {
    const user = await client.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const dbRole = user.rows[0].role;
    const isValidPassword = await bcrypt.compare(
      password,
      user.rows[0].password,
    );

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.rows[0].id,
        email: user.rows[0].email,
        role: dbRole,
        uniqueIdentifier: user.rows[0].unique_identifier,
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' },
    );

    res.status(200).json({
      token,
      userId: user.rows[0].id,
      name: user.rows[0].name,
      role: dbRole,
      uniqueIdentifier: user.rows[0].unique_identifier,
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'An error occurred during login.' });
  } finally {
    client.release();
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const generateClassCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

app.post('/api/create-class', authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res
      .status(403)
      .json({ error: 'Access denied. Only teachers can create classes.' });
  }

  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Class name is required.' });
  }

  const client = await pool.connect();

  try {
    const classCode = generateClassCode();

    await client.query(
      'INSERT INTO classes (class_name, class_code, teacher_id) VALUES ($1, $2, $3)',
      [name, classCode, req.user.id],
    );

    res.status(201).json({ message: 'Class created successfully!', classCode });
  } catch (error) {
    console.error('Error creating class:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while creating the class.' });
  } finally {
    client.release();
  }
});

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.get('/api/get-class/:classId?', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    if (req.params.classId) {
      const classDetail = await client.query(
        'SELECT * FROM classes WHERE class_id = $1',
        [req.params.classId],
      );

      if (classDetail.rows.length === 0) {
        return res.status(404).json({ error: 'Class not found' });
      }

      return res.status(200).json(classDetail.rows[0]);
    } else {
      if (req.user.role === 'teacher') {
        const classes = await client.query(
          'SELECT * FROM classes WHERE teacher_id = $1',
          [req.user.id],
        );
        return res.status(200).json({ classes: classes.rows });
      } else if (req.user.role === 'student') {
        const studentClasses = await client.query(
          'SELECT c.* FROM classes c JOIN student_class_relatiosns sc ON c.id = sc.class_id WHERE sc.student_id = $1',
          [req.user.id],
        );
        return res.status(200).json({ classes: studentClasses.rows });
      } else {
        return res.status(403).json({ error: 'Access denied. Invalid role.' });
      }
    }
  } catch (error) {
    console.error('Error fetching classes:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching classes.' });
  } finally {
    client.release();
  }
});

app.delete(
  '/api/delete-class/:classId',
  authenticateToken,
  async (req, res) => {
    const classId = req.params.classId;

    const client = await pool.connect();

    try {
      const classResult = await client.query(
        'SELECT * FROM classes WHERE class_id = $1 AND teacher_id = $2',
        [classId, req.user.id],
      );

      if (classResult.rows.length === 0) {
        return res
          .status(404)
          .json({
            error:
              'Class not found or you do not have permission to delete this class.',
          });
      }

      await client.query('DELETE FROM classes WHERE class_id = $1', [classId]);

      res.status(200).json({ message: 'Class deleted successfully.' });
    } catch (error) {
      console.error('Error deleting class:', error);
      res
        .status(500)
        .json({ error: 'An error occurred while deleting the class.' });
    } finally {
      client.release();
    }
  },
);

app.post('/api/submit-questions', authenticateToken, async (req, res) => {
  const { questions } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return res
      .status(400)
      .json({ error: 'Invalid request: questions must be a non-empty array.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO questions (test_id, text, type, options, image, answer)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    for (const question of questions) {
      const { test_id, text, type, options, image, answer } = question;

      if (!test_id || !text || !type) {
        throw new Error(`Missing required fields in question: ${text}`);
      }

      if (
        type === 'multiple-choice' &&
        (!Array.isArray(options) || options.length === 0)
      ) {
        throw new Error(
          `Options must be a non-empty array for multiple-choice question: ${text}`,
        );
      }

      if ((type === 'multiple-choice' || type === 'true-false') && !answer) {
        throw new Error(`Answer is required for question: ${text}`);
      }

      if (image && !/^data:image\/\w+;base64,/.test(image)) {
        throw new Error(`Invalid Base64 image format for question: ${text}`);
      }

      await client.query(insertQuery, [
        test_id,
        text,
        type,
        options || [],
        image || null,
        answer || null,
      ]);
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'All questions submitted successfully!' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting questions:', error.message);
    res.status(500).json({ error: `An error occurred: ${error.message}` });
  } finally {
    client.release();
  }
});

app.post('/api/create-test', authenticateToken, async (req, res) => {
  const { class_id, title, description, date, duration, disable_time } =
    req.body;

  if (
    !class_id ||
    !title ||
    !description ||
    !date ||
    !duration ||
    !disable_time
  ) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      'INSERT INTO tests (class_id, title, description, date, duration, disable_time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING test_id',
      [class_id, title, description, date, duration, disable_time],
    );

    const testId = result.rows[0].test_id;
    res
      .status(201)
      .json({ message: 'Test created successfully!', test_id: testId });
  } catch (error) {
    console.error('Error creating test:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while creating the test.' });
  } finally {
    client.release();
  }
});

app.get('/api/get-tests/:classId', authenticateToken, async (req, res) => {
  const { classId } = req.params;
  const client = await pool.connect();

  try {
    const testsResult = await client.query(
      'SELECT test_id, title, description, date, duration, disable_time FROM tests WHERE class_id = $1',
      [classId],
    );

    if (testsResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'No tests found for this class.' });
    }

    const testsWithQuestions = await Promise.all(
      testsResult.rows.map(async (test) => {
        const questionsResult = await client.query(
          'SELECT * FROM questions WHERE test_id = $1',
          [test.test_id],
        );
        return {
          ...test,
          questions: questionsResult.rows,
        };
      }),
    );

    res.status(200).json(testsWithQuestions);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching the tests.' });
  } finally {
    client.release();
  }
});

app.put('/api/edit-test/:testId', authenticateToken, async (req, res) => {
  const { testId } = req.params;
  const { title, description, date, duration, disable_time, questions } =
    req.body;
  const client = await pool.connect();

  try {
    console.log('Received request to update test:', {
      testId,
      title,
      description,
      date,
      duration,
      disable_time,
      questions,
    });

    await client.query('BEGIN');

    const testCheckResult = await client.query(
      'SELECT * FROM tests WHERE test_id = $1',
      [testId],
    );

    if (testCheckResult.rows.length === 0) {
      console.log('Test not found');
      return res.status(404).json({ message: 'Test not found.' });
    }

    const updateTestResult = await client.query(
      'UPDATE tests SET title = $1, description = $2, date = $3, duration = $4, disable_time = $5 WHERE test_id = $6 RETURNING *',
      [title, description, date, duration, disable_time, testId],
    );

    if (updateTestResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Failed to update the test.' });
    }

    if (questions && questions.length > 0) {
      for (const question of questions) {
        const { question_id, text, type, options, image, answer } = question;

        if (question_id) {
          await client.query(
            `UPDATE questions
             SET text = $1, type = $2, options = $3, image = $4, answer = $5 
             WHERE question_id = $6 AND test_id = $7`,
            [text, type, options, image, answer, question_id, testId],
          );
        } else {
          await client.query(
            `INSERT INTO questions 
             (test_id, text, type, options, image, answer) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [testId, text, type, options, image, answer],
          );
        }
      }
    }

    await client.query('COMMIT');

    res
      .status(200)
      .json({ message: 'Test and questions updated successfully!' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating test:', error);
    res
      .status(500)
      .json({
        error: 'An error occurred while updating the test and questions.',
      });
  } finally {
    client.release();
  }
});

app.delete('/api/delete-test/:testId', authenticateToken, async (req, res) => {
  const { testId } = req.params;
  const client = await pool.connect();

  try {
    const testResult = await client.query(
      'SELECT * FROM tests WHERE test_id = $1',
      [testId],
    );

    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found.' });
    }

    const classResult = await client.query(
      'SELECT * FROM classes WHERE class_id = $1',
      [testResult.rows[0].class_id],
    );

    if (classResult.rows[0].teacher_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to delete this test.' });
    }

    await client.query('DELETE FROM questions WHERE test_id = $1', [testId]);

    await client.query('DELETE FROM tests WHERE test_id = $1', [testId]);

    res
      .status(200)
      .json({ message: 'Test and associated questions deleted successfully.' });
  } catch (error) {
    console.error('Error deleting test:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while deleting the test.' });
  } finally {
    client.release();
  }
});

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

app.post('/api/chatbot', authenticateToken, async (req, res) => {
  const { topic, number, types } = req.body;

  if (!topic || !number || !types) {
    return res
      .status(400)
      .json({ error: 'Topic, number, and types are required.' });
  }

  try {
    console.log(
      'Sending request to the chatbot with topic:',
      topic,
      'number:',
      number,
      'and types:',
      types,
    );

    const systemMessage = `
      You are an intelligent question generator for a student learning platform. 
      Generate questions based on the given topic and question type distribution. 
      Provide the output in JSON format as an array of objects. 
      Each object should have:
      - "text": The question text.
      - "type": The type of the question ("multiple-choice", "true-false", "short-answer").
      - "options": An array of options (if type is "multiple-choice"), or an empty array for "true-false" and "short-answer").
      - "answer": The correct answer (true/false for true-false questions, correct option for multiple-choice, or a text answer for short-answer questions).
    `;

    const userMessage = `
      Generate questions about the topic: "${topic}". 
      The distribution of question types is as follows:
      - ${types.multipleChoice || 0} multiple-choice questions
      - ${types.trueFalse || 0} true/false questions
      - ${types.shortAnswer || 0} short-answer questions
    `;

    const completion = await client.chat.completions.create({
      extra_headers: {
        'HTTP-Referer': process.env.YOUR_SITE_URL,
        'X-Title': process.env.YOUR_SITE_NAME,
      },
      extra_body: {},
      model: 'deepseek/deepseek-r1:free',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 20000,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2,
      repetition_penalty: 1.2,
      top_k: 50,
      min_p: 0.1,
      top_a: 0.1,
    });

    console.log('Response from chatbot:', completion);

    const rawData = completion.choices[0].message.content;

    let jsonString;

    if (rawData.startsWith('```json') && rawData.endsWith('```')) {
      jsonString = rawData.slice(7, -3).trim();
    } else if (rawData.startsWith('```') && rawData.endsWith('```')) {
      jsonString = rawData.slice(3, -3).trim();
    } else {
      jsonString = rawData;
    }

    try {
      const questions = JSON.parse(jsonString);

      if (!Array.isArray(questions)) {
        return res.status(500).json({
          error:
            'Invalid response format from the chatbot. Expected an array of questions.',
        });
      }

      const formattedQuestions = questions.map((question, index) => ({
        questionNumber: index + 1,
        text: question.text || `Question ${index + 1} is incomplete.`,
        type: question.type || 'short-answer',
        options: question.options || [],
        answer:
          question.type === 'multiple-choice'
            ? question.answer
            : question.type === 'true-false'
              ? question.answer.toString()
              : question.answer || 'No answer provided.',
      }));

      console.log('Formatted response being sent to frontend:', {
        questions: formattedQuestions,
      });
      return res.status(200).json({ questions: formattedQuestions });
    } catch (err) {
      console.error('Failed to parse chatbot response as JSON:', err);
      return res.status(500).json({
        error: 'Invalid response format from the chatbot.',
        details: err.message,
      });
    }
  } catch (error) {
    console.error('Error communicating with the chatbot:', error);
    return res.status(500).json({
      error: 'Error communicating with the chatbot.',
      details: error.message,
    });
  }
});

app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    const filePath = req.file.path;

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    const text = data.text;

    const numberOfMultipleChoice =
      parseInt(req.body.numberOfMultipleChoice) || 0;
    const numberOfTrueFalse = parseInt(req.body.numberOfTrueFalse) || 0;
    const numberOfShortAnswer = parseInt(req.body.numberOfShortAnswer) || 0;

    const questions = await generateQuestionsWithOpenAI(
      text,
      numberOfMultipleChoice,
      numberOfTrueFalse,
      numberOfShortAnswer,
    );

    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
      } else {
        console.log('File deleted successfully.');
      }
    });

    res.json({ success: true, questions });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ success: false, error: 'Failed to process PDF' });
  }
});

const generateQuestionsWithOpenAI = async (
  text,
  numberOfMultipleChoice,
  numberOfTrueFalse,
  numberOfShortAnswer,
) => {
  try {
    const systemMessage = `
      You are an intelligent question generator for a student learning platform. 
      Generate questions based on the given text and the specified distribution of question types. 
      Provide the output in JSON format as an array of objects. 
      Each object should have:
      - "text": The question text.
      - "type": The type of the question ("multiple-choice", "true-false", "short-answer").
      - "options": An array of options (if type is "multiple-choice"), or an empty array for "true-false" and "short-answer").
      - "answer": The correct answer (true/false for true-false questions, correct option for multiple-choice, or a text answer for short-answer questions).
    `;

    const userMessage = `
      Generate questions based on the following text:\n\n${text}\n\n
      The distribution of question types should be:
      - ${numberOfMultipleChoice} multiple-choice questions
      - ${numberOfTrueFalse} true/false questions
      - ${numberOfShortAnswer} short-answer questions
    `;

    const completion = await client.chat.completions.create({
      extra_headers: {
        'HTTP-Referer': process.env.YOUR_SITE_URL,
        'X-Title': process.env.YOUR_SITE_NAME,
      },
      extra_body: {},
      model: 'deepseek/deepseek-r1:free',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 20000,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2,
      repetition_penalty: 1.2,
      top_k: 50,
      min_p: 0.1,
      top_a: 0.1,
    });

    console.log('Response from chatbot:', completion);

    const rawData = completion.choices[0].message.content;

    let jsonString;

    if (rawData.startsWith('```json') && rawData.endsWith('```')) {
      jsonString = rawData.slice(7, -3).trim();
    } else if (rawData.startsWith('```') && rawData.endsWith('```')) {
      jsonString = rawData.slice(3, -3).trim();
    } else {
      jsonString = rawData;
    }

    try {
      const questions = JSON.parse(jsonString);

      if (!Array.isArray(questions)) {
        throw new Error(
          'Invalid response format from the chatbot. Expected an array of questions.',
        );
      }

      const formattedQuestions = questions.map((question, index) => ({
        questionNumber: index + 1,
        text: question.text || `Question ${index + 1} is incomplete.`,
        type: question.type || 'short-answer',
        options: question.options || [],
        answer:
          question.type === 'multiple-choice'
            ? question.answer
            : question.type === 'true-false'
              ? question.answer.toString()
              : question.answer || 'No answer provided.',
      }));

      console.log('Formatted response:', { questions: formattedQuestions });
      return formattedQuestions;
    } catch (err) {
      console.error('Failed to parse chatbot response as JSON:', err);
      throw new Error('Invalid response format from the chatbot.');
    }
  } catch (error) {
    console.error('Error generating questions with OpenAI:', error);
    throw new Error('Failed to generate questions');
  }
};

app.post(
  '/api/upload-questions-pdf',
  upload.single('pdf'),
  async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      const questions = parseQuestionsFromText(data.text);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
        } else {
          console.log('PDF file deleted successfully.');
        }
      });

      res.json({ success: true, questions });
    } catch (error) {
      console.error('Error processing PDF:', error);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
        } else {
          console.log('PDF file deleted after processing failure.');
        }
      });

      res.status(500).json({ success: false, error: 'Failed to process PDF' });
    }
  },
);

app.post(
  '/api/upload-questions-csv',
  upload.single('csv'),
  async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const questions = [];
    let processingError = null;

    try {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            try {
              const question = {
                text: row.question || row.text,
                type: row.type || 'multiple_choice',
                options: row.options
                  ? typeof row.options === 'string'
                    ? JSON.parse(row.options)
                    : row.options
                  : [],
                answer: row.answer,
              };
              questions.push(question);
            } catch (parseError) {
              processingError = parseError;
              reject(parseError);
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
        } else {
          console.log('CSV file deleted successfully.');
        }
      });

      res.json({ success: true, questions });
    } catch (error) {
      console.error('Error processing CSV:', processingError || error);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
        } else {
          console.log('CSV file deleted after processing failure.');
        }
      });

      const errorMessage = processingError
        ? 'Invalid CSV format'
        : 'Failed to process CSV file';

      res.status(500).json({
        success: false,
        error: errorMessage,
        details: (processingError || error).message,
      });
    }
  },
);

function parseQuestionsFromText(text) {
  const questions = [];

  const questionBlocks = text.split(/\n\s*\n/);

  questionBlocks.forEach((block) => {
    if (block.trim()) {
      const lines = block.split('\n').filter((line) => line.trim());
      if (lines.length > 0) {
        const question = {
          text: lines[0],
          type: detectQuestionType(lines),
          options: extractOptions(lines),
          answer: extractAnswer(lines),
        };
        questions.push(question);
      }
    }
  });

  return questions;
}

function detectQuestionType(lines) {
  if (lines.some((line) => line.includes('True') || line.includes('False'))) {
    return 'true-false';
  } else if (lines.length > 2) {
    return 'multiple-choice';
  }
  return 'short-answer';
}

function extractOptions(lines) {
  if (lines.length <= 2) return [];
  return lines
    .slice(1, -1)
    .map((line) => line.replace(/^[a-zA-Z]\)\s*/, '').trim());
}

function extractAnswer(lines) {
  const lastLine = lines[lines.length - 1];
  if (lastLine.startsWith('Answer:')) {
    return lastLine.replace('Answer:', '').trim();
  }
  return lastLine.trim();
}

app.get('/api/dashboard', authenticateToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res
      .status(403)
      .json({
        error: 'Access denied. Only students can access the dashboard.',
      });
  }

  const studentId = req.user.id;
  const client = await pool.connect();

  try {
    const studentQuery = `
      SELECT name, email, id
      FROM users
      WHERE id = $1
    `;
    const studentResult = await client.query(studentQuery, [studentId]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const studentDetails = studentResult.rows[0];

    const classesQuery = `
      SELECT
        c.class_id,
        c.class_name,
        c.class_code,
        u.name AS teacher_name
      FROM classes c
      JOIN student_class_relations scr ON c.class_id = scr.class_id
      JOIN users u ON c.teacher_id = u.id
      WHERE scr.student_id = $1
    `;
    const classesResult = await client.query(classesQuery, [studentId]);

    const upcomingTestsQuery = `
      SELECT
        t.test_id,
        t.title AS test_title,
        t.date AS due_date,
        c.class_name
      FROM tests t
      JOIN classes c ON t.class_id = c.class_id
      JOIN student_class_relations scr ON c.class_id = scr.class_id
      WHERE scr.student_id = $1
      AND t.date > NOW()
      ORDER BY t.date ASC
      LIMIT 5
    `;
    const upcomingTestsResult = await client.query(upcomingTestsQuery, [
      studentId,
    ]);

    const availableTestsQuery = `
      SELECT
        t.test_id,
        t.title AS test_title,
        c.class_name,
        t.class_id,
        t.date,
        t.duration,
        t.disable_time
      FROM tests t
      JOIN classes c ON t.class_id = c.class_id
      JOIN student_class_relations scr ON c.class_id = scr.class_id
      LEFT JOIN test_submission ts ON t.test_id = ts.test_id AND ts.user_id = $1
      WHERE scr.student_id = $1
      AND ts.test_id IS NULL  -- Not attempted yet
      AND t.disable_time > NOW()  -- Test not disabled yet
      AND t.date <= NOW()  -- Test has started
      AND t.disable_time > NOW()  -- Test hasn't ended yet
      ORDER BY t.date ASC
    `;
    const availableTestsResult = await client.query(availableTestsQuery, [
      studentId,
    ]);

    const submissionsQuery = `
      SELECT
        t.test_id,
        t.title AS test_title,
        ts.submitted_at,
        CASE
          WHEN ts.submitted_at IS NOT NULL THEN 'Submitted'
          ELSE 'Pending'
        END AS status
      FROM test_submission ts
      JOIN tests t ON ts.test_id = t.test_id
      WHERE ts.user_id = $1
      ORDER BY ts.submitted_at DESC
      LIMIT 5
    `;
    const submissionsResult = await client.query(submissionsQuery, [studentId]);

    res.status(200).json({
      student: {
        name: studentDetails.name,
        email: studentDetails.email,
        id: studentDetails.id,
      },
      enrolledClasses: classesResult.rows,
      upcomingTests: upcomingTestsResult.rows,
      availableTests: availableTestsResult.rows,
      recentSubmissions: submissionsResult.rows,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  } finally {
    client.release();
  }
});

app.get('/api/teacher-dashboard', authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res
      .status(403)
      .json({
        error: 'Access denied. Only teachers can access this dashboard.',
      });
  }

  const teacherId = req.user.id;
  const client = await pool.connect();

  try {
    const teacherQuery = {
      text: 'SELECT id, name, email FROM users WHERE id = $1',
      values: [teacherId],
    };
    const teacherResult = await client.query(teacherQuery, [teacherId]);

    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }

    const classesQuery = {
      text: `
        SELECT
          c.class_id,
          c.class_name,
          c.class_code,
          COUNT(DISTINCT scr.student_id) AS student_count
        FROM classes c
        LEFT JOIN student_class_relations scr ON c.class_id = scr.class_id
        WHERE c.teacher_id = $1
        GROUP BY c.class_id, c.class_name, c.class_code
        ORDER BY c.class_name
      `,
      values: [teacherId],
    };
    const classesResult = await client.query(classesQuery);

    const upcomingTestsQuery = `
      SELECT
        t.test_id,
        t.title,
        t.date,
        c.class_name
      FROM tests t
      JOIN classes c ON t.class_id = c.class_id
      WHERE c.teacher_id = $1
      AND t.date > NOW()
      ORDER BY t.date ASC
      LIMIT 5
    `;
    const upcomingTestsResult = await client.query(upcomingTestsQuery, [
      teacherId,
    ]);

    const testAttemptsQuery = {
      text: `
        SELECT
          t.test_id,
          t.title,
          c.class_name,
          COUNT(DISTINCT scr.student_id) AS total_students,
          COUNT(DISTINCT ts.user_id) AS attempted_count,
          COUNT(DISTINCT scr.student_id) - COUNT(DISTINCT ts.user_id) AS not_attempted_count,
          COALESCE(
            ROUND(
              COUNT(DISTINCT ts.user_id) * 100.0 /
              NULLIF(COUNT(DISTINCT scr.student_id), 0),
            2),
          0) AS attempt_percentage
        FROM tests t
        JOIN classes c ON t.class_id = c.class_id
        LEFT JOIN student_class_relations scr ON c.class_id = scr.class_id
        LEFT JOIN test_submission ts ON t.test_id = ts.test_id AND scr.student_id = ts.user_id
        WHERE c.teacher_id = $1
        AND t.date <= NOW() -- Only completed tests
        GROUP BY t.test_id, t.title, c.class_name
        ORDER BY t.date DESC
        LIMIT 5
      `,
      values: [teacherId],
    };
    const testAttemptsResult = await client.query(testAttemptsQuery);

    res.status(200).json({
      teacher: teacherResult.rows[0],
      classes: classesResult.rows,
      upcomingTests: upcomingTestsResult.rows,
      testAttempts: testAttemptsResult.rows,
      statistics: {
        total_classes: classesResult.rows.length,
        total_students: classesResult.rows.reduce(
          (sum, cls) => sum + parseInt(cls.student_count),
          0,
        ),
        upcoming_tests: upcomingTestsResult.rows.length,
        completed_tests: testAttemptsResult.rows.length,
      },
    });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch teacher dashboard data.',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
});
const getSubmissionPercentage = (test) => {
  if (!test.total_students || test.total_students === 0) return 0;
  return Math.round((test.attempted_students / test.total_students) * 100);
};

//////////////////////////

app.post('/api/enroll', authenticateToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res
      .status(403)
      .json({ error: 'Access denied. Only students can enroll in classes.' });
  }

  const { classCode } = req.body;

  if (!classCode) {
    return res.status(400).json({ error: 'Class code is required.' });
  }

  const client = await pool.connect();

  try {
    const classResult = await client.query(
      'SELECT class_id, class_name FROM classes WHERE class_code = $1',
      [classCode],
    );

    if (classResult.rowCount === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    const classId = classResult.rows[0].class_id;
    const className = classResult.rows[0].class_name;

    const enrollmentCheck = await client.query(
      'SELECT * FROM student_class_relations WHERE student_id = $1 AND class_id = $2',
      [req.user.id, classId],
    );

    if (enrollmentCheck.rowCount > 0) {
      return res
        .status(400)
        .json({ error: 'You are already enrolled in this class.' });
    }

    await client.query(
      'INSERT INTO student_class_relations (student_id, class_id) VALUES ($1, $2)',
      [req.user.id, classId],
    );

    return res.status(201).json({
      message: 'Successfully enrolled in class!',
      class: {
        class_id: classId,
        class_name: className,
      },
    });
  } catch (error) {
    console.error('Error enrolling in class:', error);
    return res
      .status(500)
      .json({ error: 'An error occurred during enrollment.' });
  } finally {
    client.release();
  }
});

app.get('/api/classes', authenticateToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res
      .status(403)
      .json({
        error: 'Access denied. Only students can view enrolled classes.',
      });
  }

  const client = await pool.connect();

  try {
    const enrolledClasses = await client.query(
      `
      SELECT c.class_id, c.class_name 
      FROM classes c
      JOIN student_class_relations scr ON c.class_id = scr.class_id
      WHERE scr.student_id = $1
    `,
      [req.user.id],
    );

    res.status(200).json(enrolledClasses.rows);
  } catch (error) {
    console.error('Error fetching enrolled classes:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching enrolled classes.' });
  } finally {
    client.release();
  }
});

app.post('/api/leave-class', authenticateToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res
      .status(403)
      .json({ error: 'Access denied. Only students can leave classes.' });
  }

  const { classId } = req.body;

  if (!classId) {
    return res
      .status(400)
      .json({ error: 'Class ID is required to leave the class.' });
  }

  const client = await pool.connect();

  try {
    await client.query(
      'DELETE FROM student_class_relations WHERE student_id = $1 AND class_id = $2',
      [req.user.id, classId],
    );

    res.status(200).json({ message: 'Successfully left the class.' });
  } catch (error) {
    console.error('Error leaving class:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while leaving the class.' });
  } finally {
    client.release();
  }
});

app.get('/api/get-questions/:testId', authenticateToken, async (req, res) => {
  const { testId } = req.params;
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT question_id, text, type, options, image FROM questions WHERE test_id = $1',
      [testId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'No questions found for this test.' });
    }

    const formattedQuestions = result.rows.map((question) => ({
      ...question,
      options: question.options || [],
      image: question.image || null,
    }));

    res.status(200).json(formattedQuestions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching the questions.' });
  } finally {
    client.release();
  }
});

app.get(
  '/api/get-test-duration/:testId',
  authenticateToken,
  async (req, res) => {
    const { testId } = req.params;
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT duration FROM tests WHERE test_id = $1',
        [testId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Test not found.' });
      }

      res.status(200).json({ duration: result.rows[0].duration });
    } catch (error) {
      console.error('Error fetching test duration:', error);
      res
        .status(500)
        .json({ error: 'An error occurred while fetching the test duration.' });
    } finally {
      client.release();
    }
  },
);

app.post('/api/start-test/:testId', authenticateToken, async (req, res) => {
  const { testId } = req.params;
  const { studentId, classId } = req.body;

  console.log('Request body (start-test):', req.body);

  if (!testId || !studentId || !classId) {
    return res
      .status(400)
      .json({
        message: 'Invalid input: testId, studentId, and classId are required.',
      });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO test_submission (user_id, test_id, class_id, start_time)
         VALUES ($1, $2, $3, NOW() AT TIME ZONE 'Asia/Karachi')
         RETURNING *`,
        [studentId, testId, classId],
      );

      console.log('Insert successful:', result.rows[0]);

      await client.query('COMMIT');

      res
        .status(201)
        .json({
          message: 'Test start time recorded successfully!',
          data: result.rows[0],
        });
    } catch (queryError) {
      console.error('Database query error (start-test):', queryError);
      res
        .status(500)
        .json({
          message: 'Failed to record test start time.',
          error: queryError.message,
        });
    } finally {
      client.release();
    }
  } catch (connectionError) {
    console.error('Database connection error (start-test):', connectionError);
    res
      .status(500)
      .json({
        message: 'Failed to connect to the database.',
        error: connectionError.message,
      });
  }
});

app.post(
  '/api/submit-test/:testId/answers',
  authenticateToken,
  async (req, res) => {
    const { testId } = req.params;
    const { studentId, answers, classId } = req.body;

    if (
      !testId ||
      !studentId ||
      !answers ||
      typeof answers !== 'object' ||
      !classId
    ) {
      return res
        .status(400)
        .json({
          message:
            'Invalid input: testId, studentId, answers, and classId are required.',
        });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const submissionResult = await client.query(
        `SELECT answers_submitted FROM test_submission
       WHERE user_id = $1 AND test_id = $2 AND class_id = $3`,
        [studentId, testId, classId],
      );

      if (submissionResult.rows[0]?.answers_submitted) {
        await client.query('COMMIT');
        return res.status(200).json({ message: 'Answers already submitted.' });
      }

      const startTimeResult = await client.query(
        `SELECT start_time FROM test_submission WHERE user_id = $1 AND test_id = $2 AND class_id = $3`,
        [studentId, testId, classId],
      );

      if (startTimeResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res
          .status(400)
          .json({
            message: 'Test has not been started by the student for this class.',
          });
      }

      const questionsResult = await client.query(
        'SELECT question_id FROM questions WHERE test_id = $1',
        [testId],
      );
      const questionIds = questionsResult.rows.map((row) => row.question_id);

      for (const questionId of questionIds) {
        const answer = answers.hasOwnProperty(questionId)
          ? answers[questionId]
          : null;
        await client.query(
          'INSERT INTO test_answers (test_id, student_id, question_id, answer) VALUES ($1, $2, $3, $4)',
          [testId, studentId, questionId, answer],
        );
      }

      await client.query(
        `UPDATE test_submission
       SET answers_submitted = true, submitted_at = NOW() AT TIME ZONE 'Asia/Karachi'
       WHERE user_id = $1 AND test_id = $2 AND class_id = $3`,
        [studentId, testId, classId],
      );

      await client.query('COMMIT');
      res.status(200).json({ message: 'Answers submitted successfully!' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error during answers submission:', error);
      res.status(500).json({ message: 'Failed to submit answers.' });
    } finally {
      client.release();
    }
  },
);

app.post(
  '/api/submit-test/:testId/photos',
  authenticateToken,
  async (req, res) => {
    const { testId } = req.params;
    const { studentId, photos, classId } = req.body;

    if (!testId || !studentId || !classId) {
      return res.status(400).json({
        message:
          'Missing required fields: testId, studentId, and classId are required.',
      });
    }

    if (!Array.isArray(photos)) {
      return res.status(400).json({
        message: 'Photos must be provided as an array.',
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const photoBuffers = [];
      const photoTimestamps = [];

      for (const photo of photos) {
        if (!photo.photo || !photo.timestamp) {
          throw new Error(
            'Each photo must contain both image data and timestamp',
          );
        }

        photoBuffers.push(
          Buffer.from(
            photo.photo.replace(/^data:image\/\w+;base64,/, ''),
            'base64',
          ),
        );
        photoTimestamps.push(new Date(photo.timestamp));
      }

      await client.query(
        `INSERT INTO test_photos (user_id, test_id, photos, photo_timestamps)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, test_id)
       DO UPDATE SET 
         photos = test_photos.photos || EXCLUDED.photos,
         photo_timestamps = test_photos.photo_timestamps || EXCLUDED.photo_timestamps`,
        [studentId, testId, photoBuffers, photoTimestamps],
      );

      await client.query('COMMIT');
      res.status(200).json({ message: 'Photos submitted successfully!' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error during photo submission:', error);
      res.status(500).json({
        message: error.message || 'Failed to submit photos.',
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    } finally {
      client.release();
    }
  },
);

app.post(
  '/api/submit-test/:testId/screenshots',
  authenticateToken,
  async (req, res) => {
    const { testId } = req.params;
    const { studentId, screenshots, classId } = req.body;

    if (!testId || !studentId || !Array.isArray(screenshots) || !classId) {
      return res.status(400).json({
        message:
          'Invalid input: testId, studentId, screenshots, and classId are required.',
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const screenshotBuffers = screenshots.map((s) =>
        Buffer.from(
          s.screenshot.replace(/^data:image\/\w+;base64,/, ''),
          'base64',
        ),
      );

      const screenshotTimestamps = screenshots.map(
        (s) => new Date(s.timestamp),
      );

      await client.query(
        `INSERT INTO test_photos (user_id, test_id, screenshots, screenshot_timestamps)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, test_id)
       DO UPDATE SET 
         screenshots = test_photos.screenshots || EXCLUDED.screenshots,
         screenshot_timestamps = test_photos.screenshot_timestamps || EXCLUDED.screenshot_timestamps`,
        [studentId, testId, screenshotBuffers, screenshotTimestamps],
      );

      await client.query(
        `UPDATE test_submission
       SET screenshots_submitted = true, submitted_at = NOW() AT TIME ZONE 'Asia/Karachi'
       WHERE user_id = $1 AND test_id = $2 AND class_id = $3`,
        [studentId, testId, classId],
      );

      await client.query('COMMIT');
      res.status(200).json({ message: 'Screenshots submitted successfully!' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error during screenshots submission:', error);
      res.status(500).json({ message: 'Failed to submit screenshots.' });
    } finally {
      client.release();
    }
  },
);

app.post('/api/submit-test/:testId/logs', async (req, res) => {
  const { logs, studentId, classId } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const logsJsonb = JSON.stringify(logs);

    const query = `
      INSERT INTO activity_logs (user_id, test_id, class_id, logs)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [studentId, req.params.testId, classId, logsJsonb];

    await client.query(query, values);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Logs submitted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/api/get-logs/:testId/:studentId', async (req, res) => {
  const { testId, studentId } = req.params;

  try {
    const query = `
      SELECT logs
      FROM activity_logs
      WHERE test_id = $1 AND user_id = $2;
    `;
    const values = [testId, studentId];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No logs found for this student.' });
    }

    res.status(200).json({ logs: result.rows[0].logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete(
  '/api/unsubmit-test/:testId',
  authenticateToken,
  async (req, res) => {
    const { testId } = req.params;
    const { studentId, classId } = req.body;

    if (!testId || !studentId || !classId) {
      return res
        .status(400)
        .json({
          message:
            'Invalid input: testId, studentId, and classId are required.',
        });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `DELETE FROM test_submission
       WHERE user_id = $1 AND test_id = $2 AND class_id = $3`,
        [studentId, testId, classId],
      );

      await client.query('COMMIT');
      res
        .status(200)
        .json({ message: 'Test submission unsubmitted successfully!' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error during test unsubmission:', error);
      res.status(500).json({ message: 'Failed to unsubmit test.' });
    } finally {
      client.release();
    }
  },
);

app.post('/api/check-test-submission/:testId', async (req, res) => {
  const { testId } = req.params;
  const { userId, classId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID not provided' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      'SELECT 1 FROM test_submission WHERE user_id = $1 AND test_id = $2 AND class_id = $3',
      [userId, testId, classId],
    );

    if (result.rowCount > 0) {
      return res.json({ submitted: true });
    } else {
      return res.json({ submitted: false });
    }
  } catch (error) {
    console.error('Error checking test submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

///////////
app.get('/api/get-test-result/:testId', authenticateToken, async (req, res) => {
  const { testId } = req.params;
  let { page = 1, limit = 10 } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);
  if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'Invalid page or limit values.' });
  }

  const offset = (page - 1) * limit;
  const client = await pool.connect();

  try {
    const studentsQuery = `
      SELECT u.name, u.unique_identifier, ts.user_id AS student_id, ts.class_id, ts.submitted_at, ts.start_time
      FROM test_submission ts
      JOIN users u ON ts.user_id = u.id
      WHERE ts.test_id = $1
      LIMIT $2 OFFSET $3
    `;

    const studentsResult = await client.query(studentsQuery, [
      testId,
      limit,
      offset,
    ]);

    if (studentsResult.rows.length === 0) {
      return res.status(200).json({
        results: [],
        total: 0,
        page: page,
        limit: limit,
      });
    }

    const formatTime = (time) => {
      return new Date(time).toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    };

    const testResults = await Promise.all(
      studentsResult.rows.map(async (submission) => {
        const studentId = submission.student_id;
        const studentName = submission.name;
        const uniqueIdentifier = submission.unique_identifier;

        try {
          const questionsAndAnswersQuery = `
            SELECT 
              q.question_id,
              q.text AS question_text,
              q.answer AS correct_answer,
              a.answer AS student_answer,
              a.obtained_marks,
              a.total_marks,
              q.type AS question_type
            FROM questions q
            LEFT JOIN test_answers a ON q.question_id = a.question_id AND a.student_id = $2
            WHERE q.test_id = $1
          `;
          const questionsAndAnswers = await client.query(
            questionsAndAnswersQuery,
            [testId, studentId],
          );

          let correctCount = 0;
          let incorrectCount = 0;
          let unansweredCount = 0;
          let totalMarks = 0;
          let obtainedMarks = 0;

          questionsAndAnswers.rows.forEach((question) => {
            totalMarks += question.total_marks || 0;
            obtainedMarks += question.obtained_marks || 0;

            if (
              !question.correct_answer ||
              question.question_type === 'subjective'
            ) {
              return;
            }

            if (
              !question.student_answer ||
              question.student_answer.trim() === ''
            ) {
              unansweredCount++;
            } else if (
              question.student_answer.trim() === question.correct_answer.trim()
            ) {
              correctCount++;
            } else {
              incorrectCount++;
            }
          });

          return {
            studentId: studentId,
            studentName: studentName,
            uniqueIdentifier: uniqueIdentifier,
            classId: submission.class_id,
            submittedAt: formatTime(submission.submitted_at),
            startTime: formatTime(submission.start_time),
            questionsAndAnswers: questionsAndAnswers.rows.map((row) => ({
              question_id: row.question_id,
              question_text: row.question_text,
              student_answer: row.student_answer,
              obtained_marks: row.obtained_marks || 0,
              total_marks: row.total_marks || 0,
              correct_answer: row.correct_answer,
              question_type: row.question_type,
            })),
            summary: {
              correct: correctCount,
              incorrect: incorrectCount,
              unanswered: unansweredCount,
              totalQuestions: questionsAndAnswers.rows.length,
              totalMarks: totalMarks,
              obtainedMarks: obtainedMarks,
              percentage:
                totalMarks > 0
                  ? Math.round((obtainedMarks / totalMarks) * 100)
                  : 0,
            },
          };
        } catch (error) {
          console.error(`Error fetching data for student ${studentId}:`, error);
          return null;
        }
      }),
    );

    const filteredTestResults = testResults.filter((result) => result !== null);

    const totalStudentsQuery = `
      SELECT COUNT(*) AS total
      FROM test_submission ts
      WHERE ts.test_id = $1
    `;
    const totalStudentsResult = await client.query(totalStudentsQuery, [
      testId,
    ]);
    const totalStudents = totalStudentsResult.rows[0].total;

    res.status(200).json({
      results: filteredTestResults,
      total: totalStudents,
      page: page,
      limit: limit,
    });
  } catch (error) {
    console.error('Error fetching test results:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching the test results.' });
  } finally {
    client.release();
  }
});

app.get(
  '/api/get-media/:testId/:studentId',
  authenticateToken,
  async (req, res) => {
    const { testId, studentId } = req.params;
    const client = await pool.connect();

    try {
      const mediaQuery = `
      SELECT 
        photos, 
        photo_timestamps,
        screenshots,
        screenshot_timestamps
      FROM test_photos
      WHERE test_id = $1 AND user_id = $2
    `;

      const mediaResult = await client.query(mediaQuery, [testId, studentId]);

      if (mediaResult.rows.length === 0) {
        return res
          .status(404)
          .json({ message: 'No media found for this student and test.' });
      }

      const { photos, photo_timestamps, screenshots, screenshot_timestamps } =
        mediaResult.rows[0];

      const processedPhotos = [];
      if (photos && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          processedPhotos.push({
            data: photos[i].toString('base64'),
            timestamp:
              (photo_timestamps && photo_timestamps[i]) ||
              new Date().toISOString(),
          });
        }
      }

      const processedScreenshots = [];
      if (screenshots && screenshots.length > 0) {
        for (let i = 0; i < screenshots.length; i++) {
          processedScreenshots.push({
            data: screenshots[i].toString('base64'),
            timestamp:
              (screenshot_timestamps && screenshot_timestamps[i]) ||
              new Date().toISOString(),
          });
        }
      }

      res.status(200).json({
        photos: processedPhotos,
        screenshots: processedScreenshots,
      });
    } catch (error) {
      console.error('Error fetching media:', error);
      res
        .status(500)
        .json({ error: 'An error occurred while fetching media.' });
    } finally {
      client.release();
    }
  },
);

app.get(
  '/api/download-test-results/:testId',
  authenticateToken,
  async (req, res) => {
    const { testId } = req.params;
    const client = await pool.connect();

    try {
      const testQuery = `
      SELECT t.title, t.description, c.class_name AS class_name
      FROM tests t
      JOIN classes c ON t.class_id = c.class_id
      WHERE t.test_id = $1
    `;
      const testResult = await client.query(testQuery, [testId]);

      if (testResult.rows.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const testInfo = testResult.rows[0];

      const studentsQuery = `
      SELECT u.id AS student_id, u.name AS student_name, u.email,
             ts.submitted_at, ts.start_time
      FROM test_submission ts
      JOIN users u ON ts.user_id = u.id
      WHERE ts.test_id = $1
      ORDER BY u.name
    `;
      const studentsResult = await client.query(studentsQuery, [testId]);

      if (studentsResult.rows.length === 0) {
        return res
          .status(404)
          .json({ error: 'No submissions found for this test' });
      }

      const questionsQuery = `
      SELECT question_id, text, answer, type, marks
      FROM questions
      WHERE test_id = $1
      ORDER BY question_id
    `;
      const questionsResult = await client.query(questionsQuery, [testId]);
      const questions = questionsResult.rows;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Test Results');

      worksheet.addRow(['Test Title:', testInfo.title]);
      worksheet.addRow(['Class:', testInfo.class_name]);
      worksheet.addRow(['Description:', testInfo.description]);
      worksheet.addRow([]);

      const headers = [
        'Student ID',
        'Student Name',
        'Email',
        'Start Time',
        'Submission Time',
        'Total Marks',
        'Obtained Marks',
        'Percentage',
      ];

      questions.forEach((q, index) => {
        headers.push(`Q${index + 1}`);
        headers.push(`Q${index + 1} Answer`);
        headers.push(`Q${index + 1} Score`);
      });

      headers.push('Correct Answers');
      headers.push('Incorrect Answers');
      headers.push('Unanswered');

      worksheet.addRow(headers);

      for (const student of studentsResult.rows) {
        const answersQuery = `
        SELECT question_id, answer, obtained_marks, total_marks
        FROM test_answers
        WHERE test_id = $1 AND student_id = $2
      `;
        const answersResult = await client.query(answersQuery, [
          testId,
          student.student_id,
        ]);
        const answers = answersResult.rows;

        let correctCount = 0;
        let incorrectCount = 0;
        let unansweredCount = 0;
        let totalMarks = 0;
        let obtainedMarks = 0;

        const questionData = [];
        questions.forEach((q) => {
          const answer = answers.find((a) => a.question_id === q.question_id);
          const studentAnswer = answer?.answer || '';
          const score = answer?.obtained_marks || 0;
          const maxScore = answer?.total_marks || q.marks || 0;

          totalMarks += maxScore;
          obtainedMarks += score;

          if (q.type === 'objective') {
            if (!studentAnswer || studentAnswer.trim() === '') {
              unansweredCount++;
            } else if (studentAnswer.trim() === q.answer.trim()) {
              correctCount++;
            } else {
              incorrectCount++;
            }
          }

          questionData.push(q.text, studentAnswer, `${score}/${maxScore}`);
        });

        const percentage =
          totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : 0;

        const rowData = [
          student.student_id,
          student.student_name,
          student.email,
          new Date(student.start_time).toLocaleString(),
          new Date(student.submitted_at).toLocaleString(),
          totalMarks,
          obtainedMarks,
          `${percentage}%`,
          ...questionData,
          correctCount,
          incorrectCount,
          unansweredCount,
        ];

        worksheet.addRow(rowData);
      }

      worksheet.getRow(5).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 0;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=test_results_${testId}.xlsx`,
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error generating Excel file:', error);
      res.status(500).json({ error: 'Failed to generate Excel file' });
    } finally {
      client.release();
    }
  },
);

app.get(
  '/api/download-all-logs/:testId',
  authenticateToken,
  async (req, res) => {
    const { testId } = req.params;
    const client = await pool.connect();

    try {
      const students = await client.query(
        `SELECT u.id as student_id, u.name 
       FROM test_submission ts
       JOIN users u ON ts.user_id = u.id
       WHERE ts.test_id = $1`,
        [testId],
      );

      if (students.rows.length === 0) {
        return res
          .status(404)
          .json({ error: 'No students found for this test' });
      }

      const zip = new JSZip();
      let hasLogs = false;

      for (const student of students.rows) {
        const logsResult = await client.query(
          `SELECT logs 
         FROM activity_logs 
         WHERE test_id = $1 AND user_id = $2`,
          [testId, student.student_id],
        );

        if (
          logsResult.rows.length === 0 ||
          !logsResult.rows[0].logs ||
          logsResult.rows[0].logs.length === 0
        ) {
          continue;
        }

        hasLogs = true;
        const logs = logsResult.rows[0].logs;

        let csvContent = 'Timestamp,Event Type,Details\n';
        logs.forEach((log) => {
          if (!log.timestamp || !log.eventType) return;

          const details = log.details
            ? JSON.stringify(log.details)
                .replace(/"/g, '""')
                .replace(/\n/g, ' ')
            : '';

          csvContent += `"${new Date(log.timestamp).toISOString()}","${
            log.eventType
          }","${details}"\n`;
        });

        zip.file(
          `${sanitizeFilename(student.name)}_${student.student_id}_logs.csv`,
          csvContent,
        );
      }

      if (!hasLogs) {
        return res.status(404).json({ error: 'No logs found for any student' });
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=test_${testId}_all_logs.zip`,
      );
      res.setHeader('Content-Length', zipBuffer.length);
      res.send(zipBuffer);
    } catch (error) {
      console.error('Error generating logs zip:', error);
      res.status(500).json({
        error: 'Failed to generate log archive',
        details: error.message,
      });
    } finally {
      client.release();
    }
  },
);

function sanitizeFilename(name) {
  return (
    name
      .replace(/[^a-z0-9-_.]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50)
      .trim() || 'student'
  );
}

app.get(
  '/api/download-all-pictures/:testId',
  authenticateToken,
  async (req, res) => {
    const { testId } = req.params;
    const client = await pool.connect();

    try {
      const students = await client.query(
        `SELECT 
         u.id as student_id, 
         u.name as student_name,
         tp.photos,
         tp.photo_timestamps,
         tp.screenshots,
         tp.screenshot_timestamps
       FROM test_submission ts
       JOIN users u ON ts.user_id = u.id
       LEFT JOIN test_photos tp ON tp.test_id = ts.test_id AND tp.user_id = ts.user_id
       WHERE ts.test_id = $1`,
        [testId],
      );

      if (students.rows.length === 0) {
        return res
          .status(404)
          .json({ error: 'No students found for this test' });
      }

      const zip = new JSZip();
      let hasMedia = false;

      for (const student of students.rows) {
        if (!student.photos && !student.screenshots) continue;

        const studentFolder = zip.folder(
          `${sanitizeFilename(student.student_name)}_${student.student_id}`,
        );

        if (student.photos?.length > 0) {
          hasMedia = true;
          const photosFolder = studentFolder.folder('photos');

          student.photos.forEach((photo, index) => {
            const timestamp =
              student.photo_timestamps?.[index] || new Date().toISOString();
            const formattedTimestamp = formatTimestampForFilename(timestamp);

            photosFolder.file(
              `photo_${formattedTimestamp}_${index + 1}.jpg`,
              Buffer.isBuffer(photo) ? photo : Buffer.from(photo, 'base64'),
              { binary: true },
            );
          });
        }

        if (student.screenshots?.length > 0) {
          hasMedia = true;
          const screenshotsFolder = studentFolder.folder('screenshots');

          student.screenshots.forEach((screenshot, index) => {
            const timestamp =
              student.screenshot_timestamps?.[index] ||
              new Date().toISOString();
            const formattedTimestamp = formatTimestampForFilename(timestamp);

            screenshotsFolder.file(
              `screenshot_${formattedTimestamp}_${index + 1}.png`,
              Buffer.isBuffer(screenshot)
                ? screenshot
                : Buffer.from(screenshot, 'base64'),
              { binary: true },
            );
          });
        }
      }

      if (!hasMedia) {
        return res
          .status(404)
          .json({ error: 'No media found for any student' });
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=test_${testId}_media.zip`,
      );
      res.setHeader('Content-Length', zipBuffer.length);
      res.send(zipBuffer);
    } catch (error) {
      console.error('ZIP generation failed:', error);
      res.status(500).json({ error: 'Media download failed' });
    } finally {
      client.release();
    }
  },
);

function formatTimestampForFilename(timestamp) {
  try {
    const date = new Date(timestamp);
    const timezoneOffset = -date.getTimezoneOffset() / 60;

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
      '_',
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0'),
      String(date.getSeconds()).padStart(2, '0'),
      `_UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`,
    ].join('');
  } catch {
    return 'unknown-time';
  }
}

function sanitizeFilename(name) {
  return (name || 'unknown').replace(/[^a-z0-9]/gi, '_').substring(0, 50);
}

function formatTimestampForFilename(timestamp) {
  try {
    return new Date(timestamp)
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);
  } catch {
    return 'unknown-time';
  }
}

function sanitizeFilename(name) {
  return (name || 'unknown').replace(/[^a-z0-9]/gi, '_').substring(0, 50);
}

function sanitizeFilename(name) {
  return (
    name
      .replace(/[^a-z0-9-_.]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50)
      .trim() || 'student'
  );
}

app.post('/api/mark-answer', async (req, res) => {
  const { testId, studentId, questionMarks } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const mark of questionMarks) {
      const { questionId, totalMarks } = mark;
      const obtainedMarks = mark.obtainedMarks ?? 0;

      const testAnswerResult = await client.query(
        'SELECT * FROM test_answers WHERE test_id = $1 AND student_id = $2 AND question_id = $3',
        [testId, studentId, questionId],
      );

      if (testAnswerResult.rows.length > 0) {
        await client.query(
          'UPDATE test_answers SET obtained_marks = $1, total_marks = $2 WHERE test_id = $3 AND student_id = $4 AND question_id = $5',
          [obtainedMarks, totalMarks, testId, studentId, questionId],
        );
      } else {
        console.log(
          `No record found for Test ID: ${testId}, Student ID: ${studentId}, Question ID: ${questionId}. Inserting default 0 marks.`,
        );

        await client.query(
          'INSERT INTO test_answers (test_id, student_id, question_id, obtained_marks, total_marks) VALUES ($1, $2, $3, $4, $5)',
          [testId, studentId, questionId, obtainedMarks, totalMarks],
        );
      }
    }

    await client.query('COMMIT');
    res.status(200).send('Scores submitted successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting scores:', error);
    res.status(500).send('Error submitting scores');
  } finally {
    client.release();
  }
});

app.get(
  '/api/get-test-results/:testId',
  authenticateToken,
  async (req, res) => {
    const { testId } = req.params;
    const studentId = req.user.id;

    if (!testId) {
      return res.status(400).send({ message: 'Test ID is required.' });
    }

    try {
      const client = await pool.connect();

      try {
        const query = `
        SELECT 
          q.question_id,
          q.text AS question,
          q.type,
          q.options,
          q.answer AS correctAnswer,
          ta.answer AS studentAnswer,
          ta.obtained_marks AS obtainedMarks,
          ta.total_marks AS totalMarks
        FROM questions q
        LEFT JOIN test_answers ta
          ON q.question_id = ta.question_id AND ta.student_id = $2
        WHERE q.test_id = $1;
      `;

        const { rows } = await client.query(query, [testId, studentId]);

        if (!rows.length) {
          return res
            .status(404)
            .send({ message: 'No questions found for the given test ID.' });
        }

        const formattedResults = {
          testId,
          studentId,
          questionsAndAnswers: rows.map((row) => ({
            questionId: row.question_id,
            question: row.question,
            type: row.type,
            options: row.options || [],
            correctAnswer: row.correctanswer,
            studentAnswer: row.studentanswer || null,
            obtainedMarks: row.obtainedmarks || 0,
            totalMarks: row.totalmarks || 0,
          })),
          status: rows.every((row) => row.obtainedmarks !== null)
            ? 'graded'
            : 'pending',
        };

        res.status(200).send(formattedResults);
      } catch (error) {
        console.error('Error fetching test results:', error);
        res
          .status(500)
          .send({ message: 'Failed to fetch test results. Please try again.' });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error connecting to database:', error);
      res
        .status(500)
        .send({ message: 'Database connection failed. Please try again.' });
    }
  },
);

app.post('/api/chat-conversation', authenticateToken, async (req, res) => {
  const { message, conversationHistory = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    const fullContext = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    const systemMessage =
      'You are a helpful, friendly, and intelligent assistant for a student learning platform. Provide clear and concise educational responses.';

    const completion = await client.chat.completions.create({
      extra_headers: {
        'HTTP-Referer': process.env.YOUR_SITE_URL,
        'X-Title': process.env.YOUR_SITE_NAME,
      },
      extra_body: {},
      model: 'deepseek/deepseek-r1:free',
      messages: [{ role: 'system', content: systemMessage }, ...fullContext],
      max_tokens: 18000,
      temperature: 0.7,
      top_p: 0.95,
    });

    const rawResponse =
      completion.choices[0].message.content ||
      "I'm sorry, I couldn't generate a response.";

    console.log('Chatbot Response:', rawResponse);

    const chatbotResponse = {
      role: 'assistant',
      content: rawResponse,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json({
      message: chatbotResponse,
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: message },
        chatbotResponse,
      ],
    });
  } catch (error) {
    console.error('Error in chatbot conversation:', error);
    res.status(500).json({
      error: 'Failed to process chatbot conversation',
      details: error.message,
    });
  }
});

app.delete(
  '/api/delete-question/:questionId',
  authenticateToken,
  async (req, res) => {
    const { questionId } = req.params;
    const client = await pool.connect();

    try {
      console.log('Deleting question:', questionId);

      const result = await client.query(
        'DELETE FROM questions WHERE question_id = $1',
        [questionId],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Question not found.' });
      }

      res.status(200).json({ message: 'Question deleted successfully!' });
    } catch (error) {
      console.error('Error deleting question:', error);
      res
        .status(500)
        .json({ error: 'An error occurred while deleting the question.' });
    } finally {
      client.release();
    }
  },
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  let client;

  try {
    client = await pool.connect();

    const userResult = await client.query(
      'SELECT otp_attempts, otp_expiry, otp_last_attempt FROM users WHERE email = $1',
      [email],
    );
    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Email does not exist in our database.' });
    }

    const user = userResult.rows[0];
    const currentTime = Date.now();
    const lastAttemptTime = user.otp_last_attempt
      ? new Date(user.otp_last_attempt).getTime()
      : 0;

    const tenMinutes = 10 * 60 * 1000;
    if (currentTime - lastAttemptTime < tenMinutes) {
      if (user.otp_attempts >= 3) {
        return res
          .status(429)
          .json({
            error:
              'Maximum OTP attempts reached. Please try again after 10 minutes.',
          });
      }
      await client.query(
        'UPDATE users SET otp_attempts = otp_attempts + 1 WHERE email = $1',
        [email],
      );
    } else {
      await client.query('UPDATE users SET otp_attempts = 1 WHERE email = $1', [
        email,
      ]);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await client.query(
      'UPDATE users SET otp = $1, otp_expiry = $2, otp_last_attempt = $3 WHERE email = $4',
      [otp, otpExpiry, new Date(), email],
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. This OTP is valid for 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('Error in /api/forgot-password:', err);
    res
      .status(500)
      .json({ error: 'Something went wrong. Please try again later.' });
  } finally {
    if (client) client.release();
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  let client;

  try {
    client = await pool.connect();

    const userResult = await client.query(
      'SELECT otp, otp_expiry FROM users WHERE email = $1',
      [email],
    );
    const storedOtp = userResult.rows[0];

    if (!storedOtp || storedOtp.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    if (Date.now() > new Date(storedOtp.otp_expiry).getTime()) {
      return res.status(400).json({ error: 'OTP has expired.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await client.query(
      'UPDATE users SET password = $1, otp = NULL, otp_expiry = NULL, otp_attempts = 0, otp_last_attempt = NULL WHERE email = $2',
      [hashedPassword, email],
    );

    res
      .status(200)
      .json({
        message:
          'Password reset successful. You can now log in with your new password.',
      });
  } catch (err) {
    console.error('Error in /api/reset-password:', err);
    res
      .status(500)
      .json({ error: 'Something went wrong. Please try again later.' });
  } finally {
    if (client) client.release();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
