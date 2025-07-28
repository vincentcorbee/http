import { Readable } from 'node:stream';

export class IncomingMessage extends Readable {
  #socket;
  #httpVersion;
  #method;
  #url;
  #headers;

  constructor(args) {
    const{ socket, httpVersion, url, headers, initialChunk, ...options } = args;

    super(options);

    this.#socket = socket;
    this.#httpVersion = httpVersion;
    this.#method = args.method;
    this.#url = url;
    this.#headers = headers;
  }

  get socket () {
    return this.#socket;
  }

  get url () {
    return this.#url;
  }

  get method () {
    return this.#method;
  }

  get httpVersion () {
    return this.#httpVersion;
  }

  get headers () {
    return this.#headers;
  }
}