require('dotenv').config();

/**
 * HashHustlers Unified Backend Server
 * - Yjs WebSocket Collaboration
 * - Code Execution API
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');
const { executeCode: localExecute } = require('../services/localExecutor');
const { executeCode: remoteExecute } = require('../services/codeExecution');
const { executeCode: judge0Execute } = require('../services/judge0Service');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Helper to select execution engine
const executeCode = async (language, code) => {
  const engine = process.env.EXECUTION_ENGINE || 'local';
  console.log(`[Execution] Using engine: ${engine} for ${language}`);
  
  if (engine === 'judge0') return await judge0Execute(language, code);
  if (engine === 'piston') return await remoteExecute(language, code);
  return await localExecute(language, code);
};

// 2. Health Check
app.get('/', (req, res) => {
  res.send('HashHustlers Unified Backend is Running');
});

// 3. Code Execution Endpoint
app.post('/api/run', async (req, res) => {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: 'Language and code are required' });
  }

  try {
    const result = await executeCode(language, code);
    res.json(result);
  } catch (error) {
    console.error('[API Error] Run failed:', error.message);
    res.status(500).json({ 
      error: 'Execution failed', 
      details: error.message 
    });
  }
});

// 4. Setup HTTP & WebSocket Server
const server = app.listen(PORT, () => {
  console.log(`
  🚀 HashHustlers Backend live at http://localhost:${PORT}
  ----------------------------------------------------
  Collaboration: ws://localhost:${PORT}
  Code Execution: POST http://localhost:${PORT}/api/run
  
  System initialized and ready.
  `);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (conn, req) => {
  const roomName = req.url.slice(1) || 'default-room';
  console.log(`[Collab] New connection | Room: "${roomName}"`);

  setupWSConnection(conn, req, {
    docName: roomName,
    gc: true
  });

  conn.on('close', () => {
    console.log(`[Collab] Connection closed | Room: "${roomName}"`);
  });
});

// 5. Signal handling
process.on('SIGTERM', () => {
  server.close();
  process.exit(0);
});

