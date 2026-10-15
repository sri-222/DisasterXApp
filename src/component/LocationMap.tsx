import React, { useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors } from '../theme';

// A small street map centred on the person, built from OpenStreetMap tiles so
// it needs no API key and no extra native module. With no internet the tiles
// simply don't load and the red pin still shows on a plain background.

const TILE = 256;
const ZOOM = 16;
const TILE_URL = 'https://tile.openstreetmap.org';
// OSM's tile policy asks apps to identify themselves.
const TILE_HEADERS = { 'User-Agent': 'DisasterXApp/1.0 (disaster relief app)' };

export function tilePosition(latitude: number, longitude: number, zoom = ZOOM) {
  const n = 2 ** zoom;
  const latRad = (latitude * Math.PI) / 180;
  const x = ((longitude + 180) / 360) * n;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x: x * TILE, y: y * TILE };
}

// Which tiles cover a width x height box centred on the point, and where each
// one sits inside the box.
export function tilesFor(latitude: number, longitude: number, width: number, height: number, zoom = ZOOM) {
  const center = tilePosition(latitude, longitude, zoom);
  const left = center.x - width / 2;
  const top = center.y - height / 2;
  const tiles: { key: string; uri: string; left: number; top: number }[] = [];
  const max = 2 ** zoom;
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
      if (ty < 0 || ty >= max) continue;
      const wrappedX = ((tx % max) + max) % max;
      tiles.push({
        key: `${tx}/${ty}`,
        uri: `${TILE_URL}/${zoom}/${wrappedX}/${ty}.png`,
        left: tx * TILE - left,
        top: ty * TILE - top,
      });
    }
  }
  return tiles;
}

interface Props {
  latitude: number | null;
  longitude: number | null;
  height?: number;
}

const LocationMap: React.FC<Props> = ({ latitude, longitude, height = 170 }) => {
  const [width, setWidth] = useState(0);
  const hasFix = latitude != null && longitude != null;
  const tiles = hasFix && width > 0 ? tilesFor(latitude, longitude, width, height) : [];

  return (
    <View
      style={[styles.map, { height }]}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
    >
      {tiles.map(tile => (
        <Image
          key={tile.key}
          source={{ uri: tile.uri, headers: TILE_HEADERS }}
          style={[styles.tile, { left: tile.left, top: tile.top }]}
        />
      ))}

      {/* Red pin with its tip on the exact spot. */}
      <View pointerEvents="none" style={styles.pinLayer}>
        <View style={styles.pulse} />
        <View style={styles.pinIcon}>
          <MapPin size={38} color={colors.white} fill={colors.danger} strokeWidth={1.5} />
        </View>
      </View>

      {!hasFix && <Text style={styles.waiting}>Finding your location…</Text>}
      {tiles.length > 0 && <Text style={styles.credit}>© OpenStreetMap contributors</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  map: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: colors.dangerLight,
  },
  tile: {
    position: 'absolute',
    width: TILE,
    height: TILE,
  },
  pinLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(198, 40, 40, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(198, 40, 40, 0.5)',
  },
  pinIcon: {
    // Lift the icon so its point, not its middle, sits on the location.
    marginBottom: 34,
  },
  waiting: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    color: colors.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  credit: {
    position: 'absolute',
    right: 6,
    bottom: 4,
    fontSize: 9,
    color: '#333',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
  },
});

export default LocationMap;
