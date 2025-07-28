import { FORWARD_SLASH } from "./tokens.mjs";

export const CONTENT_LENGTH = 'Content-Length';
export const TRANSFER_ENCODING = 'Transfer-Encoding';

export const HTTP = "HTTP"
export const HTTP_VERSION_1_1 = HTTP + FORWARD_SLASH + "1.1";
export const METHODS_SET = new Set(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']);
export const STATUS_CODE_200 = "200";
export const STATUS_OK = "OK";

export const WAITING_FOR_REQUEST_LINE = 0;
export const READING_REQUEST_LINE = 1;
export const READING_HEADERS = 2;
export const READING_BODY = 3;

export const MAX_HEADER_COUNT = 100;
export const MAX_HEADER_SIZE = 16 * 2**10; /* 16KiB */
export const HIGH_WATER_MARK = 64 * 2**10; /* 64KiB */