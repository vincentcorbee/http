import { Socket } from 'node:net';

const CR = '\r';
const LF = '\n';
const CRLF = CR + LF;
const PORT = 8080;
const HOST = 'localhost';
const SP = ' ';

// for (let i = 0; i < 50; i++) {
const client = new Socket()

client.on('connect', () => {
  const request =
    CRLF + "GET /foo/bar?baz=foo HTTP/1.1" + CRLF +
    "Host: " + HOST + ":" + PORT + CRLF +
    "X-foo: \tba\traz\t\t\t" + CRLF +
    "X-Comment: Café" + CRLF +
    CRLF

  const parts = [
    CRLF + "GET /one ",
    "HTTP/1.1" + CR,
    LF + "Transfer-Enc",
    "oding: chunk",
    "ed" + CR,
    LF + "Content-Type",
    ":",
    " text/plain" + CRLF,
    "Host: " + HOST + ":",
    PORT.toString(),
    CR,
    LF,
    CRLF + "6",
    CR,
    LF,
    "He",
    "llo," + CR,
    LF,
    "8" + CRLF,
    " Ser",
    "ver!" + CR,
    LF + "0" + CRLF,
    "GET /two HTTP/1.1\r\nHost: x\r\n\r\n"
  ]

  client.write(request);

  // parts.forEach((part, i) => {
  //   setTimeout(() => {
  //     console.log(`Sending part ${i + 1}: ${part}`);
  //     client.write(part);
  //   }, i * 500);
  // });

  // const partCount = 4;
  // const partSize = Math.ceil(request.length / partCount);

  // for (let i = 0; i < partCount; i++) {
  //   setTimeout(() => {
  //     const chunk = request.slice(partSize * i, (i + 1) * partSize);
  //     console.log({ chunk: chunk.toString()})
  //     client.write(chunk);
  //   }, i * 500);
  // }

});

client.on('data', (data) => {
  // console.log(`Received from server: ${data.toString()}`);

  console.log({ data: data.toString() });
});

client.on('end', (data) => {
  console.log(`Connection ended: ${data ? data.toString() : ''}`);
});

client.on('error', (err) => {
  console.error(`Error: ${err.message}`);
});

client.connect(PORT, HOST)
// }