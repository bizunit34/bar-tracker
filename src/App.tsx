import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import headerLogo from './assets/images/logos/barTrackerLogo-horizontal.png';
import { bootstrapCatalogDatabase } from './catalog/bootstrap';
import { listItems } from './data/barInventoryRepository';
import { hydrateBarInventoryItems } from './data/barInventoryStore';
import { hydrateShareSettings } from './data/barShareSettingsStore';
import { hydrateLocalShareLinks } from './data/localShareLinkStore';
import BarScreen from './screens/BarScreen';
import EquipmentScreen from './screens/EquipmentScreen';
import InventoryScreen from './screens/InventoryScreen';
import InventoryTransferScreen from './screens/InventoryTransferScreen';
import ManageShareLinksScreen from './screens/ManageShareLinksScreen';
import ManageSharingScreen from './screens/ManageSharingScreen';
import RecipesScreen from './screens/RecipesScreen';
import SharePreviewScreen from './screens/SharePreviewScreen';
import { colors } from './theme/colors';

type RouteName =
  | 'Home'
  | 'Bar'
  | 'Recipes'
  | 'Shopping Cart'
  | 'Tools & Glassware'
  | 'Import / Export'
  | 'Share'
  | 'Share Links'
  | 'Manage Sharing'
  | 'Connected Bars';

const routes: Array<RouteName> = [
  'Home',
  'Bar',
  'Recipes',
  'Shopping Cart',
  'Tools & Glassware',
  'Import / Export',
  'Share',
  'Share Links',
  'Manage Sharing',
  'Connected Bars',
];

function App(): React.JSX.Element {
  const [activeRoute, setActiveRoute] = useState<RouteName>('Home');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  useEffect((): void => {
    bootstrapCatalogDatabase()
      .then(async (): Promise<void> => {
        await hydrateBarInventoryItems();
        await hydrateShareSettings(await listItems());
        await hydrateLocalShareLinks();
      })
      .catch((error: unknown): void => {
        console.error('Failed to initialize local database.', error);
      });
  }, []);

  const navigateToRoute = (route: RouteName): void => {
    setActiveRoute(route);
    setIsMenuOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <AppHeader
          onMenuPress={(): void => {
            return setIsMenuOpen(true);
          }}
        />
        <View style={styles.content}>
          <ActiveScreen onNavigate={navigateToRoute} route={activeRoute} />
        </View>
      </View>
      <NavigationMenu
        activeRoute={activeRoute}
        isVisible={isMenuOpen}
        onClose={(): void => {
          return setIsMenuOpen(false);
        }}
        onNavigate={navigateToRoute}
      />
    </SafeAreaView>
  );
}

type AppHeaderProps = {
  onMenuPress: () => void;
};

function AppHeader({ onMenuPress }: AppHeaderProps): React.JSX.Element {
  return (
    <View style={styles.appHeader}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Bar Tracker"
        resizeMode="contain"
        source={headerLogo}
        style={styles.appLogo}
      />
      <Pressable
        accessibilityLabel="Open navigation menu"
        accessibilityRole="button"
        onPress={onMenuPress}
        style={({ pressed }): StyleProp<ViewStyle> => {
          return [styles.menuButton, pressed ? styles.menuButtonPressed : null];
        }}
      >
        <View style={styles.menuBar} />
        <View style={styles.menuBar} />
        <View style={styles.menuBar} />
      </Pressable>
    </View>
  );
}

type NavigationMenuProps = {
  activeRoute: RouteName;
  isVisible: boolean;
  onClose: () => void;
  onNavigate: (route: RouteName) => void;
};

function NavigationMenu({
  activeRoute,
  isVisible,
  onClose,
  onNavigate,
}: NavigationMenuProps): React.JSX.Element {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={isVisible}>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.menuBackdrop}>
        <Pressable style={styles.menuPanel}>
          {routes.map((route: RouteName): React.JSX.Element => {
            const isActive = route === activeRoute;

            return (
              <Pressable
                accessibilityRole="menuitem"
                key={route}
                onPress={(): void => {
                  return onNavigate(route);
                }}
                style={({ pressed }): StyleProp<ViewStyle> => {
                  return [
                    styles.menuItem,
                    isActive ? styles.menuItemActive : null,
                    pressed ? styles.menuItemPressed : null,
                  ];
                }}
              >
                <Text style={[styles.menuItemText, isActive ? styles.menuItemTextActive : null]}>
                  {route}
                </Text>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type SimplePageProps = {
  title: string;
};

type ActiveScreenProps = {
  onNavigate: (route: RouteName) => void;
  route: RouteName;
};

function ActiveScreen({ onNavigate, route }: ActiveScreenProps): React.JSX.Element {
  if (route === 'Home') {
    return (
      <InventoryScreen
        onManageEquipment={(): void => {
          onNavigate('Tools & Glassware');
        }}
      />
    );
  }

  if (route === 'Bar') {
    return <BarScreen />;
  }

  if (route === 'Recipes') {
    return <RecipesScreen />;
  }

  if (route === 'Tools & Glassware') {
    return <EquipmentScreen />;
  }

  if (route === 'Import / Export') {
    return <InventoryTransferScreen />;
  }

  if (route === 'Share') {
    return (
      <SharePreviewScreen
        onManageSharing={(): void => {
          onNavigate('Manage Sharing');
        }}
      />
    );
  }

  if (route === 'Share Links') {
    return (
      <ManageShareLinksScreen
        onCreateNewLink={(): void => {
          onNavigate('Share');
        }}
      />
    );
  }

  if (route === 'Manage Sharing') {
    return (
      <ManageSharingScreen
        onPreview={(): void => {
          onNavigate('Share');
        }}
      />
    );
  }

  return <SimplePage title={route} />;
}

function SimplePage({ title }: SimplePageProps): React.JSX.Element {
  return (
    <View style={styles.simplePage}>
      <Text style={styles.simplePageTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  appHeader: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 20,
  },
  appLogo: {
    height: 40,
    width: 160,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  menuBackdrop: {
    alignItems: 'flex-end',
    backgroundColor: colors.overlay,
    flex: 1,
    paddingRight: 12,
    paddingTop: 64,
  },
  menuBar: {
    backgroundColor: colors.textPrimary,
    borderRadius: 1,
    height: 2,
    width: 20,
  },
  menuButton: {
    alignItems: 'center',
    borderRadius: 8,
    gap: 4,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  menuButtonPressed: {
    backgroundColor: colors.highlight,
  },
  menuItem: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemActive: {
    backgroundColor: colors.highlight,
  },
  menuItemPressed: {
    backgroundColor: colors.card,
  },
  menuItemText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  menuItemTextActive: {
    color: colors.textPrimary,
  },
  menuPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 220,
    padding: 8,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  simplePage: {
    flex: 1,
    padding: 20,
  },
  simplePageTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
});

export default App;
