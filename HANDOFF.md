# 28 小时时钟 · 交接文档

> 版本：v2.1　｜　日期：2026-11-20　｜　状态：**Web v2 + Android v1 已实现**
> v2.0 用「28 小时制时钟」取代 v1 的 8h 睡眠 / 13 阶段 / 一周 6 轮表；v1 见 Git 历史。
> v2.1 增加原生 Android 客户端（`android/`），时间模型不变；Web 根目录与 Pages 发布方式不变。
> 本文档是当前唯一事实来源；实现与文档冲突时，先改文档再改代码。

---

## 1. 项目一句话

把世界当作**一天 28 小时、一周 6 天**：页面用 28 小时制显示现在几点，并给出每天的推荐入睡时间与距离它的时间长度。

**线上地址**：<https://time.yono233.cn/>（旧地址 <https://stbanana.github.io/time6/> 自动跳转）
**仓库**：<https://github.com/stbanana/time6>

**非目标**：不做阶段划分、不做睡眠时长推算、不做一周 6 轮表、不显示真实世界日期与秒、不做后端 / 账号 / PWA。

---

## 2. 世界模型（唯一契约）

### 2.1 常量

| 名称 | 值 | 说明 |
|---|---|---|
| `HOUR` | 60 分钟 | |
| `DAY` | 28 小时 | 一天 28 小时 |
| `WEEK` | 168 小时 | 6 天一周 |
| `DAY_COUNT` | 6 | 周一 … 周六 |
| `BEDTIME_HOUR` | 20 | 推荐入睡（28 小时制） |
| `ANCHOR` | 2026-01-05（周一）00:00 本地时区 | 28h 世界的 周一 00:00 |

### 2.2 换算

```
weekOffset = mod(now - ANCHOR, 168h)      // 0 .. 168h
dayIndex   = floor(weekOffset / 28h)      // 0 .. 5  → 周一 .. 周六
dayStart   = now - mod(weekOffset, 28h)   // 当天 00:00
dayOffset  = now - dayStart               // 0 .. 28h
timeText   = HH:MM，其中 HH = floor(dayOffset / 1h)，范围 00..27
```

- 时钟显示 `00:00 – 27:59`，**不显示秒**。
- 星期固定 6 天：周一、周二、周三、周四、周五、周六。
- 推荐入睡 `bedtimeAt = dayStart + 20h`，每天如此。
- 睡前：`距推荐入睡 = ceil((bedtimeAt - now) / 1min)`。
- 睡后：`已过推荐入睡 = floor((now - bedtimeAt) / 1min)`；入睡后 1 分钟内显示「该睡了」。
- 全部使用绝对毫秒时间戳 + `mod`，禁止用 `Date#setHours` 逐段加减。

### 2.3 显示规则

| 元素 | 规则 |
|---|---|
| 主时钟 | 28h 制 `HH:MM`，居中、最大字号 |
| 星期 | `周四 · 第 4 / 6 天` |
| 表盘 | 一圈 28h；28 个刻度；数字 00/04/08/12/16/20/24；20 点用睡眠色高亮 |
| 进度环 | 00:00 → 当前时间，强调色；20:00 之后的时间段用睡眠色 |
| 指针 | 指向当前 28h 时刻；入睡后变睡眠色 |
| 推荐入睡 | 固定 `20:00` |
| 倒计时 | `距推荐入睡 X 小时 Y 分` / `已过推荐入睡 X 小时 Y 分` / `该睡了` |
| 实时刷新 | 对齐到整分钟，不跑秒 |

颜色：深色底 + 琥珀强调色（进度 / 现在），睡眠色（推荐入睡 / 已过）为靛蓝；浅色主题可切换并记忆。

---

## 3. 文件与职责

```
time6/
├─ index.html               # 单页骨架 + 表盘 SVG 静态结构
├─ assets/css/style.css     # 主题变量、表盘、布局、响应式
├─ assets/js/schedule.js    # 纯计算：常量、stateAt()、格式化（无 DOM）
├─ assets/js/app.js         # 渲染：刻度/数字/指针、时钟、倒计时、主题
├─ assets/img/favicon.svg
├─ tests/schedule.test.js   # 纯计算断言
├─ tests/browser-check.js   # 无头 Edge + CDP 布局 / 运行检查
├─ HANDOFF.md
└─ README.md
```

- `schedule.js` 不碰 DOM，浏览器挂 `window.Time6`，Node 下 `module.exports`，可直接 require 测试。
- `app.js` 不重复计算，只消费 `stateAt()`。
- 不使用 `type="module"`，保证 `file://` 双击可用。

