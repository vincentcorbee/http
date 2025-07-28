const WebSocket= require('./lib/index.js');

const http = require('http');

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running.\n');
});

server.listen(8080, () => {
  console.log('Server is listening on port 8080');
});

const ws = new WebSocket(server)

ws.on('message', ({ socket, buffer, payload }) => {
  console.log('Received message:', payload.toString());
  // Echo the message back to the client
  socket.write(buffer);
});

