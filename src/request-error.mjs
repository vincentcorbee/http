export class RequestError extends Error {
  constructor(options) {
    const { status, statusCode, message } = options

    super(message)

    this.name = 'RequestError';
    this.status = status
    this.statusCode = statusCode;
  }

  static badRequest(message) {
    return new RequestError({
      status: 'Bad Request',
      statusCode: 400,
      message: message || 'Invalid HTTP request'
    });
  }
}