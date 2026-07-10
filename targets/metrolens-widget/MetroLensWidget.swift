import AppIntents
import Foundation
import SwiftUI
import WidgetKit

private let appGroupIdentifier = "group.app.metrolens.mobile"
private let snapshotKey = "stationWidgetSnapshot"
private let widgetKind = "MetroLensWidget"
private let widgetApiBaseURL = "https://metrolens-api.wmata.workers.dev"

private enum WidgetFont {
    static func medium(_ size: CGFloat) -> Font {
        .custom("HelveticaNeue-Medium", size: size)
    }

    static func bold(_ size: CGFloat) -> Font {
        .custom("HelveticaNeue-Bold", size: size)
    }
}

private enum WidgetDateParser {
    private static let fractionalFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let standardFormatter = ISO8601DateFormatter()

    static func date(from value: String) -> Date? {
        fractionalFormatter.date(from: value) ?? standardFormatter.date(from: value)
    }

    static func string(from date: Date) -> String {
        fractionalFormatter.string(from: date)
    }
}

private enum StationNameFormatter {
    private static let abbreviations = [
        "Addison Road-Seat Pleasant": "Addison Rd",
        "Brookland-CUA": "Brookland",
        "College Park-U of Md": "College Park",
        "Downtown Largo": "Largo",
        "Fort Totten": "Ft Totten",
        "Franconia-Springfield": "Franconia",
        "L'Enfant Plaza": "L'Enfant",
        "Minnesota Ave": "Minnesota",
        "Mt Vernon Sq 7th St-Convention Center": "Mt Vernon Sq",
        "NoMa-Gallaudet U": "NoMa",
        "Potomac Ave": "Potomac",
        "Rhode Island Ave-Brentwood": "Rhode Island",
        "Ronald Reagan Washington National Airport": "DCA Airport",
        "Southern Ave": "Southern",
        "U St/African-Amer Civil War Memorial/Cardozo": "U St",
        "Van Dorn Street": "Van Dorn",
        "Vienna/Fairfax-GMU": "Vienna",
        "Virginia Sq-GMU": "Virginia Sq",
        "West Falls Church-VT/UVA": "West Falls Church",
        "Wiehle-Reston East": "Wiehle-Reston",
        "Woodley Park-Zoo/Adams Morgan": "Woodley Park"
    ]

    static func displayName(_ stationName: String) -> String {
        abbreviations[stationName] ?? stationName
    }
}

struct WidgetPrediction: Codable, Hashable {
    let destinationName: String
    let line: String?
    let minutes: PredictionMinutes?
    let rawMinutes: String?
}

enum PredictionMinutes: Codable, Hashable {
    case number(Int)
    case text(String)

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let number = try? container.decode(Int.self) {
            self = .number(number)
            return
        }

        if let text = try? container.decode(String.self) {
            self = .text(text)
            return
        }

        self = .text("--")
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch self {
        case .number(let value):
            try container.encode(value)
        case .text(let value):
            try container.encode(value)
        }
    }

    var label: String {
        switch self {
        case .number(let value):
            return "\(value)"
        case .text(let value):
            if value == "ARR" {
                return "Arr"
            }
            if value == "BRD" {
                return "Board"
            }
            return value.isEmpty ? "--" : value
        }
    }
}

struct StationWidgetSnapshot: Codable {
    let stationCode: String
    let stationCodes: [String]
    let stationName: String
    let lines: [String]
    let preferredLineOrder: [String]?
    let predictions: [WidgetPrediction]
    let alertCount: Int
    let fetchedAt: String?
    let generatedAt: String
    let isRefreshing: Bool?
}

private struct PredictionsResponse: Decodable {
    let predictions: [WidgetPrediction]
    let fetchedAt: String
}

private struct IncidentsResponse: Decodable {
    let incidents: [IncidentPlaceholder]
}

private struct IncidentPlaceholder: Decodable {}

private enum WidgetSnapshotStore {
    static func load() -> StationWidgetSnapshot? {
        guard
            let defaults = UserDefaults(suiteName: appGroupIdentifier),
            let snapshotJson = defaults.string(forKey: snapshotKey),
            let snapshotData = snapshotJson.data(using: .utf8)
        else {
            return nil
        }

        return try? JSONDecoder().decode(StationWidgetSnapshot.self, from: snapshotData)
    }

