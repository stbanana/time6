/**
 * 纯计算层自测：node tests/schedule.test.js
 * 无依赖、无框架；任何断言失败都会以非 0 退出码结束。
 */
'use strict';

const assert = require('node:assert');
const T = require('../assets/js/schedule.js');

const H = T.HOUR;
const D = T.DAY;
const anchor = T.ANCHOR.getTime();

// 1. 世界常量
assert.strictEqual(D, 28 * H, '一天 28 小时');
assert.strictEqual(T.WEEK, 168 * H, '一周 168 小时');
assert.strictEqual(T.DAY_COUNT, 6, '一周 6 天');
assert.strictEqual(T.WEEKDAYS.length, 6);
assert.deepStrictEqual(T.WEEKDAYS, ['周一', '周二', '周三', '周四', '周五', '周六']);
assert.strictEqual(T.BEDTIME_HOUR, 20);

// 2. 锚点：周一 00:00，距推荐入睡 20 小时
let s = T.stateAt(anchor);
assert.strictEqual(s.weekday, '周一');
assert.strictEqual(s.day, 1);
assert.strictEqual(s.timeText, '00:00');
assert.strictEqual(s.pastBedtime, false);
assert.strictEqual(s.gapMinutes, 20 * 60);
assert.strictEqual(s.gapText, '20 小时');
assert.strictEqual(s.bedtimeText, '20:00');

// 3. 同一天内推进
s = T.stateAt(anchor + 1 * H + 5 * 60000);
assert.strictEqual(s.timeText, '01:05');
assert.strictEqual(s.gapMinutes, 18 * 60 + 55);

s = T.stateAt(anchor + 19 * H + 59 * 60000 + 30 * 1000);
assert.strictEqual(s.timeText, '19:59');
assert.strictEqual(s.pastBedtime, false);
assert.strictEqual(s.gapMinutes, 1, '睡前 30 秒向上取整为 1 分');

// 4. 入睡点 / 入睡后
s = T.stateAt(anchor + 20 * H);
assert.strictEqual(s.timeText, '20:00');
assert.strictEqual(s.pastBedtime, true);
assert.strictEqual(s.gapMinutes, 0);
assert.strictEqual(s.atBedtime, true);

s = T.stateAt(anchor + 20 * H + 30 * 60000);
assert.strictEqual(s.timeText, '20:30');
assert.strictEqual(s.pastBedtime, true);
assert.strictEqual(s.gapMinutes, 30);
assert.strictEqual(s.gapText, '30 分');

s = T.stateAt(anchor + 27 * H + 59 * 60000);
assert.strictEqual(s.timeText, '27:59');
assert.strictEqual(s.gapMinutes, 7 * 60 + 59);
assert.strictEqual(s.gapText, '7 小时 59 分');

// 5. 跨天 / 跨周
s = T.stateAt(anchor + 28 * H);
assert.strictEqual(s.timeText, '00:00');
assert.strictEqual(s.weekday, '周二');
assert.strictEqual(s.day, 2);
assert.strictEqual(s.gapMinutes, 20 * 60);

s = T.stateAt(anchor + 5 * 28 * H);
assert.strictEqual(s.weekday, '周六');
assert.strictEqual(s.day, 6);
assert.strictEqual(s.timeText, '00:00');

s = T.stateAt(anchor + 168 * H);
assert.strictEqual(s.weekday, '周一');
assert.strictEqual(s.day, 1);
assert.strictEqual(s.timeText, '00:00');

s = T.stateAt(anchor - 1);
assert.strictEqual(s.weekday, '周六', '锚点前 1ms 属于上一周第 6 天');
assert.strictEqual(s.day, 6);
assert.strictEqual(s.timeText, '27:59');
assert.strictEqual(s.pastBedtime, true);
assert.strictEqual(s.gapMinutes, 7 * 60 + 59);

// 6. 一个已知映射：周二 04:00 真实时间 → 28h 周二 00:00
s = T.stateAt(anchor + 28 * H + 4 * H);
assert.strictEqual(s.timeText, '04:00');
assert.strictEqual(s.weekday, '周二');

// 7. 随机时刻不变量
for (let i = 0; i < 1000; i++) {
  const t = anchor - 40 * 168 * H + Math.random() * 80 * 168 * H;
  const st = T.stateAt(t);
  assert.ok(st.day >= 1 && st.day <= 6, 'day 越界');
  assert.ok(st.dayOffset >= 0 && st.dayOffset < D, 'dayOffset 越界');
  assert.ok(st.dayProgress >= 0 && st.dayProgress < 1, 'dayProgress 越界');
  assert.ok(/^(?:[01]\d|2[0-7]):[0-5]\d$/.test(st.timeText), '时间格式必须为 00:00–27:59');
  assert.ok(st.gapMinutes >= 0, '倒计时不能为负');
  assert.ok(st.gapText.indexOf('秒') === -1, '不应出现秒');
  assert.strictEqual(st.atBedtime, st.pastBedtime && st.gapMinutes === 0);
  if (st.pastBedtime) {
    assert.ok(st.gapMinutes <= 8 * 60, '睡前时间不会超过 8 小时');
  } else {
    assert.ok(st.gapMinutes <= 20 * 60, '入睡前倒计时不超过 20 小时');
  }
}

// 8. 已知换算：101 小时 39 分 → 周四 17:39，距入睡 2 小时 21 分
s = T.stateAt(anchor + 101 * H + 39 * 60000);
assert.strictEqual(s.weekday, '周四');
assert.strictEqual(s.day, 4);
assert.strictEqual(s.timeText, '17:39');
assert.strictEqual(s.gapMinutes, 141);
assert.strictEqual(s.gapText, '2 小时 21 分');

// 9. 格式化
assert.strictEqual(T.fmtClock(0), '00:00');
assert.strictEqual(T.fmtClock(27 * H + 59 * 60000), '27:59');
assert.strictEqual(T.fmtMinutes(0), '0 分');
assert.strictEqual(T.fmtMinutes(30), '30 分');
assert.strictEqual(T.fmtMinutes(60), '1 小时');
assert.strictEqual(T.fmtMinutes(141), '2 小时 21 分');

// 10. 当前真实时间跑一遍
const live = T.stateAt(Date.now());
assert.ok(live.day >= 1 && live.day <= 6);
console.log('✓ schedule.js 全部断言通过', {
  now: live.timeText,
  day: live.weekday + ' · 第 ' + live.day + ' 天',
  countdown: live.pastBedtime ? '已过 ' + live.gapText : '距入睡 ' + live.gapText
});
