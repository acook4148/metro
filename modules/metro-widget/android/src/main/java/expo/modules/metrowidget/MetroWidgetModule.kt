package expo.modules.metrowidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class MetroWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MetroWidget")

    Function("syncSnapshot") { serializedSnapshot: String ->
      val context = appContext.reactContext ?: return@Function
      WidgetStore.saveFromApp(context, JSONObject(serializedSnapshot))
      WidgetRenderer.updateAll(context)
      WidgetRefreshWorker.schedule(context)
    }
  }
}
