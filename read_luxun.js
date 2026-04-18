const fs = require('fs');
const content = fs.readFileSync('luxun.html', 'utf8');
console.log('File length:', content.length);
console.log('First 500 chars:', content.substring(0, 500));
console.log('Last 500 chars:', content.substring(content.length - 500));