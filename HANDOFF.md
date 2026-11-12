# 28 小时周历 · 纯前端项目交接文档

> 版本：v1.1　｜　日期：2026-11-13　｜　状态：**已实现、自测通过，托管于 GitHub Pages**
> 本文档是唯一事实来源（Single Source of Truth）。实现与文档冲突时，先改文档再改代码。

---

## 1. 项目一句话

把「一周 = 6 轮 × 28 小时（8h 睡眠 + 20h 清醒）」做成一个**纯静态网页**：实时告诉你现在是第几轮、处于哪个阶段、本轮几点该睡、几点醒，并托管在 GitHub Pages 上。

**非目标**（明确不做）：后端、账号体系、数据库、多人协作、付费订阅。可选增强：PWA 离线、系统通知。

---

## 2. 交接范围

| 项 | 状态 |
|---|---|
| 需求与时间模型 | ✅ 已定，见第 3、4 节 |
| 数据表（6 轮 / 13 阶段） | ✅ 已定，见第 4 节 |
| 技术约束与目录约定 | ✅ 已定，见第 5、6 节 |
| 部署方式 | ✅ 已定（GitHub Pages + 分支发布），见第 8 节 |
| 代码实现 | ✅ 已完成（2026-11-13），见第 14 节 |
| 仓库地址 / 域名 | ✅ <https://github.com/stbanana/time6> · <https://stbanana.github.io/time6/> |
| 视觉设计 | ✅ 深色 + 单一琥珀强调色；浅色主题可手动切换 |

参考数据源（工作区上一级目录，内容与本文第 4 节一致）：

- `../一周28小时划分与预计入睡时间.md`
- `../一周28小时划分与预计入睡时间.pdf`

---

## 3. 时间模型（核心，必须严格按此实现）

### 3.1 常量

| 名称 | 值 | 说明 |
|---|---|---|
| `CYCLE` | 28 h | 一轮 = 一个"28 小时的一天" |
| `WEEK` | 168 h | 6 × 28，正好一周，天然闭环 |
| `SLEEP` | 8 h | 每轮睡眠时长（固定） |
| `AWAKE` | 20 h | 每轮清醒时长（固定） |
| `CYCLES` | 6 | 一周轮数 |
| `ANCHOR` | 某个**周一 00:00（本地时区）** | 第 1 轮入睡时刻；建议做成常量，可后续开放自定义 |

### 3.2 换算规则

一轮的结构固定为：**先睡 8 小时，再醒 20 小时**。所以：

- 一轮的起点 = 入睡时刻；起床时刻 = 起点 + 8h；下一轮起点 = 起点 + 28h。
- 入睡时刻每轮比上一轮晚 **4 小时**，6 轮正好绕表盘一圈（6 × 4 = 24h），下周一回到原点。

```
weekOffset = mod(now - ANCHOR, 168h)          // 0 .. 168h
cycleIndex = floor(weekOffset / 28h)          // 0 .. 5  → 轮次 = +1
cycleStart = now - mod(weekOffset, 28h)       // 本轮入睡的绝对时刻
cycleOffset = now - cycleStart                // 0 .. 28h
sleeping   = cycleOffset < 8h
sinceWake  = cycleOffset - 8h                 // 清醒段内距起床的小时数，睡眠时为负
nextSleepAt = cycleStart + 28h
```

- 区间一律**左闭右开** `[start, end)`，避免整点重复计数。
- 全部计算走 **绝对毫秒时间戳 + `mod`**，**禁止**用 `Date.setHours()` 逐段加减（跨夏令时会错位）。

### 3.3 显示规则

- 时钟显示用 `Intl.DateTimeFormat('zh-CN', { weekday:'short', hour:'2-digit', minute:'2-digit', hour12:false })` 格式化到**访问者设备时区**，不做服务端时区假设。
- 周表固定按「周一 → 周日」顺序展示；当某轮睡眠落在白天（第 3、4、5 轮），UI 必须有「本轮睡眠在白天」的显式提示，否则用户会误读。
- 倒计时：睡眠中显示「距起床 X 小时 Y 分」，清醒中显示「距入睡 X 小时 Y 分」。

---

## 4. 数据表（可直接抄进代码）

### 4.1 一周 6 轮的入睡 / 起床

