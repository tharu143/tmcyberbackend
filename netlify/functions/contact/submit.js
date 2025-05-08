const { Pool } = require('@neondatabase/serverless');

exports.handler = async function (event, context) {
  // Normalize the FRONTEND_URL by removing trailing slashes
  const frontendUrl = (process.env.FRONTEND_URL || 'https://tmcybertech.netlify.app').replace(/\/+$/, '');

  const headers = {
    'Access-Control-Allow-Origin': frontendUrl,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Log the headers for debugging
  console.log('CORS Headers:', headers);

  // Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON payload' }),
    };
  }

  const { name, email, subject, message } = body;
  if (!name || !email || !subject || !message) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'All fields (name, email, subject, message) are required' }),
    };
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await pool.query(
      'INSERT INTO contacts (name, email, subject, message) VALUES ($1, $2, $3, $4)',
      [name, email, subject, message]
    );
    await pool.end();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Contact message submitted successfully' }),
    };
  } catch (err) {
    console.error('Contact submission error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};