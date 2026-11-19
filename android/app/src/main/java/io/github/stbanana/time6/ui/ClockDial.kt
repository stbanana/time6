package io.github.stbanana.time6.ui

import android.graphics.Paint
import android.graphics.Typeface
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import io.github.stbanana.time6.ClockState
import io.github.stbanana.time6.TimeModel
import java.util.Locale
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun ClockDial(state: ClockState, modifier: Modifier = Modifier) {
    val p = LocalTime6Palette.current
    val description = "28 小时表盘，当前 ${state.timeText}，推荐入睡 ${state.bedtimeText}"

    Canvas(
        modifier = modifier.clearAndSetSemantics { contentDescription = description }
    ) {
        val d = size.minDimension
        val center = this.center
        val ringR = d * 0.32f
        val ringW = d * 0.05f
        val topLeft = Offset(center.x - ringR, center.y - ringR)
        val ringSize = Size(ringR * 2, ringR * 2)

        drawCircle(
            color = p.dialTrack,
            radius = ringR,
            center = center,
            style = Stroke(ringW)
        )

        val bedtime = state.bedtimeProgress
        val progress = state.dayProgress
        val accentSweep = 360f * minOf(progress, bedtime)
        if (accentSweep > 0.05f) {
            drawArc(
                color = p.accent,
                startAngle = -90f,
                sweepAngle = accentSweep,
                useCenter = false,
                topLeft = topLeft,
                size = ringSize,
                style = Stroke(width = ringW, cap = StrokeCap.Butt)
            )
        }

        if (progress > bedtime) {
            drawArc(
                color = p.sleep,
                startAngle = -90f + 360f * bedtime,
                sweepAngle = 360f * (progress - bedtime),
                useCenter = false,
                topLeft = topLeft,
                size = ringSize,
                style = Stroke(width = ringW, cap = StrokeCap.Butt)
            )
        }

        for (i in 0 until 28) {
            val major = i % 4 == 0
            val angle = Math.toRadians(-90.0 + 360.0 * i / 28.0).toFloat()
            drawLine(
                color = if (major) p.dialTickMajor else p.dialTick,
                start = point(center, d * if (major) 0.365f else 0.38f, angle),
                end = point(center, d * 0.4025f, angle),
                strokeWidth = if (major) d * 1.6f / 400f else d * 1f / 400f,
                cap = StrokeCap.Round
            )
        }

        val numberPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.CENTER
            textSize = d * 17f / 400f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            color = p.muted.toArgb()
        }
        val bedtimePaint = Paint(numberPaint).apply {
            color = p.sleep.toArgb()
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        }
        val nativeCanvas = drawContext.canvas.nativeCanvas

        val numeralHours = (listOf(0, 4, 8, 12, 16, 20, 24) + TimeModel.BEDTIME_HOUR)
            .distinct()
            .sorted()
        for (hour in numeralHours) {
            val angle = Math.toRadians(-90.0 + 360.0 * hour / 28.0).toFloat()
            val position = point(center, d * 0.445f, angle)
            val paint = if (hour == TimeModel.BEDTIME_HOUR) bedtimePaint else numberPaint
            val baseline = position.y - (paint.ascent() + paint.descent()) / 2f
            nativeCanvas.drawText(
                String.format(Locale.ROOT, "%02d", hour),
                position.x,
                baseline,
                paint
            )
        }

        val bedtimeAngle = Math.toRadians(-90.0 + 360.0 * bedtime).toFloat()
        drawLine(
            color = p.sleep,
            start = point(center, d * 0.28f, bedtimeAngle),
            end = point(center, d * 0.36f, bedtimeAngle),
            strokeWidth = d * 2.6f / 400f,
            cap = StrokeCap.Round
        )

        val handAngle = Math.toRadians(-90.0 + 360.0 * progress).toFloat()
        drawLine(
            color = p.text.copy(alpha = 0.42f),
            start = point(center, d * 0.27f, handAngle),
            end = point(center, d * 0.375f, handAngle),
            strokeWidth = d * 1.5f / 400f,
            cap = StrokeCap.Round
        )
        drawCircle(
            color = if (state.pastBedtime) p.sleep else p.accent,
            radius = d * 0.016f,
            center = point(center, ringR, handAngle)
        )
    }
}

private fun point(center: Offset, radius: Float, angleRad: Float): Offset =
    Offset(
        center.x + radius * cos(angleRad),
        center.y + radius * sin(angleRad)
    )
