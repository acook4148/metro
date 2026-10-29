const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const file = path.resolve(__dirname, '../src/map/metroMap.ts');
const code = ts.transpileModule(readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const exportsObject = {};
vm.runInNewContext(code, { exports: exportsObject, require: createRequire(file) });
const { metroMap, mapHeaderHeight, stationAtPoint, stationForCode, clampMapOffset } = exportsObject;

test('98 station targets cover 102 unique boarding-zone codes', () => {
  assert.equal(metroMap.stations.length, 98);
  const codes = metroMap.stations.flatMap((station) => station.stationCodes);
  assert.equal(codes.length, 102);
  assert.equal(new Set(codes).size, 102);
  for (const station of metroMap.stations) {
    assert(station.stationCodes.includes(station.code));
    assert(station.x > 0 && station.x < metroMap.width);
    assert(station.y > 0 && station.y < metroMap.height);
    assert(station.lines.length > 0);
  }
});

test('transfer aliases resolve to a single station marker', () => {
  for (const [first, second] of [['A01', 'C01'], ['B01', 'F01'], ['B06', 'E06'], ['D03', 'F03']]) {
    assert.equal(stationForCode(first), stationForCode(second));
  }
  assert.equal(stationForCode('UNKNOWN'), undefined);
});

test('cropped station targets preserve their positions relative to the image', () => {
  const source = require('../src/map/metroMapData.json');
  assert.equal(metroMap.height, source.height - mapHeaderHeight);
  for (const original of source.stations) {
    const displayed = stationForCode(original.code);
    assert.equal(displayed.x, original.x);
    assert.equal(displayed.y + mapHeaderHeight, original.y);
  }
});

test('every station can be selected after zooming and panning', () => {
  for (const scale of [0.25, 0.36, 0.8, 1.6, 2.8]) {
    for (const [offsetX, offsetY] of [[0, 0], [-385, -450], [20, 80]]) {
      for (const station of metroMap.stations) {
        assert.equal(stationAtPoint(station.x * scale + offsetX, station.y * scale + offsetY,
          offsetX, offsetY, scale)?.code, station.code);
      }
    }
  }
});

test('empty map space does not select a station', () => {
  assert.equal(stationAtPoint(0, 0, 0, 0, 1), undefined);
  assert.equal(stationAtPoint(5000, 5000, 0, 0, 1), undefined);
  assert.equal(stationAtPoint(0, 0, 0, 0, 0), undefined);
});

test('pan bounds center small maps and prevent losing zoomed maps', () => {
  assert.equal(clampMapOffset(-500, 400, 300), 50);
  assert.equal(clampMapOffset(500, 400, 800), 0);
  assert.equal(clampMapOffset(-500, 400, 800), -400);
  assert.equal(clampMapOffset(-100, 400, 800), -100);
});

test('bundled map has the coordinate dataset aspect ratio', () => {
  const png = readFileSync(path.resolve(__dirname, '../assets/metro-system-map.png'));
  assert.equal(png.readUInt32BE(16) / png.readUInt32BE(20), metroMap.width / (metroMap.height + mapHeaderHeight));
});

test('map image explicitly overrides native asset dimensions with the overlay dimensions', () => {
  const component = ts.createSourceFile('MetroMapModal.tsx',
    readFileSync(path.resolve(__dirname, '../src/components/MetroMapModal.tsx'), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let imageStyle;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(component) === 'Image') {
      imageStyle = node.attributes.properties.find((attribute) =>
        ts.isJsxAttribute(attribute) && attribute.name.getText(component) === 'style')?.initializer?.expression;
    }
    ts.forEachChild(node, visit);
  }
  visit(component);
  assert(imageStyle && ts.isObjectLiteralExpression(imageStyle));
  const dimensions = Object.fromEntries(imageStyle.properties
    .filter(ts.isPropertyAssignment)
    .map((property) => [property.name.getText(component), property.initializer.getText(component)]));
  assert.equal(dimensions.width, 'imageWidth');
  assert.equal(dimensions.height, 'imageHeight');
});

// Exercise the real gesture callbacks without a native UI runtime.
function mapGestureHarness() {
  const gestures = {};
  const animatedStyles = [];
  const gesture = (name) => {
    const callbacks = {};
    const builder = new Proxy({}, { get: (_, method) => (value) => {
      if (method.startsWith('on')) callbacks[method] = value;
      return builder;
    } });
    gestures[name] = callbacks;
    return builder;
  };
  const jsx = (type, props) => ({ type, props });
  const stubs = {
    react: {
      useState: (initial) => [typeof initial === 'function' ? initial()
        : initial?.width === 0 ? { width: 390, height: 640 } : initial, () => {}],
      useEffect: (callback) => callback(),
      useCallback: (callback) => callback,
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { StyleSheet: { create: (styles) => styles }, Modal: 'Modal' },
    'react-native-gesture-handler': { Gesture: {
      Pan: () => gesture('pan'), Pinch: () => gesture('pinch'), Tap: () => gesture('tap'),
      Simultaneous: () => ({}),
    } },
    'react-native-reanimated': {
      useSharedValue: (value) => ({ value }),
      useAnimatedStyle: (callback) => { animatedStyles.push(callback); return {}; },
      runOnJS: (callback) => callback,
    },
    '../map/metroMap': exportsObject,
    '../theme': { colors: {}, fonts: {} },
  };
  const componentPath = path.resolve(__dirname, '../src/components/MetroMapModal.tsx');
  const compiled = ts.transpileModule(readFileSync(componentPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const component = {};
  vm.runInNewContext(compiled, { exports: component, require: (name) => stubs[name] || {} });
  const modal = component.MetroMapModal({ visible: true, selectedStationCode: 'A01' });
  const content = modal.props.children.props.children.props.children;
  content.type(content.props);
  return { ...gestures, position: () => JSON.parse(JSON.stringify(animatedStyles[0]())) };
}

test('lifting a pinch finger preserves the map and continued dragging uses the new position', () => {
  const { pan, pinch, position } = mapGestureHarness();
  pan.onStart({ translationX: 8, translationY: 0 });
  pinch.onStart({ focalX: 195, focalY: 320, scale: 1 });
  pinch.onUpdate({ focalX: 180, focalY: 300, scale: 2, numberOfPointers: 2 });
  const zoomed = position();
  pan.onUpdate({ translationX: 140, translationY: 100, numberOfPointers: 2 });
  pinch.onTouchesUp();
  pinch.onUpdate({ focalX: 0, focalY: 0, scale: 2, numberOfPointers: 1 });
  assert.deepEqual(position(), zoomed);
  pinch.onFinalize();
  pan.onTouchesUp();
  pan.onUpdate({ translationX: 200, translationY: 160, numberOfPointers: 1 });
  assert.deepEqual(position(), zoomed);
  pan.onUpdate({ translationX: 205, translationY: 164, numberOfPointers: 1 });
  assert.equal(position().transform[0].translateX, zoomed.transform[0].translateX + 5);
  assert.equal(position().transform[1].translateY, zoomed.transform[1].translateY + 4);
});

test('changing pinch pointers re-anchors without moving the map', () => {
  const { pinch, position } = mapGestureHarness();
  pinch.onStart({ focalX: 195, focalY: 320, scale: 1 });
  pinch.onUpdate({ focalX: 195, focalY: 320, scale: 2, numberOfPointers: 2 });
  const zoomed = position();
  pinch.onTouchesDown();
  pinch.onUpdate({ focalX: 30, focalY: 80, scale: 3, numberOfPointers: 3 });
  pinch.onTouchesUp();
  pinch.onUpdate({ focalX: 160, focalY: 260, scale: 3, numberOfPointers: 2 });
  assert.deepEqual(position(), zoomed);
  pinch.onFinalize();
  assert.deepEqual(position(), zoomed);
});
