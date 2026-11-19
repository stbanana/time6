package io.github.stbanana.time6

import android.graphics.Bitmap
import android.graphics.Canvas
import androidx.activity.ComponentActivity
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import io.github.stbanana.time6.ui.ClockScreen
import io.github.stbanana.time6.ui.Time6Theme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File
import java.io.FileOutputStream
import java.time.ZoneId

/**
 * 无设备时的渲染冒烟测试：Robolectric 原生图形渲染 Compose 页面，
 * 断言关键文案并把整屏 PNG 写到 app/build/screenshots/。
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w390dp-h844dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ClockScreenRenderTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    private fun state() = TimeModel.stateAt(
        TimeModel.anchorMillis(ZoneId.of("Asia/Shanghai")) +
            101 * TimeModel.HOUR_MS + 39 * TimeModel.MINUTE_MS,
        ZoneId.of("Asia/Shanghai")
    )

    @Test
    fun rendersDarkAt390dp() {
        composeRule.setContent {
            Time6Theme(darkTheme = true) {
                ClockScreen(state = state(), darkTheme = true, onToggleTheme = {})
            }
        }
        composeRule.onNodeWithText("time6").assertExists()
        composeRule.onNodeWithText("17:39").assertExists()
        composeRule.onNodeWithText("周四 · 第 4 / 6 天").assertExists()
        composeRule.onNodeWithText("推荐入睡").assertExists()
        composeRule.onNodeWithText("距推荐入睡").assertExists()
        composeRule.onNodeWithText("2 小时 21 分").assertExists()

        capture("clock-dark-390.png")
    }

    @Test
    fun rendersLightAt390dp() {
        composeRule.setContent {
            Time6Theme(darkTheme = false) {
                ClockScreen(state = state(), darkTheme = false, onToggleTheme = {})
            }
        }
        capture("clock-light-390.png")
    }

    private fun capture(name: String) {
        composeRule.waitForIdle()
        val view = composeRule.activity.window.decorView
        val width = view.width.coerceAtLeast(1)
        val height = view.height.coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        view.draw(Canvas(bitmap))
        val outDir = File("build/screenshots").apply { mkdirs() }
        FileOutputStream(File(outDir, name)).use {
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)
        }
    }
}
