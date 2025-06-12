// === main.js ===
const fs = require('fs');
const os = require('os');
const readline = require('readline-sync');
const { chromium } = require('playwright');

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
║      🔥 ARV - Advanced Real Visitors 🔥     ║
║   Smart Traffic Simulation & Real Campaign   ║
║          By : Akashirohman and team          ║
╚══════════════════════════════════════════════╝
`);

const command = readline.question('Ketik "start" untuk mulai download & test proxy: ');
if (command.trim().toLowerCase() === 'start') {
  require('./proxyManager').findWorkingProxies().then(() => main());
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

  for (let i = 0; i < proxies.length;) {
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
    const browser = await chromium.launch({
      headless: true,
      proxy: { server: `http://${host}:${port}` }
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://www.google.com/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.fill('input[name=q]', keyword);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

    const links = await page.$$('a');
    let clicked = false;
    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href && href.includes(targetUrl.replace('https://', '').replace('http://', ''))) {
        await link.click();
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        await page.mouse.wheel({ deltaY: 500 });
        await page.waitForTimeout(5000);
        stats.success++;
        clicked = true;
        break;
      }
    }

    if (!clicked) stats.failed++;
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
