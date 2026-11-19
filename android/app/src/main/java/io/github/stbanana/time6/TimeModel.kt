package io.github.stbanana.time6

import java.time.LocalDate
import java.time.ZoneId
import java.util.Locale

/**
 * 28 小时世界的时间模型：一天 28 小时、一周 6 天。
 *
 * 与 Web 版 assets/js/schedule.js 保持逐条一致：
 * - 时钟显示 00:00 – 27:59，不含秒
 * - 锚点 2026-01-05（周一）00:00（本地时区）= 28h 周一 00:00
 * - 推荐入睡每天 20:00（28h 制）
 * - 睡前倒计时向上取整，睡后向下取整
 */
object TimeModel {

    const val MINUTE_MS = 60_000L
    const val HOUR_MS = 60 * MINUTE_MS
    const val DAY_MS = 28 * HOUR_MS
    const val WEEK_MS = 6 * DAY_MS
    const val DAY_COUNT = 6
    const val BEDTIME_HOUR = 20
    const val HOURS_PER_DAY = 28

    val WEEKDAYS = listOf("周一", "周二", "周三", "周四", "周五", "周六")

    private val ANCHOR_DATE: LocalDate = LocalDate.of(2026, 1, 5)

    fun anchorMillis(zone: ZoneId = ZoneId.systemDefault()): Long =
        ANCHOR_DATE.atStartOfDay(zone).toInstant().toEpochMilli()

    fun stateAt(nowMs: Long, zone: ZoneId = ZoneId.systemDefault()): ClockState {
        val anchor = anchorMillis(zone)
        val weekOffset = Math.floorMod(nowMs - anchor, WEEK_MS)
        val dayIndex = (weekOffset / DAY_MS).toInt()
        val dayOffset = weekOffset % DAY_MS

        val bedtimeOffset = BEDTIME_HOUR * HOUR_MS
        val pastBedtime = dayOffset >= bedtimeOffset
        val gapMinutes = if (pastBedtime) {
            (dayOffset - bedtimeOffset) / MINUTE_MS
        } else {
            (bedtimeOffset - dayOffset + MINUTE_MS - 1) / MINUTE_MS
        }

        val hours = (dayOffset / HOUR_MS).toInt()
        val minutes = ((dayOffset % HOUR_MS) / MINUTE_MS).toInt()

        return ClockState(
            now = nowMs,
            dayIndex = dayIndex,
            day = dayIndex + 1,
            dayCount = DAY_COUNT,
            weekday = WEEKDAYS[dayIndex],
            dayOffset = dayOffset,
            dayProgress = dayOffset.toFloat() / DAY_MS,
            timeText = formatClock(hours, minutes),
            hours = hours,
            minutes = minutes,
            bedtimeText = formatClock(BEDTIME_HOUR, 0),
            bedtimeProgress = BEDTIME_HOUR.toFloat() / HOURS_PER_DAY,
            pastBedtime = pastBedtime,
            gapMinutes = gapMinutes,
            gapText = formatMinutes(gapMinutes),
            atBedtime = pastBedtime && gapMinutes == 0L
        )
    }

    fun formatClock(hours: Int, minutes: Int): String =
        String.format(Locale.ROOT, "%02d:%02d", hours, minutes)

    fun formatMinutes(totalMinutes: Long): String {
        val minutes = totalMinutes.coerceAtLeast(0)
        val h = minutes / 60
        val m = minutes % 60
        return when {
            h == 0L -> "$m 分"
            m == 0L -> "$h 小时"
            else -> "$h 小时 $m 分"
        }
    }
}

data class ClockState(
    val now: Long,
    val dayIndex: Int,
    val day: Int,
    val dayCount: Int,
    val weekday: String,
    val dayOffset: Long,
    val dayProgress: Float,
    val timeText: String,
    val hours: Int,
    val minutes: Int,
    val bedtimeText: String,
    val bedtimeProgress: Float,
    val pastBedtime: Boolean,
    val gapMinutes: Long,
    val gapText: String,
    val atBedtime: Boolean
)
