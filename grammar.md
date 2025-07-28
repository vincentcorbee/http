generic-message:
      start-line *(message-header CRLF) CRLF [ message-body ]
start-line:
      Request-Line | Status-Line
Request-Line:
      Method SP Request-URI SP HTTP-Version CRLF
Request-URI:
      "*"
    | absoluteURI
    | abs_path
    | authority
absoluteURI:
      scheme ":" ( hier_part | opaque_part )
HTTP-Version:
      "HTTP" "/" 1*DIGIT "." 1*DIGIT
message-header:
      field-name ":" [ field-value ]
field-name:
      token
field-value:
      *( field-content | LWS )
field-content:
      <the OCTETs making up the field-value and consisting of either *TEXT or combinations of token, separators, and quoted-string>
token:
      1*<any CHAR except CTLs or separators>
separators:
      "(" | ")" | "<" | ">" | "@" | "," | ";" | ":" | "\" | <"> | "/" | "[" | "]" | "?" | "=" | "{" | "}" | SP | HT
OCTET:
      <any 8-bit sequence of data>
CHAR:
      <any US-ASCII character (octets 0 - 127)>
UPALPHA:
      <any US-ASCII uppercase letter "A".."Z">
LOALPHA:
      <any US-ASCII lowercase letter "a".."z">
ALPHA:
      UPALPHA | LOALPHA
DIGIT:
      <any US-ASCII digit "0".."9">
CTL:
      <any US-ASCII control character (octets 0 - 31) and DEL (127)>
CR:
      <US-ASCII CR, carriage return (13)>
LF:
      <US-ASCII LF, linefeed (10)>
SP:
      <US-ASCII SP, space (32)>
HT:
      <US-ASCII HT, horizontal-tab (9)>
<">:
      <US-ASCII double-quote mark (34)>
LWS:
      [CRLF] 1*( SP | HT )
TEXT:
      <any OCTET except CTLs, but including LWS>

OWS            = *( SP / HTAB ) ; optional whitespace
RWS            = 1*( SP / HTAB ) ; required whitespace
BWS            = OWS ; "bad" whitespace