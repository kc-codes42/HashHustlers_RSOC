/**
 * Yjs WebSocket Collaboration Server
 * 
 * This server facilitates realtime collaboration by synchronizing 
 * Yjs documents across multiple clients using the y-websocket protocol.
 */

const http = require('http');
const WebSocket = require('ws');
// After installing y-websocket@1.5.0, the bin/utils.js file is available
const setupWSConnection = require('y-websocket/bin/utils').setupWSConnection;

const port = process.env.PORT || 1234;

// Create an HTTP server to attach the WebSocket server to
const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('HashHustlers Yjs Collaboration Server is Running\n');
});

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (conn, req) => {
  const roomName = req.url.slice(1) || 'default-room';
  console.log(`[Yjs Server] New connection established | Room: "${roomName}" | Timestamp: ${new Date().toISOString()}`);

  // Setup the Yjs connection logic provided by y-websocket
  setupWSConnection(conn, req, {
    docName: roomName,
    gc: true
  });

  conn.on('close', () => {
    console.log(`[Yjs Server] Connection closed | Room: "${roomName}"`);
  });
});

// Start listening
server.listen(port, () => {
  console.log(`
  🚀 Yjs Collaboration Server is live!
  ------------------------------------
  Port:     ${port}
  Protocol: ws://localhost:${port}
  Rooms:    Dynamic (determined by URL path)
  
  Ready to sync code sessions...
  `);
});
