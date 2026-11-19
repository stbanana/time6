package io.github.stbanana.time6

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.ZoneId
import kotlin.random.Random

class TimeModelTest {

    private val zone = ZoneId.of("Asia/Shanghai")
    private val anchor = TimeModel.anchorMillis(zone)

    @Test
    fun worldConstants() {
        assertEquals(28L * TimeModel.HOUR_MS, TimeModel.DAY_MS)
        assertEquals(168L * TimeModel.HOUR_MS, TimeModel.WEEK_MS)
        assertEquals(6, TimeModel.DAY_COUNT)
        assertEquals(listOf("周一", "周二", "周三", "周四", "周五", "周六"), TimeModel.WEEKDAYS)
        assertEquals(20, TimeModel.BEDTIME_HOUR)
    }

    @Test
    fun anchorIsMondayMidnight() {
        val state = TimeModel.stateAt(anchor, zone)
        assertEquals("周一", state.weekday)
        assertEquals(1, state.day)
        assertEquals("00:00", state.timeText)
        assertFalse(state.pastBedtime)
        assertEquals(20L * 60, state.gapMinutes)
        assertEquals("20 小时", state.gapText)
        assertEquals("20:00", state.bedtimeText)
    }

    @Test
    fun progressesWithinTheDay() {
        val state = TimeModel.stateAt(anchor + TimeModel.HOUR_MS + 5 * TimeModel.MINUTE_MS, zone)
        assertEquals("01:05", state.timeText)
        assertEquals(18L * 60 + 55, state.gapMinutes)
    }

    @Test
    fun bedtimeBoundaryRoundsCorrectly() {
        val before = TimeModel.stateAt(
            anchor + 19 * TimeModel.HOUR_MS + 59 * TimeModel.MINUTE_MS + 30_000L,
            zone
        )
        assertEquals("19:59", before.timeText)
        assertFalse(before.pastBedtime)
        assertEquals(1L, before.gapMinutes)

        val exact = TimeModel.stateAt(anchor + 20 * TimeModel.HOUR_MS, zone)
        assertEquals("20:00", exact.timeText)
        assertTrue(exact.pastBedtime)
        assertEquals(0L, exact.gapMinutes)
        assertTrue(exact.atBedtime)

        val after = TimeModel.stateAt(anchor + 20 * TimeModel.HOUR_MS + 30 * TimeModel.MINUTE_MS, zone)
        assertEquals("20:30", after.timeText)
        assertTrue(after.pastBedtime)
        assertEquals(30L, after.gapMinutes)
        assertEquals("30 分", after.gapText)

        val late = TimeModel.stateAt(anchor + 27 * TimeModel.HOUR_MS + 59 * TimeModel.MINUTE_MS, zone)
        assertEquals("27:59", late.timeText)
        assertEquals(7L * 60 + 59, late.gapMinutes)
        assertEquals("7 小时 59 分", late.gapText)
    }

    @Test
    fun crossesDayAndWeek() {
        var state = TimeModel.stateAt(anchor + TimeModel.DAY_MS, zone)
        assertEquals("00:00", state.timeText)
        assertEquals("周二", state.weekday)
        assertEquals(2, state.day)
        assertEquals(20L * 60, state.gapMinutes)

        state = TimeModel.stateAt(anchor + 5 * TimeModel.DAY_MS, zone)
        assertEquals("周六", state.weekday)
        assertEquals(6, state.day)
        assertEquals("00:00", state.timeText)

        state = TimeModel.stateAt(anchor + TimeModel.WEEK_MS, zone)
        assertEquals("周一", state.weekday)
        assertEquals(1, state.day)
        assertEquals("00:00", state.timeText)

        state = TimeModel.stateAt(anchor - 1L, zone)
        assertEquals("周六", state.weekday)
        assertEquals(6, state.day)
        assertEquals("27:59", state.timeText)
        assertTrue(state.pastBedtime)
        assertEquals(7L * 60 + 59, state.gapMinutes)
    }

    @Test
    fun knownMapping() {
        val state = TimeModel.stateAt(
            anchor + 101 * TimeModel.HOUR_MS + 39 * TimeModel.MINUTE_MS,
            zone
        )
        assertEquals("周四", state.weekday)
        assertEquals(4, state.day)
        assertEquals("17:39", state.timeText)
        assertEquals(141L, state.gapMinutes)
        assertEquals("2 小时 21 分", state.gapText)
    }

    @Test
    fun randomInvariants() {
        val random = Random(42)
        val span = 80L * 168 * TimeModel.HOUR_MS
        repeat(1000) {
            val t = anchor - 40L * 168 * TimeModel.HOUR_MS + (random.nextDouble() * span).toLong()
            val state = TimeModel.stateAt(t, zone)
            assertTrue(state.day in 1..6)
            assertTrue(state.dayOffset in 0L until TimeModel.DAY_MS)
            assertTrue(state.dayProgress >= 0f && state.dayProgress < 1f)
            assertTrue(
                Regex("""^(?:[01]\d|2[0-7]):[0-5]\d$""").matches(state.timeText)
            )
            assertTrue(state.gapMinutes >= 0)
            assertFalse(state.gapText.contains("秒"))
            assertEquals(state.pastBedtime && state.gapMinutes == 0L, state.atBedtime)
            if (state.pastBedtime) {
                assertTrue(state.gapMinutes <= 8 * 60)
            } else {
                assertTrue(state.gapMinutes <= 20 * 60)
            }
        }
    }

    @Test
    fun dstZoneInvariants() {
        val newYork = ZoneId.of("America/New_York")
        val localAnchor = TimeModel.anchorMillis(newYork)
        val random = Random(7)
        repeat(500) {
            val t = localAnchor + (random.nextDouble() * 365.0 * 24 * TimeModel.HOUR_MS).toLong()
            val state = TimeModel.stateAt(t, newYork)
            assertTrue(state.day in 1..6)
            assertTrue(state.dayOffset in 0L until TimeModel.DAY_MS)
            assertTrue(state.gapMinutes >= 0)
            assertFalse(state.gapText.contains("秒"))
        }
    }

    @Test
    fun formatting() {
        assertEquals("00:00", TimeModel.formatClock(0, 0))
        assertEquals("27:59", TimeModel.formatClock(27, 59))
        assertEquals("0 分", TimeModel.formatMinutes(0))
        assertEquals("30 分", TimeModel.formatMinutes(30))
        assertEquals("1 小时", TimeModel.formatMinutes(60))
        assertEquals("2 小时 21 分", TimeModel.formatMinutes(141))
    }
}
