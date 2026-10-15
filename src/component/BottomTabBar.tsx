import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Radio, Bell, HandHelping, CircleUser } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';

const { width } = Dimensions.get('window');

interface TabItemProps {
  icon: any;
  label: string;
  active?: boolean;
  onPress?: () => void;
}

const TabItem = ({ icon: Icon, label, active, onPress }: TabItemProps) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
    <Icon size={22} color={active ? colors.danger : colors.textFaint} />
    <Text style={[styles.tabLabel, active ? styles.tabLabelActive : styles.tabLabelInactive]}>
      {label}
    </Text>
    {active && <View style={styles.activeIndicator} />}
  </TouchableOpacity>
);

interface BottomTabBarProps {
  activeTab: 'HOME' | 'SOS' | 'ALERTS' | 'VOLUNTEER' | 'PROFILE';
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab }) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
      <View style={styles.tabBar}>
        <TabItem icon={Home} label="HOME" active={activeTab === 'HOME'} onPress={() => navigation.navigate('Home')} />
        <TabItem icon={Radio} label="SOS" active={activeTab === 'SOS'} onPress={() => navigation.navigate('SOS')} />
        <TabItem icon={Bell} label="ALERTS" active={activeTab === 'ALERTS'} onPress={() => navigation.navigate('Alerts')} />
        <TabItem icon={HandHelping} label="VOLUNTEER" active={activeTab === 'VOLUNTEER'} onPress={() => navigation.navigate('Volunteer')} />
        <TabItem icon={CircleUser} label="PROFILE" active={activeTab === 'PROFILE'} onPress={() => navigation.navigate('Profile')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    elevation: 10,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width / 5,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 5,
  },
  tabLabelActive: {
    color: colors.danger,
  },
  tabLabelInactive: {
    color: colors.textFaint,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.danger,
    marginTop: 4,
  },
});

export default BottomTabBar;