| 轮次 | 时段（28h） | 预计入睡（8h） | 起床 | 清醒（20h） |
|---|---|---|---|---|
| 1 | 周一 00:00 → 周二 04:00 | 周一 00:00 | 周一 08:00 | 周一 08:00 → 周二 04:00 |
| 2 | 周二 04:00 → 周三 08:00 | 周二 04:00 | 周二 12:00 | 周二 12:00 → 周三 08:00 |
| 3 | 周三 08:00 → 周四 12:00 | 周三 08:00 | 周三 16:00 | 周三 16:00 → 周四 12:00 |
| 4 | 周四 12:00 → 周五 16:00 | 周四 12:00 | 周四 20:00 | 周四 20:00 → 周五 16:00 |
| 5 | 周五 16:00 → 周六 20:00 | 周五 16:00 | 周六 00:00 | 周六 00:00 → 周六 20:00 |
| 6 | 周六 20:00 → 下周一 00:00 | 周六 20:00 | 周日 04:00 | 周日 04:00 → 下周一 00:00 |

> 表中钟点由 `ANCHOR = 周一 00:00` 推出时得到的结果；若改锚点，此表用代码推导，**不要硬编码两份**。

### 4.2 清醒 20 小时的阶段模板（t = 距起床小时数）

| t 起点 | 时长 | 阶段 |
|---|---|---|
| 0.0 | 0.5 | 起床 · 光照 · 补水 · 拉伸 |
| 0.5 | 0.5 | 早餐 |
| 1.0 | 3.0 | 深度工作 Ⅰ |
| 4.0 | 0.5 | 起身走动 · 加餐 |
| 4.5 | 2.5 | 深度工作 Ⅱ |
| 7.0 | 1.0 | 午餐 |
| 8.0 | 1.0 | 运动 |
| 9.0 | 2.0 | 会议 · 协作 · 杂务 |
| 11.0 | 2.0 | 学习 / 项目 |
| 13.0 | 1.0 | 晚餐 |
| 14.0 | 3.0 | 自由 · 社交 · 爱好 |
| 17.0 | 1.5 | 放松 · 洗澡 · 调暗灯光 |
| 18.5 | 1.5 | 睡前缓冲 · 上床 |

合计 20.0h。数据以数组形式放在 `schedule.js`，**用 t 累加求累计边界**，不要写死变量的绝对钟点。

---

## 5. 技术约束（硬性）

1. **纯前端、零构建**：只有 `.html` / `.css` / `.js`，不引入 npm、打包器、脚手架。`git push` 即上线。
2. **零运行时依赖**：不引框架；如需图标用内联 SVG 或单个 CDN 字体图标（可选）。
3. **必须支持 `file://` 双击打开**：因此**不要用 `type="module"`**（本地会触发 CORS 失败）。脚本用经典 `<script src>` + IIFE/挂到 `window`；若坚持 ESM，则必须在文档里写明"只能通过本地服务器预览"。
4. **资源路径一律相对**（`./assets/css/style.css`），**禁止**以 `/` 开头 —— Pages 项目页挂在 `/<repo>/` 子路径下，绝对路径必然 404。
5. 移动端优先，自适应 320px 起；用 `dvh`/`svh` 而非 `100vh`。
6. 状态只放内存 + `localStorage`（可选，用于记住锚点/主题）；不引入 Cookie、不打点、不外传数据。
7. 无障碍底线：语义标签、`aria-live="polite"` 播报状态变化、对比度 ≥ 4.5:1、`prefers-reduced-motion` 时关闭动画。

---

## 6. 建议目录与文件职责

```
28h-week/
├─ HANDOFF.md                # 本文件
├─ index.html                # 唯一页面，静态骨架
├─ README.md                 # 项目简介 + 线上地址（接手后补）
├─ .nojekyll                 # 出现下划线开头的文件时必需
└─ assets/
   ├─ css/style.css          # 变量化配色、布局、响应式、动效
   ├─ js/schedule.js         # 纯函数：常量、阶段表、stateAt()、格式化
   ├─ js/app.js              # DOM 渲染、requestAnimationFrame/setInterval 驱动
   └─ img/                   # 图标、favicon
```

- `schedule.js` 只做计算，**不碰 DOM**，便于后续单测或复用。
- `app.js` 只做渲染，**不重复计算**。
- 刷新频率：状态切换用 `setInterval(1000)` 足够；进度环如需顺滑再上 `requestAnimationFrame`。

### 6.1 可直接使用的骨架

