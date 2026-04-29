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
import { logSafeError } from './utils/logging';

type RouteName =
  | 'Home'
  | 'Bar'
  | 'Share'
  | 'Recipes'
  | 'More'
  | 'Shopping Cart'
  | 'Tools & Glassware'
  | 'Import / Export'
  | 'Share Links'
  | 'Manage Sharing'
  | 'Connected Bars';

const routes: Array<RouteName> = ['Home', 'Bar', 'Share', 'Recipes', 'More'];

function App(): React.JSX.Element {
  const [activeRoute, setActiveRoute] = useState<RouteName>('Home');
  const [barInitialCategory, setBarInitialCategory] = useState<string | null>(null);
  const [barEditRequest, setBarEditRequest] = useState<{ itemId: string | null; request: number }>({
    itemId: null,
    request: 0,
  });
  const [barOpenAddRequest, setBarOpenAddRequest] = useState<number>(0);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  useEffect((): void => {
    bootstrapCatalogDatabase()
      .then(async (): Promise<void> => {
        await hydrateBarInventoryItems();
        await hydrateShareSettings(await listItems());
        await hydrateLocalShareLinks();
      })
      .catch((error: unknown): void => {
        logSafeError('Failed to initialize local database', error);
      });
  }, []);

  const navigateToRoute = (route: RouteName): void => {
    setActiveRoute(route);
    setIsMenuOpen(false);
  };

  const navigateToBar = (
    options: { category?: string; editItemId?: string; openAdd?: boolean } = {},
  ): void => {
    setBarInitialCategory(options.category ?? null);

    if (options.openAdd) {
      setBarOpenAddRequest((currentRequest: number): number => {
        return currentRequest + 1;
      });
    }

    if (options.editItemId) {
      setBarEditRequest((currentRequest): { itemId: string | null; request: number } => {
        return {
          itemId: options.editItemId ?? null,
          request: currentRequest.request + 1,
        };
      });
    }

    navigateToRoute('Bar');
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
          <ActiveScreen
            barEditRequest={barEditRequest}
            barInitialCategory={barInitialCategory}
            barOpenAddRequest={barOpenAddRequest}
            onNavigate={navigateToRoute}
            onNavigateToBar={navigateToBar}
            route={activeRoute}
          />
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
  barEditRequest: { itemId: string | null; request: number };
  barInitialCategory: string | null;
  barOpenAddRequest: number;
  onNavigate: (route: RouteName) => void;
  onNavigateToBar: (options?: {
    category?: string;
    editItemId?: string;
    openAdd?: boolean;
  }) => void;
  route: RouteName;
};

function ActiveScreen({
  barEditRequest,
  barInitialCategory,
  barOpenAddRequest,
  onNavigate,
  onNavigateToBar,
  route,
}: ActiveScreenProps): React.JSX.Element {
  if (route === 'Home') {
    return (
      <InventoryScreen
        onAddItem={(): void => {
          onNavigateToBar({ openAdd: true });
        }}
        onImportExport={(): void => {
          onNavigate('Import / Export');
        }}
        onEditItem={(itemId: string): void => {
          onNavigateToBar({ editItemId: itemId });
        }}
        onManageEquipment={(): void => {
          onNavigate('Tools & Glassware');
        }}
        onManageSharing={(): void => {
          onNavigate('Manage Sharing');
        }}
        onPreviewShare={(): void => {
          onNavigate('Share');
        }}
        onSelectCategory={(category: string): void => {
          onNavigateToBar({ category });
        }}
      />
    );
  }

  if (route === 'Bar') {
    return (
      <BarScreen
        editItemId={barEditRequest.itemId}
        editItemRequest={barEditRequest.request}
        initialCategory={barInitialCategory}
        openAddRequest={barOpenAddRequest}
        onManageEquipment={(): void => {
          onNavigate('Tools & Glassware');
        }}
        onOpenImportExport={(): void => {
          onNavigate('Import / Export');
        }}
      />
    );
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
        onManageLinks={(): void => {
          onNavigate('Share Links');
        }}
        onManageSharing={(): void => {
          onNavigate('Manage Sharing');
        }}
        onOpenBar={(): void => {
          onNavigateToBar();
        }}
      />
    );
  }

  if (route === 'More') {
    return <MoreScreen onNavigate={onNavigate} />;
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
      <Text style={styles.simplePageCopy}>
        This area is planned for a later pass. The current bar tracking, sharing, tools, import, and
        recipe features are available from Home, Bar, Share, Recipes, and More.
      </Text>
    </View>
  );
}

function MoreScreen({ onNavigate }: { onNavigate: (route: RouteName) => void }): React.JSX.Element {
  return (
    <View style={styles.moreScreen}>
      <Text style={styles.simplePageTitle}>More</Text>
      <Text style={styles.simplePageCopy}>
        Setup tools, sharing utilities, imports, exports, and future workflows.
      </Text>
      <MoreSection
        items={[
          { label: 'Tools & Glassware', route: 'Tools & Glassware' },
          { label: 'Import / Export', route: 'Import / Export' },
        ]}
        title="Bar Setup"
        onNavigate={onNavigate}
      />
      <MoreSection
        items={[
          { label: 'Manage Sharing', route: 'Manage Sharing' },
          { label: 'Share Links', route: 'Share Links' },
        ]}
        title="Sharing"
        onNavigate={onNavigate}
      />
      <MoreSection
        items={[
          { label: 'Shopping Cart', route: 'Shopping Cart' },
          { label: 'Connected Bars', route: 'Connected Bars' },
        ]}
        title="Future"
        onNavigate={onNavigate}
      />
    </View>
  );
}

function MoreSection({
  items,
  onNavigate,
  title,
}: {
  items: Array<{ label: string; route: RouteName }>;
  onNavigate: (route: RouteName) => void;
  title: string;
}): React.JSX.Element {
  return (
    <View style={styles.moreSection}>
      <Text style={styles.moreSectionTitle}>{title}</Text>
      {items.map((item): React.JSX.Element => {
        return (
          <Pressable
            accessibilityRole="button"
            key={item.route}
            onPress={(): void => {
              onNavigate(item.route);
            }}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.moreItem, pressed ? styles.menuItemPressed : null];
            }}
          >
            <Text style={styles.moreItemText}>{item.label}</Text>
          </Pressable>
        );
      })}
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
  moreItem: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  moreItemText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  moreScreen: {
    flex: 1,
    gap: 16,
    padding: 20,
  },
  moreSection: {
    gap: 10,
  },
  moreSectionTitle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  simplePage: {
    flex: 1,
    gap: 10,
    padding: 20,
  },
  simplePageCopy: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  simplePageTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
});

export default App;
