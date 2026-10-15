import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ProfileScreen from '../ProfileScreen';

// react-native-safe-area-context's `initialWindowMetrics` is only populated
// by the native module, which isn't present under Jest - supply explicit
// metrics instead of relying on an onLayout event that react-test-renderer
// never fires.
const TEST_SAFE_AREA_METRICS = {
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
  frame: { x: 0, y: 0, width: 375, height: 812 },
};

const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ reset: mockReset }),
}));

jest.mock('../api', () => ({
  logout: jest.fn(),
  getMe: jest.fn(),
  getMyHelpRequests: jest.fn(),
  getMySosHistory: jest.fn(),
  joinVolunteer: jest.fn(),
  leaveVolunteer: jest.fn(),
}));

const authSession = require('../../services/authSession');
const userProfileStorage = require('../../services/userProfileStorage');
const { logout, getMe, getMyHelpRequests, getMySosHistory } = require('../api');

describe('ProfileScreen logout button', () => {
  let activeRenderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(authSession, 'clearToken').mockResolvedValue(undefined);
    jest.spyOn(userProfileStorage, 'clearUserProfile').mockResolvedValue(undefined);
    (getMe as jest.Mock).mockResolvedValue({
      success: true,
      user: {
        id: 'user-1',
        name: 'Test Responder',
        email: 'test@example.com',
        phone: '1234567890',
        role: 'responder',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        volunteerStatus: 'inactive',
      },
    });
    (getMyHelpRequests as jest.Mock).mockResolvedValue([]);
    (getMySosHistory as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    // Without this, a renderer left mounted from a previous test can still
    // be mid-re-render (from setIsLoggingOut(false)) when Jest tears the
    // module environment down between tests, which surfaces as a confusing
    // "import after teardown" error instead of the real assertion result.
    act(() => {
      activeRenderer?.unmount();
    });
    activeRenderer = undefined;
  });

  function renderProfileScreen() {
    act(() => {
      activeRenderer = create(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
          <ProfileScreen />
        </SafeAreaProvider>,
      );
    });
    return activeRenderer!;
  }

  function pressLogout(root: ReactTestRenderer) {
    // react-test-renderer instances hold circular fiber references, so
    // JSON.stringify-based matching blows up; walk up from the rendered
    // label text to its enclosing TouchableOpacity instead.
    const label = root.root
      .findAllByType(Text)
      .find(node => typeof node.props.children === 'string' && node.props.children.includes('LOGOUT'));
    let button = label?.parent ?? null;
    while (button && button.type !== TouchableOpacity) {
      button = button.parent;
    }
    return act(async () => {
      await (button as any).props.onPress();
    });
  }

  test('successful server logout clears local state and navigates to Login without a warning', async () => {
    (logout as jest.Mock).mockResolvedValue({ success: true });
    const root = renderProfileScreen();

    await pressLogout(root);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(authSession.clearToken).toHaveBeenCalledTimes(1);
    expect(userProfileStorage.clearUserProfile).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] });
  });

  test('logout still clears local state and navigates to Login when the network/server call fails', async () => {
    (logout as jest.Mock).mockRejectedValue(new Error('Network request failed'));
    const root = renderProfileScreen();

    await pressLogout(root);

    expect(authSession.clearToken).toHaveBeenCalledTimes(1);
    expect(userProfileStorage.clearUserProfile).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] });
  });
});
