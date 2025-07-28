import { createReadStream } from 'node:fs';
import http from 'node:http';

const server = http.createServer();

server.on('request', (req, res) => {
  console.log(`Received request: ${req.method} ${req.url} HTTP/${req.httpVersion}`);
  const stream = createReadStream('./grammar.md')

  console.log(req.headers);

  req.on('data', (chunk) => {
    console.log({ chunk});
  });
  req.on('end', () => {
    console.log(req.url)
    if(req.url === '/one') {
      setTimeout(() => {
        // res.write('foo');
        res.writeHead(200, { 'Content-Type': 'text/plain', 'X-foo': '💩' }).end('Response for /one\n');
      }, 2000);
    } else {
      stream.pipe(res);
    }
    console.log('Request ended');
  });
})

server.listen(8888, () => `Server is listening on port 8888`);