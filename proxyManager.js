
// === proxyManager.js ===
const fs = require('fs');
const https = require('https');

async function findWorkingProxies() {
  console.log('🔍 Mendownload daftar proxy...');

  const urls = [
    'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt',
    'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt'
  ];

  let proxies = [];

  for (const url of urls) {
    try {
      const data = await download(url);
      proxies.push(...data.split('\n').filter(p => p.includes(':')));
    } catch (err) {
      console.log(`❌ Gagal download dari ${url}`);
    }
  }

  proxies = proxies.filter(p => p).slice(0, 100); // ambil 100 proxy pertama

  console.log(`⚙️  Menguji proxy... (${proxies.length} kandidat)`);

  const working = [];

  for (const proxy of proxies) {
    if (working.length >= 20) break;
    const success = await testProxy(proxy);
    if (success) {
      working.push(proxy);
      console.log(`✅ ${proxy}`);
    }
  }

  fs.writeFileSync('proxy.txt', working.join('\n'));
  console.log(`\n💾 Disimpan 20 proxy aktif ke proxy.txt`);
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function testProxy(proxy) {
  return new Promise((resolve) => {
    const [host, port] = proxy.split(':');
    const socket = require('net').createConnection({ host, port: parseInt(port), timeout: 3000 }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

module.exports = { findWorkingProxies };
