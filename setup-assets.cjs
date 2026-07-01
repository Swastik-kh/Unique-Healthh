const fs = require('fs');
const path = require('path');

// Ensure assets folder exists
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

const faviconPath = path.join(__dirname, 'public', 'favicon.png');

if (fs.existsSync(faviconPath)) {
  console.log('Copying favicon.png to assets/ directory...');
  fs.copyFileSync(faviconPath, path.join(assetsDir, 'icon-only.png'));
  fs.copyFileSync(faviconPath, path.join(assetsDir, 'icon-foreground.png'));
  fs.copyFileSync(faviconPath, path.join(assetsDir, 'icon-background.png'));
  fs.copyFileSync(faviconPath, path.join(assetsDir, 'splash.png'));
  fs.copyFileSync(faviconPath, path.join(assetsDir, 'splash-dark.png'));
  console.log('Successfully set up assets/ folder!');
} else {
  console.error('favicon.png not found in public folder!');
}
