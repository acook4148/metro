import { StyleSheet, Text, View } from 'react-native';

import { TrainPrediction } from '../api/metrolensApi';
import { colors, fonts } from '../theme';
import { LineBadge } from './LineBadge';

type PredictionRowProps = {
  prediction: TrainPrediction;
  hasDivider?: boolean;
};

export function PredictionRow({ hasDivider = false, prediction }: PredictionRowProps) {
  return (
    <View style={[styles.row, hasDivider && styles.rowDivider]}>
      <View style={styles.lineColumn}>
        <LineBadge code={prediction.line} compact />
      </View>

      <View style={styles.destinationColumn}>
        <Text numberOfLines={1} style={styles.destination}>
          {prediction.destinationName}
        </Text>
      </View>

      <View style={styles.timeColumn}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.minutes}>
          {formatMinutes(prediction.minutes)}
        </Text>
      </View>
    </View>
  );
}

function formatMinutes(minutes: TrainPrediction['minutes']): string {
  if (minutes === 'ARR') return 'Arr';
  if (minutes === 'BRD') return 'Board';
  if (typeof minutes === 'number') return `${minutes}m`;
  return '--';
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rowDivider: {
    borderColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  lineColumn: {
    marginRight: 12,
  },
  destinationColumn: {
    flex: 1,
    minWidth: 0,
  },
  destination: {
    color: colors.ink,
    fontSize: 16,
    ...fonts.medium,
    letterSpacing: 0,
  },
  timeColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
    minWidth: 56,
  },
  minutes: {
    color: colors.ink,
    fontSize: 24,
    ...fonts.bold,
    letterSpacing: 0,
  },
});
