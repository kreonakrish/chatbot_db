const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

// Create an Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Set up MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'admin',
  password: 'guest',
  database: 'chatbot_db'
});

db.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL database.');
});

// OpenAI API key
const OPENAI_API_KEY = 'test';

// Function to handle job inquiries using RAG (Retrieval-Augmented Generation)
async function handleJobInquiryRAG(userInput) {
  // Step 1: Use GPT to understand the user's question
  const gptResponse = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for job tracking.' },
        { role: 'user', content: userInput }
      ],
      max_tokens: 100,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    }
  );

  // The response from GPT will give us the interpretation of the question
  const botResponse = gptResponse.data.choices[0].message.content;
  
  // Step 2: Parse the response to identify entities (like job_id, job_name, or column)
  const parsedEntities = parseEntities(botResponse);
  
  let retrievedData;

  // Step 3: Retrieve relevant data from the database based on the parsed entities
  if (parsedEntities.job_id) {
    // If the query contains a job_id, retrieve job status by job_id
    retrievedData = await getJobStatusByJobId(parsedEntities.job_id);
  } else if (parsedEntities.job_name) {
    // If the query contains a job_name, retrieve job status by job_name
    retrievedData = await getJobStatusByJobName(parsedEntities.job_name);
  } else if (parsedEntities.column && parsedEntities.job_id) {
    // If the query asks for a specific column value for a job_id
    retrievedData = await getJobColumnValue(parsedEntities.job_id, parsedEntities.column);
  } else {
    // If nothing specific is identified, return a fallback message
    retrievedData = "Sorry, I didn't understand that. Can you ask about job status or job details?";
  }

  // Step 4: Use GPT again to generate a final, natural language response
  const finalResponse = await generateFinalResponse(userInput, retrievedData);

  return finalResponse;
}

// Helper function to parse entities from the GPT response
function parseEntities(text) {
  const entities = {};

  // Basic parsing logic to detect job_id, job_name, or columns in the text
  const jobIdMatch = text.match(/job_id\s*(\d+)/i);
  const jobNameMatch = text.match(/job\s+name\s*([\w\s]+)/i);
  const columnMatch = text.match(/column\s*([\w\s]+)/i);

  if (jobIdMatch) entities.job_id = jobIdMatch[1];
  if (jobNameMatch) entities.job_name = jobNameMatch[1].trim();
  if (columnMatch) entities.column = columnMatch[1].trim();

  return entities;
}

// Function to generate a final response using OpenAI GPT (combining the retrieved data)
async function generateFinalResponse(userInput, retrievedData) {
  const prompt = `
    The user asked: ${userInput}.
    Based on the database query, here is the relevant information: ${retrievedData}.
    Generate a polite and helpful response based on this information.
  `;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for job tracking.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    }
  );

  return response.data.choices[0].message.content;
}

// Function to get job status by job_id
async function getJobStatusByJobId(jobId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT status FROM Job WHERE job_id = ?`;
    db.query(query, [jobId], (err, result) => {
      if (err) {
        reject(err);
      } else if (result.length > 0) {
        resolve(`The status of the job with job_id ${jobId} is: ${result[0].status}`);
      } else {
        resolve(`No job found with job_id ${jobId}.`);
      }
    });
  });
}

// Function to get job status by job_name
async function getJobStatusByJobName(jobName) {
  return new Promise((resolve, reject) => {
    const query = `SELECT status FROM Job WHERE job_name LIKE ?`;
    db.query(query, [`%${jobName}%`], (err, result) => {
      if (err) {
        reject(err);
      } else if (result.length > 0) {
        resolve(`The status of the job '${jobName}' is: ${result[0].status}`);
      } else {
        resolve(`No job found with the name '${jobName}'.`);
      }
    });
  });
}

// Function to get the value of a specific column for a job
async function getJobColumnValue(jobId, columnName) {
  return new Promise((resolve, reject) => {
    const query = `SHOW COLUMNS FROM Job LIKE ?`;
    db.query(query, [columnName], (err, result) => {
      if (err) return reject(err);
      if (result.length === 0) {
        resolve(`The column '${columnName}' does not exist in the Job table.`);
      } else {
        const valueQuery = `SELECT ?? FROM Job WHERE job_id = ?`;
        db.query(valueQuery, [columnName, jobId], (err, result) => {
          if (err) return reject(err);
          if (result.length > 0) {
            resolve(`The value of '${columnName}' for job with job_id ${jobId} is: ${result[0][columnName]}`);
          } else {
            resolve(`No job found with job_id ${jobId}.`);
          }
        });
      }
    });
  });
}

// Chatbot API Route
app.post('/api/chat', async (req, res) => {
  const userInput = req.body.userInput;
  try {
    const botResponse = await handleJobInquiryRAG(userInput);
    res.json({ botResponse });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong, please try again later.' });
  }
});

// Start the server
app.listen(5000, () => {
  console.log('Server is running on port 5000.');
});
