/**
 * Generate lightweight PNG icons for Jot Chrome Extension
 * Uses pure Node.js zlib and binary buffers (0 dependencies)
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const iconsDir = path.join(__dirname, '..', 'extension', 'icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
    }
  }
  return (c ^ 0xffffffff) >>> 0
}

function createPng(width, height, drawPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // color type RGBA
  ihdrData[10] = 0 // compression
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // interlace

  const ihdr = createChunk('IHDR', ihdrData)

  // Scanlines with filter byte 0
  const scanlineLength = width * 4 + 1
  const rawData = Buffer.alloc(height * scanlineLength)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength
    rawData[rowOffset] = 0 // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4
      const [r, g, b, a] = drawPixel(x, y, width, height)
      rawData[pixelOffset] = r
      rawData[pixelOffset + 1] = g
      rawData[pixelOffset + 2] = b
      rawData[pixelOffset + 3] = a
    }
  }

  const compressedData = zlib.deflateSync(rawData)
  const idat = createChunk('IDAT', compressedData)
  const iend = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

function createChunk(type, data) {
  const length = data.length
  const chunk = Buffer.alloc(length + 12)
  chunk.writeUInt32BE(length, 0)
  chunk.write(type, 4, 4, 'ascii')
  data.copy(chunk, 8)
  const crc = crc32(chunk.subarray(4, 8 + length))
  chunk.writeUInt32BE(crc, 8 + length)
  return chunk
}

function drawJotIcon(x, y, w, h) {
  // Pastel purple / indigo rounded square with yellow star / lock center
  const cx = w / 2
  const cy = h / 2

  const dx = Math.abs(x - cx)
  const dy = Math.abs(y - cy)

  // Rounded box mask
  const cornerR = w * 0.2
  const innerW = w * 0.45 - cornerR
  const innerH = h * 0.45 - cornerR

  let isInside = false
  if (dx <= innerW && dy <= w * 0.45) isInside = true
  else if (dx <= w * 0.45 && dy <= innerH) isInside = true
  else {
    const cxCorner = dx - innerW
    const cyCorner = dy - innerH
    if (cxCorner * cxCorner + cyCorner * cyCorner <= cornerR * cornerR) {
      isInside = true
    }
  }

  if (!isInside) return [0, 0, 0, 0] // Transparent

  // Gradient background: Pastel purple (#7C3AED to #A78BFA)
  const t = y / h
  const bgR = Math.round(124 + (167 - 124) * t)
  const bgG = Math.round(58 + (139 - 58) * t)
  const bgB = Math.round(237 + (250 - 237) * t)

  // Center white/gold lock icon or dot
  const centerDist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy))
  if (centerDist <= w * 0.16) {
    return [254, 240, 138, 255] // Pastel gold
  }

  return [bgR, bgG, bgB, 255]
}

const sizes = [16, 48, 128]
sizes.forEach(size => {
  const pngBuf = createPng(size, size, drawJotIcon)
  const outPath = path.join(iconsDir, `icon-${size}.png`)
  fs.writeFileSync(outPath, pngBuf)
  console.log(`Generated icon: ${outPath} (${size}x${size})`)
})

console.log('Icon generation complete!')
