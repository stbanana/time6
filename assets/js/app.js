/**
 * time6 · 28 小时周历
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
  var BAND_R = 128;
  var PROGRESS_R = 106;

  var els = {
    hero: document.getElementById('hero'),
    faceCycle: document.getElementById('faceCycle'),
    clockHM: document.getElementById('clockHM'),
    clockSec: document.getElementById('clockSec'),
    srClock: document.getElementById('srClock'),
    faceDate: document.getElementById('faceDate'),
    faceState: document.getElementById('faceState'),
    stateText: document.getElementById('stateText'),
    countdownLabel: document.getElementById('countdownLabel'),
    cdText: document.getElementById('cdText'),
    countdownAt: document.getElementById('countdownAt'),
    factSleep: document.getElementById('factSleep'),
    factWake: document.getElementById('factWake'),
    heroNotice: document.getElementById('heroNotice'),
    rhythmRange: document.getElementById('rhythmRange'),
    stageName: document.getElementById('stageName'),
    stageTime: document.getElementById('stageTime'),
    stageBarWrap: document.getElementById('stageBarWrap'),
    stageBar: document.getElementById('stageBar'),
    nextUp: document.getElementById('nextUp'),
    stageList: document.getElementById('stageList'),
    weekList: document.getElementById('weekList'),
    dialTicks: document.getElementById('dialTicks'),
    dialStages: document.getElementById('dialStages'),
    dialLabels: document.getElementById('dialLabels'),
    dialProgress: document.getElementById('dialProgress'),
    dialHead: document.getElementById('dialHead'),
    live: document.getElementById('liveStatus'),
    tz: document.getElementById('tzLabel'),
    themeToggle: document.getElementById('themeToggle'),
    themeMeta: document.querySelector('meta[name="theme-color"]')
  };

  var stageEls = [];
  var sleepEl = null;
  var stageRows = [];
  var lastCycleStart = null;
  var lastWeekStart = null;
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
    var a = (hour / 28) * Math.PI * 2 - Math.PI / 2;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  }

  function arcD(r, fromHour, toHour) {
    var p1 = polar(r, fromHour);
    var p2 = polar(r, toHour);
    var large = toHour - fromHour > 14 ? 1 : 0;
    return 'M' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) +
      'A' + r + ' ' + r + ' 0 ' + large + ' 1 ' +
      p2[0].toFixed(2) + ' ' + p2[1].toFixed(2);
  }

  /** 毫秒 → 「X 小时 Y 分」；不足 1 分钟返回「不到 1 分」。 */
  function gapText(ms) {
    var totalMin = Math.max(0, Math.floor(ms / T.MINUTE));
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    if (h === 0 && m === 0) return '不到 1 分';
    if (h === 0) return m + ' 分';
    return h + ' 小时 ' + m + ' 分';
  }

  function setNextUp(timeText, name) {
    els.nextUp.textContent = '下一阶段：';
    var strong = document.createElement('strong');
    strong.textContent = timeText;
    els.nextUp.appendChild(strong);
    els.nextUp.appendChild(document.createTextNode(' ' + name));
  }

  // ---------- 表盘 ----------

  function buildDial() {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 28; i++) {
      var major = i % 4 === 0;
      var p1 = polar(major ? 145 : 151, i);
      var p2 = polar(158, i);
      frag.appendChild(svg('line', {
        x1: p1[0].toFixed(2),
        y1: p1[1].toFixed(2),
        x2: p2[0].toFixed(2),
        y2: p2[1].toFixed(2),
        'class': 'dial-tick' + (major ? ' is-major' : '')
      }));
    }
    els.dialTicks.appendChild(frag);

    sleepEl = svg('path', { d: arcD(BAND_R, 0.07, 7.93), 'class': 'dial-sleep' });
    els.dialStages.appendChild(sleepEl);

    T.STAGES.forEach(function (s) {
      var path = svg('path', {
        d: arcD(BAND_R, 8 + s.t + 0.07, 8 + s.end - 0.07),
        'class': 'dial-stage',
        'data-kind': s.kind
      });
      els.dialStages.appendChild(path);
      stageEls.push(path);
    });

    addDialLabel('入睡', 0, 'middle');
    addDialLabel('起床', 8, 'end');
  }

  function addDialLabel(text, hour, anchor) {
    var p = polar(179, hour);
    var node = svg('text', {
      x: p[0].toFixed(2),
      y: p[1].toFixed(2),
      'class': 'dial-label',
      'text-anchor': anchor,
      'dominant-baseline': 'middle'
    });
    node.textContent = text;
    els.dialLabels.appendChild(node);
  }

  function updateDial(state) {
    var hours = state.cycleOffset / T.HOUR;
    var angle = (hours / 28) * 360;

    els.dialHead.setAttribute('transform', 'rotate(' + angle.toFixed(3) + ' ' + CX + ' ' + CY + ')');
    els.dialHead.classList.toggle('is-sleeping', state.sleeping);

    if (hours > 0.03) {
      els.dialProgress.setAttribute('d', arcD(PROGRESS_R, 0, hours));
      els.dialProgress.style.visibility = 'visible';
    } else {
      els.dialProgress.style.visibility = 'hidden';
    }
    els.dialProgress.classList.toggle('is-sleeping', state.sleeping);

    for (var i = 0; i < stageEls.length; i++) {
      var s = T.STAGES[i];
      var passed = hours >= 8 + s.end;
      var current = !state.sleeping && state.stageIndex === i;
      stageEls[i].classList.toggle('is-past', passed && !current);
      stageEls[i].classList.toggle('is-current', current);
    }

    if (sleepEl) {
      sleepEl.classList.toggle('is-past', !state.sleeping && hours >= 8);
      sleepEl.classList.toggle('is-current', state.sleeping);
    }
  }

  // ---------- 时钟 / 状态 ----------

  function updateClock(state) {
    var d = new Date(state.now);
    els.faceCycle.textContent = '第 ' + state.cycle + ' 轮 / 6';
    els.clockHM.textContent = T.fmtTime(state.now);
    els.clockSec.textContent = T.pad2(d.getSeconds());
    els.faceDate.textContent = T.fmtWeekday(state.now) + ' · ' + T.fmtDate(state.now);
    els.stateText.textContent = state.sleeping ? '睡眠中' : '清醒中';
    els.faceState.classList.toggle('is-sleeping', state.sleeping);
    els.hero.dataset.state = state.sleeping ? 'sleep' : 'awake';
    els.srClock.textContent = '现在是 ' + d.getHours() + ' 点 ' + d.getMinutes() + ' 分，' +
      T.fmtWeekday(state.now) + '，' + T.fmtDate(state.now) + '。';
  }

  function updateHero(state) {
    var target = state.sleeping ? state.wakeAt : state.nextSleepAt;

    els.countdownLabel.textContent = state.sleeping ? '距起床' : '距入睡';
    els.cdText.textContent = gapText(target - state.now);
    els.countdownAt.textContent = T.fmtDayTime(target, state.now) + (state.sleeping ? ' 起床' : ' 入睡');

    els.factSleep.textContent = T.fmtDayTime(state.cycleStart, state.now);
    els.factWake.textContent = T.fmtDayTime(state.wakeAt, state.now);

    if (T.isDaySleep(state.cycleStart)) {
      els.heroNotice.hidden = false;
      els.heroNotice.textContent = '本轮睡眠在白天：' +
        T.fmtDayTime(state.cycleStart, state.now) + ' 入睡，' +
        T.fmtDayTime(state.wakeAt, state.now) + ' 起床。这是 28 小时节律的结果，不是建议。';
    } else {
      els.heroNotice.hidden = true;
    }
  }

  // ---------- 本轮节奏 ----------

  function makeStageRow(index, name, startText, endText, kind) {
    var li = document.createElement('li');
    li.className = 'stage-row';
    li.dataset.index = String(index);
    li.dataset.kind = kind;

    var dot = document.createElement('span');
    dot.className = 'stage-dot';
    dot.setAttribute('aria-hidden', 'true');

    var nm = document.createElement('span');
    nm.className = 'stage-row-name';
    nm.textContent = name;

    var tm = document.createElement('span');
    tm.className = 'stage-row-time';
    tm.textContent = startText + ' – ' + endText;

    li.appendChild(dot);
    li.appendChild(nm);
    li.appendChild(tm);
    return li;
  }

  function rebuildStageList(state) {
    var frag = document.createDocumentFragment();
    frag.appendChild(makeStageRow(-1, '睡眠', T.fmtTime(state.cycleStart), T.fmtTime(state.wakeAt), 'sleep'));
    T.STAGES.forEach(function (s, i) {
      var start = state.wakeAt + s.t * T.HOUR;
      var end = start + s.h * T.HOUR;
      frag.appendChild(makeStageRow(i, s.name, T.fmtTime(start), T.fmtTime(end), s.kind));
    });

    els.stageList.textContent = '';
    els.stageList.appendChild(frag);
    stageRows = Array.prototype.slice.call(els.stageList.children);
  }

  function updateRhythm(state) {
    if (state.cycleStart !== lastCycleStart) {
      lastCycleStart = state.cycleStart;
      rebuildStageList(state);
    }

    els.rhythmRange.textContent =
      T.fmtDayTime(state.cycleStart, state.now) + ' → ' + T.fmtDayTime(state.nextSleepAt, state.now);

    var progress;
    if (state.sleeping) {
      progress = state.cycleOffset / T.SLEEP;
      els.stageName.textContent = '睡眠';
      els.stageTime.textContent = T.fmtTime(state.cycleStart) + ' – ' + T.fmtTime(state.wakeAt) +
        ' · 剩 ' + gapText(state.wakeAt - state.now);
      setNextUp(T.fmtDayTime(state.wakeAt, state.now), T.STAGES[0].name);
    } else {
      progress = (state.now - state.stageStartAt) / (state.stageEndAt - state.stageStartAt);
      els.stageName.textContent = state.stage.name;
      els.stageTime.textContent = T.fmtTime(state.stageStartAt) + ' – ' + T.fmtTime(state.stageEndAt) +
        ' · 剩 ' + gapText(state.stageEndAt - state.now);

      if (state.stageIndex < T.STAGES.length - 1) {
        var next = T.STAGES[state.stageIndex + 1];
        setNextUp(T.fmtDayTime(state.wakeAt + next.t * T.HOUR, state.now), next.name);
      } else {
        setNextUp(T.fmtDayTime(state.nextSleepAt, state.now), '入睡');
      }
    }

    var pct = Math.max(0, Math.min(1, progress || 0)) * 100;
    els.stageBar.style.width = pct.toFixed(2) + '%';
    els.stageBarWrap.setAttribute('aria-valuenow', String(Math.round(pct)));
    els.stageBarWrap.setAttribute('aria-valuetext', els.stageName.textContent + '，已过 ' + Math.round(pct) + '%');
    els.stageBarWrap.classList.toggle('is-sleeping', state.sleeping);

    var currentIdx = state.sleeping ? -1 : state.stageIndex;
    for (var i = 0; i < stageRows.length; i++) {
      var row = stageRows[i];
      var on = Number(row.dataset.index) === currentIdx;
      row.classList.toggle('is-current', on);
      if (on) {
        row.setAttribute('aria-current', 'true');
      } else {
        row.removeAttribute('aria-current');
      }
    }
  }

  // ---------- 一周表 ----------

  function rebuildWeek(state) {
    var cycles = T.cyclesOfWeek(state.weekStart);
    var frag = document.createDocumentFragment();

    cycles.forEach(function (c) {
      var li = document.createElement('li');
      li.className = 'week-row' + (c.daySleep ? ' is-day-sleep' : '');
      li.dataset.cycle = String(c.index);
      li.setAttribute('aria-label',
        '第 ' + c.index + ' 轮，' + c.weekday + ' ' + T.fmtTime(c.start) +
        ' 入睡，' + T.fmtTime(c.wakeAt) + ' 起床');

      var head = document.createElement('div');
      head.className = 'week-head';

      var no = document.createElement('span');
      no.className = 'week-no';
      no.textContent = '第 ' + c.index + ' 轮';

      var day = document.createElement('span');
      day.className = 'week-day';
      day.textContent = c.weekday + ' ';
      var date = document.createElement('span');
      date.className = 'week-date';
      date.textContent = c.date;
      day.appendChild(date);

      head.appendChild(no);
      head.appendChild(day);

      if (c.daySleep) {
        var tag = document.createElement('span');
        tag.className = 'week-tag';
        tag.textContent = '白天睡眠';
        head.appendChild(tag);
      }

      var nowTag = document.createElement('span');
      nowTag.className = 'week-now';
      nowTag.textContent = '现在';
      nowTag.hidden = true;
      head.appendChild(nowTag);

      var times = document.createElement('span');
      times.className = 'week-times';
      times.textContent = '入睡 ' + T.fmtTime(c.start) + ' · 起床 ' + T.fmtTime(c.wakeAt);
      head.appendChild(times);

      var track = document.createElement('div');
      track.className = 'week-track';

      var bar = document.createElement('span');
      bar.className = 'week-bar';
      var sleepSeg = document.createElement('i');
      sleepSeg.className = 'week-seg-sleep';
      var awakeSeg = document.createElement('i');
      awakeSeg.className = 'week-seg-awake';
      bar.appendChild(sleepSeg);
      bar.appendChild(awakeSeg);

      var marker = document.createElement('span');
      marker.className = 'week-marker';
      marker.hidden = true;

      track.appendChild(bar);
      track.appendChild(marker);

      li.appendChild(head);
      li.appendChild(track);
      frag.appendChild(li);
    });

    els.weekList.textContent = '';
    els.weekList.appendChild(frag);
    lastWeekStart = state.weekStart;
  }

  function updateWeek(state) {
    if (state.weekStart !== lastWeekStart) rebuildWeek(state);

    var pct = (state.cycleOffset / T.CYCLE) * 100;
    var rows = els.weekList.children;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var isCurrent = Number(row.dataset.cycle) === state.cycle;
      row.classList.toggle('is-current', isCurrent);

      var marker = row.querySelector('.week-marker');
      if (marker) {
        marker.hidden = !isCurrent;
        if (isCurrent) marker.style.left = pct.toFixed(3) + '%';
      }
      var nowTag = row.querySelector('.week-now');
      if (nowTag) nowTag.hidden = !isCurrent;
    }
  }

  // ---------- 无障碍播报 / 标题 / 主题 ----------

  function updateLive(state) {
    var sig = state.cycle + '|' + state.sleeping + '|' +
      (state.stage ? state.stage.name : '') + '|' + T.isDaySleep(state.cycleStart);
    if (sig === lastLiveSig) return;
    lastLiveSig = sig;

    var next = state.sleeping
      ? '距起床 ' + gapText(state.wakeAt - state.now)
      : '距入睡 ' + gapText(state.nextSleepAt - state.now);

    var msg = '第 ' + state.cycle + ' 轮，' +
      (state.sleeping ? '睡眠中' : '清醒中，当前阶段 ' + state.stage.name) + '，' + next + '。';
    if (T.isDaySleep(state.cycleStart)) msg += '注意：本轮睡眠在白天。';
    els.live.textContent = msg;
  }

  function updateTitle(state) {
    var key = T.fmtTime(state.now) + '|' + state.cycle;
    if (key === lastTitle) return;
    lastTitle = key;
    document.title = T.fmtTime(state.now) + ' · 第 ' + state.cycle + ' 轮 ' +
      (state.sleeping ? '睡眠中' : '清醒中') + ' · time6';
  }

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
    var saved = storedTheme();
    setTheme(saved === 'light' ? 'light' : 'dark', false);

    els.themeToggle.addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      setTheme(next, true);
    });
  }

  // ---------- 主循环 ----------

  function tick() {
    var state = T.stateAt(Date.now());
    updateClock(state);
    updateHero(state);
    updateRhythm(state);
    updateDial(state);
    updateWeek(state);
    updateLive(state);
    updateTitle(state);
  }

  function loop() {
    tick();
    // 对齐到下一个整秒，避免 setInterval 漂移导致秒数跳格。
    window.setTimeout(loop, 1000 - (Date.now() % 1000));
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
