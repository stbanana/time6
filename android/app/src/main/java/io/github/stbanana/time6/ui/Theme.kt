package io.github.stbanana.time6.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

@Immutable
data class Time6Palette(
    val bgTop: Color,
    val bgBottom: Color,
    val surface: Color,
    val border: Color,
    val text: Color,
    val muted: Color,
    val faint: Color,
    val accent: Color,
    val sleep: Color,
    val onAccent: Color,
    val dialTrack: Color,
    val dialTick: Color,
    val dialTickMajor: Color
)

val DarkPalette = Time6Palette(
    bgTop = Color(0xFF0A1120),
    bgBottom = Color(0xFF070B16),
    surface = Color(0xFF111A2C),
    border = Color(0x2996A6D6),
    text = Color(0xFFEEF2FF),
    muted = Color(0xFF9AA6C4),
    faint = Color(0xFF7C89A8),
    accent = Color(0xFFFFB454),
    sleep = Color(0xFF8EA2FF),
    onAccent = Color(0xFF1A1206),
    dialTrack = Color(0xFF16203A),
    dialTick = Color(0x3896A6D6),
    dialTickMajor = Color(0x8596A6D6)
)

val LightPalette = Time6Palette(
    bgTop = Color(0xFFF8F9FD),
    bgBottom = Color(0xFFEEF1F8),
    surface = Color(0xFFFFFFFF),
    border = Color(0x1A1E2D50),
    text = Color(0xFF111827),
    muted = Color(0xFF59647E),
    faint = Color(0xFF66718A),
    accent = Color(0xFFE08B1F),
    sleep = Color(0xFF4F5BD5),
    onAccent = Color(0xFF1A1206),
    dialTrack = Color(0xFFE7EBF5),
    dialTick = Color(0x2E1E2D50),
    dialTickMajor = Color(0x6B1E2D50)
)

val LocalTime6Palette = staticCompositionLocalOf { DarkPalette }

@Composable
fun Time6Theme(darkTheme: Boolean, content: @Composable () -> Unit) {
    val palette = if (darkTheme) DarkPalette else LightPalette
    val scheme = if (darkTheme) {
        darkColorScheme(
            primary = palette.accent,
            onPrimary = palette.onAccent,
            secondary = palette.sleep,
            onSecondary = palette.text,
            background = palette.bgBottom,
            onBackground = palette.text,
            surface = palette.surface,
            onSurface = palette.text,
            surfaceVariant = palette.dialTrack,
            onSurfaceVariant = palette.muted,
            outline = palette.border
        )
    } else {
        lightColorScheme(
            primary = palette.accent,
            onPrimary = palette.onAccent,
            secondary = palette.sleep,
            onSecondary = palette.text,
            background = palette.bgBottom,
            onBackground = palette.text,
            surface = palette.surface,
            onSurface = palette.text,
            surfaceVariant = palette.dialTrack,
            onSurfaceVariant = palette.muted,
            outline = palette.border
        )
    }

    CompositionLocalProvider(LocalTime6Palette provides palette) {
        MaterialTheme(
            colorScheme = scheme,
            typography = Typography(),
            content = content
        )
    }
}
