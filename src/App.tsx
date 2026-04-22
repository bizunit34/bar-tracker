import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';

import InventoryScreen from './screens/InventoryScreen';
import { colors } from './theme/colors';

function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <InventoryScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  container: {
    backgroundColor: colors.background,
    flex: 1
  }
});

export default App;
