/**
 * 开发用：无头 Edge + CDP 检查布局与运行时错误。
 * 用法：node tests/browser-check.js
 * 不参与线上运行；需要本机安装 Edge / Chrome。
 */
'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const browserPath = EDGE_CANDIDATES.find((p) => fs.existsSync(p));
if (!browserPath) {
  console.error('找不到 Edge，跳过浏览器检查');
  process.exit(1);
}

const PORT = 9333;
const PAGE_URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const PROFILE = path.join(process.env.TEMP, 'time6-cdp-' + Date.now());
const OUT_DIR = path.join(__dirname, '..', '.preview');

fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = spawn(browserPath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + PROFILE,
  '--window-size=1440,1000',
  PAGE_URL
], { stdio: 'ignore' });

let ws;
let msgId = 0;
const pending = new Map();
const problems = [];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (res.exceptionDetails) {
    throw new Error('页面脚本异常: ' + JSON.stringify(res.exceptionDetails));
  }
  return res.result.value;
}

async function waitForEndpoint() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && t.url === PAGE_URL) || list.find((t) => t.type === 'page');
      if (page) return page;
    } catch (e) { /* 还没起来 */ }
    await sleep(150);
  }
  throw new Error('浏览器调试端口未就绪');
}

const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 760, mobile: true },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, mobile: true },
  { name: 'desktop-1024', width: 1024, height: 900, mobile: false },
  { name: 'desktop-1440', width: 1440, height: 1000, mobile: false }
];

async function fullShot(name) {
  const metrics = await send('Page.getLayoutMetrics');
  const size = metrics.cssContentSize || metrics.contentSize;
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: {
      x: 0,
      y: 0,
      width: Math.ceil(size.width),
      height: Math.ceil(size.height),
      scale: 1
    }
  });
  fs.writeFileSync(path.join(OUT_DIR, name + '.png'), Buffer.from(shot.data, 'base64'));
}

const CHECK_SCRIPT = `(() => {
  const out = { width: innerWidth, height: innerHeight, errors: [] };
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  };
  const text = (id) => (document.getElementById(id) || {}).textContent || '';

  out.docScrollWidth = document.documentElement.scrollWidth;
  out.bodyScrollWidth = document.body.scrollWidth;
  out.overflowX = out.docScrollWidth - innerWidth;

  out.clock = text('clockHM');
  out.seconds = text('clockSec');
  out.cycle = text('faceCycle');
  out.date = text('faceDate');
  out.state = text('stateText');
  out.countdownLabel = text('countdownLabel');
  out.countdown = text('cdText');
  out.countdownAt = text('countdownAt');
  out.stage = text('stageName');
  out.stageTime = text('stageTime');
  out.nextUp = text('nextUp');
  out.heroNoticeHidden = document.getElementById('heroNotice').hidden;
  out.heroNotice = text('heroNotice');
  out.weekRows = document.querySelectorAll('.week-row').length;
  out.weekTimes = [...document.querySelectorAll('.week-times')].map((n) => n.textContent);
  out.weekDayTags = [...document.querySelectorAll('.week-tag')].map((n) => n.textContent);
  out.currentWeekRows = document.querySelectorAll('.week-row.is-current').length;
  out.currentStageRows = document.querySelectorAll('.stage-row.is-current').length;
  out.stageRows = document.querySelectorAll('.stage-row').length;
  out.dialStages = document.querySelectorAll('.dial-stage').length;
  out.dialTicks = document.querySelectorAll('.dial-tick').length;
  out.theme = document.documentElement.dataset.theme;
  out.clockFont = getComputedStyle(document.getElementById('clockHM')).fontSize;
  out.heroTextAlign = getComputedStyle(document.querySelector('.hero-meta')).textAlign;

  const ft = document.querySelector('.face-time').getBoundingClientRect();
  const fc = document.querySelector('.face').getBoundingClientRect();
  out.faceTimeOverflow = ft.width > fc.width + 0.5 || ft.height > fc.height + 0.5;

  out.rects = {
    topbar: rect(document.querySelector('.topbar')),
    hero: rect(document.querySelector('.hero')),
    watch: rect(document.querySelector('.watch')),
    face: rect(document.querySelector('.face')),
    faceTime: rect(document.querySelector('.face-time')),
    countdown: rect(document.getElementById('cdText')),
    week: rect(document.querySelector('.week')),
    foot: rect(document.querySelector('.foot'))
  };

  const named = [
    ['topbar', document.querySelector('.topbar')],
    ['brand', document.querySelector('.brand')],
    ['hero', document.querySelector('.hero')],
    ['watch', document.querySelector('.watch')],
    ['countdown', document.getElementById('cdText')],
    ['facts', document.querySelector('.facts')],
    ['rhythm', document.querySelector('.rhythm')],
    ['week', document.querySelector('.week')],
    ['foot', document.querySelector('.foot')]
  ];
  out.outOfBounds = named.filter(([, el]) => {
    if (!el) return true;
    const r = el.getBoundingClientRect();
    return r.left < -0.5 || r.right > innerWidth + 0.5;
  }).map(([n]) => n);

  // 无文本溢出容器（允许 stage-row-name 省略号）
  out.textOverflow = [...document.querySelectorAll('.countdown, .face-time, .week-times, .card-head h2, .foot-meta')]
    .filter((el) => el.scrollWidth > el.clientWidth + 1)
    .map((el) => el.className || el.id);

  out.weekRowOverflow = [...document.querySelectorAll('.week-row')]
    .filter((el) => el.scrollWidth > el.clientWidth + 1).length;

  return out;
})()`;

