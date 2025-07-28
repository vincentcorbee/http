import { Stream } from 'node:stream';
import { HIGH_WATER_MARK, MAX_HEADER_COUNT, MAX_HEADER_SIZE, HTTP_VERSION_1_1, STATUS_OK } from './constants.mjs';
import { SP, CRLF } from './tokens.mjs';

export class OutgoingMessage extends Stream {
  #socket;
  #chunks = [];
  #headersWritten = false;
  #ended = false;
  #finished = false;
  #highWaterMark = HIGH_WATER_MARK;

  constructor({ socket, ...options }) {
    super(options);

    this.#socket = socket;
  }

  writeHead(statusCode, headers = {}) {
    if (this.#headersWritten) {
      throw new Error('Headers already written');
    }

    this.write(HTTP_VERSION_1_1 + SP + statusCode + SP + STATUS_OK + CRLF);

    const entries = Object.entries(headers);

    if (entries.length > MAX_HEADER_COUNT) throw new Error('Too many headers');

    entries.forEach(([key, value]) => {
      this.write(`${key}: ${value}${CRLF}`, 'ascii');
    });

    if(entries.length > 0) this.write(CRLF, 'ascii');

    this.#headersWritten = true;

    return this;
  }

  write(chunk, encoding, callback) {
    if (typeof chunk === 'string') chunk = Buffer.from(chunk, encoding);

    if (!Buffer.isBuffer(chunk)) {
      throw new TypeError('Chunk must be a string or a Buffer');
    }

    this.#chunks.push(chunk);

    if (callback) process.nextTick(callback);

    if (this.#chunks.length >= this.#highWaterMark) return false;
  }

  end(chunk, encoding, callback) {
    if (chunk) this.write(chunk, encoding, callback);

    this.#ended = true;
  }

  _send(callback) {
    setImmediate(() => {
      if (this.#finished) return;

      if (this.#chunks.length === 0) return this._send(callback);

      this.#socket.write(Buffer.concat(this.#chunks), (error) => {
        if (error) {
          this.emit('error', error);

          return callback(error);
        }

        if (this.#ended) {
          this.#finished = true;

          this.emit('finish');

          callback();
        } else {
          this._send(callback);
        }
      });

      this.#chunks = [];

      this.emit('drain');
    });
  }
}