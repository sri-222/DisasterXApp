import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SosScreen from '../SosScreen';

const TEST_SAFE_AREA_METRICS = {
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
  frame: { x: 0, y: 0, width: 375, height: 812 },
};

// Run the focus effect like a plain effect: the screen is "focused" while mounted.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn() }),
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

jest.mock('../LocationContext', () => ({
  useLocation: () => ({ currentLocation: 'Gandhipuram, Coimbatore', latitude: 11.01, longitude: 76.95 }),
}));

jest.mock('../api', () => ({
  submitSos: jest.fn(),
  getMySosHistory: jest.fn(),
}));

const { getMySosHistory } = require('../api');

function allText(renderer: ReactTestRenderer) {
  return renderer.root
    .findAllByType(Text)
    .map(node => [].concat(node.props.children).join(''))
    .join('\n');
}

describe('SosScreen control room status', () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(() => {
    act(() => renderer?.unmount());
    renderer = undefined;
  });

  it('shows the dispatched team for the latest SOS', async () => {
    (getMySosHistory as jest.Mock).mockResolvedValue([
      {
        id: 's1',
        userId: 'u1',
        crisisType: 'Flood',
        status: 'dispatched',
        assignedTeam: 'NDRF Team 4',
        createdAt: new Date().toISOString(),
      },
    ]);

    await act(async () => {
      renderer = create(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
          <SosScreen />
        </SafeAreaProvider>
      );
    });

    const text = allText(renderer!);
    expect(text).toContain('Rescue team on the way');
    expect(text).toContain('NDRF Team 4 is on the way');
  });

  it('shows no status card before any SOS was sent', async () => {
    (getMySosHistory as jest.Mock).mockResolvedValue([]);
    await act(async () => {
      renderer = create(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
          <SosScreen />
        </SafeAreaProvider>
      );
    });
    expect(allText(renderer!)).not.toContain('YOUR LAST SOS');
  });
});
