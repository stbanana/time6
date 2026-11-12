/**
 * time6 · 28 小时时钟
 * app.js —— 只做渲染：读 schedule.js 算好的状态，写 DOM / SVG。
 * 经典脚本（非 ESM），保证 file:// 双击可用。
 */
(function () {
  'use strict';

  var T = window.Time6;
  if (!T) {
    console.error('[time6] schedule.js 未加载');
    return;
  }

  var NS = 'http://www.w3.org/2000/svg';
  var CX = 200;
  var CY = 200;
  var RING_R = 128;
  var HOURS = 28;

  var els = {
    faceDay: document.getElementById('faceDay'),
    clockTime: document.getElementById('clockTime'),
    srClock: document.getElementById('srClock'),
    bedtime: document.getElementById('bedtime'),
    countBlock: document.getElementById('countBlock'),
    countLabel: document.getElementById('countLabel'),
    countValue: document.getElementById('countValue'),
    dialTicks: document.getElementById('dialTicks'),
    dialNumerals: document.getElementById('dialNumerals'),
    dialBedtime: document.getElementById('dialBedtime'),
    dialProgress: document.getElementById('dialProgress'),
    dialOverdue: document.getElementById('dialOverdue'),
    dialHand: document.getElementById('dialHand'),
    live: document.getElementById('liveStatus'),
    tz: document.getElementById('tzLabel'),
    themeToggle: document.getElementById('themeToggle'),
    themeMeta: document.querySelector('meta[name="theme-color"]')
  };

  var lastLiveSig = '';
  var lastTitle = '';

  // ---------- 小工具 ----------

  function svg(tag, attrs) {
    var node = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        node.setAttribute(k, attrs[k]);
      });
    }
    return node;
  }

  function polar(r, hour) {
    var a = (hour / HOURS) * Math.PI * 2 - Math.PI / 2;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  }

  function arcD(r, fromHour, toHour) {
    var p1 = polar(r, fromHour);
    var p2 = polar(r, toHour);
    var large = toHour - fromHour > HOURS / 2 ? 1 : 0;
    return 'M' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) +
      'A' + r + ' ' + r + ' 0 ' + large + ' 1 ' +
      p2[0].toFixed(2) + ' ' + p2[1].toFixed(2);
  }

  // ---------- 表盘 ----------

  function buildDial() {
    var tickFrag = document.createDocumentFragment();
    for (var i = 0; i < HOURS; i++) {
      var major = i % 4 === 0;
      var p1 = polar(major ? 146 : 152, i);
      var p2 = polar(161, i);
      tickFrag.appendChild(svg('line', {
        x1: p1[0].toFixed(2),
        y1: p1[1].toFixed(2),
        x2: p2[0].toFixed(2),
        y2: p2[1].toFixed(2),
        'class': 'dial-tick' + (major ? ' is-major' : '')
      }));
    }
    els.dialTicks.appendChild(tickFrag);

    var numFrag = document.createDocumentFragment();
    [0, 4, 8, 12, 16, 20, 24].forEach(function (h) {
      var p = polar(178, h);
      var node = svg('text', {
        x: p[0].toFixed(2),
        y: p[1].toFixed(2),
        'class': 'dial-num' + (h === T.BEDTIME_HOUR ? ' is-bedtime' : ''),
        'text-anchor': 'middle',
        'dominant-baseline': 'middle'
      });
      node.textContent = T.pad2(h);
      numFrag.appendChild(node);
    });
    els.dialNumerals.appendChild(numFrag);

    var b1 = polar(112, T.BEDTIME_HOUR);
    var b2 = polar(144, T.BEDTIME_HOUR);
    els.dialBedtime.appendChild(svg('line', {
      x1: b1[0].toFixed(2),
      y1: b1[1].toFixed(2),
      x2: b2[0].toFixed(2),
      y2: b2[1].toFixed(2),
      'class': 'dial-bedtime-line'
    }));
  }

  function setPath(node, d) {
    if (d) {
      node.setAttribute('d', d);
      node.style.visibility = 'visible';
    } else {
      node.setAttribute('d', '');
      node.style.visibility = 'hidden';
    }
  }

  function updateDial(s) {
    var hours = s.dayOffset / T.HOUR;
    var angle = (hours / HOURS) * 360;

    els.dialHand.setAttribute('transform', 'rotate(' + angle.toFixed(4) + ' ' + CX + ' ' + CY + ')');
    els.dialHand.classList.toggle('is-past', s.pastBedtime);

    var accentEnd = Math.min(hours, T.BEDTIME_HOUR);
    setPath(els.dialProgress, accentEnd > 0.02 ? arcD(RING_R, 0, accentEnd) : '');
    setPath(els.dialOverdue, hours > T.BEDTIME_HOUR ? arcD(RING_R, T.BEDTIME_HOUR, hours) : '');
  }

  // ---------- 文字 ----------

  function render(s) {
    els.faceDay.textContent = s.weekday + ' · 第 ' + s.day + ' / ' + s.dayCount + ' 天';
    els.clockTime.textContent = s.timeText;
    els.srClock.textContent = s.hours + ' 点 ' + s.minutes + ' 分';
    els.bedtime.textContent = s.bedtimeText;

    var past = s.pastBedtime;
    if (!past) {
      els.countLabel.textContent = '距推荐入睡';
      els.countValue.textContent = s.gapText;
    } else if (s.gapMinutes === 0) {
      els.countLabel.textContent = '推荐入睡';
      els.countValue.textContent = '该睡了';
    } else {
      els.countLabel.textContent = '已过推荐入睡';
      els.countValue.textContent = s.gapText;
    }
    els.countBlock.classList.toggle('is-past', past);

    updateDial(s);

    var title = s.timeText + ' · ' + s.weekday;
    if (title !== lastTitle) {
      lastTitle = title;
      document.title = title + ' · time6';
    }

    // 只在「天」或「是否已过入睡点」变化时播报，避免每分钟打扰。
    var sig = s.dayIndex + '|' + past + '|' + (s.gapMinutes === 0);
    if (sig !== lastLiveSig) {
      lastLiveSig = sig;
      var msg = '现在是' + s.weekday + '，第 ' + s.day + ' 天，' + s.timeText + '。';
      if (!past) {
        msg += '距推荐入睡 ' + s.gapText + '。';
      } else if (s.gapMinutes === 0) {
        msg += '到了推荐入睡时间。';
      } else {
        msg += '已过推荐入睡 ' + s.gapText + '。';
      }
      els.live.textContent = msg;
    }
  }

  // ---------- 主题 ----------

  var THEME_KEY = 'time6:theme';

  function storedTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function setTheme(theme, persist) {
    document.documentElement.dataset.theme = theme;
    els.themeToggle.setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题');
    if (els.themeMeta) els.themeMeta.setAttribute('content', theme === 'dark' ? '#070b16' : '#f3f5fa');
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (e) { /* 忽略隐私模式下的写入失败 */ }
    }
  }

  function initTheme() {
    setTheme(storedTheme() === 'light' ? 'light' : 'dark', false);
    els.themeToggle.addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      setTheme(next, true);
    });
  }

  // ---------- 主循环 ----------

  function tick() {
    render(T.stateAt(Date.now()));
  }

  function loop() {
    tick();
    // 对齐到下一个整分钟；页面只显示到分钟，不需要秒。
    window.setTimeout(loop, 60000 - (Date.now() % 60000) + 40);
  }

  function init() {
    buildDial();
    initTheme();

    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && els.tz) els.tz.textContent = tz;

    loop();

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) tick();
    });
  }

  init();
})();
