/**
 * Seed script: adds 40 maths questions (10 MCQ, 10 TF, 10 Short, 10 Long)
 * to a given test and pool.
 *
 * Usage:
 *   node scripts/seed-maths-questions.mjs
 *
 * You will be prompted for:
 *   - API base URL (default: http://localhost:3000)
 *   - Bearer token (paste your JWT)
 *   - Test ID
 *   - Pool ID (leave blank to skip pool assignment)
 */

import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

// ─── Question bank ────────────────────────────────────────────────────────────

const MCQ_QUESTIONS = [
  { text: 'What is 15% of 200?', options: ['20', '25', '30', '35'], correctAnswer: 2, maxMarks: 2 },
  {
    text: 'What is the value of π (pi) to 2 decimal places?',
    options: ['3.12', '3.14', '3.16', '3.18'],
    correctAnswer: 1,
    maxMarks: 2,
  },
  {
    text: 'Which of the following is a prime number?',
    options: ['21', '27', '29', '33'],
    correctAnswer: 2,
    maxMarks: 2,
  },
  {
    text: 'What is the derivative of x³?',
    options: ['x²', '2x²', '3x²', '3x'],
    correctAnswer: 2,
    maxMarks: 3,
  },
  {
    text: 'Solve: 2x + 6 = 18. What is x?',
    options: ['4', '5', '6', '7'],
    correctAnswer: 2,
    maxMarks: 2,
  },
  { text: 'What is √144?', options: ['10', '11', '12', '13'], correctAnswer: 2, maxMarks: 2 },
  {
    text: 'What is the area of a circle with radius 7? (Use π ≈ 22/7)',
    options: ['144', '154', '164', '174'],
    correctAnswer: 1,
    maxMarks: 3,
  },
  {
    text: 'What is the LCM of 4 and 6?',
    options: ['8', '10', '12', '24'],
    correctAnswer: 2,
    maxMarks: 2,
  },
  {
    text: 'If a triangle has angles 60° and 80°, what is the third angle?',
    options: ['30°', '40°', '50°', '60°'],
    correctAnswer: 1,
    maxMarks: 2,
  },
  { text: 'What is 2⁸?', options: ['128', '256', '512', '1024'], correctAnswer: 1, maxMarks: 2 },
];

const TF_QUESTIONS = [
  { text: 'The sum of angles in a triangle is 180°.', correctAnswer: 0, maxMarks: 1 },
  {
    text: 'A negative number multiplied by a negative number gives a positive result.',
    correctAnswer: 0,
    maxMarks: 1,
  },
  { text: 'The number 1 is considered a prime number.', correctAnswer: 1, maxMarks: 1 },
  { text: 'The square root of 81 is 9.', correctAnswer: 0, maxMarks: 1 },
  { text: 'An isosceles triangle has all three sides equal.', correctAnswer: 1, maxMarks: 1 },
  { text: 'The slope of a horizontal line is undefined.', correctAnswer: 1, maxMarks: 1 },
  { text: '0.5 is equal to 1/2.', correctAnswer: 0, maxMarks: 1 },
  { text: 'The product of any number and 0 is always 0.', correctAnswer: 0, maxMarks: 1 },
  { text: 'The HCF of 12 and 18 is 8.', correctAnswer: 1, maxMarks: 1 },
  {
    text: 'A quadratic equation always has two distinct real roots.',
    correctAnswer: 1,
    maxMarks: 1,
  },
];

const SHORT_QUESTIONS = [
  { text: 'Factorise: x² - 9.', maxMarks: 3 },
  { text: 'Find the value of x in: 3x - 7 = 14.', maxMarks: 2 },
  { text: 'What is the perimeter of a rectangle with length 8 cm and width 5 cm?', maxMarks: 2 },
  { text: 'Express 0.75 as a fraction in its simplest form.', maxMarks: 2 },
  { text: 'Calculate the mean of the following numbers: 4, 7, 13, 16, 10.', maxMarks: 3 },
  { text: 'Simplify: (3x²y)(2xy³).', maxMarks: 3 },
  {
    text: 'A bag contains 3 red and 7 blue balls. What is the probability of picking a red ball?',
    maxMarks: 2,
  },
  { text: 'Convert 45° to radians.', maxMarks: 2 },
  { text: 'What is the gradient of the line passing through (1, 2) and (3, 8)?', maxMarks: 3 },
  { text: 'Evaluate: 5! (5 factorial).', maxMarks: 2 },
];

