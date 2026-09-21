package expo.modules.metrowidget

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class WidgetDataTest {
  private fun station(code: String) = JSONObject().put("stationCode", code)
    .put("stationCodes", JSONArray(listOf(code))).put("stationName", code)
    .put("lines", JSONArray(listOf("OR"))).put("preferredLineOrder", JSONArray(listOf("OR", "RD")))

  private fun snapshot() = station("A01").put("topStations", JSONArray(listOf(station("A01"), station("B01"), station("C01"))))
    .put("predictions", JSONArray()).put("fetchedAt", "2026-09-11T12:00:00.000Z")

  private fun response(line: String, destination: String, status: JSONObject? = null) = JSONObject()
    .put("fetchedAt", "2026-09-11T12:01:00Z")
    .put("predictions", JSONArray(listOf(JSONObject().put("line", line).put("destinationName", destination).put("minutes", 3))))
    .apply { if (status != null) put("stationStatus", status) }

  @Test fun stationRotationWrapsAndHandlesMissingCurrentStation() {
    val snapshot = snapshot()
    assertEquals("B01", WidgetData.nextStation(snapshot)?.getString("stationCode"))
    snapshot.put("stationCode", "C01")
    assertEquals("A01", WidgetData.nextStation(snapshot)?.getString("stationCode"))
    snapshot.put("stationCode", "Z99")
    assertEquals("A01", WidgetData.nextStation(snapshot)?.getString("stationCode"))
    snapshot.put("topStations", JSONArray(listOf(station("A01"), station("A01"))))
    assertNull(WidgetData.nextStation(snapshot))
  }

  @Test fun switchingClearsOldArrivalsAndPreservesTopStations() {
    val original = snapshot().put("isClosed", true).put("nextTrainTime", "5:00 AM")
    val switched = WidgetData.switching(original, station("B01"))
    assertEquals("B01", switched.getString("stationCode"))
    assertEquals(3, switched.getJSONArray("topStations").length())
    assertTrue(switched.isNull("fetchedAt"))
    assertTrue(switched.isNull("nextTrainTime"))
    assertFalse(switched.getBoolean("isClosed"))
    assertEquals("A01", original.getString("stationCode"))
  }

  @Test fun combinesBoardingZonesAndKeepsStablePreferredLineOrder() {
    val first = response("RD", "Glenmont")
    val second = response("OR", "Vienna")
    second.getJSONArray("predictions").put(JSONObject().put("line", "OR").put("destinationName", "New Carrollton").put("minutes", "ARR"))
    second.getJSONArray("predictions").put(JSONObject().put("line", JSONObject.NULL))
    val merged = WidgetData.merge(snapshot(), listOf(first, second))
    assertEquals(listOf("Vienna", "New Carrollton", "Glenmont"), WidgetData.objects(merged.getJSONArray("predictions")).map { it.getString("destinationName") })
    assertEquals("2026-09-11T12:01:00Z", merged.getString("fetchedAt"))
  }

  @Test fun closedStationsUseEarliestNextTrainAcrossZones() {
    fun closed(time: String) = JSONObject().put("isClosed", true).put("nextTrain", JSONObject()
      .put("localDate", "2026-09-12").put("time", time).put("displayTime", time))
    val merged = WidgetData.merge(snapshot(), listOf(response("RD", "A", closed("07:10")), response("OR", "B", closed("07:00"))))
    assertTrue(merged.getBoolean("isClosed"))
    assertEquals("07:00", merged.getString("nextTrainTime"))
  }

  @Test fun openZoneOverridesClosedAndMissingStatusesDoNotInventClosure() {
    val original = snapshot().put("isClosed", true).put("nextTrainTime", "07:00")
    val merged = WidgetData.merge(original, listOf(response("RD", "A", JSONObject().put("isClosed", true)), response("OR", "B", JSONObject().put("isClosed", false))))
    assertFalse(merged.getBoolean("isClosed"))
    assertTrue(merged.isNull("nextTrainTime"))
    val missing = WidgetData.merge(original, listOf(response("RD", "A")))
    assertTrue(missing.getBoolean("isClosed"))
  }

  @Test fun fixedFontRowsNeverExceedAvailableHeight() {
    for (height in listOf(110f, 150f, 170f, 220f, 300f)) {
      for (scale in listOf(1f, 1.3f, 2f)) {
        val reserved = 63 + 22 * scale
        val rowHeight = 13.5f * scale * 1.25f + 4
        val count = WidgetData.rowLimit(height, reserved, rowHeight, false)
        assertTrue(count in 0..5)
        if (height >= reserved) assertTrue(count * rowHeight <= height - reserved)
      }
    }
    assertEquals(5, WidgetData.rowLimit(220f, 85f, 21f, false))
    assertEquals(2, WidgetData.rowLimit(220f, 85f, 21f, true))
  }

  @Test fun labelsColorsAndAbbreviationsMatchWidgetConventions() {
    assertEquals("BRD", WidgetData.minutes(JSONObject().put("minutes", "brd")))
    assertEquals("3", WidgetData.minutes(JSONObject().put("minutes", 3)))
    assertEquals("--", WidgetData.minutes(JSONObject().put("minutes", JSONObject.NULL)))
    assertEquals("#5CB87A", WidgetData.timeColor("BRD"))
    assertEquals("#E06429", WidgetData.timeColor("ARR"))
    assertEquals("#E8BD47", WidgetData.timeColor("3"))
    assertEquals("DCA Airport", StationNames.displayName("Ronald Reagan Washington National Airport"))
    assertEquals("Metro Center", StationNames.displayName("Metro Center"))
    assertNotNull(WidgetData.timestamp("2026-09-11T12:00:00.123Z"))
    assertNotNull(WidgetData.timestamp("2026-09-11T12:00:00Z"))
    assertNull(WidgetData.timestamp("invalid"))
  }
}
