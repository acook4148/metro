package expo.modules.metrowidget

import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.util.Locale
import kotlin.math.floor

internal object WidgetData {
  fun rowLimit(height: Float, reserved: Float, rowHeight: Float, lockScreen: Boolean): Int =
    floor((height - reserved) / rowHeight).toInt().coerceIn(0, if (lockScreen) 2 else 5)

  fun objects(array: JSONArray?): List<JSONObject> =
    (0 until (array?.length() ?: 0)).mapNotNull { array?.optJSONObject(it) }

  fun strings(array: JSONArray?): List<String> =
    (0 until (array?.length() ?: 0)).mapNotNull { array?.optString(it)?.takeIf(String::isNotBlank) }

  fun timestamp(value: String?): Long? =
    runCatching { Instant.parse(value).toEpochMilli() }.getOrNull()

  fun nextStation(snapshot: JSONObject): JSONObject? {
    val stations = objects(snapshot.optJSONArray("topStations"))
      .distinctBy { it.optString("stationCode") }.take(3)
    if (stations.size < 2) return null
    val index = stations.indexOfFirst { it.optString("stationCode") == snapshot.optString("stationCode") }
    return stations[(index + 1) % stations.size]
  }

  fun switching(snapshot: JSONObject, station: JSONObject): JSONObject =
    JSONObject(snapshot.toString()).apply {
      for (key in listOf("stationCode", "stationCodes", "stationName", "lines", "preferredLineOrder")) {
        put(key, station.get(key))
      }
      put("predictions", JSONArray())
      put("fetchedAt", JSONObject.NULL)
      put("isClosed", false)
      put("nextTrainTime", JSONObject.NULL)
    }

  fun merge(snapshot: JSONObject, responses: List<JSONObject>): JSONObject {
    require(responses.isNotEmpty())
    val order = strings(snapshot.optJSONArray("preferredLineOrder"))
    val predictions = responses.flatMap { objects(it.getJSONArray("predictions")) }
      .filter { !it.isNull("line") && it.optString("line").isNotBlank() }
      .sortedBy { order.indexOf(it.optString("line")).takeIf { index -> index >= 0 } ?: Int.MAX_VALUE }
      .take(8)
    val statuses = responses.mapNotNull { it.optJSONObject("stationStatus") }
    val fetchedAt = responses.map { it.getString("fetchedAt") }
      .maxByOrNull { timestamp(it) ?: Long.MIN_VALUE }
    return JSONObject(snapshot.toString()).apply {
      put("predictions", JSONArray(predictions))
      put("fetchedAt", fetchedAt ?: snapshot.opt("fetchedAt"))
      put("generatedAt", Instant.now().toString())
      put("isRefreshing", false)
      if (statuses.any { !it.isNull("isClosed") && !it.optBoolean("isClosed") }) {
        put("isClosed", false)
        put("nextTrainTime", JSONObject.NULL)
      } else if (statuses.size == responses.size && statuses.all { it.optBoolean("isClosed") }) {
        put("isClosed", true)
        val nextTrain = statuses.mapNotNull { it.optJSONObject("nextTrain") }
          .minByOrNull { it.optString("localDate") + "T" + it.optString("time") }
        put("nextTrainTime", nextTrain?.optString("displayTime") ?: JSONObject.NULL)
      }
    }
  }

  fun minutes(prediction: JSONObject): String {
    if (prediction.isNull("minutes")) return "--"
    return prediction.optString("minutes").uppercase(Locale.ROOT).ifBlank { "--" }
  }

  fun timeColor(minutes: String): String = when (minutes) {
    "BRD" -> "#5CB87A"
    "ARR" -> "#E06429"
    "--" -> "#C9C9C4"
    else -> "#E8BD47"
  }

  fun lineColor(line: String): String = when (line) {
    "RD" -> "#C62828"
    "OR" -> "#F28C28"
    "SV" -> "#A7A9AC"
    "BL" -> "#1D62A8"
    "YL" -> "#F6D04D"
    "GR" -> "#228B4E"
    else -> "#C9C9C4"
  }
}
