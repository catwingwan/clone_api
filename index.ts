import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// Health check
app.get('/health', (_, res) => res.send('OK'));

// Signup
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const client = await pool.connect();
  const r = await client.query(
    'INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id,email',
    [email, hashed]
  );
  client.release();
  const token = jwt.sign({ userId: r.rows[0].id }, JWT_SECRET);
  res.json({ token });
});

// Store API key
app.post('/apikey', async (req, res) => {
  const { token } = req.headers;
  if (!token) return res.status(401).json({ error: 'no token' });
  let t: any;
  try {
    t = jwt.verify(token as string, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'invalid' });
  }
  const { provider, key } = req.body;
  await pool.query(
    'INSERT INTO api_keys(user_id,provider,key_encrypted) VALUES($1,$2,$3)',
    [t.userId, provider, key]
  );
  res.json({ ok: true });
});

// Chat endpoint
app.post('/chats/:chatId/message', async (req, res) => {
  const { chatId } = req.params;
  const { role, content } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'no token' });
  let t: any;
  try {
    t = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'invalid' });
  }
  const r = await pool.query(
    'SELECT key_encrypted FROM api_keys WHERE user_id=$1 AND provider=$2 LIMIT 1',
    [t.userId, 'openai']
  );
  if (r.rows.length === 0) return res.status(400).json({ error: 'no openai key' });
  const userKey = r.rows[0].key_encrypted;

  await pool.query(
    'INSERT INTO messages(chat_id, role, content) VALUES($1,$2,$3)',
    [chatId, role, content]
  );

  try {
    const resp = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      { model: 'gpt-4o-mini', messages: [{ role: 'user', content }], max_tokens: 1000 },
      { headers: { Authorization: `Bearer ${userKey}` } }
    );
    const assistantText = resp.data.choices?.[0]?.message?.content || resp.data.choices?.[0]?.text;
    await pool.query('INSERT INTO messages(chat_id, role, content) VALUES($1,$2,$3)', [
      chatId,
      'assistant',
      assistantText,
    ]);
    res.json({ assistant: assistantText, raw: resp.data });
  } catch (err: any) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: 'provider error', details: err?.response?.data || err.message });
  }
});

app.listen(process.env.PORT || 4000, () => console.log('API running on port 4000'));
