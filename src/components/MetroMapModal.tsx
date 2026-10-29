import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { clampMapOffset, mapHeaderHeight, MapStation, metroMap, stationAtPoint, stationForCode } from '../map/metroMap';
import { colors, fonts } from '../theme';
import { LineBadge } from './LineBadge';

type Props = {
  visible: boolean;
  selectedStationCode: string;
  onClose: () => void;
  onSelect: (station: MapStation) => void;
};

export function MetroMapModal(props: Props) {
  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose} presentationStyle="fullScreen">
      {props.visible ? (
        <GestureHandlerRootView style={styles.fill}>
          <SafeAreaProvider>
            <MapContent {...props} />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      ) : null}
    </Modal>
  );
}

function MapContent({ selectedStationCode, onClose, onSelect }: Props) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [focused, setFocused] = useState<MapStation | undefined>(() => stationForCode(selectedStationCode));
  const [imageFailed, setImageFailed] = useState(false);
  const zoom = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const panNeedsRebase = useSharedValue(true);
  const pinching = useSharedValue(false);
  const pinchNeedsRebase = useSharedValue(false);
  const pinchZoom = useSharedValue(1);
  const pinchX = useSharedValue(0);
  const pinchY = useSharedValue(0);
  const fit = viewport.width && viewport.height
    ? Math.min(viewport.width / metroMap.width, viewport.height / metroMap.height) : 0;
  const imageWidth = metroMap.width * fit;
  const mapHeight = metroMap.height * fit;
  const imageHeight = (metroMap.height + mapHeaderHeight) * fit;

  useEffect(() => {
    const center = stationForCode('A01')!;
    const initialZoom = 1.6;
    zoom.value = initialZoom;
    offsetX.value = clampMapOffset(viewport.width / 2 - center.x * fit * initialZoom,
      viewport.width, imageWidth * initialZoom);
    offsetY.value = clampMapOffset(viewport.height / 2 - center.y * fit * initialZoom,
      viewport.height, mapHeight * initialZoom);
  }, [fit, imageWidth, mapHeight, viewport.width, viewport.height, zoom, offsetX, offsetY]);

  const handleTap = useCallback((x: number, y: number, tx: number, ty: number, scale: number) => {
    const station = stationAtPoint(x, y, tx, ty, fit * scale);
    if (station) setFocused(station);
  }, [fit]);

  // Match iOS center-of-touch tracking when Android pointers change during a pinch.
  const pan = Gesture.Pan().averageTouches(true).minDistance(8)
    .onTouchesDown(() => { panNeedsRebase.value = true; })
    .onTouchesUp(() => { panNeedsRebase.value = true; })
    .onStart((event) => {
      panX.value = event.translationX;
      panY.value = event.translationY;
      panNeedsRebase.value = false;
    })
    .onUpdate((event) => {
      const dx = event.translationX - panX.value;
      const dy = event.translationY - panY.value;
      panX.value = event.translationX;
      panY.value = event.translationY;
      if (pinching.value || event.numberOfPointers !== 1) {
        panNeedsRebase.value = true;
        return;
      }
      // Re-anchor after pointer changes; never reuse the drag origin from before a pinch.
      if (panNeedsRebase.value) {
        panNeedsRebase.value = false;
        return;
      }
      offsetX.value = clampMapOffset(offsetX.value + dx, viewport.width, imageWidth * zoom.value);
      offsetY.value = clampMapOffset(offsetY.value + dy, viewport.height, mapHeight * zoom.value);
    });
  const pinch = Gesture.Pinch()
    .onTouchesDown(() => { pinchNeedsRebase.value = true; })
    .onTouchesUp(() => { pinchNeedsRebase.value = true; })
    .onStart((event) => {
      pinching.value = true;
      panNeedsRebase.value = true;
      pinchNeedsRebase.value = false;
      pinchZoom.value = zoom.value / event.scale;
      pinchX.value = (event.focalX - offsetX.value) / zoom.value;
      pinchY.value = (event.focalY - offsetY.value) / zoom.value;
    })
    .onUpdate((event) => {
      if (event.numberOfPointers !== 2) {
        pinchNeedsRebase.value = true;
        return;
      }
      if (pinchNeedsRebase.value) {
        pinchZoom.value = zoom.value / event.scale;
        pinchX.value = (event.focalX - offsetX.value) / zoom.value;
        pinchY.value = (event.focalY - offsetY.value) / zoom.value;
        pinchNeedsRebase.value = false;
        return;
      }
      const next = Math.min(8, Math.max(1, pinchZoom.value * event.scale));
      zoom.value = next;
      offsetX.value = clampMapOffset(event.focalX - pinchX.value * next, viewport.width, imageWidth * next);
      offsetY.value = clampMapOffset(event.focalY - pinchY.value * next, viewport.height, mapHeight * next);
    })
    .onFinalize(() => {
      pinching.value = false;
      panNeedsRebase.value = true;
    });
  const tap = Gesture.Tap().maxDistance(8).onEnd((event, success) => {
    if (success) runOnJS(handleTap)(event.x, event.y, offsetX.value, offsetY.value, zoom.value);
  });
  const canvasStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }, { scale: zoom.value }],
  }));
  const markerStyle = useAnimatedStyle(() => ({
    width: 28 / zoom.value,
    height: 28 / zoom.value,
    borderRadius: 14 / zoom.value,
    borderWidth: 3 / zoom.value,
    marginLeft: -14 / zoom.value,
    marginTop: -14 / zoom.value,
  }));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Metro map</Text>
        <MapTool icon="close" label="Close map" onPress={onClose} />
      </View>
      <View style={styles.viewport} onLayout={({ nativeEvent }) => setViewport(nativeEvent.layout)}>
        {imageFailed ? (
          <View style={styles.error}>
            <Text style={styles.stationName}>Unable to display the map</Text>
            <Pressable onPress={onClose} style={styles.selectButton} accessibilityRole="button">
              <Text style={styles.selectLabel}>Back to stations</Text>
            </Pressable>
          </View>
        ) : fit > 0 ? (
          <GestureDetector gesture={Gesture.Simultaneous(pan, pinch, tap)}>
            <View style={styles.fill} collapsable={false}>
              <Animated.View style={[styles.canvas, { width: imageWidth, height: mapHeight }, canvasStyle]}>
                {/* Override bundled-image dimensions so native layout matches the station overlay. */}
                <Image source={require('../../assets/metro-system-map.png')} resizeMode="contain"
                  style={{ position: 'absolute', top: -mapHeaderHeight * fit, width: imageWidth, height: imageHeight }}
                  accessible={false} onError={() => setImageFailed(true)} />
                {metroMap.stations.map((station) => (
                  <View key={station.code} accessible accessibilityRole="button"
                    accessibilityLabel={`${station.name}, ${station.lines.join(', ')}`}
                    accessibilityState={{ selected: focused?.code === station.code }}
                    accessibilityActions={[{ name: 'activate', label: 'Select station' }]}
                    onAccessibilityTap={() => setFocused(station)}
                    onAccessibilityAction={() => setFocused(station)}
                    style={[styles.accessibleStation, { left: station.x * fit - 12, top: station.y * fit - 12 }]} />
                ))}
                {focused ? (
                  <Animated.View pointerEvents="none" accessible={false}
                    style={[styles.marker, { left: focused.x * fit, top: focused.y * fit }, markerStyle]} />
                ) : null}
              </Animated.View>
            </View>
          </GestureDetector>
        ) : null}
      </View>
      <View style={styles.selection}>
        <View style={styles.selectionDetails} accessibilityLiveRegion="polite">
          <Text numberOfLines={2} style={styles.stationName}>{focused?.name || 'Stations'}</Text>
          <View style={styles.lines}>
            {focused?.lines.map((line) => <LineBadge key={line} code={line} compact />)}
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={focused ? `Show arrivals at ${focused.name}` : 'Show arrivals'}
          disabled={!focused} onPress={() => focused && onSelect(focused)}
          style={({ pressed }) => [styles.selectButton, (!focused || pressed) && styles.dimmed]}>
          <Text style={styles.selectLabel}>Show arrivals</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.surface} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function MapTool({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [styles.tool, pressed && styles.dimmed]}>
      <Ionicons name={icon} size={22} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 18, paddingRight: 10, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  title: { fontSize: 20, color: colors.ink, ...fonts.bold },
  viewport: { flex: 1, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  canvas: { position: 'absolute', left: 0, top: 0, overflow: 'hidden', transformOrigin: [0, 0, 0] },
  marker: { position: 'absolute', borderColor: colors.brand, backgroundColor: 'rgba(179, 38, 30, 0.12)' },
  accessibleStation: { position: 'absolute', width: 24, height: 24 },
  tool: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  selection: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, padding: 16, gap: 12 },
  selectionDetails: { minHeight: 59, gap: 8 },
  stationName: { fontSize: 18, color: colors.ink, ...fonts.bold },
  lines: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  selectButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  selectLabel: { color: colors.surface, fontSize: 15, ...fonts.bold },
  dimmed: { opacity: 0.55 },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
});
