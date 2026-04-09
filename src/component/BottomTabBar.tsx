import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Home, Radio, Bell, HandHelping, CircleUser } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const TAB_BAR_PADDING_BOTTOM = Platform.OS === 'ios' ? 36 : 24;

interface TabItemProps {
  icon: any;
  label: string;
  active?: boolean;
  onPress?: () => void;
}

const TabItem = ({ icon: Icon, label, active, onPress }: TabItemProps) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
    <Icon size={22} color={active ? '#C62828' : '#9E9E9E'} />
    <Text style={[styles.tabLabel, { color: active ? '#C62828' : '#9E9E9E' }]}>{label}</Text>
    {active && <View style={styles.activeIndicator} />}
  </TouchableOpacity>
);

interface BottomTabBarProps {
  activeTab: 'HOME' | 'SOS' | 'ALERTS' | 'VOLUNTEER' | 'PROFILE';
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab }) => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.tabBarWrapper}>
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
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingBottom: TAB_BAR_PADDING_BOTTOM,
    paddingTop: 12,
    elevation: 10,
    shadowColor: '#000',
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
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C62828',
    marginTop: 4,
  },
});

export default BottomTabBar;