/**
 * Sample Browser Password CSV Generator for Testing Jot
 *
 * Generates sample CSV files in the exact format of:
 * - Chrome / Edge (name,url,username,password,note)
 * - Safari (Title,URL,Username,Password,Notes,OTPAuth)
 * - Firefox (url,username,password,httpRealm,formActionOrigin,guid,timeCreated,timeLastUsed,timePasswordChanged)
 * - Bitwarden (folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp)
 *
 * Usage:
 *   node scripts/generate-sample-csv.js [chrome|safari|firefox|bitwarden|all]
 */

const fs = require('fs')
const path = require('path')

const targetFormat = (process.argv[2] || 'all').toLowerCase()
const outputDir = path.join(__dirname, '..', 'data', 'samples')

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const sampleItems = [
  {
    name: 'GitHub',
    url: 'https://github.com/login',
    username: 'developer@example.com',
    password: 'p@ssword-gh-9988',
    notes: 'Developer account, 2FA enabled'
  },
  {
    name: 'Google',
    url: 'https://accounts.google.com/signin',
    username: 'alex.smith@gmail.com',
    password: 'G00gle-Secret-77!',
    notes: 'Primary personal Google workspace'
  },
  {
    name: 'Slack',
    url: 'https://workspace.slack.com',
    username: 'alex.dev@company.org',
    password: 'Slack-Team-Pass#2026',
    notes: 'Team communications channel'
  },
  {
    name: 'Proxmox VE',
    url: 'https://192.168.1.100:8006',
    username: 'root@pam',
    password: 'Pr0xm0x-Hypervis0r$',
    notes: 'Home lab cluster node'
  },
  {
    name: 'Amazon Web Services',
    url: 'https://console.aws.amazon.com',
    username: 'cloud-admin',
    password: 'Aws-Cloud-K3y!99',
    notes: 'IAM root administrator account'
  }
]

function generateChromeCsv() {
  const header = 'name,url,username,password,note\n'
  const rows = sampleItems.map(item =>
    `"${item.name}","${item.url}","${item.username}","${item.password}","${item.notes}"`
  ).join('\n')
  return header + rows + '\n'
}

function generateSafariCsv() {
  const header = 'Title,URL,Username,Password,Notes,OTPAuth\n'
  const rows = sampleItems.map(item =>
    `"${item.name}","${item.url}","${item.username}","${item.password}","${item.notes}",""`
  ).join('\n')
  return header + rows + '\n'
}

function generateFirefoxCsv() {
  const header = '"url","username","password","httpRealm","formActionOrigin","guid","timeCreated","timeLastUsed","timePasswordChanged"\n'
  const now = Date.now()
  const rows = sampleItems.map((item, idx) =>
    `"${item.url}","${item.username}","${item.password}","","${item.url}","{${idx}-uuid-firefox}",${now},${now},${now}`
  ).join('\n')
  return header + rows + '\n'
}

function generateBitwardenCsv() {
  const header = 'folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n'
  const rows = sampleItems.map(item =>
    `"","0","login","${item.name}","${item.notes}","","0","${item.url}","${item.username}","${item.password}",""`
  ).join('\n')
  return header + rows + '\n'
}

const formats = {
  chrome: { filename: 'chrome-passwords.csv', generator: generateChromeCsv },
  safari: { filename: 'safari-passwords.csv', generator: generateSafariCsv },
  firefox: { filename: 'firefox-passwords.csv', generator: generateFirefoxCsv },
  bitwarden: { filename: 'bitwarden-passwords.csv', generator: generateBitwardenCsv }
}

const toGenerate = targetFormat === 'all'
  ? Object.keys(formats)
  : [targetFormat]

let generatedCount = 0
for (const fmt of toGenerate) {
  if (formats[fmt]) {
    const filePath = path.join(outputDir, formats[fmt].filename)
    fs.writeFileSync(filePath, formats[fmt].generator(), 'utf8')
    console.log(`Generated sample [${fmt}]: ${filePath}`)
    generatedCount++
  } else {
    console.warn(`Unknown format "${fmt}". Available: chrome, safari, firefox, bitwarden, all`)
  }
}

console.log(`\nSuccess! Created ${generatedCount} test CSV file(s) in: ${outputDir}`)
console.log('You can now drag & drop or select any of these files in Jot to test the import!')
