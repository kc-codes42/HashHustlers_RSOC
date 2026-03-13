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
const { executeCode } = require('../services/localExecutor');

const app = express();
const port = process.env.PORT || 5000;

// 1. Middleware
app.use(cors());
app.use(express.json());

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
const server = http.createServer(app);
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

// 5. Start Server
server.listen(port, () => {
  console.log(`
  🚀 HashHustlers Backend live at http://localhost:${port}
  ----------------------------------------------------
  Collaboration: ws://localhost:${port}
  Code Execution: POST http://localhost:${port}/api/run
  
  System initialized and ready.
  `);
});