    static func save(_ snapshot: StationWidgetSnapshot) throws {
        let snapshotData = try JSONEncoder().encode(snapshot)
        guard let snapshotJson = String(data: snapshotData, encoding: .utf8) else {
            throw CocoaError(.fileWriteUnknown)
        }

        UserDefaults(suiteName: appGroupIdentifier)?.set(snapshotJson, forKey: snapshotKey)
    }
}

private enum MetroLensWidgetRefreshService {
    static func refresh(_ snapshot: StationWidgetSnapshot) async throws -> StationWidgetSnapshot {
        let stationCodes = snapshot.stationCodes.isEmpty ? [snapshot.stationCode] : snapshot.stationCodes
        let predictionResponses = try await fetchPredictionResponses(stationCodes: stationCodes)
        let incidentCount = (try? await fetchIncidents().incidents.count) ?? snapshot.alertCount
        let predictions = sortPredictions(
            predictionResponses
            .flatMap(\.predictions)
            .filter { prediction in
                guard let line = prediction.line else { return false }
                return !line.isEmpty
            },
            preferredLineOrder: snapshot.preferredLineOrder ?? []
        )
            .prefix(8)

        return StationWidgetSnapshot(
            stationCode: snapshot.stationCode,
            stationCodes: snapshot.stationCodes,
            stationName: snapshot.stationName,
            lines: snapshot.lines,
            preferredLineOrder: snapshot.preferredLineOrder,
            predictions: Array(predictions),
            alertCount: incidentCount,
            fetchedAt: latestFetchedAt(predictionResponses.map(\.fetchedAt)) ?? snapshot.fetchedAt,
            generatedAt: WidgetDateParser.string(from: Date()),
            isRefreshing: false
        )
    }

    private static func fetchPredictionResponses(stationCodes: [String]) async throws -> [PredictionsResponse] {
        var responses: [PredictionsResponse] = []

        for stationCode in stationCodes {
            responses.append(try await fetchPredictions(stationCode: stationCode))
        }

        return responses
    }

    private static func fetchPredictions(stationCode: String) async throws -> PredictionsResponse {
        let normalizedCode = stationCode.uppercased()
        let escapedCode = normalizedCode.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? normalizedCode
        return try await request("/v1/stations/\(escapedCode)/predictions")
    }

    private static func fetchIncidents() async throws -> IncidentsResponse {
        try await request("/v1/incidents")
    }

    private static func request<T: Decodable>(_ path: String) async throws -> T {
        guard let url = URL(string: "\(widgetApiBaseURL)\(path)") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200..<300).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        return try JSONDecoder().decode(T.self, from: data)
    }

    private static func latestFetchedAt(_ values: [String]) -> String? {
        return values
            .compactMap { value -> (String, Date)? in
                guard let date = WidgetDateParser.date(from: value) else { return nil }
                return (value, date)
            }
            .max { left, right in left.1 < right.1 }?
            .0
    }

    private static func sortPredictions(
        _ predictions: [WidgetPrediction],
        preferredLineOrder: [String]
    ) -> [WidgetPrediction] {
        predictions
            .enumerated()
            .sorted { left, right in
                let leftLineIndex = lineIndex(left.element.line, preferredLineOrder: preferredLineOrder)
                let rightLineIndex = lineIndex(right.element.line, preferredLineOrder: preferredLineOrder)

                if leftLineIndex == rightLineIndex {
                    return left.offset < right.offset
                }

                return leftLineIndex < rightLineIndex
            }
            .map { $0.element }
    }

    private static func lineIndex(_ line: String?, preferredLineOrder: [String]) -> Int {
        guard let line else {
            return Int.max
        }

        return preferredLineOrder.firstIndex(of: line) ?? Int.max
    }
}

@available(iOSApplicationExtension 17.0, *)
struct RefreshMetroLensWidgetIntent: AppIntent {
    static var title: LocalizedStringResource = "Refresh DC Metro Mate"
    static var description = IntentDescription("Refreshes DC Metro Mate arrivals.")
    static var openAppWhenRun = false

