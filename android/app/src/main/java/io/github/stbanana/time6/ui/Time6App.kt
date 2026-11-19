package io.github.stbanana.time6.ui

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import io.github.stbanana.time6.TimeModel
import io.github.stbanana.time6.data.ThemeStore
import kotlinx.coroutines.delay

@Composable
fun Time6App() {
    val context = LocalContext.current
    val store = remember(context) { ThemeStore(context) }
    var darkTheme by remember { mutableStateOf(store.isDark()) }
    var state by remember { mutableStateOf(TimeModel.stateAt(System.currentTimeMillis())) }
    val lifecycleOwner = LocalLifecycleOwner.current

    LaunchedEffect(lifecycleOwner) {
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            while (true) {
                val now = System.currentTimeMillis()
                state = TimeModel.stateAt(now)
                // 只显示到分钟：对齐到下一分钟，不做秒级刷新。
                delay(60_000L - (now % 60_000L) + 40L)
            }
        }
    }

    Time6Theme(darkTheme) {
        SystemBarAppearance(darkTheme)
        ClockScreen(
            state = state,
            darkTheme = darkTheme,
            onToggleTheme = {
                darkTheme = !darkTheme
                store.setDark(darkTheme)
            }
        )
    }
}

@Composable
private fun SystemBarAppearance(darkTheme: Boolean) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val activity = view.context.findActivity() ?: return@SideEffect
            WindowCompat.getInsetsController(activity.window, view).apply {
                isAppearanceLightStatusBars = !darkTheme
                isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
