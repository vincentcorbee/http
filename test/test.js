

const uint8Array = new Uint8Array([254, 255, 253, 255, 255, 253, 29, 228])

const radix = 10
let hi = 0
let lo = 0

for(let pos = uint8Array.byteLength - 1; pos > -1; pos --) {
  const uint8 = uint8Array[pos]

  if (pos < 4) {
    hi += Math.max((2**((3 - pos) * 8) - 1), 1) * uint8
  }

  else {
    lo += Math.max((2**((7 - pos) * 8) - 1), 1) * uint8
  }
}

console.log(hi, lo)

let numberAsString = ''

while (hi || lo) {
  var mod = (hi % radix) * 0xffffffff + lo;

  hi = Math.floor(hi / radix);
  lo = Math.floor(mod / radix);

  numberAsString = `${(mod % radix).toString(radix)}${numberAsString}`;
}

console.log(numberAsString)

// const number = '43243,45'

// const [integer, fraction] = number.split(',')

// let intl = new Intl.NumberFormat('nl-NL')

// const parts = intl.format(integer).split('.')
// const position = parts.length - 1

// let output = ''

// const map = {
//   h: {
//     1: 'honderd'
//   }
// }

// while (length > -1) {
//   const part = parts[position]

//   const length = part.length

//   const [h, t, s] = part



//   position --
// }

// let bitPosition = uint8Array.byteLength * 8 - 1

// for (const uint8 of uint8Array) {

//   let bitPositionInByte = 7

//   if (uint8 == 0) bitPosition -= 7
//   else {
//     while (bitPositionInByte > -1) {
//       if ((uint8 >>> bitPositionInByte) & 0x1) console.log(uint8, uint8 % radix, 2**bitPosition)

//       bitPosition--
//       bitPositionInByte--
//     }
//   }
// }


/*

const Uint64BE = require('int64-buffer').Uint64BE

const uint8Array = new Uint8Array([254, 255, 90, 255, 255, 253, 29, 1])

const uint64 = new Uint64BE(uint8Array)

let bitPosition = 0

let bytePosition = uint8Array.byteLength - 1

let number = ''

while (bytePosition > -1) {
  const uint8 = uint8Array[bytePosition]

  let bitPositionInByte = 0

  if (uint8 == 0) bitPosition += 7
  else {
    while (bitPositionInByte < 8) {
      if (uint8 & 2**bitPositionInByte) console.log(uint8, 2**bitPosition)

      bitPosition++
      bitPositionInByte++
    }
  }

  bytePosition--
}
*/