    func perform() async -> some IntentResult {
        defer {
            WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
        }

        guard let snapshot = WidgetSnapshotStore.load() else {
            return .result()
        }

        try? WidgetSnapshotStore.save(snapshot.withRefreshState(true))
        WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)

        if let refreshedSnapshot = try? await MetroLensWidgetRefreshService.refresh(snapshot) {
            try? WidgetSnapshotStore.save(refreshedSnapshot)
        } else {
            try? WidgetSnapshotStore.save(snapshot.withRefreshState(false))
        }

        return .result()
    }
}

struct MetroLensEntry: TimelineEntry {
    let date: Date
    let snapshot: StationWidgetSnapshot?
}

struct MetroLensProvider: TimelineProvider {
    func placeholder(in context: Context) -> MetroLensEntry {
        MetroLensEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (MetroLensEntry) -> Void) {
        completion(MetroLensEntry(date: Date(), snapshot: loadSnapshot() ?? .placeholder))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MetroLensEntry>) -> Void) {
        let entry = MetroLensEntry(date: Date(), snapshot: loadSnapshot())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func loadSnapshot() -> StationWidgetSnapshot? {
        WidgetSnapshotStore.load()
    }
}

struct MetroLensWidgetView: View {
    @Environment(\.widgetFamily) private var family

    let entry: MetroLensEntry

    var body: some View {
        widgetContent
    }

