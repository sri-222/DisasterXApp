import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AlertsScreen from '../AlertsScreen';

const TEST_SAFE_AREA_METRICS = {
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
  frame: { x: 0, y: 0, width: 375, height: 812 },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../LocationContext', () => ({
  useLocation: () => ({
    currentLocation: 'Gandhipuram, Coimbatore',
    locationError: null,
    isPermissionDenied: false,
    fetchLocation: jest.fn(),
    openLocationSettings: jest.fn(),
  }),
}));

jest.mock('../api', () => {
  const actual = jest.requireActual('../api');
  return {
    ...actual,
    getQuakes: jest.fn(),
    getOfficialAlerts: jest.fn(),
  };
});

const { getQuakes, getOfficialAlerts, normalizeOfficialAlert } = require('../api');

function allText(renderer: ReactTestRenderer) {
  return renderer.root
    .findAllByType(Text)
    .map(node => [].concat(node.props.children).join(''))
    .join('\n');
}

describe('AlertsScreen', () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => renderer?.unmount());
    renderer = undefined;
    jest.useRealTimers();
  });

  it('renders official alerts left by the old backend without crashing', async () => {
    (getQuakes as jest.Mock).mockResolvedValue({ scope: 'worldwide', events: [] });
    (getOfficialAlerts as jest.Mock).mockResolvedValue(
      [
        { message: 'High value detected for water sensor', severity: 'Danger', timestamp: { _seconds: 1760000000 } },
        { title: 'Flood warning', message: 'Move to higher ground', severity: 'Warning', timestamp: new Date().toISOString() },
      ].map(normalizeOfficialAlert),
    );

    await act(async () => {
      renderer = create(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
          <AlertsScreen />
        </SafeAreaProvider>,
      );
    });

    const text = allText(renderer!);
    expect(text).toContain('FROM AUTHORITIES');
    expect(text).toContain('Flood warning');
    expect(text).toContain('High value detected for water sensor');
    expect(text).not.toContain('Could not show');
  });
});