```js
// schedule.js
const HOUR = 3600 * 1000;
const CYCLE = 28 * HOUR, WEEK = 168 * HOUR, SLEEP = 8 * HOUR;
const ANCHOR = new Date(2026, 0, 5, 0, 0, 0, 0); // 周一 00:00，可配置

const STAGES = [
  { t: 0.0,  h: 0.5, name: '起床 · 光照 · 补水' },
  { t: 0.5,  h: 0.5, name: '早餐' },
  { t: 1.0,  h: 3.0, name: '深度工作 Ⅰ' },
  { t: 4.0,  h: 0.5, name: '起身走动 · 加餐' },
  { t: 4.5,  h: 2.5, name: '深度工作 Ⅱ' },
  { t: 7.0,  h: 1.0, name: '午餐' },
  { t: 8.0,  h: 1.0, name: '运动' },
  { t: 9.0,  h: 2.0, name: '会议 · 协作 · 杂务' },
  { t: 11.0, h: 2.0, name: '学习 / 项目' },
  { t: 13.0, h: 1.0, name: '晚餐' },
  { t: 14.0, h: 3.0, name: '自由 · 社交 · 爱好' },
  { t: 17.0, h: 1.5, name: '放松 · 洗澡 · 调暗灯光' },
  { t: 18.5, h: 1.5, name: '睡前缓冲 · 上床' }
];

const mod = (a, n) => ((a % n) + n) % n;

function stateAt(nowMs = Date.now()) {
  const weekOff = mod(nowMs - ANCHOR.getTime(), WEEK);
  const cycleStart = nowMs - mod(weekOff, CYCLE);
  const off = nowMs - cycleStart;             // 0..28h，从入睡算
  return {
    cycle: Math.floor(weekOff / CYCLE) + 1,   // 1..6
    sleeping: off < SLEEP,
    off,                                      // 本轮已过时长
    sleepAt: cycleStart,
    wakeAt: cycleStart + SLEEP,
    nextSleepAt: cycleStart + CYCLE,
    stage: off >= SLEEP ? stageOf((off - SLEEP) / HOUR) : null
  };
}

function stageOf(hoursSinceWake) {
  let acc = 0;
  for (const s of STAGES) {
    if (hoursSinceWake >= acc && hoursSinceWake < acc + s.h) return s;
    acc += s.h;
  }
  return STAGES[STAGES.length - 1];
}
```

---

## 7. 实现顺序（建议）

1. `schedule.js` + 控制台 `console.log(stateAt())` 自测（先不写 UI）。
2. 静态骨架：轮次 / 当前阶段 / 倒计时 / 一周表 四个区块。
3. 接 `setInterval` 刷新；处理 0 点、周界、睡眠↔清醒切换。
4. 响应式与暗色；加「本轮睡眠在白天」提示条。
5. `localStorage` 记住锚点与主题（可选）。
6. 部署、真机验证、补 README。

---

## 8. GitHub Pages 部署

**前置**：仓库为 **Public**（免费账号的 Pages 只对公开仓库开放）。

1. Settings → Pages → Build and deployment → Source 选 **Deploy from a branch**。
2. Branch 选 `main`，Folder 选 **/ (root)**，Save。
3. 等 1–2 分钟，访问 `https://<用户名>.github.io/<仓库名>/`。
4. 之后每次 `git push origin main` 自动重新发布（约 1–10 分钟生效）。

**必须注意的坑**

| 坑 | 处理 |
|---|---|
| 资源 404 | 全部相对路径 `./assets/...`，不要 `/assets/...` |
| 页面白屏 | 打开 DevTools Console 看 MIME/路径；`type="module"` 在 Pages 上可以，但本地 `file://` 不行 |
| 文件名以下划线开头被 Jekyll 忽略 | 加空文件 `.nojekyll` |
| 改了 CSS 但没生效 | Pages CDN 缓存约 10 分钟；改文件名或加 `?v=2` 强制刷新 |
| 需要 SPA 路由 | 本项目单页不需要；如加路由请用 hash 路由，避免 404 |
| 自定义域名 | 仓库根放 `CNAME` 文件，DNS 配 CNAME 记录，勾选 Enforce HTTPS |

**禁做**：不要为了"方便"在仓库里塞构建产物目录、node_modules、本地 IDE 配置；`.gitignore` 覆盖 `.vscode/`、`.DS_Store`、`Thumbs.db`。

---

## 9. 验收清单（Definition of Done）

- [x] 双击 `index.html` 能正常显示（无需本地服务器）。
- [x] 打开页面 1 秒内显示：当前轮次（1–6）、当前阶段、状态倒计时。
- [x] 6 个入睡钟点与第 4.1 节表格完全一致。
- [x] 跨轮、跨周（周日 → 周一）切换时无跳变、无负值倒计时。
- [x] 睡眠段与清醒段的显示不混淆；白天睡眠轮次有提示。
- [x] 320px / 768px / 1440px 三档布局无横向滚动。
- [ ] 手机实机（含 iOS Safari 地址栏收缩）显示正常。
- [ ] 线上地址可访问，Console 无报错，Lighthouse 性能 ≥ 90，无障碍 ≥ 90。
- [x] README 写明线上地址、本地预览方式、锚点配置说明。

