// Serves the plaintext deliverable on localhost so the Browser pane can open it
// without the StatiCrypt password. Local only; nothing here is published.
const http = require('http');
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'DealerCore-Reviewed-Copy.html');
// The Browser pane may assign another port when 8099 is already taken.
const PORT = Number(process.env.PORT) || 8099;

http.createServer((req, res) => {
  fs.readFile(FILE, (err, buf) => {
    if (err) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      return res.end('cannot read ' + FILE + ': ' + err.message);
    }
    // Read per request so a rebuild shows on reload rather than needing a restart.
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(buf);
  });
}).listen(PORT, () => console.log('reviewed copy on http://localhost:' + PORT));