---

## 4. 验收

- [x] 双击 `index.html` 正常显示（无需服务器）。
- [x] 主时钟为 28h 制 `00:00 – 27:59`，不含秒。
- [x] 一周显示 6 天：周一 … 周六。
- [x] 推荐入睡固定 `20:00`（28h 制）。
- [x] 倒计时在 20:00 前显示「距推荐入睡」，20:00 后显示「已过推荐入睡」。
- [x] 跨天 / 跨周无跳变、无负值。
- [x] 320 / 390 / 768 / 1024 / 1440 五档无横向滚动。
- [x] 线上地址可访问，Console 无报错；Lighthouse 性能 100 / 无障碍 100 / 最佳实践 100 / SEO 100。
- [x] 页面无「阶段」「一周 6 轮」等旧模块。
- [ ] iOS Safari 真机（地址栏收缩）待实测。

---

## 5. 部署

**前置**：仓库 Public；Pages 已启用（Deploy from a branch，`main` / root）。

```bash
git add .
git commit -m "feat: ..."
git push origin main
```

1–10 分钟后 <https://time.yono233.cn/> 生效（仓库根 `CNAME` = `time.yono233.cn`，旧地址自动跳转）。资源路径一律相对，禁止 `/assets/...`。

---

## 6. 验证记录（2026-11-13）

- `node tests/schedule.test.js`：锚点、20:00 边界、跨天/跨周、1000 次随机时刻、无「秒」断言全部通过。
- 无头 Edge（`file://`）：5 档视口 `scrollWidth == innerWidth`，Console 0 报错；表盘 28 刻度 / 7 个数字 / 1 个入睡刻度；模拟 21:30 时正确显示「已过推荐入睡 1 小时 30 分」。
- 线上：HTTP 200，CSS/JS/favicon 均 200；Lighthouse 性能 100 / 无障碍 100 / 最佳实践 100 / SEO 100。

---

## 7. 配置

| 想改什么 | 改哪里 |
|---|---|
| 推荐入睡时间 | `assets/js/schedule.js` 的 `BEDTIME_HOUR` |
| 28h 世界的周一 00:00 | 同文件 `ANCHOR`（必须是真实的某个周一 00:00 本地时间） |
| 主题默认值 | `index.html` 首屏脚本与 `app.js` 的 `initTheme`（默认 dark） |
| 颜色 | `style.css` 的 `[data-theme="dark"]` / `[data-theme="light"]` 变量 |

---

## 8. Android 客户端（v1.0）

- **位置**：`android/`，原生 Kotlin + Jetpack Compose；Web 仍在仓库根目录，Pages 仍从 `main` 根目录发布，**Web 文件不改**。
- **时间模型**：与 `assets/js/schedule.js` 逐条一致。Android 端在 `android/app/src/main/java/io/github/stbanana/time6/TimeModel.kt`；`BEDTIME_HOUR` 与 `ANCHOR_DATE` 两处常量需与 Web 同步修改。
- **单测**：`TimeModelTest.kt` 覆盖锚点、20:00 边界、跨天/跨周、随机不变量、DST 与「不含秒」；`ClockScreen*Test.kt` 用 Robolectric 在 JVM 渲染 390dp 深/浅、320dp、横屏并输出截图，无需模拟器。
- **界面**：28h Canvas 表盘、主时钟、星期、推荐入睡、倒计时、深浅主题；全屏沉浸；无网络权限。
- **构建**：JDK 17 + Android SDK 35；`cd android && ./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug`。
- **发布**：`android-v*` tag 触发 `.github/workflows/android-release.yml`，生成 debug 签名 APK；日常构建 artifact 见 `.github/workflows/android.yml`。
- **不参与 Web 发布**：Android workflow 只在 `android/**` 变化时运行；Android 源码不是 Web 入口，不影响页面运行。

### 零干扰检查

- `index.html`、`assets/**`、`tests/**` 在 Android 合并前后无 diff。
- 合并后仍通过 `node tests/schedule.test.js`、`node tests/browser-check.js`，线上 <https://time.yono233.cn/> 返回 200。

### Android 验收

- [x] `testDebugUnitTest` / `lintDebug` / `assembleDebug` 通过。
- [x] APK 包名 `io.github.stbanana.time6`、versionName `1.0.0`。
- [ ] 真机安装与视觉确认（由用户完成；如接 adb 设备可补安装截图）。
- [x] Web 端回归与线上地址检查。