    @ViewBuilder
    private var widgetContent: some View {
        switch family {
        case .accessoryInline:
            accessoryInlineContent
        case .accessoryCircular:
            accessoryCircularContent
        case .accessoryRectangular:
            accessoryRectangularContent
        default:
            if #available(iOSApplicationExtension 17.0, *) {
                homeScreenContent
                    .containerBackground(widgetBackground, for: .widget)
            } else {
                homeScreenContent
                    .background(widgetBackground)
            }
        }
    }

    private var homeScreenContent: some View {
        ZStack {
            widgetBackground
            if let snapshot = entry.snapshot {
                homeScreenContent(snapshot)
            } else {
                emptyState
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func homeScreenContent(_ snapshot: StationWidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: contentSpacing) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(displayStationName(snapshot))
                    .font(WidgetFont.medium(titleSize))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .truncationMode(.tail)

                Spacer(minLength: 4)

                HStack(spacing: 5) {
                    Text(ageLabel(snapshot))
                        .font(WidgetFont.medium(ageSize))
                        .foregroundColor(secondaryText)
                        .lineLimit(1)
                    refreshControl(snapshot)
                }
            }

            VStack(spacing: rowSpacing) {
                ForEach(Array(snapshot.predictions.prefix(predictionLimit).enumerated()), id: \.offset) { _, prediction in
                    predictionRow(prediction)
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, horizontalPadding)
        .padding(.vertical, verticalPadding)
    }

    @ViewBuilder
    private var accessoryInlineContent: some View {
        if let snapshot = entry.snapshot {
            Text(inlineAccessoryLabel(snapshot))
                .font(WidgetFont.medium(12))
        } else {
            Text("DC Metro Mate")
                .font(WidgetFont.medium(12))
        }
    }

    @ViewBuilder
    private var accessoryCircularContent: some View {
        if let prediction = entry.snapshot?.predictions.first {
            VStack(spacing: 2) {
                Circle()
                    .fill(lineBackground(prediction.line ?? "--"))
                    .frame(width: 12, height: 12)
                Text(prediction.minutes?.label ?? "--")
                    .font(WidgetFont.bold(18))
                    .monospacedDigit()
                    .minimumScaleFactor(0.72)
                    .lineLimit(1)
            }
            .widgetAccentable()
        } else {
            Image(systemName: "tram.fill")
                .font(.system(size: 20, weight: .semibold))
                .widgetAccentable()
        }
    }

    @ViewBuilder
    private var accessoryRectangularContent: some View {
        if let snapshot = entry.snapshot {
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(displayStationName(snapshot))
                        .font(WidgetFont.bold(13))
                        .lineLimit(1)
                        .truncationMode(.tail)

                    Spacer(minLength: 2)

                    Text(ageLabel(snapshot))
                        .font(WidgetFont.medium(10))
                        .monospacedDigit()
                        .lineLimit(1)

                    accessoryRefreshControl(snapshot)
                }

                ForEach(Array(snapshot.predictions.prefix(2).enumerated()), id: \.offset) { _, prediction in
                    HStack(spacing: 4) {
                        Text(prediction.line ?? "--")
                            .font(WidgetFont.bold(11))
                            .monospaced()
                        Text(prediction.destinationName)
                            .lineLimit(1)
                        Spacer(minLength: 2)
                        Text(prediction.minutes?.label ?? "--")
                            .monospacedDigit()
                    }
                    .font(WidgetFont.medium(12))
                }
            }
            .widgetAccentable()
        } else {
            VStack(alignment: .leading, spacing: 2) {
                Text("DC Metro Mate")
                    .font(WidgetFont.bold(13))
                Text("Open app to choose station")
                    .font(WidgetFont.medium(12))
                    .lineLimit(1)
            }
            .widgetAccentable()
        }
    }

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("DC Metro Mate")
                .font(WidgetFont.medium(18))
                .foregroundColor(.white)
            Text("Open the app and select a station.")
                .font(WidgetFont.medium(13))
                .foregroundColor(secondaryText)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(.horizontal, 11)
        .padding(.vertical, 10)
    }

    private var predictionLimit: Int {
        family == .systemMedium ? 4 : 5
    }

    private var contentSpacing: CGFloat {
        family == .systemMedium ? 8 : 5
    }

    private var titleSize: CGFloat {
        family == .systemMedium ? 19 : 16
    }

    private var ageSize: CGFloat {
        family == .systemMedium ? 13 : 11
    }

    private var refreshIconSize: CGFloat {
        family == .systemMedium ? 17 : 14
    }

    private var rowSpacing: CGFloat {
        family == .systemMedium ? 8 : 3
    }

    private var rowTextSize: CGFloat {
        family == .systemMedium ? 17 : 13
    }

    private var minuteTextSize: CGFloat {
        family == .systemMedium ? 17 : 13
    }

    private var dotSize: CGFloat {
        family == .systemMedium ? 16 : 12
    }

    private var horizontalPadding: CGFloat {
        family == .systemMedium ? 11 : 9
    }

    private var verticalPadding: CGFloat {
        family == .systemMedium ? 10 : 8
    }

    private var widgetBackground: Color {
        Color(red: 0.128, green: 0.122, blue: 0.112)
    }

    private var secondaryText: Color {
        Color(red: 0.79, green: 0.79, blue: 0.77)
    }

    @ViewBuilder
    private func refreshControl(_ snapshot: StationWidgetSnapshot) -> some View {
        if snapshot.isRefreshing == true {
            ProgressView()
                .progressViewStyle(.circular)
                .controlSize(.small)
                .tint(secondaryText)
                .frame(width: refreshIconSize, height: refreshIconSize)
                .accessibilityLabel("Refreshing arrivals")
        } else {
            Button(intent: RefreshMetroLensWidgetIntent()) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: refreshIconSize, weight: .semibold))
                    .foregroundColor(secondaryText)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Refresh arrivals")
        }
    }

    @ViewBuilder
    private func accessoryRefreshControl(_ snapshot: StationWidgetSnapshot) -> some View {
        if snapshot.isRefreshing == true {
            ProgressView()
                .progressViewStyle(.circular)
                .controlSize(.small)
                .frame(width: 10, height: 10)
                .accessibilityLabel("Refreshing arrivals")
        } else {
            Button(intent: RefreshMetroLensWidgetIntent()) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 10, weight: .semibold))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Refresh arrivals")
        }
    }

    private func predictionRow(_ prediction: WidgetPrediction) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: family == .systemMedium ? 9 : 7) {
            Circle()
                .fill(lineBackground(prediction.line ?? "--"))
                .frame(width: dotSize, height: dotSize)
                .alignmentGuide(.firstTextBaseline) { context in
                    context[VerticalAlignment.center]
                }

            Text(prediction.destinationName)
                .font(WidgetFont.medium(rowTextSize))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.56)
                .truncationMode(.tail)

            Spacer(minLength: 3)

            Text(prediction.minutes?.label ?? "--")
                .font(WidgetFont.medium(minuteTextSize))
                .foregroundColor(.white)
                .monospacedDigit()
                .lineLimit(1)
        }
        .frame(minHeight: family == .systemMedium ? 21 : 16)
    }

    private func ageLabel(_ snapshot: StationWidgetSnapshot) -> String {
        let timestamp = snapshot.fetchedAt ?? snapshot.generatedAt
        guard let date = WidgetDateParser.date(from: timestamp) else { return "--" }

        let seconds = max(Int(Date().timeIntervalSince(date)), 0)
        if seconds < 60 {
            return "\(seconds) sec"
        }

        let minutes = seconds / 60
        if minutes < 60 {
            return "\(minutes) min"
        }

        return "\(minutes / 60) hr"
    }

    private func inlineAccessoryLabel(_ snapshot: StationWidgetSnapshot) -> String {
        let stationName = displayStationName(snapshot)
        let predictions = snapshot.predictions.prefix(2).map { prediction in
            "\(prediction.line ?? "--") \(prediction.minutes?.label ?? "--")"
        }

        if predictions.isEmpty {
            return "\(stationName): no trains - \(ageLabel(snapshot))"
        }

        return "\(stationName): \(predictions.joined(separator: ", ")) - \(ageLabel(snapshot))"
    }

    private func displayStationName(_ snapshot: StationWidgetSnapshot) -> String {
        StationNameFormatter.displayName(snapshot.stationName)
    }

    private func lineBackground(_ line: String) -> Color {
        switch line {
        case "RD": return Color(red: 0.776, green: 0.157, blue: 0.157)
        case "OR": return Color(red: 0.949, green: 0.549, blue: 0.157)
        case "SV": return Color(red: 0.655, green: 0.663, blue: 0.675)
        case "BL": return Color(red: 0.114, green: 0.384, blue: 0.659)
        case "YL": return Color(red: 0.965, green: 0.816, blue: 0.302)
        case "GR": return Color(red: 0.133, green: 0.545, blue: 0.306)
        default: return Color(red: 0.933, green: 0.949, blue: 0.941)
        }
    }
}

