package io.github.stbanana.time6.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import io.github.stbanana.time6.ClockState
import io.github.stbanana.time6.R
import java.time.ZoneId

@Composable
fun ClockScreen(
    state: ClockState,
    darkTheme: Boolean,
    onToggleTheme: () -> Unit
) {
    val palette = LocalTime6Palette.current
    BoxWithConstraints(
        Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(palette.bgTop, palette.bgBottom)
                )
            )
    ) {
        val landscape = maxWidth > maxHeight
        val screenWidth = maxWidth
        Column(
            Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .padding(horizontal = 20.dp)
        ) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                TopBar(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 620.dp),
                    darkTheme = darkTheme,
                    onToggleTheme = onToggleTheme,
                    showSubtitle = screenWidth >= 380.dp
                )
            }

            BoxWithConstraints(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                val pad = if (landscape) 20.dp else 24.dp
                val dialSize: Dp
                val cardWidth: Dp
                if (landscape) {
                    dialSize = minOf(maxHeight - 44.dp, maxWidth * 0.46f)
                        .coerceAtLeast(140.dp)
                    cardWidth = minOf(maxWidth, dialSize + 340.dp)
                } else {
                    val panelBudget = 150.dp
                    dialSize = minOf(
                        maxWidth - pad * 2,
                        maxHeight - panelBudget - pad * 2,
                        440.dp
                    ).coerceAtLeast(140.dp)
                    cardWidth = dialSize + pad * 2
                }

                ClockCard(
                    state = state,
                    dialSize = dialSize,
                    horizontal = landscape,
                    modifier = Modifier.width(cardWidth)
                )
            }

            Footer()
        }
    }
}

@Composable
private fun TopBar(
    modifier: Modifier,
    darkTheme: Boolean,
    onToggleTheme: () -> Unit,
    showSubtitle: Boolean
) {
    val palette = LocalTime6Palette.current
    Row(
        modifier = modifier.padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        BrandMark()
        Spacer(Modifier.width(10.dp))
        Text(
            text = "time6",
            color = palette.text,
            style = LocalTextStyle.current.copy(
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = (-0.02).em
            )
        )
        if (showSubtitle) {
            Spacer(Modifier.width(10.dp))
            Box(
                Modifier
                    .width(1.dp)
                    .height(16.dp)
                    .background(palette.border)
            )
            Spacer(Modifier.width(10.dp))
            Text(
                text = stringResource(R.string.brand_sub),
                color = palette.muted,
                style = LocalTextStyle.current.copy(
                    fontSize = 12.sp,
                    letterSpacing = 0.04.em
                ),
                maxLines = 1
            )
        }
        Spacer(Modifier.weight(1f))
        ThemeToggle(darkTheme, onToggleTheme)
    }
}

@Composable
private fun BrandMark() {
    Box(
        modifier = Modifier
            .size(30.dp)
            .clip(RoundedCornerShape(9.dp))
            .background(Color(0xFF0D1526)),
        contentAlignment = Alignment.Center
    ) {
        Canvas(Modifier.size(22.dp)) {
            val radius = size.minDimension / 2f - 1.dp.toPx()
            val center = this.center
            val topLeft = Offset(center.x - radius, center.y - radius)
            val arcSize = Size(radius * 2, radius * 2)
            val stroke = 2.4.dp.toPx()

            drawCircle(
                color = Color(0xFF26314D),
                radius = radius,
                center = center,
                style = Stroke(stroke)
            )
            drawArc(
                color = Color(0xFF8EA2FF),
                startAngle = -90f,
                sweepAngle = 102.86f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = stroke, cap = StrokeCap.Round)
            )
            drawArc(
                color = Color(0xFFFFB454),
                startAngle = 12.86f,
                sweepAngle = 257.14f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = stroke, cap = StrokeCap.Round)
            )
            drawCircle(
                color = Color(0xFFFFB454),
                radius = 2.4.dp.toPx(),
                center = Offset(center.x, center.y - radius)
            )
        }
    }
}

@Composable
private fun ThemeToggle(darkTheme: Boolean, onToggleTheme: () -> Unit) {
    val palette = LocalTime6Palette.current
    Surface(
        shape = CircleShape,
        color = palette.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, palette.border)
    ) {
        IconButton(
            onClick = onToggleTheme,
            modifier = Modifier.size(40.dp)
        ) {
            Icon(
                painter = painterResource(
                    if (darkTheme) R.drawable.ic_sun else R.drawable.ic_moon
                ),
                contentDescription = stringResource(
                    if (darkTheme) R.string.theme_to_light else R.string.theme_to_dark
                ),
                tint = palette.text,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@Composable
private fun ClockCard(
    state: ClockState,
    dialSize: Dp,
    horizontal: Boolean,
    modifier: Modifier
) {
    val palette = LocalTime6Palette.current
    val compact = dialSize < 300.dp
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(if (horizontal) 24.dp else 30.dp),
        color = palette.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, palette.border),
        shadowElevation = 18.dp
    ) {
        if (horizontal) {
            Row(
                modifier = Modifier.padding(20.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                DialBlock(state, dialSize)
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    BedtimeBlock(state, compact)
                    CountdownBlock(state, compact)
                }
            }
        } else {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                DialBlock(state, dialSize)
                SleepPanel(state, compact)
            }
        }
    }
}

