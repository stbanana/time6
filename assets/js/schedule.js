/**
 * time6 · 28 小时时钟
 * schedule.js —— 纯计算：一天 28 小时、一周 6 天，不碰 DOM。
 *
 * 世界设定：
 * - 1 天 = 28 小时，时钟显示 00:00 – 27:59。
 * - 1 周 = 6 天 = 168 小时，星期为 周一 … 周六。
 * - 锚点：2026-01-05（周一）00:00（设备本地时区）＝ 28h 世界的 周一 00:00。
 * - 推荐入睡：每天 20:00（28 小时制），只作为固定提醒，不推算睡眠时长。
 *
 * 经典脚本（非 ESM）：浏览器挂到 window.Time6，Node 下同时 module.exports。
 */
(function (root) {
  'use strict';

  var MINUTE = 60 * 1000;
  var HOUR = 60 * MINUTE;
  var DAY = 28 * HOUR;
  var WEEK = 6 * DAY; // 168h
  var DAY_COUNT = 6;

  // 推荐入睡时刻（28 小时制）。只改这里，页面与倒计时会一起变。
  var BEDTIME_HOUR = 20;

  // 锚点：真实世界的某个周一 00:00，对应 28h 世界的 周一 00:00。
  var ANCHOR = new Date(2026, 0, 5, 0, 0, 0, 0);

  var WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六'];

  function mod(a, n) {
    return ((a % n) + n) % n;
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  /** 28h 制时刻：00:00 – 27:59，不含秒。 */
  function fmtClock(dayOffsetMs) {
    var totalMinutes = Math.floor(dayOffsetMs / MINUTE);
    var h = Math.floor(totalMinutes / 60);
    var m = totalMinutes % 60;
    return pad2(h) + ':' + pad2(m);
  }

  /** 分钟数 → 「2 小时 21 分」；不含秒。 */
  function fmtMinutes(totalMinutes) {
    var min = Math.max(0, Math.round(totalMinutes));
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (h === 0) return m + ' 分';
    if (m === 0) return h + ' 小时';
    return h + ' 小时 ' + m + ' 分';
  }

  /**
   * 某一真实时刻在 28h 世界里的状态。
   * @param {number} [nowMs] 绝对毫秒时间戳，默认 Date.now()
   */
  function stateAt(nowMs) {
    var now = typeof nowMs === 'number' ? nowMs : Date.now();
    var weekOffset = mod(now - ANCHOR.getTime(), WEEK);
    var dayIndex = Math.floor(weekOffset / DAY); // 0..5
    var dayStart = now - mod(weekOffset, DAY); // 28h 世界的当天 00:00
    var dayOffset = now - dayStart; // 0 .. 28h

    var bedtimeAt = dayStart + BEDTIME_HOUR * HOUR;
    var pastBedtime = dayOffset >= BEDTIME_HOUR * HOUR;

    // 入睡前向上取整（还差 30 秒也显示 1 分），入睡后向下取整。
    var gapMinutes = pastBedtime
      ? Math.floor((now - bedtimeAt) / MINUTE)
      : Math.ceil((bedtimeAt - now) / MINUTE);

    return {
      now: now,
      weekOffset: weekOffset,
      dayIndex: dayIndex,
      day: dayIndex + 1,
      dayCount: DAY_COUNT,
      weekday: WEEKDAYS[dayIndex],
      dayStart: dayStart,
      dayOffset: dayOffset,
      dayProgress: dayOffset / DAY,
      timeText: fmtClock(dayOffset),
      hours: Math.floor(dayOffset / HOUR),
      minutes: Math.floor((dayOffset % HOUR) / MINUTE),
      bedtimeAt: bedtimeAt,
      bedtimeText: pad2(BEDTIME_HOUR) + ':00',
      bedtimeProgress: BEDTIME_HOUR / 28,
      pastBedtime: pastBedtime,
      gapMinutes: gapMinutes,
      gapText: fmtMinutes(gapMinutes),
      atBedtime: pastBedtime && gapMinutes === 0,
      nextBedtimeAt: pastBedtime ? bedtimeAt + DAY : bedtimeAt
    };
  }

  var api = {
    MINUTE: MINUTE,
    HOUR: HOUR,
    DAY: DAY,
    WEEK: WEEK,
    DAY_COUNT: DAY_COUNT,
    BEDTIME_HOUR: BEDTIME_HOUR,
    ANCHOR: ANCHOR,
    WEEKDAYS: WEEKDAYS,
    mod: mod,
    pad2: pad2,
    fmtClock: fmtClock,
    fmtMinutes: fmtMinutes,
    stateAt: stateAt
  };

  root.Time6 = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
