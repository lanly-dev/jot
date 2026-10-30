/**
 * Package Jot Chrome Extension into a clean .zip file
 * Uses pure Node.js (zlib + binary buffers) with 0 external dependencies
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const extensionDir = path.join(__dirname, '..', 'extension')
const downloadsDir = path.join(__dirname, '..', 'public', 'downloads')
const outputZip = path.join(downloadsDir, 'jot-extension.zip')

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true })
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

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath)
  files.forEach(file => {
    const fullPath = path.join(dirPath, file)
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles)
    } else {
      arrayOfFiles.push(fullPath)
    }
  })
  return arrayOfFiles
}

function createZipArchive(sourceDir) {
  const files = getAllFiles(sourceDir)
  const localHeaders = []
  const centralHeaders = []
  let offset = 0

  const dosTime = 0x5421 // Arbitrary fixed valid DOS timestamp
  const dosDate = 0x5898

  for (const filePath of files) {
    const relativePath = path.relative(sourceDir, filePath).replace(/\\/g, '/')
    const rawContent = fs.readFileSync(filePath)
    const compressedContent = zlib.deflateRawSync(rawContent)
    const fileCrc = crc32(rawContent)
    const nameBuf = Buffer.from(relativePath, 'utf8')

    // Local file header (30 bytes + name length + data length)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4) // version needed
    localHeader.writeUInt16LE(0, 6) // flags
    localHeader.writeUInt16LE(8, 8) // method (deflate)
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(fileCrc, 14)
    localHeader.writeUInt32LE(compressedContent.length, 18)
    localHeader.writeUInt32LE(rawContent.length, 22)
    localHeader.writeUInt16LE(nameBuf.length, 26)
    localHeader.writeUInt16LE(0, 28) // extra field length

    const localChunk = Buffer.concat([localHeader, nameBuf, compressedContent])
    localHeaders.push(localChunk)

    // Central directory header (46 bytes + name length)
    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4) // version made by
    centralHeader.writeUInt16LE(20, 6) // version needed
    centralHeader.writeUInt16LE(0, 8) // flags
    centralHeader.writeUInt16LE(8, 10) // method
    centralHeader.writeUInt16LE(dosTime, 12)
    centralHeader.writeUInt16LE(dosDate, 14)
    centralHeader.writeUInt32LE(fileCrc, 16)
    centralHeader.writeUInt32LE(compressedContent.length, 20)
    centralHeader.writeUInt32LE(rawContent.length, 24)
    centralHeader.writeUInt16LE(nameBuf.length, 28)
    centralHeader.writeUInt16LE(0, 30) // extra len
    centralHeader.writeUInt16LE(0, 32) // comment len
    centralHeader.writeUInt16LE(0, 34) // disk num
    centralHeader.writeUInt16LE(0, 36) // internal attr
    centralHeader.writeUInt32LE(0, 38) // external attr
    centralHeader.writeUInt32LE(offset, 42) // relative offset of local header

    centralHeaders.push(Buffer.concat([centralHeader, nameBuf]))
    offset += localChunk.length
  }

  const centralDirBuffer = Buffer.concat(centralHeaders)
  const centralDirOffset = offset
  const centralDirSize = centralDirBuffer.length

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4) // disk number
  eocd.writeUInt16LE(0, 6) // start disk
  eocd.writeUInt16LE(files.length, 8) // records on disk
  eocd.writeUInt16LE(files.length, 10) // total records
  eocd.writeUInt32LE(centralDirSize, 12)
  eocd.writeUInt32LE(centralDirOffset, 16)
  eocd.writeUInt16LE(0, 20) // comment len

  return Buffer.concat([...localHeaders, centralDirBuffer, eocd])
}

const zipBuffer = createZipArchive(extensionDir)
fs.writeFileSync(outputZip, zipBuffer)
console.log(`Successfully created: ${outputZip} (${zipBuffer.length} bytes)`)

module.exports = { createZipArchive }
