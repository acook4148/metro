import { ExtensionStorage } from '@bacons/apple-targets';

const extensionStorage = new ExtensionStorage('group.app.metrolens.mobile');

export function syncNativeWidget(serializedSnapshot: string): void {
  extensionStorage.set('stationWidgetSnapshot', serializedSnapshot);
  ExtensionStorage.reloadWidget('MetroLensWidget');
}
