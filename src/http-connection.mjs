export class HttpConnection {
  #socket;
  #queue;
  #isWriting = false;

  constructor(options) {
    const { socket } = options;

    this.#socket = socket;
    this.#queue = [];
  }

  queue(repsonse) {
    this.#queue.push(repsonse);
    this.#dequeue();
  }

  #dequeue() {
    if (this.#isWriting) return;

    if (this.#queue.length === 0) return null;

    const response = this.#queue.shift();

    this.#isWriting = true;

    response._send(() => {
      this.#isWriting = false;

      this.#dequeue();
    })

  }
}