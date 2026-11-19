由DSH+Deepseek V4.1 Flash 制作

# time6 Android 客户端

与 Web 版同功能的原生 Android App：一天 28 小时、一周 6 天的时钟。

- **28 小时制时间**：`00:00 – 27:59`，只到分钟，不显示秒
- **6 天一周**：周一 … 周六，显示「周四 · 第 4 / 6 天」
- **推荐入睡**：`20:00`（28h 制）
- **倒计时**：`距推荐入睡 X 小时 Y 分`；过点后显示 `已过推荐入睡 …`
- **28h 表盘**：28 个刻度、20 点睡眠色标记、进度环与当前指针
- 深色 / 浅色主题，选择会记住
- 无网络权限、无后端、无统计；完全离线
- 全屏沉浸，隐藏系统状态栏，避免真实 24h 时间与 28h 时钟并排造成混淆

时间模型与 Web 端逐条一致，锚点为 `2026-01-05 周一 00:00`（设备本地时区），推荐入睡为每天 `20:00`。

---

## 下载与安装

从 GitHub Releases 下载最新 APK：

<https://github.com/stbanana/time6/releases/tag/android-v1.0.0>

这是 **debug 签名** 的 APK，个人侧载足够；在手机上允许「安装未知来源应用」后打开即可。CI 每次构建使用临时 debug keystore，后续版本覆盖安装若提示签名冲突，先卸载旧版再装。正式上架 Play Store 需要另配 release keystore 与 AAB，不在 v1 范围。

## 构建

需要 JDK 17、Android SDK 35（platform 35 / build-tools 35.0.0）。

```bash
cd android
./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```

APK 输出：`android/app/build/outputs/apk/debug/app-debug.apk`

如果本机没有 SDK，在 `android/local.properties` 写：

```properties
sdk.dir=/path/to/Android/Sdk
```

`local.properties` 已被 `.gitignore` 忽略。

## 测试

```bash
cd android
./gradlew :app:testDebugUnitTest
```

- **时间模型单测**：锚点、20:00 边界、跨天/跨周、1000 次随机不变量、`America/New_York` DST 不变量、格式化与「不含秒」断言。
- **渲染冒烟测试**：Robolectric + Compose 在 JVM 上渲染 390dp 深/浅色、320dp、横屏四种画面，断言关键文案，并把 PNG 写到 `app/build/screenshots/`。不需要模拟器或真机。

## 配置

编辑 [`TimeModel.kt`](./app/src/main/java/io/github/stbanana/time6/TimeModel.kt)：

```kotlin
const val BEDTIME_HOUR = 20              // 推荐入睡（28h 制）
private val ANCHOR_DATE = LocalDate.of(2026, 1, 5) // 28h 周一 00:00 对应的本地日期
```

Web 端对应 [`../assets/js/schedule.js`](../assets/js/schedule.js)；改时间模型时两端一起改。

## 结构

```
android/
├─ app/src/main/java/io/github/stbanana/time6/
│  ├─ MainActivity.kt          # 沉浸式单 Activity
│  ├─ TimeModel.kt             # 纯 Kotlin 时间模型（与 JS 对齐）
│  ├─ data/ThemeStore.kt       # 主题偏好
│  └─ ui/
│     ├─ Time6App.kt           # 状态、分钟对齐刷新、系统栏
│     ├─ ClockScreen.kt        # 布局、主时钟、倒计时、页脚
│     ├─ ClockDial.kt          # Canvas 28h 表盘
│     └─ Theme.kt              # 配色与 Material3 主题
├─ app/src/main/res/           # 字符串、主题、自适应图标
├─ app/src/test/...            # JVM 单测
├─ gradle/                     # 版本目录与 wrapper
└─ README.md
```

## CI / 发布

- `.github/workflows/android.yml`：仅在 `android/**` 变更时构建、测试、lint，并上传 APK artifact。
- `.github/workflows/android-release.yml`：推送 `android-v*` tag 时构建并创建 GitHub Release，附 debug APK。

本机没有 JDK/SDK 时，也可以在 GitHub Actions 的 **Actions → Android → 最新 run → Artifacts** 下载 APK；Release 资产更适合长期保存。

## v1 不做

桌面小组件、通知/提醒、秒针、阶段/周表、Play Store 上架、自动更新。App 不申请任何敏感权限，也没有网络权限，完全离线。