@Composable
private fun DialBlock(state: ClockState, dialSize: Dp) {
    Box(Modifier.size(dialSize), contentAlignment = Alignment.Center) {
        ClockDial(state, Modifier.matchParentSize())
        Face(state, dialSize)
    }
}

@Composable
private fun BoxScope.Face(state: ClockState, dialSize: Dp) {
    val palette = LocalTime6Palette.current
    val compact = dialSize < 260.dp
    val density = androidx.compose.ui.platform.LocalDensity.current
    val timeSize = with(density) {
        (dialSize.toPx() * 0.16f)
            .coerceAtMost(66.dp.toPx())
            .toSp()
    }

    Column(
        modifier = Modifier.fillMaxWidth(0.56f),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Text(
            text = stringResource(
                R.string.day_format,
                state.weekday,
                state.day,
                state.dayCount
            ),
            color = palette.muted,
            style = LocalTextStyle.current.copy(
                fontSize = if (compact) 10.sp else 12.sp,
                letterSpacing = 0.05.em
            ),
            maxLines = 1
        )
        Text(
            text = state.timeText,
            color = palette.text,
            style = LocalTextStyle.current.copy(
                fontSize = timeSize,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = (-0.03).em,
                fontFeatureSettings = "tnum"
            ),
            maxLines = 1,
            softWrap = false
        )
        Text(
            text = stringResource(R.string.face_zone),
            color = palette.faint,
            style = LocalTextStyle.current.copy(
                fontSize = if (compact) 10.sp else 12.sp,
                letterSpacing = 0.18.em
            ),
            maxLines = 1
        )
    }
}

@Composable
private fun SleepPanel(state: ClockState, compact: Boolean) {
    val palette = LocalTime6Palette.current
    Column(Modifier.padding(top = 22.dp)) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(palette.border)
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 18.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom
        ) {
            BedtimeBlock(state, compact)
            Spacer(Modifier.width(16.dp))
            CountdownBlock(state, compact, Modifier.weight(1f))
        }
    }
}

@Composable
private fun BedtimeBlock(state: ClockState, compact: Boolean) {
    val palette = LocalTime6Palette.current
    Column {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Box(
                Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(palette.sleep)
            )
            Text(
                text = stringResource(R.string.label_bedtime),
                color = palette.muted,
                style = LocalTextStyle.current.copy(
                    fontSize = 12.sp,
                    letterSpacing = 0.08.em
                )
            )
        }
        Text(
            text = state.bedtimeText,
            color = palette.text,
            style = LocalTextStyle.current.copy(
                fontSize = if (compact) 22.sp else 26.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = (-0.01).em
            ),
            maxLines = 1
        )
    }
}

@Composable
private fun CountdownBlock(
    state: ClockState,
    compact: Boolean,
    modifier: Modifier = Modifier
) {
    val palette = LocalTime6Palette.current
    val past = state.pastBedtime
    val label = when {
        !past -> R.string.label_until
        state.gapMinutes == 0L -> R.string.label_now
        else -> R.string.label_past
    }
    val value = if (state.atBedtime) {
        stringResource(R.string.value_sleep_now)
    } else {
        state.gapText
    }

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.End
    ) {
        Text(
            text = stringResource(label),
            color = if (past) palette.sleep else palette.muted,
            style = LocalTextStyle.current.copy(
                fontSize = 12.sp,
                letterSpacing = 0.08.em
            ),
            maxLines = 1
        )
        Text(
            text = value,
            color = if (past) palette.sleep else palette.text,
            style = LocalTextStyle.current.copy(
                fontSize = if (compact) 22.sp else 26.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = (-0.01).em
            ),
            maxLines = 1,
            softWrap = false
        )
    }
}

@Composable
private fun Footer() {
    val palette = LocalTime6Palette.current
    val zone = ZoneId.systemDefault().id
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 16.dp, bottom = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = stringResource(R.string.footer_world),
            color = palette.muted,
            style = LocalTextStyle.current.copy(fontSize = 12.sp),
            textAlign = TextAlign.Center
        )
        Text(
            text = stringResource(R.string.footer_meta, zone),
            color = palette.faint,
            style = LocalTextStyle.current.copy(fontSize = 12.sp),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}
