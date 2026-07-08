import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  metrolensApiBaseUrl,
  metrolensApi,
  MetroStation,
  ServiceIncident,
  TrainPrediction,
} from '../api/metrolensApi';
import { LineBadge } from '../components/LineBadge';
import { PredictionRow } from '../components/PredictionRow';
import {
  LinePreferenceSnapshot,
  readLinePreferences,
  setLinePreference,
} from '../storage/linePreferenceStore';
import {
  getCanonicalStationCode,
  incrementStationUsage,
  readStationUsage,
  StationUsageSnapshot,
} from '../storage/stationUsageStore';
import {
  createStationWidgetPredictions,
  writeStationWidgetSnapshot,
} from '../storage/widgetSnapshotStore';
import { colors, lineColors, shadow } from '../theme';

const DEFAULT_STATION_CODE = 'A01';
const LINE_ORDER = ['RD', 'OR', 'SV', 'BL', 'YL', 'GR'];
const LINE_NAMES: Record<string, string> = {
  RD: 'Red Line',
  OR: 'Orange Line',
  SV: 'Silver Line',
  BL: 'Blue Line',
  YL: 'Yellow Line',
  GR: 'Green Line',
};

type StationGroup = {
  code: string;
  name: string;
  stationCodes: string[];
  lines: string[];
};

