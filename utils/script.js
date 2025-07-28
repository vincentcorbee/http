const TOKEN_CTL = {
  HORIZONTAL_TAB: "\t",
  LINE_FEED: "\n",
  CARRIAGE_RETURN: "\r",
  DEL: "\x7F",
}

const TOKEN_VCHAR = {
  SPACE: " ",
  EXCLAMATION_MARK: "!",
  DOUBLE_QUOTE: '"',
  HASH: "#",
  DOLLAR_SIGN: "$",
  PERCENT: "%",
  AMPERSAND: "&",
  APOSTROPHE: "'",
  LEFT_PARENTHESIS: "(",
  RIGHT_PARENTHESIS: ")",
  ASTERISK: "*",
  PLUS_SIGN: "+",
  COMMA: ",",
  HYPHEN: "-",
  PERIOD: ".",
  FORWARD_SLASH: "/",

  DIGIT_0: "0",
  DIGIT_1: "1",
  DIGIT_2: "2",
  DIGIT_3: "3",
  DIGIT_4: "4",
  DIGIT_5: "5",
  DIGIT_6: "6",
  DIGIT_7: "7",
  DIGIT_8: "8",
  DIGIT_9: "9",

  COLON: ":",
  SEMICOLON: ";",
  LESS_THAN: "<",
  EQUALS_SIGN: "=",
  GREATER_THAN: ">",
  QUESTION_MARK: "?",
  AT_SIGN: "@",

  UPPERCASE_A: "A",
  UPPERCASE_B: "B",
  UPPERCASE_C: "C",
  UPPERCASE_D: "D",
  UPPERCASE_E: "E",
  UPPERCASE_F: "F",
  UPPERCASE_G: "G",
  UPPERCASE_H: "H",
  UPPERCASE_I: "I",
  UPPERCASE_J: "J",
  UPPERCASE_K: "K",
  UPPERCASE_L: "L",
  UPPERCASE_M: "M",
  UPPERCASE_N: "N",
  UPPERCASE_O: "O",
  UPPERCASE_P: "P",
  UPPERCASE_Q: "Q",
  UPPERCASE_R: "R",
  UPPERCASE_S: "S",
  UPPERCASE_T: "T",
  UPPERCASE_U: "U",
  UPPERCASE_V: "V",
  UPPERCASE_W: "W",
  UPPERCASE_X: "X",
  UPPERCASE_Y: "Y",
  UPPERCASE_Z: "Z",

  LEFT_SQUARE_BRACKET: "[",
  BACKSLASH: "\\",
  RIGHT_SQUARE_BRACKET: "]",
  CARET: "^",
  UNDERSCORE: "_",
  BACKTICK: "`",

  LOWERCASE_A: "a",
  LOWERCASE_B: "b",
  LOWERCASE_C: "c",
  LOWERCASE_D: "d",
  LOWERCASE_E: "e",
  LOWERCASE_F: "f",
  LOWERCASE_G: "g",
  LOWERCASE_H: "h",
  LOWERCASE_I: "i",
  LOWERCASE_J: "j",
  LOWERCASE_K: "k",
  LOWERCASE_L: "l",
  LOWERCASE_M: "m",
  LOWERCASE_N: "n",
  LOWERCASE_O: "o",
  LOWERCASE_P: "p",
  LOWERCASE_Q: "q",
  LOWERCASE_R: "r",
  LOWERCASE_S: "s",
  LOWERCASE_T: "t",
  LOWERCASE_U: "u",
  LOWERCASE_V: "v",
  LOWERCASE_W: "w",
  LOWERCASE_X: "x",
  LOWERCASE_Y: "y",
  LOWERCASE_Z: "z",

  LEFT_CURLY_BRACE: "{",
  VERTICAL_BAR: "|",
  RIGHT_CURLY_BRACE: "}",
  TILDE: "~"
};

const TOKEN_SEPERATORS_SOURCE = [
  "LEFT_BRACE",
  "RIGHT_BRACE",
  "LEFT_ANGLE_BRACKET",
  "RIGHT_ANGLE_BRACKET",
  "AT_SIGN",
  "COMMA",
  "SEMICOLON",
  "COLON",
  "BACKSLASH",
  "DOUBLE_QUOTE",
  "FORWARD_SLASH",
  "LEFT_SQUARE_BRACKET",
  "RIGHT_SQUARE_BRACKET",
  "QUESTION_MARK",
  "EQUALS_SIGN",
  "LEFT_CURLY_BRACE",
  "RIGHT_CURLY_BRACE",
  "SPACE",
  "HORIZONTAL_TAB"
]

const TOKEN_SUB_DELIMITERS_SOURCE = [
  "EXCLAMATION_MARK",
  "DOLLAR_SIGN",
  "AMPERSAND",
  "APOSTROPHE",
  "ASTERISK",
  "PLUS_SIGN",
  "COMMA",
  "SEMICOLON",
  "EQUALS_SIGN",
  "LEFT_BRACE",
  "RIGHT_BRACE"
]

let TOKEN_CODES = ''
let TOKEN = ''
let TOKEN_SEPERATORS_SET = []

let TOKEN_SUB_DELIMITERS = ''
let TOKEN_SUB_DELIMITERS_CODES = ''
let TOKEN_SUB_DELIMITERS_SET = []

TOKEN_SEPERATORS_SOURCE.forEach(([name]) => {
  TOKEN_SEPERATORS_SET.push(`${name}_CODE`)
})

TOKEN_SUB_DELIMITERS_SOURCE.forEach(([name]) => {
  TOKEN_SUB_DELIMITERS_SET.push(`${name}_CODE`)
})

const TOKEN_SET = new Set();

([...TOKEN_SEPERATORS_SOURCE, ...TOKEN_SUB_DELIMITERS_SOURCE]).forEach((name) => {
  const value = TOKEN_VCHAR[name] || TOKEN_CTL[name];

  if (value === undefined) throw new Error(`Token "${name}" not found in TOKEN_VCHAR or TOKEN_CTL`);

  if(!TOKEN_SET.has(value)) {
    TOKEN_SET.add(value);

    TOKEN += `export const ${name} = '${value}';\n`
    TOKEN_CODES += `export const ${name}_CODE = 0x${value.charCodeAt(0).toString(16).padStart(2, '0')};\n`
  }
})

console.log(TOKEN)
console.log(TOKEN_CODES)
console.log(`export const SEPERATORS_SET = new Set([${TOKEN_SEPERATORS_SET.join(',')}]);`)
console.log(`export const SUB_DELIMITERS_SET = new Set([${TOKEN_SUB_DELIMITERS_SET.join(',')}]);`)