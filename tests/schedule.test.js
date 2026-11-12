/**
 * 纯计算层自测：node tests/schedule.test.js
 * 无依赖、无框架；任何断言失败都会以非 0 退出码结束。
 */
'use strict';

const assert = require('node:assert');
const T = require('../assets/js/schedule.js');

const H = T.HOUR;
const anchor = T.ANCHOR.getTime();

// 1. 阶段表：13 段、合计 20h、边界连续
assert.strictEqual(T.STAGES.length, 13, '阶段数应为 13');
assert.ok(Math.abs(T.STAGES.totalHours - 20) < 1e-9, '阶段总时长应为 20h');
T.STAGES.forEach((s, i) => {
  assert.ok(s.h > 0, '阶段时长必须为正');
  if (i > 0) assert.ok(Math.abs(s.t - T.STAGES[i - 1].end) < 1e-9, '阶段边界必须连续');
});
assert.strictEqual(T.STAGES[0].name, '起床 · 光照 · 补水 · 拉伸');
assert.strictEqual(T.STAGES[12].name, '睡前缓冲 · 上床');
assert.ok(Math.abs(T.STAGES[12].end - 20) < 1e-9);

// 2. 一周 6 轮的入睡/起床/结束，严格匹配文档表 4.1
const week = T.cyclesOfWeek(anchor);
assert.strictEqual(week.length, 6);
const expected = [
  ['周一', '00:00', '08:00', '04:00'],
  ['周二', '04:00', '12:00', '08:00'],
  ['周三', '08:00', '16:00', '12:00'],
  ['周四', '12:00', '20:00', '16:00'],
  ['周五', '16:00', '00:00', '20:00'],
  ['周六', '20:00', '04:00', '00:00']
];
week.forEach((c, i) => {
  assert.strictEqual(c.weekday, expected[i][0], `第 ${i + 1} 轮入睡星期`);
  assert.strictEqual(T.fmtTime(c.start), expected[i][1], `第 ${i + 1} 轮入睡钟点`);
  assert.strictEqual(T.fmtTime(c.wakeAt), expected[i][2], `第 ${i + 1} 轮起床钟点`);
  assert.strictEqual(T.fmtTime(c.end), T.fmtTime(anchor + (i + 1) * T.CYCLE), '结束时刻');
  assert.strictEqual(c.end, anchor + (i + 1) * T.CYCLE, '结束时刻应等于下一轮入睡');
  assert.strictEqual(c.end - c.start, 28 * H);
});
assert.strictEqual(T.fmtWeekday(week[5].end), '周一', '第 6 轮结束应回到下周一');
assert.strictEqual(T.fmtTime(week[5].end), '00:00');

// 3. 白天睡眠标记：只有第 3、4、5 轮
assert.deepStrictEqual(week.map((c) => c.daySleep), [false, false, true, true, true, false]);

// 4. 边界：入睡、起床、换轮、换周
let s = T.stateAt(anchor);
assert.strictEqual(s.cycle, 1);
assert.strictEqual(s.sleeping, true);
assert.strictEqual(s.cycleOffset, 0);
assert.strictEqual(s.nextTransitionType, 'wake');

s = T.stateAt(anchor + 8 * H);
assert.strictEqual(s.sleeping, false);
assert.strictEqual(s.cycle, 1);
assert.strictEqual(s.stageIndex, 0);

s = T.stateAt(anchor + 8 * H - 1);
assert.strictEqual(s.sleeping, true, '起床前 1ms 仍属睡眠');

s = T.stateAt(anchor + 8 * H + 4.5 * H + 1);
assert.strictEqual(s.stage.name, '深度工作 Ⅱ', 't=4.5h+ 应进入深度工作 Ⅱ');

s = T.stateAt(anchor + 27.999 * H);
assert.strictEqual(s.cycle, 1);
assert.strictEqual(s.stage.name, '睡前缓冲 · 上床');

s = T.stateAt(anchor + 28 * H);
assert.strictEqual(s.cycle, 2);
assert.strictEqual(s.sleeping, true);

s = T.stateAt(anchor + 168 * H);
assert.strictEqual(s.cycle, 1, '整周后回到第 1 轮');
assert.strictEqual(s.sleeping, true);

s = T.stateAt(anchor - 1);
assert.strictEqual(s.cycle, 6, '锚点前 1ms 属于上一周第 6 轮');
assert.strictEqual(s.sleeping, false);
assert.strictEqual(s.stage.name, '睡前缓冲 · 上床');

// 5. 任意时刻的偏移必须落在 [0, 28h)
for (let i = 0; i < 500; i++) {
  const t = anchor - 30 * 168 * H + Math.random() * 60 * 168 * H;
  const st = T.stateAt(t);
  assert.ok(st.cycleOffset >= 0 && st.cycleOffset < 28 * H, 'cycleOffset 越界');
  assert.ok(st.cycle >= 1 && st.cycle <= 6, 'cycle 越界');
  assert.ok(st.nextTransitionAt > t, '下一次切换必须晚于现在');
  assert.ok(st.nextTransitionAt - t <= 28 * H, '下一次切换不应超过 28h');
  if (!st.sleeping) {
    assert.ok(st.stage, '清醒时必须能取到阶段');
    assert.ok(st.stageStartAt <= t && t < st.stageEndAt, '阶段区间必须包含当前时刻');
  } else {
    assert.strictEqual(st.stage, null);
  }
}

// 6. 显示格式
assert.strictEqual(T.fmtTime(new Date(2026, 0, 5, 0, 0).getTime()), '00:00');
assert.strictEqual(T.fmtTime(new Date(2026, 0, 5, 8, 5).getTime()), '08:05');
assert.strictEqual(T.fmtWeekday(new Date(2026, 0, 5).getTime()), '周一');
assert.strictEqual(T.fmtDayTime(anchor + 24 * H, anchor), '明天 00:00');

// 7. 当前真实时间跑一遍，保证不抛错且字段齐全
const live = T.stateAt(Date.now());
assert.ok(live.cycle >= 1 && live.cycle <= 6);
console.log('✓ schedule.js 全部断言通过', {
  now: T.fmtTime(live.now),
  cycle: live.cycle,
  sleeping: live.sleeping,
  stage: live.stage ? live.stage.name : '睡眠',
  sleepAt: T.fmtDayTime(live.cycleStart, live.now),
  wakeAt: T.fmtDayTime(live.wakeAt, live.now),
  nextAt: T.fmtDayTime(live.nextSleepAt, live.now)
});
