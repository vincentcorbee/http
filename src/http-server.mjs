import { Server as NodeServer } from 'node:net'
import { EventEmitter } from 'node:events';

import { CRLF, CR_CODE, LF_CODE, SP_CODE, COLON_CODE, ZERO_CODE, NINE_CODE, HORIZONTAL_TAB_CODE, FORWARD_SLASH_CODE, CTL_END, DEL_CODE, PERIOD_CODE, SP, SEPERATORS_SET, A_CODE, Z_CODE, SUB_DELIMITERS_SET, AT_SIGN_CODE, PERCENT_CODE, UNRESERVED_SET, A_LOWER_CODE, Z_LOWER_CODE, QUESTION_MARK_CODE, ASTERISK_CODE, TCHAR_SET, PLUS_SIGN_CODE, HYPHEN_CODE } from './tokens.mjs';
import { CONTENT_LENGTH, METHODS_SET, HTTP, HTTP_VERSION_1_1, TRANSFER_ENCODING, WAITING_FOR_REQUEST_LINE, READING_REQUEST_LINE, READING_HEADERS, READING_BODY, MAX_HEADER_COUNT, MAX_HEADER_SIZE } from './constants.mjs';

import { IncomingMessage } from './incoming-message.mjs';
import { OutgoingMessage } from './outgoing-message.mjs';
import { RequestError } from './request-error.mjs';
import { HttpConnection } from './http-connection.mjs';

export class HttpServer extends EventEmitter {
  #server;

  maxHeaderSize = MAX_HEADER_SIZE
  maxHeaderCount = MAX_HEADER_COUNT;
  headersTimeout = 60000;
  keepAliveTimeout = 5000;
  requestTimeout = 300000;