@main
struct MetroLensWidget: Widget {
    let kind = widgetKind

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MetroLensProvider()) { entry in
            MetroLensWidgetView(entry: entry)
        }
        .configurationDisplayName("DC Metro Mate Station")
        .description("Shows the latest arrivals for your selected Metro station.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryInline, .accessoryCircular, .accessoryRectangular])
        .contentMarginsDisabled()
    }
}

private extension StationWidgetSnapshot {
    static let placeholder = StationWidgetSnapshot(
        stationCode: "A01",
        stationCodes: ["A01", "C01"],
        stationName: "Metro Center",
        lines: ["RD", "BL", "OR", "SV"],
        preferredLineOrder: ["RD", "OR", "SV", "BL", "YL", "GR"],
        predictions: [
            WidgetPrediction(destinationName: "Glenmont", line: "RD", minutes: .number(3), rawMinutes: "3"),
            WidgetPrediction(destinationName: "Largo", line: "BL", minutes: .number(6), rawMinutes: "6"),
            WidgetPrediction(destinationName: "New Carrollton", line: "OR", minutes: .number(8), rawMinutes: "8"),
        ],
        alertCount: 0,
        fetchedAt: nil,
        generatedAt: WidgetDateParser.string(from: Date()),
        isRefreshing: false
    )
}

private extension StationWidgetSnapshot {
    func withRefreshState(_ isRefreshing: Bool) -> StationWidgetSnapshot {
        StationWidgetSnapshot(
            stationCode: stationCode,
            stationCodes: stationCodes,
            stationName: stationName,
            lines: lines,
            preferredLineOrder: preferredLineOrder,
            predictions: predictions,
            alertCount: alertCount,
            fetchedAt: fetchedAt,
            generatedAt: generatedAt,
            isRefreshing: isRefreshing
        )
    }
}
