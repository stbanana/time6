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

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w800dp-h360dp-land-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ClockScreenLandscapeTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    private fun state() = TimeModel.stateAt(
        TimeModel.anchorMillis(ZoneId.of("Asia/Shanghai")) +
            101 * TimeModel.HOUR_MS + 39 * TimeModel.MINUTE_MS,
        ZoneId.of("Asia/Shanghai")
    )

    @Test
    fun rendersInLandscape() {
        composeRule.setContent {
            Time6Theme(darkTheme = true) {
                ClockScreen(state = state(), darkTheme = true, onToggleTheme = {})
            }
        }
        composeRule.onNodeWithText("17:39").assertExists()
        composeRule.onNodeWithText("推荐入睡").assertExists()
        composeRule.waitForIdle()

        val view = composeRule.activity.window.decorView
        val bitmap = Bitmap.createBitmap(
            view.width.coerceAtLeast(1),
            view.height.coerceAtLeast(1),
            Bitmap.Config.ARGB_8888
        )
        view.draw(Canvas(bitmap))
        val outDir = File("build/screenshots").apply { mkdirs() }
        FileOutputStream(File(outDir, "clock-dark-landscape.png")).use {
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)
        }
    }
}
