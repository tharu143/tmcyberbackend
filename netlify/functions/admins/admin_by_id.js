const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.handler = async function (event, context) {
  const headers = {
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'https://tmcybertech.netlify.app',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  try {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid token' }),
    };
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const { id } = event.queryStringParameters || {};

  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'ID is required' }),
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      const result = await pool.query('SELECT id, email, created_at FROM admins WHERE id = $1', [id]);
      if (!result.rows[0]) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Admin not found' }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    } else if (event.httpMethod === 'PUT') {
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

      const { email, password } = body;
      if (!email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email is required' }),
        };
      }

      let query = 'UPDATE admins SET email = $1';
      const params = [email, id];
      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        query += ', password_hash = $3';
        params.splice(1, 0, passwordHash);
      }
      query += ' WHERE id = $2 RETURNING id, email, created_at';

      const result = await pool.query(query, params);
      if (!result.rows[0]) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Admin not found' }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    } else if (event.httpMethod === 'DELETE') {
      const result = await pool.query('DELETE FROM admins WHERE id = $1 RETURNING id', [id]);
      if (!result.rows[0]) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Admin not found' }),
        };
      }
      return {
        statusCode: 204,
        headers,
        body: '',
      };
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }
  } catch (err) {
    console.error('Admins error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  } finally {
    await pool.end();
  }
};