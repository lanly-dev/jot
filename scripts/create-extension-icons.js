/**
 * Sync the Chrome extension icons with the app icons.
 *
 * The Jót icons are designed assets (indigo tile, "Jót" wordmark with the
 * underline) rendered to PNG at every size the app needs and checked into
 * public/ (icon-16.png, icon-48.png, icon-128.png, ...). The extension uses
 * the same artwork, so this script just copies the three sizes the
 * extension needs into extension/icons/ — one source of truth, no separate
 * drawing code to drift out of sync.
 *
 * Usage: node scripts/create-extension-icons.js
 */

const fs = require('fs')
const path = require('path')

const publicDir = path.join(__dirname, '..', 'public')
const iconsDir = path.join(__dirname, '..', 'extension', 'icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

const sizes = [16, 48, 128]
sizes.forEach(size => {
  const src = path.join(publicDir, `icon-${size}.png`)
  const dest = path.join(iconsDir, `icon-${size}.png`)
  if (!fs.existsSync(src)) {
    console.error(`Missing app icon: ${src} — render the Jót icons into public/ first.`)
    process.exitCode = 1
    return
  }
  fs.copyFileSync(src, dest)
  console.log(`Synced icon: ${dest} (${size}x${size})`)
})

console.log('Extension icons in sync with app icons.')
