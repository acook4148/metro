package expo.modules.metrowidget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Bundle

open class MetroWidgetReceiver : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    WidgetRenderer.updateAll(context)
    WidgetRefreshWorker.schedule(context)
    WidgetRefreshWorker.enqueue(context)
  }

  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) {
    WidgetRenderer.updateAll(context)
  }

  override fun onDisabled(context: Context) = WidgetRefreshWorker.cancelIfUnused(context)

  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_REFRESH, ACTION_NEXT -> {
        if (WidgetStore.read(context)?.busy != true) {
          WidgetRefreshWorker.enqueue(context, intent.action == ACTION_NEXT)
        }
      }
      else -> super.onReceive(context, intent)
    }
  }

  companion object {
    const val ACTION_REFRESH = "expo.modules.metrowidget.REFRESH"
    const val ACTION_NEXT = "expo.modules.metrowidget.NEXT"
  }
}

class MetroWideWidgetReceiver : MetroWidgetReceiver()
