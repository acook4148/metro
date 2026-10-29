package expo.modules.metrowidget

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.concurrent.TimeUnit

class WidgetRefreshWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result {
    if (WidgetRenderer.ids(applicationContext).isEmpty()) return Result.success()
    val request = WidgetStore.begin(applicationContext, inputData.getBoolean("next", false), id.toString(), inputData.getString("revision"))
      ?: return Result.success()
    var result: JSONObject? = null
    try {
      WidgetRenderer.updateAll(applicationContext)
      result = runCatching {
        val codes = WidgetData.strings(request.snapshot.optJSONArray("stationCodes"))
          .ifEmpty { listOf(request.snapshot.getString("stationCode")) }.distinct().take(4)
        val responses = codes.map { code ->
          val normalized = code.uppercase(Locale.ROOT)
          require(normalized.matches(Regex("[A-Z][0-9]{2}")))
          fetch("/v1/stations/$normalized/predictions")
        }
        WidgetData.merge(request.snapshot, responses)
      }.getOrNull()
    } finally {
      WidgetStore.finish(applicationContext, request, result)
      WidgetRenderer.updateAll(applicationContext)
    }
    return Result.success()
  }

  private fun fetch(path: String): JSONObject {
    val connection = URL("https://metrolens-api.wmata.workers.dev$path").openConnection() as HttpURLConnection
    try {
      connection.connectTimeout = 8_000
      connection.readTimeout = 8_000
      connection.setRequestProperty("Accept", "application/json")
      require(connection.responseCode in 200..299)
      return connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
    } finally {
      connection.disconnect()
    }
  }

  companion object {
    private const val REFRESH_WORK = "metro-widget-refresh"
    private const val PERIODIC_WORK = "metro-widget-periodic"

    fun enqueue(context: Context, next: Boolean = false) {
      val revision = WidgetStore.read(context)?.revision ?: return
      WorkManager.getInstance(context).enqueueUniqueWork(REFRESH_WORK, ExistingWorkPolicy.KEEP,
        OneTimeWorkRequestBuilder<WidgetRefreshWorker>().setInputData(workDataOf("next" to next, "revision" to revision)).build())
    }

    fun schedule(context: Context) {
      if (WidgetRenderer.ids(context).isEmpty()) return
      val periodic = PeriodicWorkRequestBuilder<WidgetPeriodicWorker>(30, TimeUnit.MINUTES)
        .setInitialDelay(30, TimeUnit.MINUTES)
        .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
        .build()
      WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC_WORK, ExistingPeriodicWorkPolicy.KEEP, periodic)
    }

    fun cancelIfUnused(context: Context) {
      if (WidgetRenderer.ids(context).isNotEmpty()) return
      WorkManager.getInstance(context).apply {
        cancelUniqueWork(PERIODIC_WORK)
        cancelUniqueWork(REFRESH_WORK)
      }
    }
  }
}

// Scheduled and manual updates use the same unique queue, so they cannot race.
class WidgetPeriodicWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result {
    WidgetRefreshWorker.enqueue(applicationContext)
    return Result.success()
  }
}