const LONG_QUESTIONS = [
  {
    text: 'Solve the quadratic equation 2x² - 7x + 3 = 0 and verify your answers by substitution.',
    maxMarks: 6,
  },
  {
    text: 'A car travels 120 km at 60 km/h, then 90 km at 45 km/h. Calculate the total time taken and the average speed for the entire journey. Show all working.',
    maxMarks: 6,
  },
  {
    text: 'Prove that the diagonals of a rectangle are equal in length. Include a clearly labelled diagram in your explanation.',
    maxMarks: 5,
  },
  {
    text: 'Using integration, find the area under the curve y = x² + 2x between x = 0 and x = 3.',
    maxMarks: 6,
  },
  {
    text: 'A principal of £5,000 is invested at a compound interest rate of 4% per annum. Calculate the total amount after 3 years and the interest earned. Show step-by-step working.',
    maxMarks: 5,
  },
  {
    text: 'Solve the simultaneous equations: 3x + 2y = 16 and 5x - y = 9. State the method used and verify your solution.',
    maxMarks: 6,
  },
  {
    text: 'The heights (in cm) of 10 students are: 150, 165, 170, 155, 160, 175, 168, 158, 163, 172. Calculate the mean, median, and standard deviation.',
    maxMarks: 7,
  },
  {
    text: 'Differentiate f(x) = 3x⁴ - 5x³ + 2x - 8 and determine the coordinates of any stationary points. Classify each point as a minimum or maximum.',
    maxMarks: 7,
  },
  {
    text: 'A cylindrical tank has radius 3 m and height 5 m. Calculate (a) the volume, (b) the curved surface area, and (c) the total surface area. Use π = 3.14159.',
    maxMarks: 6,
  },
  {
    text: 'Using the binomial theorem, expand (2x + 3)⁴ fully and simplify each term.',
    maxMarks: 5,
  },
];

// ─── Build questions payload ──────────────────────────────────────────────────

function buildQuestions(poolId) {
  const pid = poolId ? Number(poolId) : undefined;

  const mcq = MCQ_QUESTIONS.map((q) => ({
    type: 'MULTIPLE_CHOICE',
    text: q.text,
    options: q.options,
    correctAnswer: q.correctAnswer,
    maxMarks: q.maxMarks,
    ...(pid ? { questionPoolId: pid } : {}),
  }));

  const tf = TF_QUESTIONS.map((q) => ({
    type: 'TRUE_FALSE',
    text: q.text,
    options: ['True', 'False'],
    correctAnswer: q.correctAnswer,
    maxMarks: q.maxMarks,
    ...(pid ? { questionPoolId: pid } : {}),
  }));

  const short = SHORT_QUESTIONS.map((q) => ({
    type: 'SHORT_ANSWER',
    text: q.text,
    maxMarks: q.maxMarks,
    ...(pid ? { questionPoolId: pid } : {}),
  }));

  const long = LONG_QUESTIONS.map((q) => ({
    type: 'LONG_ANSWER',
    text: q.text,
    maxMarks: q.maxMarks,
    ...(pid ? { questionPoolId: pid } : {}),
  }));

  return [...mcq, ...tf, ...short, ...long];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Test Sphere — Maths Question Seeder   ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const baseUrl =
    (await ask('API base URL [http://localhost:5000]: ')).trim() || 'http://localhost:5000';
  const token = (await ask('Bearer token (JWT): ')).trim();
  const testId = (await ask('Test ID: ')).trim();
  const poolId = (await ask('Pool ID (leave blank to skip): ')).trim();

  rl.close();

  if (!token || !testId) {
    console.error('\n✗ Token and Test ID are required.');
    process.exit(1);
  }

  const questions = buildQuestions(poolId);
  const url = `${baseUrl}/tests/${testId}/questions`;

  console.log(`\nPosting ${questions.length} questions to ${url} …`);
  console.log(`  Pool: ${poolId || 'none (no pool assignment)'}`);
  console.log(`  Breakdown: 10 MCQ · 10 T/F · 10 Short · 10 Long\n`);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ questions }),
    });
  } catch (err) {
    console.error('✗ Request failed:', err.message);
    process.exit(1);
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`✗ HTTP ${res.status} ${res.statusText}`);
    console.error(body);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`✓ Success! ${questions.length} questions added.`);
  console.log('Response:', JSON.stringify(data, null, 2));
}

main();
