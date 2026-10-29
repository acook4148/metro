# Metro Map Asset

Source: https://www.wmata.com/content/dam/wmata-com/maps/system-map-rail.pdf

Retrieved September 21, 2026 from https://www.wmata.com/ride/maps.html.
The published map carries WMATA's 2025 copyright notice. It includes Potomac Yard,
the Silver Line extension, and the current alternating-service branches shown in its legend.

`metro-system-map.png` is a full-page, unaltered 2.5x raster rendering of the
1080 x 1312 point PDF. It retains the map's legend, branding, and copyright notice.
The map is bundled locally; displaying or navigating it makes no network requests.
The app clips the top 260 PDF points (legend and separator) from its visible canvas;
the bundled file remains unchanged. This cropped presentation also needs to be
covered by the applicable map-use permission before distribution.

`src/map/metroMapData.json` stores the 98 station marker centers in PDF coordinates,
their names, and all 102 boarding-zone codes. Circle centers were extracted from
the PDF vector geometry and the station/code assignments visually verified. These
are diagram coordinates, not latitude/longitude. `metroMap.ts` subtracts the clipped
header height for rendering and hit testing. Selection is a separate UI overlay.

WMATA's map-use terms: https://www.wmata.com/about/developers/use-of-metro-intellectual-property-developers.html

This asset is copyrighted, not an open-source map. WMATA describes a permission/license
process for using its map and prohibits altering the artwork. Permission has not been
verified in this repository; confirm the applicable permission before distributing
the bundled artwork. Inclusion here does not assert a license or WMATA endorsement.

When updating the map, replace the image and marker data together, verify every station
and transfer code against the station API, run the map tests, and visually review the
targets. The UI does not hotlink the PDF, so a remote map update cannot silently move
the image underneath existing tap targets.
