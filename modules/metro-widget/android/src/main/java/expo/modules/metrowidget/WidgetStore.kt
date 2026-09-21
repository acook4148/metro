package expo.modules.metrowidget

import android.content.Context
import org.json.JSONObject
import java.util.UUID

internal object WidgetStore {
  data class State(val snapshot: JSONObject, val revision: String, val busy: Boolean, val error: Boolean)
  data class Request(val previous: JSONObject, val snapshot: JSONObject, val revision: String)

  private fun preferences(context: Context) = context.getSharedPreferences("metro_widget", Context.MODE_PRIVATE)

  @Synchronized
  fun read(context: Context): State? {
    val prefs = preferences(context)
    val snapshot = runCatching { JSONObject(prefs.getString("snapshot", null) ?: return null) }.getOrNull()
      ?: return null
    return State(snapshot, prefs.getString("revision", "")!!,
      prefs.getLong("busyUntil", 0) > System.currentTimeMillis(), prefs.getBoolean("error", false))
  }

  @Synchronized
  fun saveFromApp(context: Context, snapshot: JSONObject) {
    require(snapshot.optString("stationCode").isNotBlank())
    preferences(context).edit().putString("snapshot", snapshot.toString())
      .putString("revision", UUID.randomUUID().toString()).putLong("busyUntil", 0)
      .putBoolean("error", false).remove("requestId").remove("previous").apply()
  }

  @Synchronized
  fun begin(context: Context, next: Boolean, requestId: String, expectedRevision: String?): Request? {
    val state = read(context) ?: return null
    val prefs = preferences(context)
    // WorkManager may restart after process death. Resume the same station switch only once.
    if (prefs.getString("requestId", null) == requestId) {
      val previous = JSONObject(prefs.getString("previous", null) ?: return null)
      prefs.edit().putLong("busyUntil", System.currentTimeMillis() + 120_000).commit()
      return Request(previous, state.snapshot, state.revision)
    }
    if (expectedRevision != state.revision) return null
    val target = if (next) WidgetData.nextStation(state.snapshot) ?: return null else null
    val snapshot = if (target != null) WidgetData.switching(state.snapshot, target) else state.snapshot
    val revision = UUID.randomUUID().toString()
    preferences(context).edit().putString("snapshot", snapshot.toString()).putString("revision", revision)
      .putString("requestId", requestId).putString("previous", state.snapshot.toString())
      .putLong("busyUntil", System.currentTimeMillis() + 120_000).putBoolean("error", false).commit()
    return Request(state.snapshot, snapshot, revision)
  }

  // App selections made during a network request take precedence over its result.
  @Synchronized
  fun finish(context: Context, request: Request, result: JSONObject?) {
    if (read(context)?.revision != request.revision) return
    preferences(context).edit().putString("snapshot", (result ?: request.previous).toString())
      .putLong("busyUntil", 0).putBoolean("error", result == null)
      .remove("requestId").remove("previous").commit()
  }
}