(async () => {
  try {
    const target = await waitForEndpoint();
    ws = new WebSocket(target.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.method + ': ' + JSON.stringify(msg.error)));
        else resolve(msg.result);
        return;
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        problems.push({ type: 'exception', detail: msg.params.exceptionDetails.text });
      }
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        problems.push({ type: 'log', detail: msg.params.entry.text });
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        problems.push({
          type: 'console',
          detail: msg.params.args.map((a) => a.value || a.description).join(' ')
        });
      }
    };

    await send('Runtime.enable');
    await send('Log.enable');
    await send('Page.enable');
    await send('Page.reload', { ignoreCache: true });
    await sleep(1200);

    const report = { page: PAGE_URL, problems, viewports: [] };

    for (const vp of VIEWPORTS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile
      });
      await sleep(450);
      const result = await evaluate(CHECK_SCRIPT);
      report.viewports.push({ name: vp.name, width: vp.width, ...result });

      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(OUT_DIR, vp.name + '.png'), Buffer.from(shot.data, 'base64'));
    }

    // 主题切换与 localStorage（默认深色）
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    report.themeInitial = await evaluate(`document.documentElement.dataset.theme`);

    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await sleep(300);
    await fullShot('dark-desktop');

    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(300);
    await fullShot('dark-mobile');

    await evaluate(`document.getElementById('themeToggle').click()`);
    await sleep(350);
    report.themeAfterToggle = await evaluate(`({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem('time6:theme'), bg: getComputedStyle(document.body).backgroundColor })`);
    await fullShot('light-mobile');

    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await sleep(300);
    await fullShot('light-desktop');

    await evaluate(`document.getElementById('themeToggle').click()`);
    await sleep(250);
    report.themeAfterSecondToggle = await evaluate(`document.documentElement.dataset.theme`);

    // 展开完整阶段表后的高度 / 横向溢出
    await evaluate(`document.querySelector('.stages').open = true`);
    await sleep(250);
    report.stagesOpen = await evaluate(`(() => {
      const list = document.querySelector('.stage-list');
      const r = list.getBoundingClientRect();
      return { rows: list.children.length, left: r.left, right: r.right, width: innerWidth, overflowX: document.documentElement.scrollWidth - innerWidth };
    })()`);

    fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    console.log('\n截图与报告已写入 .preview/');
  } catch (err) {
    console.error('检查失败:', err.message);
    process.exitCode = 1;
  } finally {
    try { ws && ws.close(); } catch (e) { /* ignore */ }
    browser.kill();
  }
})();
