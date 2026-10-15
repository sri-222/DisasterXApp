import React from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StatusBar,
  StatusBarStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors } from '../../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  backgroundColor?: string;
  statusBarStyle?: StatusBarStyle;
  statusBarBackgroundColor?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  scrollViewProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
}

// Uses react-native-safe-area-context's SafeAreaView everywhere, instead of
// the no-op-on-Android RN built-in one some screens previously used paired
// with a manual `Platform.OS === 'android' ? StatusBar.currentHeight : 0`
// hack - this is the single cross-platform-correct source of safe-area
// insets for the whole app.
const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scroll = false,
  backgroundColor = colors.background,
  statusBarStyle = 'dark-content',
  statusBarBackgroundColor,
  contentContainerStyle,
  edges,
  scrollViewProps,
}) => {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={edges}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarBackgroundColor ?? backgroundColor}
      />
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={contentContainerStyle}
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
});

export default ScreenContainer;