> 2026-11-13：前 6 项与最后一项已用 `tests/schedule.test.js` + 无头 Edge 五档视口验证；iOS 真机与线上 Lighthouse 需发布后补测。

---

## 10. 风险与边界

| 风险 | 影响 | 应对 |
|---|---|---|
| 访问者时区不同 / 跨夏令时 | 显示的钟点与用户预期不符 | 一律按设备时区格式化；算法只用绝对时间戳 |
| 28h 作息本身是"非 24h"节律 | 用户可能误以为是健康建议 | 页面加一行免责说明：本工具只做时间换算，不构成睡眠或健康建议 |
| 锚点写死 | 用户想改起点要改代码 | 抽成常量 + 可选 `localStorage` 覆盖 |
| Pages 缓存 | 更新后仍旧版 | 版本号查询串 |
| 移动端 `100vh` | 底部按钮被地址栏遮挡 | `dvh` / `svh` |
| 白天睡眠轮次 | 用户被误读为"整周都在熬夜" | 周表标注每轮的睡眠时段色块 |

---

## 11. 协作约定

- 分支：`main` 为发布分支（Pages 源），开发用 `dev`，PR 合入。
- 提交信息：`feat: 新增进度环` / `fix: 修复跨周倒计时` / `docs: 补充部署说明`。
- 一次提交只做一件事；改契约（第 3、4 节）必须同步改本文档。
- 不引入依赖前先在 issue 里写明理由；"为了少写 20 行代码"不是理由。
- 删除/重命名 `schedule.js` 中的导出的函数时，同步更新第 6.1 节。

---

## 12. 待确认（已于 2026-11-13 确认）

1. 仓库名与 GitHub 用户名？→ `stbanana/time6`，项目页 <https://stbanana.github.io/time6/>。
2. 锚点固定为「周一 00:00」，还是允许用户在页面上自定义？→ **固定**，`assets/js/schedule.js` 顶部常量，改一处即可。
3. 是否需要 PWA（可安装 + 离线）？→ **不需要**，v1 不做。
4. 是否需要同时叠加 24 小时视图对照？→ **不需要**，本地数字时钟已显示 24h 时间。
5. 界面语言仅中文？→ **是**。
6. 是否有设计稿 / 品牌色？→ **无**，采用深色 + 琥珀强调色，并提供浅色主题。

---

## 13. 接手第一步（已完成）

```bash
git init
git add .
git commit -m "feat: 28 小时周历首版"
git remote add origin https://github.com/stbanana/time6.git
git push -u origin main
```

本地预览：双击 `index.html`，或 `python -m http.server 8080`。

---

## 14. 实现记录（2026-11-13）

**文件**

- `index.html`：单页骨架；表盘 SVG 静态结构，阶段弧线/刻度由 JS 生成
- `assets/css/style.css`：深/浅主题变量、响应式、表盘与周表样式
- `assets/js/schedule.js`：`stateAt()`、`cyclesOfWeek()`、`stageAt()`、本地化格式化；无 DOM 依赖，Node 可 require
- `assets/js/app.js`：SVG 表盘构建、每秒刷新、周表、阶段表、主题、`aria-live` 播报
- `tests/schedule.test.js`：纯计算断言（阶段边界、6 轮钟点、跨周、随机时刻不变量）
- `tests/browser-check.js`：无头 Edge + CDP，检查五档视口溢出、Console 错误、主题切换，并输出截图

**实现与 6.1 骨架的差异**

- `stageAt()` 返回 `{ stage, index, elapsed }`，`stateAt()` 附带 `stageIndex`、`stageStartAt/stageEndAt`、`weekStart` 等渲染所需字段；计算契约不变。
- 增加 `cyclesOfWeek()` 与格式化函数，周表与所有钟点均由 `ANCHOR` 推导，无第二份硬编码。
- 刷新使用「对齐到下一个整秒」的 `setTimeout` 递归，避免 `setInterval` 漂移。

**验证结果**

- `node tests/schedule.test.js`：全部断言通过
- 无头 Edge（`file://`）：320 / 390 / 768 / 1024 / 1440 五档均 `scrollWidth == innerWidth`，无 Console 异常，主题切换与 `localStorage` 正常
- 白天睡眠轮次（第 3–5 轮）在周表带标签，当前轮另有文案提示

---

**签收**：接手人确认第 3、4 节无歧义后，在本行下方署名与日期。

`接手人：DeepSeek　日期：2026-11-13`