export function HomeScreen() {
  const [stations, setStations] = useState<MetroStation[]>([]);
  const [incidents, setIncidents] = useState<ServiceIncident[]>([]);
  const [predictions, setPredictions] = useState<TrainPrediction[]>([]);
  const [selectedStationCode, setSelectedStationCode] = useState(DEFAULT_STATION_CODE);
  const [query, setQuery] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [stationUsage, setStationUsage] = useState<StationUsageSnapshot>({});
  const [linePreferences, setLinePreferences] = useState<LinePreferenceSnapshot>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAlertModalVisible, setIsAlertModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stationGroups = useMemo(() => groupStations(stations), [stations]);

  const selectedStation = useMemo(
    () => stationGroups.find((station) => station.stationCodes.includes(selectedStationCode)) || null,
    [selectedStationCode, stationGroups],
  );

  const preferredLine = useMemo(() => {
    if (!selectedStation) return null;
    return linePreferences[getCanonicalStationCode(selectedStation.stationCodes)] || null;
  }, [linePreferences, selectedStation]);

  const preferredLineOrder = useMemo(() => getPreferredLineOrder(preferredLine), [preferredLine]);

  const selectedStationLines = useMemo(() => {
    const lines = selectedStation?.lines.length
      ? selectedStation.lines
      : predictions.map((prediction) => prediction.line).filter(isPresent);

    return sortLines(unique(lines), preferredLine).slice(0, 6);
  }, [predictions, preferredLine, selectedStation]);

  const filteredStations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return getTopStationGroups(stationGroups, stationUsage, 3);

    return stationGroups
      .filter((station) => {
        const searchText =
          `${station.stationCodes.join(' ')} ${station.name} ${station.lines.join(' ')}`.toLowerCase();
        return searchText.includes(normalizedQuery);
      })
      .slice(0, 3);
  }, [query, stationGroups, stationUsage]);

  const affectedLines = useMemo(() => {
    const lines = new Set<string>();
    incidents.forEach((incident) => {
      incident.linesAffected.forEach((line) => lines.add(line));
    });
    return Array.from(lines).slice(0, 6);
  }, [incidents]);

  const predictionGroups = useMemo(() => {
    const groups = new Map<string, TrainPrediction[]>();

    predictions.forEach((prediction) => {
      const line = prediction.line || '--';
      const linePredictions = groups.get(line);
      if (linePredictions) {
        linePredictions.push(prediction);
      } else {
        groups.set(line, [prediction]);
      }
    });

    return Array.from(groups.entries())
      .sort(([lineA], [lineB]) => compareLines(lineA, lineB, preferredLineOrder))
      .map(([line, linePredictions]) => ({
        line,
        predictions: linePredictions,
      }));
  }, [predictions, preferredLineOrder]);

  const loadHome = useCallback(async (
    stationCodes: string | string[],
    refreshing = false,
    activeLinePreferences: LinePreferenceSnapshot = {},
  ) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const requestedStationCodes = Array.isArray(stationCodes) ? stationCodes : [stationCodes];
      const [stationsResponse, incidentsResponse] = await Promise.all([
        metrolensApi.getStations(),
        metrolensApi.getIncidents(),
      ]);
      const resolvedStationGroups = groupStations(stationsResponse.stations);
      const resolvedStation = resolvedStationGroups.find((station) =>
        station.stationCodes.includes(requestedStationCodes[0]),
      );
      const resolvedStationCodes = resolvedStation?.stationCodes.length
        ? resolvedStation.stationCodes
        : [requestedStationCodes[0]];
      const predictionsResponses = await Promise.all(
        resolvedStationCodes.map((stationCode) => metrolensApi.getPredictions(stationCode)),
      );
      const nextPredictions = predictionsResponses.flatMap((response) => response.predictions);
      const nextUpdatedAt = getLatestFetchedAt(predictionsResponses.map((response) => response.fetchedAt));

      setStations(stationsResponse.stations);
      setIncidents(incidentsResponse.incidents);
      setPredictions(nextPredictions);
      setUpdatedAt(nextUpdatedAt);

      if (resolvedStation) {
        const nextPreferredLine = activeLinePreferences[getCanonicalStationCode(resolvedStation.stationCodes)] || null;
        const nextPreferredLineOrder = getPreferredLineOrder(nextPreferredLine);

        writeStationWidgetSnapshot({
          stationCode: resolvedStation.code,
          stationCodes: resolvedStation.stationCodes,
          stationName: resolvedStation.name,
          lines: sortLines(resolvedStation.lines, nextPreferredLine),
          preferredLineOrder: nextPreferredLineOrder,
          predictions: createStationWidgetPredictions(nextPredictions, nextPreferredLineOrder),
          alertCount: incidentsResponse.incidents.length,
          fetchedAt: nextUpdatedAt,
          generatedAt: new Date().toISOString(),
        });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Metro data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const timeoutId = setTimeout(() => {
      Promise.all([readStationUsage(), readLinePreferences()]).then(([storedUsage, storedLinePreferences]) => {
        if (!isMounted) return;

        const defaultStationCode = getDefaultStationCode(storedUsage);
        setStationUsage(storedUsage);
        setLinePreferences(storedLinePreferences);
        setSelectedStationCode(defaultStationCode);
        loadHome(defaultStationCode, false, storedLinePreferences);
      });
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [loadHome]);

  function selectStation(station: StationGroup) {
    Keyboard.dismiss();
    setSelectedStationCode(station.code);
    setQuery('');
    loadHome(station.stationCodes, false, linePreferences);
    incrementStationUsage(station.stationCodes).then(setStationUsage).catch(() => undefined);
  }

  function selectPreferredLine(line: string) {
    if (!selectedStation) return;

    const nextLinePreferences = {
      ...linePreferences,
      [getCanonicalStationCode(selectedStation.stationCodes)]: line,
    };
    const nextPreferredLineOrder = getPreferredLineOrder(line);

    setLinePreferences(nextLinePreferences);
    setLinePreference(selectedStation.stationCodes, line).catch(() => undefined);

    if (predictions.length === 0) return;

    writeStationWidgetSnapshot({
      stationCode: selectedStation.code,
      stationCodes: selectedStation.stationCodes,
      stationName: selectedStation.name,
      lines: sortLines(selectedStation.lines, line),
      preferredLineOrder: nextPreferredLineOrder,
      predictions: createStationWidgetPredictions(predictions, nextPreferredLineOrder),
      alertCount: incidents.length,
      fetchedAt: updatedAt,
      generatedAt: new Date().toISOString(),
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={colors.brand}
            onRefresh={() => loadHome(selectedStation?.stationCodes || selectedStationCode, true, linePreferences)}
          />
        }
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>MetroLens</Text>
            <Text style={styles.title}>Where are you headed?</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        <View style={styles.searchPanel}>
          <Text style={styles.label}>Station</Text>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            onSubmitEditing={Keyboard.dismiss}
            placeholder="Search station or line"
            placeholderTextColor={colors.inkSubtle}
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />

          <View style={styles.stationResults}>
            {filteredStations.map((station) => (
              <Pressable
                accessibilityRole="button"
                key={station.code}
                onPress={() => selectStation(station)}
                style={({ pressed }) => [
                  styles.stationOption,
                  station.stationCodes.includes(selectedStationCode) && styles.stationOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.stationOptionText}>
                  <Text numberOfLines={1} style={styles.stationName}>
                    {station.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.stationCode}>
                    {formatStationCodes(station.stationCodes)}
                  </Text>
                </View>
                <View style={styles.lineRow}>
                  {station.lines.slice(0, 4).map((line) => (
                    <LineBadge code={line} compact key={`${station.code}-${line}`} />
                  ))}
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.stationCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleGroup}>
              <Text style={styles.cardKicker}>Selected station</Text>
              <Text numberOfLines={2} style={styles.cardTitle}>
                {selectedStation?.name || selectedStationCode}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => loadHome(selectedStation?.stationCodes || selectedStationCode, true, linePreferences)}
              style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </Pressable>
          </View>

          <View style={styles.selectedLineRow}>
            {selectedStationLines.map((line) => (
              <Pressable
                accessibilityLabel={`Prefer ${LINE_NAMES[line] || `${line} Line`}`}
                accessibilityRole="button"
                accessibilityState={{ selected: line === preferredLine }}
                key={line}
                onPress={() => selectPreferredLine(line)}
                style={({ pressed }) => [
                  styles.linePreferenceButton,
                  line === preferredLine && styles.linePreferenceButtonSelected,
                  pressed && styles.pressed,
                ]}
              >
                <LineBadge code={line} />
              </Pressable>
            ))}
          </View>

          {updatedAt ? (
            <Text style={styles.updatedText}>Updated {new Date(updatedAt).toLocaleTimeString()}</Text>
          ) : null}

          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.stateText}>Loading live arrivals</Text>
            </View>
          ) : null}

          {!isLoading && error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Metro data is not connected</Text>
              <Text style={styles.errorCopy}>{error}</Text>
              <Text style={styles.errorHint}>{getApiErrorHint()}</Text>
            </View>
          ) : null}

          {!isLoading && !error && predictions.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>No trains listed right now</Text>
              <Text style={styles.stateText}>Try refreshing or choosing another station.</Text>
            </View>
          ) : null}

          {!isLoading && !error && predictions.length > 0 ? (
            <View style={styles.predictionList}>
              {predictionGroups.map((group) => (
                <View
                  key={group.line}
                  style={[
                    styles.predictionGroup,
                    { borderLeftColor: lineColors[group.line]?.background || colors.border },
                  ]}
                >
                  <View style={styles.predictionGroupHeader}>
                    <LineBadge code={group.line} compact />
                    <Text style={styles.predictionGroupTitle}>
                      {LINE_NAMES[group.line] || `${group.line} Line`}
                    </Text>
                    <Text style={styles.predictionGroupCount}>
                      {group.predictions.length}
                    </Text>
                  </View>

                  <View style={styles.predictionGroupRows}>
                    {group.predictions.map((prediction, index) => (
                      <PredictionRow
                        hasDivider={index > 0}
                        key={`${prediction.locationCode}-${prediction.destinationCode}-${prediction.rawMinutes}-${index}`}
                        prediction={prediction}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityRole={incidents.length > 0 ? 'button' : undefined}
          disabled={incidents.length === 0}
          onPress={() => setIsAlertModalVisible(true)}
          style={({ pressed }) => [styles.statusCard, incidents.length > 0 && pressed && styles.pressed]}
        >
          <View>
            <Text style={styles.cardKicker}>Service snapshot</Text>
            <Text style={styles.statusTitle}>
              {incidents.length === 0 ? 'No active rail alerts' : `${incidents.length} active rail alerts`}
            </Text>
          </View>

          {affectedLines.length > 0 ? (
            <View style={styles.affectedLineRow}>
              {affectedLines.map((line) => (
                <LineBadge code={line} compact key={line} />
              ))}
            </View>
          ) : (
            <Text style={styles.statusCopy}>We will flag line-specific issues here when WMATA reports them.</Text>
          )}

          {incidents[0] ? (
            <Text numberOfLines={3} style={styles.incidentPreview}>
              {incidents[0].description}
            </Text>
          ) : null}
        </Pressable>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsAlertModalVisible(false)}
        transparent
        visible={isAlertModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close service alerts"
            style={StyleSheet.absoluteFill}
            onPress={() => setIsAlertModalVisible(false)}
          />
          <View style={styles.alertModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Text style={styles.modalKicker}>Service alerts</Text>
                <Text style={styles.modalTitle}>{incidents.length} active rail alerts</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsAlertModalVisible(false)}
                style={({ pressed }) => [styles.modalCloseButton, pressed && styles.pressed]}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator
            >
              {incidents.map((incident, index) => (
                <View
                  key={incident.id || `${incident.updatedAt}-${index}`}
                  style={[styles.alertDetail, index > 0 && styles.alertDetailDivider]}
                >
                  <View style={styles.alertDetailHeader}>
                    <Text style={styles.alertDetailType}>{incident.type || 'Rail alert'}</Text>
                    {incident.updatedAt ? (
                      <Text style={styles.alertDetailDate}>
                        {new Date(incident.updatedAt).toLocaleTimeString()}
                      </Text>
                    ) : null}
                  </View>

                  {incident.linesAffected.length > 0 ? (
                    <View style={styles.alertDetailLines}>
                      {incident.linesAffected.map((line) => (
                        <LineBadge code={line} compact key={`${incident.id || index}-${line}`} />
                      ))}
                    </View>
                  ) : null}

                  <Text style={styles.alertDetailDescription}>{incident.description}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function groupStations(stations: MetroStation[]): StationGroup[] {
  const parent = new Map<string, string>();
  const stationByCode = new Map(stations.map((station) => [station.code, station]));
  const nameRootByKey = new Map<string, string>();

  stations.forEach((station) => {
    parent.set(station.code, station.code);
  });

  stations.forEach((station) => {
    const nameKey = normalizeStationName(station.name);
    const nameRoot = nameRootByKey.get(nameKey);
    if (nameRoot) {
      union(parent, station.code, nameRoot);
    } else {
      nameRootByKey.set(nameKey, station.code);
    }

    station.stationTogether.forEach((pairedCode) => {
      if (stationByCode.has(pairedCode)) {
        union(parent, station.code, pairedCode);
      }
    });
  });

  const groups = new Map<string, MetroStation[]>();
  stations.forEach((station) => {
    const root = find(parent, station.code);
    groups.set(root, [...(groups.get(root) || []), station]);
  });

  return Array.from(groups.values())
    .map((group) => {
      const stationCodes = unique(group.flatMap((station) => [station.code, ...station.stationTogether]))
        .filter((code) => stationByCode.has(code))
        .sort();
      const lines = sortLines(unique(group.flatMap((station) => station.lines)));

      return {
        code: stationCodes[0] || group[0].code,
        name: group[0].name,
        stationCodes,
        lines,
      };
    })
    .sort((stationA, stationB) => stationA.name.localeCompare(stationB.name));
}

function getDefaultStationCode(stationUsage: StationUsageSnapshot): string {
  const topStationCode = Object.entries(stationUsage).sort(([, countA], [, countB]) => countB - countA)[0]?.[0];
  return topStationCode || DEFAULT_STATION_CODE;
}

function getTopStationGroups(
  stationGroups: StationGroup[],
  stationUsage: StationUsageSnapshot,
  limit: number,
): StationGroup[] {
  return [...stationGroups]
    .sort((stationA, stationB) => {
      const stationACount = stationUsage[getCanonicalStationCode(stationA.stationCodes)] || 0;
      const stationBCount = stationUsage[getCanonicalStationCode(stationB.stationCodes)] || 0;

      if (stationACount !== stationBCount) return stationBCount - stationACount;
      return stationA.name.localeCompare(stationB.name);
    })
    .slice(0, limit);
}

function find(parent: Map<string, string>, code: string): string {
  const currentParent = parent.get(code) || code;
  if (currentParent === code) return code;

  const root = find(parent, currentParent);
  parent.set(code, root);
  return root;
}

function union(parent: Map<string, string>, codeA: string, codeB: string) {
  const rootA = find(parent, codeA);
  const rootB = find(parent, codeB);
  if (rootA !== rootB) {
    parent.set(rootB, rootA);
  }
}

function normalizeStationName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function sortLines(lines: string[], preferredLine?: string | null): string[] {
  const lineOrder = getPreferredLineOrder(preferredLine);

  return [...lines].sort((lineA, lineB) => compareLines(lineA, lineB, lineOrder));
}

function getPreferredLineOrder(preferredLine?: string | null): string[] {
  if (!preferredLine) return LINE_ORDER;
  return [preferredLine, ...LINE_ORDER.filter((line) => line !== preferredLine)];
}

function compareLines(lineA: string, lineB: string, lineOrder: string[]): number {
  const lineAIndex = lineOrder.indexOf(lineA);
  const lineBIndex = lineOrder.indexOf(lineB);

  if (lineAIndex === -1 && lineBIndex === -1) return lineA.localeCompare(lineB);
  if (lineAIndex === -1) return 1;
  if (lineBIndex === -1) return -1;
  return lineAIndex - lineBIndex;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

function formatStationCodes(stationCodes: string[]): string {
  return stationCodes.join(' / ');
}

function getLatestFetchedAt(fetchedAtValues: string[]): string | null {
  if (fetchedAtValues.length === 0) return null;

  const latestTime = Math.max(...fetchedAtValues.map((fetchedAt) => new Date(fetchedAt).getTime()));
  return Number.isFinite(latestTime) ? new Date(latestTime).toISOString() : fetchedAtValues[0];
}

function getApiErrorHint(): string {
  if (metrolensApiBaseUrl.includes('localhost') || metrolensApiBaseUrl.includes('127.0.0.1')) {
    return 'Start the local API proxy, then pull down to refresh.';
  }

  return 'Check the deployed MetroLens API, then pull down to refresh.';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 32,
    paddingHorizontal: 18,
    paddingTop: 34,
  },
  topBar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  eyebrow: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 38,
    marginTop: 6,
    maxWidth: 280,
  },
  livePill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 34,
    paddingHorizontal: 12,
    ...shadow,
  },
  liveDot: {
    backgroundColor: colors.success,
    borderRadius: 99,
    height: 8,
    marginRight: 7,
    width: 8,
  },
  liveText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  searchPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    ...shadow,
  },
  label: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  searchInput: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  stationResults: {
    gap: 8,
    marginTop: 12,
  },
  stationOption: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  stationOptionSelected: {
    backgroundColor: '#FFF4F2',
    borderColor: '#E4A29D',
  },
  stationOptionText: {
    flex: 1,
    marginRight: 10,
    minWidth: 0,
  },
  stationName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  stationCode: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  lineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'flex-end',
    maxWidth: 160,
  },
  pressed: {
    opacity: 0.7,
  },
  stationCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
    ...shadow,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitleGroup: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  cardKicker: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 31,
    marginTop: 6,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 13,
  },
  refreshButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  selectedLineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  linePreferenceButton: {
    borderColor: 'transparent',
    borderRadius: 999,
    borderWidth: 2,
    padding: 2,
  },
  linePreferenceButtonSelected: {
    borderColor: colors.ink,
  },
  updatedText: {
    color: colors.inkSubtle,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    paddingHorizontal: 18,
  },
  stateTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateText: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FFF4F2',
    borderColor: '#E4A29D',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  errorTitle: {
    color: colors.brandDark,
    fontSize: 16,
    fontWeight: '900',
  },
  errorCopy: {
    color: colors.brandDark,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  errorHint: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  predictionList: {
    gap: 12,
    marginTop: 16,
  },
  predictionGroup: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderLeftWidth: 5,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  predictionGroupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  predictionGroupTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
    marginLeft: 8,
  },
  predictionGroupCount: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  predictionGroupRows: {
    gap: 8,
  },
  statusCard: {
    backgroundColor: colors.ink,
    borderRadius: 8,
    marginTop: 16,
    padding: 16,
  },
  statusTitle: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 27,
    marginTop: 6,
  },
  affectedLineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  statusCopy: {
    color: '#C8D2CB',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  incidentPreview: {
    color: '#E5ECE7',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 32, 0.52)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  alertModal: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    maxHeight: '76%',
    overflow: 'hidden',
    width: '100%',
    ...shadow,
  },
  modalHeader: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalTitleGroup: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  modalKicker: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 27,
    marginTop: 5,
  },
  modalCloseButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  modalCloseText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  alertDetail: {
    paddingVertical: 14,
  },
  alertDetailDivider: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  alertDetailHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alertDetailType: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    marginRight: 10,
  },
  alertDetailDate: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  alertDetailLines: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 10,
  },
  alertDetailDescription: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
});
