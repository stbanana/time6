/**
 * time6 · 28 小时周历
 * schedule.js —— 纯计算层：常量、阶段表、状态换算、本地化格式化。
 *
 * 经典脚本（非 ESM），浏览器里挂到 window.Time6；
 * 在 Node 下（typeof module === 'object'）同时导出，方便跑 tests/schedule.test.js。
 *
 * 约定：
 * - 一轮 = 28h，先睡 8h，再醒 20h；一周 = 6 轮 = 168h，天然闭环。
 * - 所有周期计算只使用绝对毫秒时间戳 + mod，不用 Date#setHours 逐段加减。
 * - 区间一律左闭右开 [start, end)。
 */
(function (root) {
  'use strict';

  var MINUTE = 60 * 1000;
  var HOUR = 60 * MINUTE;
  var CYCLE = 28 * HOUR;
  var WEEK = 6 * CYCLE; // 168h
  var SLEEP = 8 * HOUR;
  var AWAKE = 20 * HOUR;
  var CYCLE_COUNT = 6;

  // 锚点：2026-01-05 是周一，第 1 轮在周一 00:00 入睡。
  // 只在这里改；表盘、周表、阶段时间全部由它推导。
  var ANCHOR = new Date(2026, 0, 5, 0, 0, 0, 0);

  // 清醒 20h 的阶段模板（t 由 h 累加得到，不要手写绝对钟点）。
  var STAGES = [
    { h: 0.5, kind: 'wake', name: '起床 · 光照 · 补水 · 拉伸' },
    { h: 0.5, kind: 'meal', name: '早餐' },
    { h: 3.0, kind: 'focus', name: '深度工作 Ⅰ' },
    { h: 0.5, kind: 'break', name: '起身走动 · 加餐' },
    { h: 2.5, kind: 'focus', name: '深度工作 Ⅱ' },
    { h: 1.0, kind: 'meal', name: '午餐' },
    { h: 1.0, kind: 'move', name: '运动' },
    { h: 2.0, kind: 'work', name: '会议 · 协作 · 杂务' },
    { h: 2.0, kind: 'focus', name: '学习 / 项目' },
    { h: 1.0, kind: 'meal', name: '晚餐' },
    { h: 3.0, kind: 'free', name: '自由 · 社交 · 爱好' },
    { h: 1.5, kind: 'wind', name: '放松 · 洗澡 · 调暗灯光' },
    { h: 1.5, kind: 'prep', name: '睡前缓冲 · 上床' }
  ];

  (function computeStageBounds() {
    var acc = 0;
    for (var i = 0; i < STAGES.length; i++) {
      STAGES[i].t = acc;
      STAGES[i].end = acc + STAGES[i].h;
      acc = STAGES[i].end;
    }
    // AWAKE 仅用于表达契约；累加结果应为 20h。
    STAGES.totalHours = acc;
  })();

  function mod(a, n) {
    return ((a % n) + n) % n;
  }

  /** 距起床 hoursSinceWake 小时后处于哪个阶段；返回 { stage, index, elapsed }。 */
  function stageAt(hoursSinceWake) {
    if (hoursSinceWake < 0) return null;
    var acc = 0;
    for (var i = 0; i < STAGES.length; i++) {
      var s = STAGES[i];
      if (hoursSinceWake < acc + s.h) {
        return { stage: s, index: i, elapsed: hoursSinceWake - acc };
      }
      acc += s.h;
    }
    var last = STAGES[STAGES.length - 1];
    return { stage: last, index: STAGES.length - 1, elapsed: last.h };
  }

  /**
   * 某一时刻的完整状态。
   * @param {number} [nowMs] 绝对毫秒时间戳，默认 Date.now()
   */
  function stateAt(nowMs) {
    var now = typeof nowMs === 'number' ? nowMs : Date.now();
    var weekOffset = mod(now - ANCHOR.getTime(), WEEK);
    var weekStart = now - weekOffset; // 本周第 1 轮入睡（模型周起点）
    var cycleStart = weekStart + Math.floor(weekOffset / CYCLE) * CYCLE;
    var cycleOffset = now - cycleStart; // 0 .. 28h，从入睡算
    var sleeping = cycleOffset < SLEEP;
    var wakeAt = cycleStart + SLEEP;
    var nextSleepAt = cycleStart + CYCLE;
    var stage = sleeping ? null : stageAt((cycleOffset - SLEEP) / HOUR);

    return {
      now: now,
      weekStart: weekStart,
      weekOffset: weekOffset,
      weekProgress: weekOffset / WEEK,
      cycle: Math.floor(weekOffset / CYCLE) + 1, // 1..6
      cycleStart: cycleStart,
      cycleOffset: cycleOffset,
      cycleProgress: cycleOffset / CYCLE,
      cycleEnd: cycleStart + CYCLE,
      sleeping: sleeping,
      wakeAt: wakeAt,
      nextSleepAt: nextSleepAt,
      stage: stage ? stage.stage : null,
      stageIndex: stage ? stage.index : -1,
      stageElapsed: stage ? stage.elapsed : 0,
      stageStartAt: stage ? wakeAt + stage.stage.t * HOUR : null,
      stageEndAt: stage ? wakeAt + stage.stage.end * HOUR : null,
      nextTransitionAt: sleeping ? wakeAt : nextSleepAt,
      nextTransitionType: sleeping ? 'wake' : 'sleep'
    };
  }

  /** 本周 6 轮的入睡/起床/结束时刻；周一 → 周日。 */
  function cyclesOfWeek(weekStartMs) {
    var out = [];
    for (var i = 0; i < CYCLE_COUNT; i++) {
      var start = weekStartMs + i * CYCLE;
      var wakeAt = start + SLEEP;
      out.push({
        index: i + 1,
        start: start,
        wakeAt: wakeAt,
        end: start + CYCLE,
        weekday: fmtWeekday(start),
        date: fmtShortDate(start),
        daySleep: isDaySleep(start)
      });
    }
    return out;
  }

  /** 入睡时刻落在白天（06:00–17:59）即视为「白天睡眠」轮次。 */
  function isDaySleep(sleepAtMs) {
    var h = new Date(sleepAtMs).getHours();
    return h >= 6 && h < 18;
  }

  // ---- 格式化（一律按访问者设备时区） ----

  var timeFmt = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  var weekdayFmt = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' });

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function fmtTime(ms) {
    return timeFmt.format(new Date(ms));
  }

  function fmtWeekday(ms) {
    return weekdayFmt.format(new Date(ms));
  }

  function fmtDate(ms) {
    var d = new Date(ms);
    return d.getMonth() + 1 + '月' + d.getDate() + '日';
  }

  function fmtShortDate(ms) {
    var d = new Date(ms);
    return d.getMonth() + 1 + '/' + d.getDate();
  }

  /** 本地零点（仅用于显示层的「今天/明天」，不参与周期换算）。 */
  function startOfLocalDay(ms) {
    var d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  /** 「今天 08:00」「明天 04:00」「11 月 20 日 08:00」 */
  function fmtDayTime(ms, refMs) {
    var ref = typeof refMs === 'number' ? refMs : Date.now();
    var days = Math.round((startOfLocalDay(ms) - startOfLocalDay(ref)) / (24 * HOUR));
    var label;
    switch (days) {
      case -2: label = '前天'; break;
      case -1: label = '昨天'; break;
      case 0: label = '今天'; break;
      case 1: label = '明天'; break;
      case 2: label = '后天'; break;
      default: label = fmtDate(ms);
    }
    return label + ' ' + fmtTime(ms);
  }

  var api = {
    MINUTE: MINUTE,
    HOUR: HOUR,
    CYCLE: CYCLE,
    WEEK: WEEK,
    SLEEP: SLEEP,
    AWAKE: AWAKE,
    CYCLE_COUNT: CYCLE_COUNT,
    ANCHOR: ANCHOR,
    STAGES: STAGES,
    mod: mod,
    stageAt: stageAt,
    stateAt: stateAt,
    cyclesOfWeek: cyclesOfWeek,
    isDaySleep: isDaySleep,
    fmtTime: fmtTime,
    fmtWeekday: fmtWeekday,
    fmtDate: fmtDate,
    fmtShortDate: fmtShortDate,
    fmtDayTime: fmtDayTime,
    pad2: pad2
  };

  root.Time6 = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
