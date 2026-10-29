package expo.modules.metrowidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProviderInfo
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.text.format.DateFormat
import android.util.SizeF
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import java.util.Locale
import java.util.Date

internal object WidgetRenderer {
  fun ids(context: Context): IntArray {
    val manager = AppWidgetManager.getInstance(context)
    return listOf(MetroWidgetReceiver::class.java, MetroWideWidgetReceiver::class.java)
      .flatMap { manager.getAppWidgetIds(ComponentName(context, it)).toList() }.toIntArray()
  }

  @Suppress("DEPRECATION")
  fun updateAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val state = WidgetStore.read(context)
    for (id in ids(context)) {
      val options = manager.getAppWidgetOptions(id)
      val lockScreen = options.getInt(AppWidgetManager.OPTION_APPWIDGET_HOST_CATEGORY) == AppWidgetProviderInfo.WIDGET_CATEGORY_KEYGUARD
      val sizes = if (Build.VERSION.SDK_INT >= 31) options.getParcelableArrayList<SizeF>(AppWidgetManager.OPTION_APPWIDGET_SIZES)
        ?.filter { it.width > 0 && it.height > 0 }?.distinct()?.take(16) else null
      val views = if (Build.VERSION.SDK_INT >= 31 && !sizes.isNullOrEmpty()) {
        RemoteViews(sizes.associateWith { render(context, state, it, lockScreen) })
      } else {
        val defaultWidth = if (manager.getAppWidgetInfo(id)?.provider?.className == MetroWideWidgetReceiver::class.java.name) 320 else 170
        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, defaultWidth).coerceAtLeast(1)
        val maxWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, minWidth)
        val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 180).coerceAtLeast(1)
        val maxHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, minHeight)
        RemoteViews(
          render(context, state, SizeF(maxWidth.toFloat(), minHeight.toFloat()), lockScreen),
          render(context, state, SizeF(minWidth.toFloat(), maxHeight.toFloat()), lockScreen)
        )
      }
      manager.updateAppWidget(id, views)
    }
  }

  private fun render(context: Context, state: WidgetStore.State?, size: SizeF, lockScreen: Boolean): RemoteViews {
    val fontScale = context.resources.configuration.fontScale.coerceAtLeast(1f)
    val wide = size.width >= 280 * fontScale || lockScreen
    val views = RemoteViews(context.packageName, if (wide) R.layout.metro_widget_wide else R.layout.metro_widget_compact)
    context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launch ->
      views.setOnClickPendingIntent(R.id.metro_widget_root, PendingIntent.getActivity(context, 0, launch,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
    }
    views.removeAllViews(R.id.metro_rows)
    if (state == null) {
      views.setViewVisibility(R.id.metro_controls, View.GONE)
      return views
    }
    val snapshot = state.snapshot
    val stationName = snapshot.optString("stationName")
    views.setTextViewText(R.id.metro_station, StationNames.displayName(stationName))
    views.setContentDescription(R.id.metro_station, stationName)
    if (lockScreen) views.setTextViewTextSize(R.id.metro_station, TypedValue.COMPLEX_UNIT_SP, 13f)

    val predictions = WidgetData.objects(snapshot.optJSONArray("predictions"))
    val rowSize = if (wide && !lockScreen) 15f else 13.5f
    // Reserve the title, divider, padding, and controls before allocating departure rows.
    val reserved = 20 + 11 + (if (wide) maxOf(32f, 22 * fontScale) else 22 * fontScale + 32)
    val rowHeight = rowSize * fontScale * 1.25f + 4
    val rowLimit = WidgetData.rowLimit(size.height, reserved, rowHeight, lockScreen)
    val status = when {
      state.busy && predictions.isEmpty() -> context.getString(R.string.metro_widget_refreshing)
      predictions.isEmpty() && snapshot.optBoolean("isClosed") -> {
        val next = snapshot.optString("nextTrainTime").takeUnless { snapshot.isNull("nextTrainTime") || it.isBlank() }
        if (next == null) context.getString(R.string.metro_widget_closed) else context.getString(R.string.metro_widget_next_train, next)
      }
      predictions.isEmpty() -> context.getString(R.string.metro_widget_no_trains)
      else -> null
    }
    views.setViewVisibility(R.id.metro_status, if (status == null) View.GONE else View.VISIBLE)
    if (status != null) {
      views.setTextViewText(R.id.metro_status, status)
      views.setInt(R.id.metro_status, "setMaxLines", rowLimit.coerceIn(1, 3))
    }

    for (prediction in predictions.take(rowLimit)) {
      val row = RemoteViews(context.packageName, R.layout.metro_widget_row)
      val line = prediction.optString("line").trim().uppercase(Locale.ROOT)
      val destination = prediction.optString("destinationName")
      val minutes = WidgetData.minutes(prediction)
      row.setTextViewText(R.id.metro_line, line)
      row.setTextColor(R.id.metro_line, Color.parseColor(WidgetData.lineColor(line)))
      row.setTextViewText(R.id.metro_destination, StationNames.displayName(destination))
      row.setTextViewText(R.id.metro_minutes, minutes)
      row.setTextColor(R.id.metro_minutes, Color.parseColor(WidgetData.timeColor(minutes)))
      for (textId in listOf(R.id.metro_line, R.id.metro_destination, R.id.metro_minutes)) {
        row.setTextViewTextSize(textId, TypedValue.COMPLEX_UNIT_SP, rowSize)
      }
      row.setContentDescription(R.id.metro_row, "$line, $destination, ${when(minutes) { "BRD" -> "boarding"; "ARR" -> "arriving"; else -> "$minutes minutes" }}")
      views.addView(R.id.metro_rows, row)
    }

    val canSwitch = WidgetData.nextStation(snapshot) != null
    views.setViewVisibility(R.id.metro_next, if (canSwitch) View.VISIBLE else View.GONE)
    views.setViewVisibility(R.id.metro_next_text, if (lockScreen || size.width < 170 * fontScale) View.GONE else View.VISIBLE)
    views.setBoolean(R.id.metro_next, "setEnabled", !state.busy)
    views.setViewVisibility(R.id.metro_refresh, if (state.busy) View.GONE else View.VISIBLE)
    views.setProgressBar(R.id.metro_loading, 100, 0, state.busy)
    views.setViewVisibility(R.id.metro_loading, if (state.busy) View.VISIBLE else View.GONE)
    views.setOnClickPendingIntent(R.id.metro_next, action(context, MetroWidgetReceiver.ACTION_NEXT, 1))
    views.setOnClickPendingIntent(R.id.metro_refresh, action(context, MetroWidgetReceiver.ACTION_REFRESH, 2))
    views.setOnClickPendingIntent(R.id.metro_retry, action(context, MetroWidgetReceiver.ACTION_REFRESH, 2))
    views.setViewVisibility(R.id.metro_retry, if (state.error && size.width >= 200 * fontScale) View.VISIBLE else View.GONE)
    views.setTextColor(R.id.metro_age, Color.parseColor(if (state.error) "#E06429" else "#C9C9C4"))
    views.setContentDescription(R.id.metro_refresh, context.getString(if (state.error) R.string.metro_widget_failed else R.string.metro_widget_refresh))
    val fetchedAt = WidgetData.timestamp(snapshot.optString("fetchedAt"))
    if (fetchedAt != null) {
      val updated = DateFormat.getTimeFormat(context).format(Date(fetchedAt))
      views.setTextViewText(R.id.metro_age, updated)
      views.setContentDescription(R.id.metro_age, context.getString(R.string.metro_widget_updated_at, updated))
    } else {
      views.setTextViewText(R.id.metro_age, context.getString(R.string.metro_widget_unknown_age))
    }
    return views
  }

  private fun action(context: Context, action: String, code: Int): PendingIntent =
    PendingIntent.getBroadcast(context, code, Intent(context, MetroWidgetReceiver::class.java).setAction(action),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
}
