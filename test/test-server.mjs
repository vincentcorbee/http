import { createReadStream, readFile } from 'node:fs';
import { HttpServer } from './index.mjs';

const PORT = 8080;
const HOST = 'localhost';

const server = new HttpServer();

server.on('listening', () => {
  console.log(`Server is listening on ${HOST}:${PORT}`);
});

server.on('request', (req, res) => {
  console.log(req.headers);
  console.log(`Received request: ${req.method} ${req.url} HTTP/${req.httpVersion}`);

  req.on('data', (chunk) => {
    console.log(`Received data: ${chunk.toString()}`);
  });

  req.on('end', () => {
    const payload = req.url;
    const contentLength = Buffer.byteLength(payload);
    const stream = createReadStream('./grammar.md')

    if (payload === '/one') {
      // setTimeout(() => {
        res.writeHead(200, { 'Content-Length': contentLength, 'Content-Type': 'text/plain', 'X-foo': '💩' }).end(payload);
      // }, 2000);
    } else if (payload === '/two') {
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });

        stream.pipe(res);
      }, 3000)
    } else {
      res.writeHead(200, { 'Content-Length': contentLength, 'Content-Type': 'text/plain', 'X-foo': '💩' }).end(payload);
    }
  });
})

server.on('error', (err) => {
  console.error(`Server error: ${err.message}`);
});

server.listen(PORT, HOST);