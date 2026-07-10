import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, lineColors } from '../theme';

type LineBadgeProps = {
  code: string | null;
  compact?: boolean;
};

export function LineBadge({ code, compact = false }: LineBadgeProps) {
  const normalizedCode = code || '--';
  const lineColor = lineColors[normalizedCode] || {
    background: colors.surfaceMuted,
    foreground: colors.inkMuted,
  };

  return (
    <View
      style={[
        styles.badge,
        compact && styles.compactBadge,
        { backgroundColor: lineColor.background },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          compact && styles.compactLabel,
          { color: lineColor.foreground },
        ]}
      >
        {normalizedCode}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 28,
    minWidth: 38,
    paddingHorizontal: 10,
  },
  compactBadge: {
    minHeight: 24,
    minWidth: 34,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 12,
    ...fonts.bold,
    letterSpacing: 0,
  },
  compactLabel: {
    fontSize: 11,
  },
});
