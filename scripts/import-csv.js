/**
 * CSV Import CLI Tool for Jot
 *
 * Reads a CSV file from disk (Chrome, Edge, Safari, Firefox, Bitwarden),
 * parses it, and sends it directly to Jot's backend at POST /api/import.
 *
 * Usage:
 *   node scripts/import-csv.js <path-to-csv-file> [server-url] [api-token]
 *
 * Example:
 *   node scripts/import-csv.js data/samples/chrome-passwords.csv
 *   node scripts/import-csv.js data/samples/chrome-passwords.csv http://localhost:3000 my-token
 */

const fs = require('fs')
const path = require('path')

const filePath = process.argv[2]
const serverUrl = process.argv[3] || process.env.JOT_SERVER_URL || 'http://localhost:3000'
const apiToken = process.argv[4] || process.env.JOT_API_TOKEN || ''

if (!filePath) {
  console.error('Error: Please provide a CSV file path.')
  console.log('Usage: node scripts/import-csv.js <path-to-csv> [server-url] [api-token]')
  process.exit(1)
}

const resolvedPath = path.resolve(process.cwd(), filePath)
if (!fs.existsSync(resolvedPath)) {
  console.error(`Error: File not found at "${resolvedPath}"`)
  process.exit(1)
}

/**
 * RFC 4180 compliant CSV parser
 */
function parseCSV(text) {
  const rows = []
  let currentRow = []
  let currentVal = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentVal += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        currentVal += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentVal.trim())
        currentVal = ''
      } else if (char === '\r') {
        // Skip CR
      } else if (char === '\n') {
        currentRow.push(currentVal.trim())
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow)
        }
        currentRow = []
        currentVal = ''
      } else {
        currentVal += char
      }
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim())
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
      rows.push(currentRow)
    }
  }

  return rows
}

/**
 * Multi-browser heuristic mapping
 */
function mapCSVToCredentials(csvRows) {
  if (!csvRows || csvRows.length < 2) return { credentials: [], source: 'Empty CSV' }

  const headers = csvRows[0].map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''))
  const rawHeaders = csvRows[0].map(h => h.trim())

  let source = 'Generic CSV'
  if (headers.includes('login_uri') || headers.includes('login_username')) {
    source = 'Bitwarden'
  } else if (headers.includes('httprealm') || headers.includes('formactionorigin')) {
    source = 'Firefox'
  } else if (rawHeaders.includes('Title') && rawHeaders.includes('Notes') && rawHeaders.includes('URL')) {
    source = 'Safari'
  } else if (headers.includes('name') && headers.includes('url') && headers.includes('username') && headers.includes('password')) {
    source = 'Chrome / Edge'
  }

  const findIdx = (names) => {
    for (const name of names) {
      const idx = headers.indexOf(name)
      if (idx !== -1) return idx
    }
    return -1
  }

  const nameIdx = findIdx(['title', 'name', 'service', 'site', 'website_name'])
  const urlIdx = findIdx(['url', 'login_uri', 'website', 'link', 'uri', 'address'])
  const userIdx = findIdx(['username', 'login_username', 'user', 'login', 'email', 'account'])
  const passIdx = findIdx(['password', 'login_password', 'pass', 'secret'])
  const noteIdx = findIdx(['note', 'notes', 'comment', 'description', 'fields'])

  const credentials = []
  const now = new Date().toISOString()

  for (let i = 1; i < csvRows.length; i++) {
    const row = csvRows[i]
    if (row.length === 0 || (row.length === 1 && !row[0])) continue

    let rawName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].trim() : ''
    const rawUrl = urlIdx !== -1 && row[urlIdx] ? row[urlIdx].trim() : ''
    const rawUser = userIdx !== -1 && row[userIdx] ? row[userIdx].trim() : ''
    const rawPass = passIdx !== -1 && row[passIdx] ? row[passIdx].trim() : ''
    const rawNotes = noteIdx !== -1 && row[noteIdx] ? row[noteIdx].trim() : ''

    if (!rawName && rawUrl) {
      try {
        const u = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl)
        rawName = u.hostname.replace(/^www\./i, '')
      } catch {
        rawName = rawUrl
      }
    }

    if (!rawName && !rawUrl && !rawUser && !rawPass) continue

    credentials.push({
      category: 'login',
      name: rawName || 'Untitled Login',
      url: rawUrl,
      username: rawUser,
      password: rawPass,
      notes: rawNotes,
      createdAt: now,
      updatedAt: now
    })
  }

  return { credentials, source }
}

async function run() {
  console.log(`Reading CSV file: ${resolvedPath}`)
  const content = fs.readFileSync(resolvedPath, 'utf8')
  const rows = parseCSV(content)
  const { credentials, source } = mapCSVToCredentials(rows)

  console.log(`Detected format: ${source}`)
  console.log(`Parsed ${credentials.length} credential(s) from CSV.`)

  if (credentials.length === 0) {
    console.warn('No credentials found in CSV. Exiting.')
    return
  }

  console.log('\nPreviewing items to import:')
  credentials.slice(0, 5).forEach((c, idx) => {
    console.log(`  ${idx + 1}. [${c.name}] Username: "${c.username}" | Password: "${'•'.repeat(Math.min(c.password.length, 8))}" | URL: "${c.url}"`)
  })
  if (credentials.length > 5) {
    console.log(`  ... and ${credentials.length - 5} more item(s).`)
  }

  const endpoint = `${serverUrl.replace(/\/+$/, '')}/api/import`
  console.log(`\nSending batch import request to: ${endpoint}`)

  const headers = { 'Content-Type': 'application/json' }
  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ credentials })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Server returned HTTP ${res.status}: ${errText}`)
    }

    const data = await res.json()
    console.log('\n Import Success!')
    console.log(`  - Credentials added: ${data.credentialsAdded}`)
    console.log(`  - Credentials updated: ${data.credentialsUpdated}`)
    console.log('Credentials are now securely encrypted with AES-256-GCM in your Jot vault! 🔒')
  } catch (err) {
    console.error('\nImport failed:', err.message)
    process.exit(1)
  }
}

run()
