import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WeatherScreen from '../WeatherScreen';

const TEST_SAFE_AREA_METRICS = {
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
  frame: { x: 0, y: 0, width: 375, height: 812 },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true }),
}));

jest.mock('../LocationContext', () => ({
  useLocation: () => ({
    currentLocation: 'Chennai, Tamil Nadu',
    latitude: 12.87,
    longitude: 80.21,
    locationLoading: false,
    locationError: null,
    fetchLocation: jest.fn(),
  }),
}));

jest.mock('../api', () => ({ getWeather: jest.fn() }));

const { getWeather } = require('../api');

function allText(renderer: ReactTestRenderer) {
  return renderer.root
    .findAllByType(Text)
    .map(node => [].concat(node.props.children).join(''))
    .join('\n');
}

async function render() {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <WeatherScreen />
      </SafeAreaProvider>,
    );
  });
  return renderer!;
}

describe('WeatherScreen', () => {
  it('shows live conditions with safety advice', async () => {
    (getWeather as jest.Mock).mockResolvedValue({
      location: '12.87, 80.21',
      temperature: 29.4,
      feelsLike: 34.2,
      humidity: 74,
      conditions: 'Heavy rain',
      wind: 4.1,
      sunrise: '2026-10-15T00:30:00.000Z',
      sunset: '2026-10-15T12:20:00.000Z',
      updatedAt: '2026-10-15T13:00:00.000Z',
      source: 'met.no',
    });
    const renderer = await render();
    const text = allText(renderer);
    expect(text).toContain('Chennai, Tamil Nadu');
    expect(text).toContain('29°');
    expect(text).toContain('Heavy rain');
    expect(text).toContain('Never walk or drive through flood water');
    expect(text).toContain('MET Norway');
    act(() => renderer.unmount());
  });

  it('shows the error with a retry button when weather is unavailable', async () => {
    (getWeather as jest.Mock).mockRejectedValue(new Error('Live weather is unavailable right now.'));
    const renderer = await render();
    const text = allText(renderer);
    expect(text).toContain('Live weather is unavailable right now.');
    expect(text).toContain('Try again');
    act(() => renderer.unmount());
  });
});
