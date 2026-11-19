package io.github.stbanana.time6.data

import android.content.Context

/** 只保存一个主题偏好，不联网、不上传。 */
class ThemeStore(context: Context) {

    private val prefs = context.applicationContext
        .getSharedPreferences("time6", Context.MODE_PRIVATE)

    fun isDark(): Boolean = prefs.getBoolean(KEY_DARK, true)

    fun setDark(value: Boolean) {
        prefs.edit().putBoolean(KEY_DARK, value).apply()
    }

    private companion object {
        const val KEY_DARK = "dark"
    }
}
