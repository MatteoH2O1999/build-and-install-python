console.log('\nAdding licenses to dist file...');

const fs = require('fs');

console.log('Reading dist/licenses.txt...');

const license = fs.readFileSync('./dist/licenses.txt').toString();

console.log('Preparing licenses as comments...')

const licenseLines = license.split('\n');

console.log('Preparing dist/index.js...');

fs.appendFileSync('./dist/index.js', '\n/'.concat('*'.repeat(73)).concat('/\n'));
fs.appendFileSync('./dist/index.js', '/******/\n');
fs.appendFileSync('./dist/index.js', '/******/ 	// Node modules licenses\n');
fs.appendFileSync('./dist/index.js', '/******/\n');
fs.appendFileSync('./dist/index.js', '/'.concat('*'.repeat(73)).concat('/\n'));

console.log('Appending licenses to dist/index.js...');

licenseLines.forEach(line => {
    fs.appendFileSync('./dist/index.js', '/******/ 	// '.concat(line).concat('\n'));
});

console.log('Licenses successfully added to dist file.')
