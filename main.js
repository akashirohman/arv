// === main.js ===
const fs = require('fs');
const os = require('os');
const readline = require('readline-sync');
const { findWorkingProxies } = require('./proxyManager');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

let stats = { sent: 0, success: 0, failed: 0 };
let stopRequested = false;
let activeThreads = 1;

function printStats() {
  process.stdout.write(`\r📊 Sent: ${stats.sent} | ✅ Success: ${stats.success} | ❌ Failed: ${stats.failed}   `);
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  if (data.trim().toLowerCase() === 'stop') {
    stopRequested = true;
    console.log('\n🛑 Perintah STOP diterima. Menghentikan bot...');
  }
});

console.clear();
console.log(`
╔══════════════════════════════════════════════╗
║      🔥 ARV - Advanced Real Visitors 🔥       ║
║   Smart Traffic Simulation & Real Campaign   ║
║          By : Akashirohman and team          ║
╚══════════════════════════════════════════════╝
`);

const command = readline.question('Ketik "start" untuk mulai download & test proxy: ');
if (command.trim().toLowerCase() === 'start') {
  findWorkingProxies().then(() => main());
} else {
  console.log('❌ Perintah tidak dikenali. Keluar.');
  process.exit();
}

async function main() {
  const url = readline.question('\n🌐 Masukkan URL target: ');
  const keyword = readline.question('🔍 Masukkan keyword pencarian: ');

  const proxies = fs.readFileSync('proxy.txt', 'utf-8')
    .split('\n')
    .filter(p => p.trim() !== '');

  console.log(`\n🚀 Menjalankan simulasi dengan ${proxies.length} proxy...`);
  console.log('💡 Ketik "stop" lalu ENTER untuk menghentikan bot.\n');

  for (let i = 0; i < proxies.length; ) {
    if (stopRequested) break;

    const usage = await getCPUUsage();
    if (usage < 90 && activeThreads < 20) activeThreads++;
    else if (usage > 95 && activeThreads > 1) activeThreads--;

    const batch = proxies.slice(i, i + activeThreads);
    await Promise.all(batch.map(proxy => simulateVisit(url, keyword, proxy)));
    i += activeThreads;
  }

  console.log(`\n\n📈 Simulasi selesai.`);
}

async function simulateVisit(targetUrl, keyword, proxy) {
  stats.sent++;
  printStats();
  const [host, port] = proxy.split(':');
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [`--proxy-server=http://${host}:${port}`]
    });
    const page = await browser.newPage();

    await page.goto('https://www.google.com/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.type('input[name=q]', keyword);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

    const links = await page.$x(`//a[contains(@href, '${targetUrl.replace('https://', '').replace('http://', '')}')]`);
    if (links.length > 0) {
      await links[0].click();
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(5000);
      stats.success++;
    } else {
      stats.failed++;
    }

    await browser.close();
  } catch (err) {
    stats.failed++;
  }
  printStats();
}

function getCPUUsage() {
  return new Promise((resolve) => {
    const start = os.cpus();
    setTimeout(() => {
      const end = os.cpus();
      let idleDiff = 0, totalDiff = 0;

      for (let i = 0; i < start.length; i++) {
        const startCpu = start[i].times;
        const endCpu = end[i].times;

        const idle = endCpu.idle - startCpu.idle;
        const total = Object.keys(startCpu).reduce((acc, type) => acc + (endCpu[type] - startCpu[type]), 0);

        idleDiff += idle;
        totalDiff += total;
      }

      const usage = 100 - Math.floor(100 * idleDiff / totalDiff);
      resolve(usage);
    }, 500);
  });
}
