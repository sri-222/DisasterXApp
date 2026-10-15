import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type Props = { children: React.ReactNode; message?: string };
type State = { hasError: boolean };

// In a release build an uncaught render error closes the whole app. This keeps
// a bad piece of data from taking the screen (and the app) down with it.
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('ErrorBoundary caught', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.box}>
          <Text style={styles.text}>{this.props.message ?? 'Something went wrong showing this section.'}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', paddingVertical: 24 },
  text: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
});
