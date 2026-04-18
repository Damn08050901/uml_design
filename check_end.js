// 尝试读取文件末尾
const fs = require('fs');
try {
  const stats = fs.statSync('luxun.html');
  console.log('File size:', stats.size);
  
  const fd = fs.openSync('luxun.html', 'r');
  const buffer = Buffer.alloc(1000);
  fs.readSync(fd, buffer, 0, 1000, stats.size - 1000);
  fs.closeSync(fd);
  
  console.log('Last 1000 bytes:', buffer.toString('utf8'));
} catch (err) {
  console.error('Error:', err.message);
}