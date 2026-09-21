import { requireOptionalNativeModule } from 'expo';

// Expo Go has no custom widget module; the app still keeps its local snapshot.
const widget = requireOptionalNativeModule<{
  syncSnapshot(snapshot: string): void;
}>('MetroWidget');

export function syncNativeWidget(serializedSnapshot: string): void {
  widget?.syncSnapshot(serializedSnapshot);
}
