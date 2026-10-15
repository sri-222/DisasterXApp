import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Rect, Stop } from 'react-native-svg';

export type SkyTone = 'clear' | 'cloudy' | 'rain' | 'storm';

// Top and bottom sky colours for each kind of weather. Always a sky, never black.
const SKY: Record<SkyTone, { top: string; bottom: string; cloud: number }> = {
  clear: { top: '#2F80ED', bottom: '#BFE3FF', cloud: 0.85 },
  cloudy: { top: '#5B8DB8', bottom: '#DCE8F2', cloud: 0.95 },
  rain: { top: '#3E6A93', bottom: '#AFC6DB', cloud: 0.9 },
  storm: { top: '#34536F', bottom: '#8FA9BF', cloud: 0.75 },
};

// A soft cartoon cloud built from overlapping ellipses.
const Cloud = ({ x, y, scale, opacity }: { x: number; y: number; scale: number; opacity: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`} opacity={opacity}>
    <Ellipse cx={60} cy={42} rx={60} ry={22} fill="#FFFFFF" />
    <Ellipse cx={40} cy={30} rx={28} ry={24} fill="#FFFFFF" />
    <Ellipse cx={75} cy={22} rx={34} ry={28} fill="#FFFFFF" />
    <Ellipse cx={100} cy={36} rx={22} ry={18} fill="#FFFFFF" />
  </G>
);

const SkyBackground: React.FC<{ tone: SkyTone }> = ({ tone }) => {
  const { width, height } = useWindowDimensions();
  const sky = SKY[tone];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky.top} />
            <Stop offset="1" stopColor={sky.bottom} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#sky)" />
        <Cloud x={-30} y={height * 0.12} scale={1.3} opacity={sky.cloud * 0.6} />
        <Cloud x={width * 0.55} y={height * 0.05} scale={1.0} opacity={sky.cloud * 0.5} />
        <Cloud x={width * 0.4} y={height * 0.42} scale={1.6} opacity={sky.cloud * 0.35} />
        <Cloud x={-50} y={height * 0.7} scale={1.8} opacity={sky.cloud * 0.45} />
        <Cloud x={width * 0.6} y={height * 0.82} scale={1.2} opacity={sky.cloud * 0.5} />
      </Svg>
    </View>
  );
};

export default SkyBackground;
