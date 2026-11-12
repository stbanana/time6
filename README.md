# time6 · 28 小时周历

把一周看成 **6 轮 × 28 小时**（每轮 8 小时睡眠 + 20 小时清醒）的纯静态表盘网页。

打开就能看到：现在几点、处于第几轮、正在哪个阶段、距入睡或起床还有多久。

**线上地址：<https://stbanana.github.io/time6/>**

---

## 功能

- **实时表盘**：本地时间（时:分:秒）+ 28 小时周期环 + 本轮进度指针
- **当前状态**：第几轮、清醒/睡眠、当前阶段、阶段剩余时间
- **倒计时**：睡眠中显示「距起床 X 小时 Y 分」，清醒中显示「距入睡 X 小时 Y 分」
- **一周 6 轮**：每轮的入睡、起床钟点与睡眠/清醒比例条，标出当前轮与「白天睡眠」轮次
- **深色 / 浅色主题**：默认深色，切换后写入 `localStorage`
- **零依赖、零构建**：只有 HTML / CSS / JS，双击 `index.html` 即可打开

> 本工具只做时间换算，不构成睡眠或健康建议。

---

## 时间模型

- 一轮 28 小时 = 先睡 8 小时，再醒 20 小时
- 一周 6 轮 = 168 小时，正好闭环
- 每轮入睡时间比上一轮晚 4 小时：周一 00:00 → 周二 04:00 → 周三 08:00 → 周四 12:00 → 周五 16:00 → 周六 20:00 → 下周一 00:00
- 锚点：**2026-01-05（周一）00:00，设备本地时区**，第 1 轮入睡

所有周期计算只用绝对毫秒时间戳 + 取模，不逐段加减日期，因此跨天、跨周、跨轮不会出现负值或跳变；显示统一按访问者设备时区格式化。

### 修改锚点

编辑 [`assets/js/schedule.js`](./assets/js/schedule.js) 顶部的 `ANCHOR`：换成一个周一的本地 00:00 即可，周表与阶段时间会自动重算，不需要改第二处。

```js
var ANCHOR = new Date(2026, 0, 5, 0, 0, 0, 0);
```

---

## 本地预览

任选一种：

1. 直接双击 `index.html`（页面没有使用 `type="module"`，`file://` 可用）
2. 起一个静态服务器：

```bash
python -m http.server 8080
# 打开 http://localhost:8080
```

## 自测

```bash
node tests/schedule.test.js
```

覆盖 13 个阶段的边界、6 轮入睡/起床钟点、睡眠↔清醒切换、跨轮/跨周、随机时刻的区间不变量。

```bash
node tests/browser-check.js
```

用本机 Edge 无头模式检查 320 / 390 / 768 / 1024 / 1440 五档布局的横向溢出、Console 报错、主题切换与关键文案，并把截图写到 `.preview/`（需要安装 Edge）。

---

## 目录

```
time6/
├─ index.html               # 唯一页面
├─ assets/
│  ├─ css/style.css         # 配色变量、布局、响应式、主题
│  ├─ js/schedule.js        # 纯计算：常量 / 阶段表 / stateAt()
│  ├─ js/app.js             # 渲染：DOM / SVG 表盘 / 定时刷新
│  └─ img/favicon.svg
├─ tests/                   # 仅开发用，不参与线上运行
├─ .nojekyll                # 关闭 Jekyll
└─ HANDOFF.md               # 原始需求与契约
```

## 部署

仓库 `main` 分支根目录直接发布到 GitHub Pages：

1. Settings → Pages → Source: **Deploy from a branch**
2. Branch: `main`，Folder: `/ (root)`
3. push 后 1–10 分钟生效

所有资源使用相对路径（`./assets/...`），因此项目页挂在 `/<repo>/` 子路径下也能正常加载。

---

## 浏览器支持

现代浏览器（Chrome / Edge / Safari / Firefox 最近两年版本）。用到的 `Intl.DateTimeFormat`、`backdrop-filter`、`svh`、`color-mix()` 在旧浏览器上会优雅降级，核心时间计算不受影响。