  constructor() {
    super();

    const server = new NodeServer();

    this.#server = server;

    server.on('connection', (socket) => {
      const connection = new HttpConnection({ socket });

      let requestBuffer = Buffer.alloc(0);
      let remainingBuffer = Buffer.alloc(0);
      let headerLine = Buffer.alloc(this.maxHeaderSize);
      let headerNameParsed = false;
      let headerValueParsed = false;
      let headers = {};
      let request = null;
      let response = null;
      let bodyBytesRecieved = 0;
      let headerBytesRecieved = 0;
      let headerCount = 0;
      let headerNameIndex = 0;
      let headerValueIndex = 0;
      let contentLength = 0;
      let transferEncoding = null;
      let isChunked = false;
      let index = 0;
      let currentChunkSize = null;
      let chunkSizeRemaining = 0;
      let chunkSizeStart = 0;

      let minor = '';
      let major = '';
      let method = '';
      let requestTarget = '';
      let httpVersion = '';

      let state = WAITING_FOR_REQUEST_LINE;

      socket.setTimeout(100);

      socket.on('data', (data) => {
        try {
          /* If the request line and headers are processed, the body is streamed and concatenated with remaining data */
          if (state === READING_BODY || index === requestBuffer.byteLength) {
            requestBuffer = Buffer.concat([remainingBuffer, data]);
            remainingBuffer = Buffer.alloc(0);
            index = 0;
          } else {
            requestBuffer = Buffer.concat([requestBuffer, data]);
          }

          while(index < requestBuffer.byteLength) {
            /*
              Request line start not recieved

              4.1 Message Types

              In the interest of robustness, servers SHOULD ignore any empty
              line(s) received where a Request-Line is expected.

              In other words, if the server is reading the protocol stream at the beginning of a
              message and receives a CRLF first, it should ignore the CRLF.
            */
            if (state === WAITING_FOR_REQUEST_LINE) {
              while(index < requestBuffer.byteLength) {
                if(requestBuffer[index] === CR_CODE) {
                  if (requestBuffer[index + 1] === LF_CODE) {
                    index += 2;
                    continue;
                  } else {
                    return
                  }
                } else {
                  state = READING_REQUEST_LINE;
                  break;
                }
              }

              if (state === WAITING_FOR_REQUEST_LINE) return
            }

            /* Waiting for CRLF */
            if (state !== READING_BODY && (requestBuffer[requestBuffer.byteLength - 1] === CR_CODE || requestBuffer.indexOf(CRLF, index) === -1)) return;

            /* request-line = method SP request-target SP HTTP-version */
            if (state === READING_REQUEST_LINE) {
              const methodStart = index;

              /*
                method SP

                method         = token

                token          = 1*tchar

                tchar          = "!" / "#" / "$" / "%" / "&" / "'" / "*"
                  / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
                  / DIGIT / ALPHA
                  ; any VCHAR, except delimiters

                VCHAR          =  %x21-7E ; visible (printing) characters
              */
              while(index < requestBuffer.byteLength) {
                const code = requestBuffer[index];

                if (code === SP_CODE) break;

                if (!(TCHAR_SET.has(code) || (code >= ZERO_CODE && code <= NINE_CODE) || (code >= A_CODE && code <= Z_CODE) || (code >= A_LOWER_CODE && code <= Z_LOWER_CODE))) {
                  throw RequestError.badRequest('Invalid HTTP request: Method contains invalid characters');
                }

                index++;
              }

              method = requestBuffer.toString('ascii', methodStart, index);

              if (requestBuffer[index++] !== SP_CODE) {
                throw RequestError.badRequest('Invalid HTTP request: Request-Line not properly formatted');
              }

              if (!METHODS_SET.has(method)) {
                throw RequestError.badRequest('Invalid HTTP request: Unsupported HTTP method');
              }

              const requestTargetStart = index;

              const code = requestBuffer[index];

              /*
                request-target =
                  /  origin-form
                  /  absolute-form
                  /  authority-form
                  /  asterisk-form
              */

              /*
                origin-form   = absolute-path [ "?" query ]

                absolute-path = 1*( "/" segment )
                segment       = *pchar
                pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
                unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
                pct-encoded   = "%" HEXDIG HEXDIG
                HEXDIG        =  DIGIT / "A" / "B" / "C" / "D" / "E" / "F"
                sub-delims    =
                  / "!" / "$" / "&" / "'" / "(" / ")"
                  / "*" / "+" / "," / ";" / "="
              */
              if (code === FORWARD_SLASH_CODE) {
                index++;

                while(index < requestBuffer.byteLength) {
                  const code = requestBuffer[index];

                  if (code === SP_CODE || code === QUESTION_MARK_CODE) break;

                  if(!((code >= ZERO_CODE && code <= NINE_CODE) || (code >= A_CODE && code <= Z_CODE) || (code >= A_LOWER_CODE && code <= Z_LOWER_CODE) || SUB_DELIMITERS_SET.has(code) || code === COLON_CODE || code === AT_SIGN_CODE || code === FORWARD_SLASH_CODE || code === PERCENT_CODE || UNRESERVED_SET.has(code))) {
                    throw RequestError.badRequest('Invalid HTTP request: Request target contains invalid characters');
                  }

                  /* pct-encoded   = "%" HEXDIG HEXDIG */
                  if (code === PERCENT_CODE) {
                    index++;

                    const firstHex = requestBuffer[index++];

                    if (!((firstHex >= ZERO_CODE && firstHex <= NINE_CODE) || (firstHex >= A_CODE && firstHex <= Z_CODE) || (firstHex >= A_LOWER_CODE || firstHex <= Z_LOWER_CODE))) {
                      throw RequestError.badRequest('Invalid HTTP request: Request target contains invalid percent-encoded characters');
                    }

                    const secondHex = requestBuffer[index++];

                    if (!((secondHex >= ZERO_CODE && secondHex <= NINE_CODE) || (secondHex >= A_CODE && secondHex <= Z_CODE) || (secondHex >= A_LOWER_CODE || secondHex <= Z_LOWER_CODE))) {
                      throw RequestError.badRequest('Invalid HTTP request: Request target contains invalid percent-encoded characters');
                    }
                  }

                  index++;
                }
                /*
                  query = *( pchar / "/" / "?" )
                */
                if (requestBuffer[index] === QUESTION_MARK_CODE) {
                  index++;

                  while(index < requestBuffer.byteLength) {
                    const code = requestBuffer[index];

                    if (code === SP_CODE) break;

                    if(!((code >= ZERO_CODE && code <= NINE_CODE) || (code >= A_CODE && code <= Z_CODE) || (code >= A_LOWER_CODE && code <= Z_LOWER_CODE) || SUB_DELIMITERS_SET.has(code) || code === COLON_CODE || code === AT_SIGN_CODE || code === FORWARD_SLASH_CODE || code === PERCENT_CODE || UNRESERVED_SET.has(code) || code === QUESTION_MARK_CODE)) {
                      throw RequestError.badRequest('Invalid HTTP request: Query contains invalid characters');
                    }

                    /* pct-encoded   = "%" HEXDIG HEXDIG */
                    if (code === PERCENT_CODE) {
                      index++;

                      const firstHex = requestBuffer[index++];

                      if (!((firstHex >= ZERO_CODE && firstHex <= NINE_CODE) || (firstHex >= A_CODE && firstHex <= Z_CODE) || (firstHex >= A_LOWER_CODE || firstHex <= Z_LOWER_CODE))) {
                        throw RequestError.badRequest('Invalid HTTP request: Request target contains invalid percent-encoded characters');
                      }

                      const secondHex = requestBuffer[index++];

                      if (!((secondHex >= ZERO_CODE && secondHex <= NINE_CODE) || (secondHex >= A_CODE && secondHex <= Z_CODE) || (secondHex >= A_LOWER_CODE || secondHex <= Z_LOWER_CODE))) {
                        throw RequestError.badRequest('Invalid HTTP request: Request target contains invalid percent-encoded characters');
                      }
                    }

                    index++;
                  }
                }
              }

              /*
                asterisk-form  = "*"
              */
              else if (code === ASTERISK_CODE) {
                index++
              }

              /*
                absolute-form  = absolute-URI

                absolute-URI   = scheme ":" hier-part [ "?" query ]
              */

              else if ((code >= A_CODE && code <= Z_CODE) || (code >= A_LOWER_CODE && code <= Z_LOWER_CODE)) {
                index++;

                /*
                  scheme       = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
                */
                while (index < requestBuffer.byteLength) {
                  const code = requestBuffer[index];

                  if (code === COLON_CODE) break;

                  if(!((code >= ZERO_CODE && code <= NINE_CODE) || (code >= A_CODE && code <= Z_CODE) || (code >= A_LOWER_CODE && code <= Z_LOWER_CODE) || code === PLUS_SIGN_CODE || code === HYPHEN_CODE || code === PERIOD_CODE)) {
                    throw RequestError.badRequest('Invalid HTTP request: Scheme contains invalid characters');
                  }

                  index++;
                }

                if( requestBuffer[index++] !== COLON_CODE) {
                  throw RequestError.badRequest('Invalid HTTP request: Request target not properly formatted, missing colon after scheme');
                }

                const code = requestBuffer[index];

                /*
                  hier-part      =
                    / "//" authority path-abempty
                    / path-absolute
                    / path-rootless
                    / path-empty
                */

                /* "//" authority path-abempty */
                if (code === FORWARD_SLASH_CODE && requestBuffer[index + 1] === FORWARD_SLASH_CODE) {
                  index += 2;

                  /*
                    authority   = [ userinfo "@" ] host [ ":" port ]

                    userinfo    = *( unreserved / pct-encoded / sub-delims / ":" )
                    host        = IP-literal / IPv4address / reg-name
                    IP-literal  = "[" ( IPv6address / IPvFuture  ) "]"
                    IPv4address = dec-octet "." dec-octet "." dec-octet "." dec-octet
                    IPvFuture   = "v" 1*HEXDIG "." 1*( unreserved / sub-delims / ":" )
                    reg-name    = *( unreserved / pct-encoded / sub-delims )
                    port        = *DIGIT
                  */
                  throw RequestError.badRequest('Invalid HTTP request: Absolute-form authority not supported');
                }

                /*
                  path-absolute = "/" [ segment-nz *( "/" segment ) ]
                  path-rootless = segment-nz *( "/" segment )

                  segment-nz    = 1*pchar
                */
                else if((code >= ZERO_CODE && code <= NINE_CODE) || (code >= A_CODE && code <= Z_CODE) || (code >= A_LOWER_CODE && code <= Z_LOWER_CODE) || SUB_DELIMITERS_SET.has(code) || code === COLON_CODE || code === AT_SIGN_CODE || code === FORWARD_SLASH_CODE || code === PERCENT_CODE || UNRESERVED_SET.has(code)) {
                  while(index < requestBuffer.byteLength) {
                    const code = requestBuffer[index];

                    if (code === SP_CODE || code === QUESTION_MARK_CODE) break;

                    if(!((code >= ZERO_CODE && code <= NINE_CODE) || (code >= A_CODE && code <= Z_CODE) || (code >= A_LOWER_CODE && code <= Z_LOWER_CODE) || SUB_DELIMITERS_SET.has(code) || code === COLON_CODE || code === AT_SIGN_CODE || code === FORWARD_SLASH_CODE || code === PERCENT_CODE && UNRESERVED_SET.has(code))) {
                      throw RequestError.badRequest('Invalid HTTP request: Path absolute contains invalid characters');
                    }

                    /* pct-encoded   = "%" HEXDIG HEXDIG */
                    if (code === PERCENT_CODE) {
                      index++;

                      const firstHex = requestBuffer[index++];

                      if (!((firstHex >= ZERO_CODE && firstHex <= NINE_CODE) || (firstHex >= A_CODE && firstHex <= Z_CODE) || (firstHex >= A_LOWER_CODE || firstHex <= Z_LOWER_CODE))) {
                        throw RequestError.badRequest('Invalid HTTP request: Request target contains invalid percent-encoded characters');
                      }

                      const secondHex = requestBuffer[index++];

                      if (!((secondHex >= ZERO_CODE && secondHex <= NINE_CODE) || (secondHex >= A_CODE && secondHex <= Z_CODE) || (secondHex >= A_LOWER_CODE || secondHex <= Z_LOWER_CODE))) {
                        throw RequestError.badRequest('Invalid HTTP request: Request target contains invalid percent-encoded characters');
                      }
                    }

                    index++;
                  }
                }

                if (requestBuffer[index] === QUESTION_MARK_CODE) {
                  index++;

                  while(index < requestBuffer.byteLength) {
                    const code = requestBuffer[index];

                    if (code === SP_CODE) break;

                    if(!((code >= ZERO_CODE && code <= NINE_CODE) || (code >= A_CODE && code <= Z_CODE) || (code >= A_LOWER_CODE && code <= Z_LOWER_CODE) || SUB_DELIMITERS_SET.has(code) || code === COLON_CODE || code === AT_SIGN_CODE || code === FORWARD_SLASH_CODE || code === PERCENT_CODE || UNRESERVED_SET.has(code))) {
                      throw RequestError.badRequest('Invalid HTTP request: Request target contains invalid characters');
                    }

                    if (code === PERCENT_CODE) {
                      index++;

                      const firstHex = requestBuffer[index++];

                      if (!((firstHex >= ZERO_CODE && firstHex <= NINE_CODE) || (firstHex >= A_CODE && firstHex <= Z_CODE) || (firstHex >= A_LOWER_CODE || firstHex <= Z_LOWER_CODE))) {
                        throw RequestError.badRequest('Invalid HTTP request: Request target contains invalid percent-encoded characters');
                      }

                      const secondHex = requestBuffer[index++];

                      if (!((secondHex >= ZERO_CODE && secondHex <= NINE_CODE) || (secondHex >= A_CODE && secondHex <= Z_CODE) || (secondHex >= A_LOWER_CODE || secondHex <= Z_LOWER_CODE))) {
                        throw RequestError.badRequest('Invalid HTTP request: Request target contains invalid percent-encoded characters');
                      }
                    }

                    index++;
                  }
                }
              }

              requestTarget = requestBuffer.toString('ascii', requestTargetStart, index);

              if (requestBuffer[index++] !== SP_CODE) {
                throw RequestError.badRequest('Invalid HTTP request: Request-Line not properly formatted');
              }

              const httpVersionStart = index;

              /* HTTP-Version: "HTTP" "/" 1*DIGIT "." 1*DIGIT */
              while(index < requestBuffer.byteLength) {
                if (requestBuffer[index] === FORWARD_SLASH_CODE) break;
                index++
              }

              if (requestBuffer.toString('ascii', httpVersionStart, index) !== HTTP) {
                throw RequestError.badRequest('Invalid HTTP request: Unsupported HTTP version');
              }

              if (requestBuffer[index++] !== FORWARD_SLASH_CODE) {
                throw RequestError.badRequest('Invalid HTTP request: Unsupported HTTP version');
              }

              const majorStart = index;

              /* 1*DIGIT */
              while (index < requestBuffer.byteLength) {
                if (requestBuffer[index] === PERIOD_CODE) break;

                const code = requestBuffer[index++];

                if (code < ZERO_CODE || code > NINE_CODE) {
                  throw RequestError.badRequest('Invalid HTTP request: Unsupported HTTP version');
                }
              }

              major = requestBuffer.toString('ascii', majorStart, index);

              if (major === '') {
                throw RequestError.badRequest('Invalid HTTP request: Unsupported HTTP version');
              }

              if (requestBuffer[index++] !== PERIOD_CODE) {
                throw RequestError.badRequest('Invalid HTTP request: Unsupported HTTP version');
              }

              const minorStart = index;

              while (index < requestBuffer.byteLength) {
                if (requestBuffer[index] === CR_CODE && requestBuffer[index + 1] === LF_CODE) break;

                const code = requestBuffer[index++];

                if (code < ZERO_CODE || code > NINE_CODE) {
                  throw RequestError.badRequest('Invalid HTTP request: Unsupported HTTP version');
                }
              }

              minor = requestBuffer.toString('ascii', minorStart, index);

              if (minor === '') {
                throw RequestError.badRequest('Invalid HTTP request: Unsupported HTTP version');
              }

              if (requestBuffer[index] !== CR_CODE && requestBuffer[index + 1] !== LF_CODE) {
                throw RequestError.badRequest('Invalid HTTP request: Request-Line not properly terminated');
              }

              index += 2;

              state = READING_HEADERS;

              httpVersion = `${major}.${minor}`;

              if (requestBuffer.byteLength === index) return;
            }

            /* *(message-header CRLF) CRLF */
            if (state === READING_HEADERS) {
              while(index < requestBuffer.byteLength) {
                if (!headerNameParsed) {
                  /*
                    field-line:
                        field-name ":" OWS field-value OWS
                  */
                  while(index < requestBuffer.byteLength) {
                    if (requestBuffer[index] === COLON_CODE) break;

                    const code = requestBuffer[index++];

                    /*
                      field-name:
                          token
                      token:
                          1*<any CHAR except CTLs or separators>
                      CHAR:
                          <any US-ASCII character (octets 0 - 127)>
                    */
                    if(!((code > CTL_END && code < DEL_CODE) && !SEPERATORS_SET.has(code))) {
                      throw RequestError.badRequest('Invalid HTTP request: Header name contains invalid characters');
                    }

                    headerBytesRecieved ++;

                    if (headerBytesRecieved > this.maxHeaderSize) {
                      throw RequestError.badRequest('Invalid HTTP request: Headers too large');
                    }

                    headerLine[headerNameIndex] = code;
                    headerNameIndex++;
                  }

                  if (requestBuffer.byteLength === index) return;

                  if (requestBuffer[index++] !== COLON_CODE) {
                    throw RequestError.badRequest('Invalid HTTP request: Header not properly formatted');
                  }

                  headerValueIndex = headerNameIndex;

                  /* Consume any whitespace after the colon */
                  while(index < requestBuffer.byteLength) {
                    const code = requestBuffer[index];

                    if (code === SP_CODE || code === HORIZONTAL_TAB_CODE) {
                      index ++;
                      headerBytesRecieved++;

                      if (headerBytesRecieved > this.maxHeaderSize) {
                        throw RequestError.badRequest('Invalid HTTP request: Headers too large');
                      }
                    }
                    else break;
                  }

                  headerNameParsed = true;
                }

                /*
                  field-value    = *field-content
                  field-content  = field-vchar
                                  [ 1*( SP / HTAB / field-vchar ) field-vchar ]
                  field-vchar    = VCHAR / obs-text
                  obs-text       = %x80-FF

                */
                if (!headerValueParsed) {
                  while(index < requestBuffer.byteLength) {
                    if(requestBuffer[index] === CR_CODE && requestBuffer[index + 1] === LF_CODE) break;

                    const code = requestBuffer[index];

                    if (!((code > CTL_END || code < DEL_CODE) || code === HORIZONTAL_TAB_CODE || (code >= 0x80 && code <= 0xFF))) {
                      throw RequestError.badRequest(`Invalid HTTP request: Header value contains invalid character: ${code}`);
                    }

                    index++;
                    headerBytesRecieved++;

                    if (headerBytesRecieved > this.maxHeaderSize) {
                      throw RequestError.badRequest('Invalid HTTP request: Headers too large');
                    }

                    headerLine[headerValueIndex] = code;
                    headerValueIndex++;
                  }

                  if (requestBuffer.byteLength === index) return;

                  if(requestBuffer[index] !== CR_CODE && requestBuffer[index + 1] !== LF_CODE){
                    throw RequestError.badRequest('Invalid HTTP request: Header not properly formatted');
                  }

                  index += 2;

                  headerValueParsed = true;

                  headers[headerLine.toString('ascii', 0, headerNameIndex)] = headerLine.toString('ascii', headerNameIndex, headerValueIndex);

                  if (requestBuffer.byteLength === index) return;

                }

                if (headerNameParsed && headerValueParsed) {
                  headerCount++;

                  if (headerCount > this.maxHeaderCount) {
                    throw RequestError.badRequest('Invalid HTTP request: Max header count exceeded');
                  }

                  headerNameParsed = false;
                  headerValueParsed = false;

                  headerNameIndex = 0;
                  headerValueIndex = 0;

                  /*
                    CRLF
                    End of headers
                  */
                  if(requestBuffer[index] === CR_CODE && requestBuffer[index + 1] === LF_CODE) break;
                }
              }

              if(requestBuffer[index] !== CR_CODE && requestBuffer[index + 1] !== LF_CODE){
                throw RequestError.badRequest('Invalid HTTP request: Headers not properly terminated');
              }

              index += 2;

              state = READING_BODY;

              socket.setTimeout(0);

              const contentLengthValue = parseInt(headers[CONTENT_LENGTH] ?? '0', 10);

              contentLength = isNaN(contentLengthValue) ? 0 : contentLengthValue;
              transferEncoding = headers[TRANSFER_ENCODING] ?? null;
              isChunked = transferEncoding ? transferEncoding.toLowerCase() === 'chunked' : false;

              headerCount = 0;
              headerBytesRecieved = 0;

              /* Only return if a body is expected based on Content-Length and Transfer-Encoding: chunked */
              if (requestBuffer.byteLength === index && (contentLength !== 0 || isChunked)) return;
            }

            /* message-body */
            if(state === READING_BODY) {
              let chunk

              if (isChunked) {
                /* Process chunk header*/
                if (currentChunkSize === null) {
                  chunkSizeStart = index;

                  while(index < requestBuffer.byteLength) {
                    if (requestBuffer[index] === CR_CODE && requestBuffer[index + 1] === LF_CODE) break;

                    index ++;
                  }

                  if (index === requestBuffer.byteLength) {
                    remainingBuffer = requestBuffer.slice(chunkSizeStart);

                    return;
                  }

                  if (requestBuffer[index] !== CR_CODE && requestBuffer[index + 1] !== LF_CODE) {
                    throw RequestError.badRequest('Invalid HTTP request: Chunked transfer encoding not properly formatted');
                  };

                  currentChunkSize = parseInt(requestBuffer.slice(chunkSizeStart, index).toString(), 16);

                  if (Number.isNaN(currentChunkSize) || currentChunkSize < 0) {
                    throw RequestError.badRequest('Invalid HTTP request: Chunked transfer encoding not properly formatted');
                  }

                  if(currentChunkSize !== 0) index += 2;

                  chunkSizeRemaining = currentChunkSize;
                }

                /* Last chunk */
                if (currentChunkSize === 0) {
                  if (requestBuffer[index] !== CR_CODE && requestBuffer[index + 1] !== LF_CODE) {
                    throw RequestError.badRequest('Invalid HTTP request: Chunked transfer encoding not properly formatted');
                  };

                  index += 2;

                  chunk = Buffer.alloc(0);
                } else {
                  chunk = requestBuffer.slice(index, index + chunkSizeRemaining);

                  const length = chunk.byteLength;

                  chunkSizeRemaining -= length;

                  index += length;

                  /* End of chunk */
                  if(chunkSizeRemaining === 0) {
                    if (requestBuffer[index] !== CR_CODE && requestBuffer[index + 1] !== LF_CODE) {
                      throw RequestError.badRequest('Invalid HTTP request: Chunked transfer encoding not properly terminated');
                    }

                    index += 2;

                    currentChunkSize = null;
                  }
                }
              } else {
                chunk = requestBuffer.slice(index);
              }

              bodyBytesRecieved += chunk.byteLength;

              const bodyConsumed = isChunked ? currentChunkSize === 0 : bodyBytesRecieved === contentLength;

              if (request) {
                request.push(chunk);
              } else {
                request = new IncomingMessage({ socket, method, httpVersion, url: requestTarget, headers,  read() { } });

                request.push(chunk);

                response = new OutgoingMessage({ socket });

                connection.queue(response);

                this.emit('request', request, response);
              }

              if (bodyConsumed) {
                request.push(null);

                this.emit('end');

                remainingBuffer = requestBuffer.slice(index);
                requestBuffer = Buffer.alloc(0);
                headers = {};
                request = null;
                response = null;
                bodyBytesRecieved = 0;
                contentLength = 0;
                transferEncoding = null;
                isChunked = false;
                index = 0;
                currentChunkSize = null;
                chunkSizeRemaining = 0;
                chunkSizeStart = 0;

                minor = '';
                major = '';
                method = '';
                requestTarget = '';
                httpVersion = '';

                state = WAITING_FOR_REQUEST_LINE;
              }
            }
          }
        } catch (error) {
          if (error instanceof RequestError) {
            const response =
              HTTP_VERSION_1_1 + SP + error.statusCode + SP + error.status + CRLF +
              'Connection: close' + CRLF +
              CRLF;

            console.error(`Request error: ${error.message}`);

            socket.end(response);
          } else {
            const response =
              HTTP_VERSION_1_1 + SP + "500" + SP + "Internal Server Error" + CRLF +
              'Connection: close' + CRLF +
              CRLF;

            console.error(`Request error: ${error.message}`);

            socket.end(response);
          }
        }
      });

      socket.on('timeout', () => {
        const response =
              HTTP_VERSION_1_1 + SP + "408" + SP + "Request Timeout" + CRLF +
              'Connection: close' + CRLF +
              CRLF;

        console.error(`Request error: Request Timeout`);

        socket.end(response);

        socket.destroy();
      });
    });
  }

  listen(port = 8080, host = 'localhost', callback) {
    this.#server.listen(port, host, callback);
  }
}