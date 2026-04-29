import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ListRenderItemInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Asset, launchCamera, launchImageLibrary } from 'react-native-image-picker';

import { catalogInventoryItems } from '../catalog/catalogInventory';
import BarItemActionSheet from '../components/bar/BarItemActionSheet';
import BarItemCard from '../components/bar/BarItemCard';
import BarItemRow from '../components/bar/BarItemRow';
import EmptyInventoryState from '../components/bar/EmptyInventoryState';
import Icon from '../components/bar/Icon';
import {
  archiveBarInventoryItem,
  removeBarInventoryItem,
  restoreBarInventoryItem,
  saveBarInventoryItem,
  useBarInventoryItems,
} from '../data/barInventoryStore';
import { colors, componentTokens, radii, shadows, spacing, typography } from '../theme';
import {
  InventoryCategory,
  InventoryHolding,
  InventoryItem,
  InventoryVisibility,
} from '../types/inventory';
import { logSafeError } from '../utils/logging';

type ViewMode = 'list' | 'display';

type StockStatus = 'inStock' | 'lowStock' | 'outOfStock';

type SortOption = 'name' | 'rating' | 'quantity' | 'updatedAt';

type SortDirection = 'asc' | 'desc';

type EmptyStateKind = 'noInventory' | 'noSearchResults' | 'noArchivedItems';

type OpenDropdown = 'category' | 'sort' | 'stock' | 'type' | null;

type EditorMode = 'add' | 'edit';

type BarFilterState = {
  archiveStatus: 'active' | 'archived';
  categories: Array<InventoryCategory>;
  productTypes: Array<string>;
  query: string;
  sortBy: SortOption;
  sortDirection: SortDirection;
  stockStatuses: Array<StockStatus>;
  viewMode: ViewMode;
};

type SortSelection = {
  direction: SortDirection;
  label: string;
  sortBy: SortOption;
};

type ItemFormState = {
  abv: string;
  brand: string;
  category: InventoryCategory;
  catalogItemId: string | null;
  description: string;
  holdings: Array<ItemHoldingFormState>;
  imageUri: string | null;
  isOpen: boolean;
  name: string;
  notes: string;
  proof: string;
  productType: string;
  publicNotes: string;
  rating: string;
  ratingComments: string;
  size: string;
  subcategory: string;
  tags: string;
  unit: InventoryItem['unit'];
  visibility: InventoryVisibility;
};

type ItemHoldingFormState = {
  amount: string;
  id: string;
  label: string;
};

const allCategories: Array<InventoryCategory> = [
  'spirit',
  'liqueur',
  'mixer',
  'bitters',
  'syrup',
  'juice',
  'garnish',
  'wine',
  'beer',
  'tool',
  'glassware',
  'other',
];

const stockFilters: Array<StockStatus> = ['inStock', 'lowStock', 'outOfStock'];

const sortSelections: Array<SortSelection> = [
  { direction: 'asc', label: 'Name A-Z', sortBy: 'name' },
  { direction: 'desc', label: 'Name Z-A', sortBy: 'name' },
  { direction: 'desc', label: 'Recently updated', sortBy: 'updatedAt' },
  { direction: 'asc', label: 'Oldest updated', sortBy: 'updatedAt' },
  { direction: 'desc', label: 'Rating high-low', sortBy: 'rating' },
  { direction: 'asc', label: 'Rating low-high', sortBy: 'rating' },
  { direction: 'desc', label: 'Quantity high-low', sortBy: 'quantity' },
  { direction: 'asc', label: 'Quantity low-high', sortBy: 'quantity' },
];

const initialFilters: BarFilterState = {
  archiveStatus: 'active',
  categories: [],
  productTypes: [],
  query: '',
  sortBy: 'name',
  sortDirection: 'asc',
  stockStatuses: [],
  viewMode: 'list',
};

const emptyItemForm: ItemFormState = {
  abv: '',
  brand: '',
  catalogItemId: null,
  category: 'spirit',
  description: '',
  holdings: [{ amount: '1', id: 'holding-1', label: 'Unopened bottle' }],
  imageUri: null,
  isOpen: false,
  name: '',
  notes: '',
  proof: '',
  productType: '',
  publicNotes: '',
  rating: '',
  ratingComments: '',
  size: '',
  subcategory: '',
  tags: '',
  unit: 'bottle',
  visibility: 'private',
};

type BarScreenProps = {
  editItemId?: string | null;
  editItemRequest?: number;
  initialCategory?: string | null;
  onManageEquipment?: () => void;
  onOpenImportExport?: () => void;
  openAddRequest?: number;
};

function BarScreen({
  editItemId = null,
  editItemRequest = 0,
  initialCategory = null,
  onManageEquipment,
  onOpenImportExport,
  openAddRequest = 0,
}: BarScreenProps): React.JSX.Element {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<BarFilterState>(initialFilters);
  const inventoryItems = useBarInventoryItems();
  const [editorMode, setEditorMode] = useState<EditorMode>('add');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemFormState>(emptyItemForm);
  const [actionSheetItem, setActionSheetItem] = useState<InventoryItem | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [lastHandledEditRequest, setLastHandledEditRequest] = useState<number>(0);

  useEffect((): void => {
    if (!initialCategory) {
      return;
    }

    setFilters((currentFilters: BarFilterState): BarFilterState => {
      return {
        ...currentFilters,
        archiveStatus: 'active',
        categories: [initialCategory as InventoryCategory],
      };
    });
  }, [initialCategory]);

  useEffect((): void => {
    if (openAddRequest <= 0) {
      return;
    }

    setEditorMode('add');
    setEditingItemId(null);
    setForm(emptyItemForm);
    setIsEditorOpen(true);
  }, [openAddRequest]);

  useEffect((): void => {
    if (!editItemId || editItemRequest <= 0 || editItemRequest <= lastHandledEditRequest) {
      return;
    }

    const itemToEdit = inventoryItems.find((item: InventoryItem): boolean => {
      return item.id === editItemId;
    });

    if (!itemToEdit) {
      return;
    }

    setLastHandledEditRequest(editItemRequest);
    setEditorMode('edit');
    setEditingItemId(itemToEdit.id);
    setExpandedItemId(itemToEdit.id);
    setForm(createFormFromItem(itemToEdit));
    setIsEditorOpen(true);
  }, [editItemId, editItemRequest, inventoryItems, lastHandledEditRequest]);

  const productTypes = useMemo((): Array<string> => {
    return Array.from(
      new Set(
        inventoryItems.map((item: InventoryItem): string => {
          return item.productType ?? formatFilterLabel(item.category);
        }),
      ),
    ).sort((left: string, right: string): number => {
      return left.localeCompare(right);
    });
  }, [inventoryItems]);

  const visibleItems = useMemo((): Array<InventoryItem> => {
    const normalizedQuery = filters.query.trim().toLowerCase();

    return inventoryItems
      .filter((item: InventoryItem): boolean => {
        const productType = item.productType ?? formatFilterLabel(item.category);

        if (filters.archiveStatus === 'active' && item.isArchived) {
          return false;
        }

        if (filters.archiveStatus === 'archived' && !item.isArchived) {
          return false;
        }

        if (filters.categories.length > 0 && !filters.categories.includes(item.category)) {
          return false;
        }

        if (filters.productTypes.length > 0 && !filters.productTypes.includes(productType)) {
          return false;
        }

        if (
          filters.stockStatuses.length > 0 &&
          !filters.stockStatuses.includes(getStockStatus(item))
        ) {
          return false;
        }

        if (normalizedQuery.length === 0) {
          return true;
        }

        const searchableText = [
          item.name,
          item.brand,
          item.category,
          item.subcategory,
          item.productType,
          item.size,
          item.tags?.join(' '),
          item.description,
          item.notes,
          item.ratingComments,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .sort((left: InventoryItem, right: InventoryItem): number => {
        return compareInventoryItems(left, right, filters.sortBy, filters.sortDirection);
      });
  }, [filters, inventoryItems]);

  const showFeedback = useCallback((message: string): void => {
    setFeedbackMessage(message);

    setTimeout((): void => {
      setFeedbackMessage(null);
    }, 2400);
  }, []);

  const openAddItem = useCallback((): void => {
    setEditorMode('add');
    setEditingItemId(null);
    setForm(emptyItemForm);
    setIsEditorOpen(true);
  }, []);

  const openEditItem = useCallback((item: InventoryItem): void => {
    setEditorMode('edit');
    setEditingItemId(item.id);
    setForm(createFormFromItem(item));
    setIsEditorOpen(true);
  }, []);

  const closeEditor = useCallback((): void => {
    setIsEditorOpen(false);
  }, []);

  const saveItem = (): void => {
    const nextItem = createItemFromForm(
      form,
      editingItemId ?? form.catalogItemId ?? createInventoryItemId(form.name),
    );

    if (!nextItem) {
      return;
    }

    saveBarInventoryItem(nextItem);
    setExpandedItemId(nextItem.id);
    setIsEditorOpen(false);
    showFeedback(modeLabel(editorMode));
  };

  const removeItem = useCallback(
    (itemId: string): void => {
      removeBarInventoryItem(itemId);
      setExpandedItemId(null);
      showFeedback('Item deleted.');
    },
    [showFeedback],
  );

  const archiveItem = useCallback(
    (itemId: string): void => {
      archiveBarInventoryItem(itemId);
      setExpandedItemId(null);
      showFeedback('Item archived.');
    },
    [showFeedback],
  );

  const restoreItem = useCallback(
    (itemId: string): void => {
      restoreBarInventoryItem(itemId);
      setExpandedItemId(itemId);
      setFilters((currentFilters: BarFilterState): BarFilterState => {
        return { ...currentFilters, archiveStatus: 'active' };
      });
      showFeedback('Item restored.');
    },
    [showFeedback],
  );

  const confirmRemoveItem = useCallback(
    (item: InventoryItem): void => {
      Alert.alert('Delete item?', `Delete ${item.name} permanently? This cannot be undone.`, [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Delete permanently',
          onPress: (): void => {
            removeItem(item.id);
          },
        },
      ]);
    },
    [removeItem],
  );

  const duplicateItem = useCallback(
    (item: InventoryItem): void => {
      const now = new Date().toISOString();
      const duplicatedItem: InventoryItem = {
        ...item,
        archivedAt: null,
        createdAt: now,
        id: createInventoryItemId(`${item.name}-copy`),
        isArchived: false,
        name: `${item.name} Copy`,
        updatedAt: now,
      };

      saveBarInventoryItem(duplicatedItem);
      setExpandedItemId(duplicatedItem.id);
      setFilters((currentFilters: BarFilterState): BarFilterState => {
        return { ...currentFilters, archiveStatus: 'active' };
      });
      showFeedback('Item duplicated.');
    },
    [showFeedback],
  );

  const toggleOpenStatus = useCallback(
    (item: InventoryItem): void => {
      saveBarInventoryItem({
        ...item,
        isOpen: !item.isOpen,
        updatedAt: new Date().toISOString(),
      });
      showFeedback(item.isOpen ? 'Marked unopened.' : 'Marked open.');
    },
    [showFeedback],
  );

  const toggleVisibility = useCallback(
    (item: InventoryItem): void => {
      const currentVisibility = item.visibility ?? 'private';
      const nextVisibility: InventoryVisibility =
        currentVisibility === 'private'
          ? 'shared'
          : currentVisibility === 'shared'
            ? 'guest_visible'
            : 'private';

      saveBarInventoryItem({
        ...item,
        updatedAt: new Date().toISOString(),
        visibility: nextVisibility,
      });
      showFeedback(`Visibility changed to ${formatFilterLabel(nextVisibility)}.`);
    },
    [showFeedback],
  );

  const emptyStateKind = useMemo((): EmptyStateKind => {
    if (inventoryItems.length === 0) {
      return 'noInventory';
    }

    if (filters.archiveStatus === 'archived') {
      return 'noArchivedItems';
    }

    return 'noSearchResults';
  }, [filters.archiveStatus, inventoryItems.length]);

  const primaryItemAction = useCallback(
    (targetItem: InventoryItem): void => {
      if (targetItem.isArchived) {
        restoreItem(targetItem.id);

        return;
      }

      openEditItem(targetItem);
    },
    [openEditItem, restoreItem],
  );

  const toggleExpandedItem = useCallback((itemId: string): void => {
    setExpandedItemId((currentItemId: string | null): string | null => {
      return currentItemId === itemId ? null : itemId;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<InventoryItem>): React.JSX.Element => {
      const stockStatus = getStockStatus(item);

      if (filters.viewMode === 'display') {
        return (
          <BarItemCard
            item={item}
            stockStatus={stockStatus}
            onOpenActions={setActionSheetItem}
            onPrimaryAction={primaryItemAction}
          />
        );
      }

      return (
        <BarItemRow
          isExpanded={item.id === expandedItemId}
          item={item}
          stockStatus={stockStatus}
          onOpenActions={setActionSheetItem}
          onPrimaryAction={primaryItemAction}
          onToggleExpanded={toggleExpandedItem}
        />
      );
    },
    [expandedItemId, filters.viewMode, primaryItemAction, toggleExpandedItem],
  );

  return (
    <>
      <FlatList
        columnWrapperStyle={filters.viewMode === 'display' ? styles.displayRow : undefined}
        contentContainerStyle={styles.container}
        data={visibleItems}
        extraData={expandedItemId}
        initialNumToRender={10}
        key={filters.viewMode}
        keyExtractor={(item: InventoryItem): string => {
          return item.id;
        }}
        ListEmptyComponent={
          <EmptyInventoryState
            kind={emptyStateKind}
            onAddItem={openAddItem}
            onResetFilters={(): void => {
              setFilters(initialFilters);
            }}
            onViewActive={(): void => {
              setFilters({ ...initialFilters, archiveStatus: 'active' });
            }}
          />
        }
        ListHeaderComponent={
          <>
            <BarControls
              filters={filters}
              onAddItem={openAddItem}
              onManageEquipment={onManageEquipment}
              onOpenImportExport={onOpenImportExport}
              productTypes={productTypes}
              resultCount={visibleItems.length}
              onFiltersChange={(nextFilters: BarFilterState): void => {
                setExpandedItemId(null);
                setFilters(nextFilters);
              }}
            />
            {feedbackMessage ? <Text style={styles.feedbackText}>{feedbackMessage}</Text> : null}
          </>
        }
        maxToRenderPerBatch={10}
        numColumns={filters.viewMode === 'display' ? 2 : 1}
        renderItem={renderItem}
        updateCellsBatchingPeriod={50}
        windowSize={7}
      />
      <ItemEditorModal
        catalogItems={catalogInventoryItems}
        form={form}
        mode={editorMode}
        visible={isEditorOpen}
        onChange={setForm}
        onClose={closeEditor}
        onSave={saveItem}
      />
      <BarItemActionSheet
        item={actionSheetItem}
        onArchive={archiveItem}
        onClose={(): void => {
          setActionSheetItem(null);
        }}
        onDuplicate={duplicateItem}
        onEdit={openEditItem}
        onRemove={confirmRemoveItem}
        onRestore={restoreItem}
        onToggleOpen={toggleOpenStatus}
        onToggleVisibility={toggleVisibility}
      />
    </>
  );
}

type BarControlsProps = {
  filters: BarFilterState;
  onAddItem: () => void;
  onFiltersChange: (filters: BarFilterState) => void;
  onManageEquipment?: () => void;
  onOpenImportExport?: () => void;
  productTypes: Array<string>;
  resultCount: number;
};

function BarControls({
  filters,
  onAddItem,
  onFiltersChange,
  onManageEquipment,
  onOpenImportExport,
  productTypes,
  resultCount,
}: BarControlsProps): React.JSX.Element {
  const [draftFilters, setDraftFilters] = useState<BarFilterState>(filters);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState<boolean>(false);
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const activeFilterCount = getActiveFilterCount(filters);

  const updateFilters = (partialFilters: Partial<BarFilterState>): void => {
    onFiltersChange({ ...filters, ...partialFilters });
  };

  const updateDraftFilters = (partialFilters: Partial<BarFilterState>): void => {
    setDraftFilters((currentFilters: BarFilterState): BarFilterState => {
      return { ...currentFilters, ...partialFilters };
    });
  };

  const toggleFilterMenu = (): void => {
    if (isFilterMenuOpen) {
      setDraftFilters(filters);
      setOpenDropdown(null);
      setIsFilterMenuOpen(false);

      return;
    }

    setDraftFilters(filters);
    setIsFilterMenuOpen(true);
  };

  const applyDraftFilters = (): void => {
    onFiltersChange(draftFilters);
    setOpenDropdown(null);
    setIsFilterMenuOpen(false);
  };

  const clearFilters = (): void => {
    setDraftFilters(initialFilters);
    onFiltersChange(initialFilters);
    setOpenDropdown(null);
  };

  const toggleDropdown = (dropdown: OpenDropdown): void => {
    setOpenDropdown((currentDropdown: OpenDropdown): OpenDropdown => {
      return currentDropdown === dropdown ? null : dropdown;
    });
  };

  return (
    <View style={styles.controls}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Bar</Text>
          <Text style={styles.pageSubtitle}>
            {resultCount} {filters.archiveStatus === 'archived' ? 'archived' : 'active'} item(s)
          </Text>
          <Text style={styles.visibilityHelper}>
            Private stays local. Shared and Guest Visible can appear in guest previews when
            included.
          </Text>
        </View>
      </View>

      <View style={styles.searchToolbar}>
        <View style={styles.searchBox}>
          <Icon name="search" style={styles.searchIcon} />
          <TextInput
            onChangeText={(query: string): void => {
              updateFilters({ query });
            }}
            placeholder="Search name or brand"
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            value={filters.query}
          />
          {filters.query.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              onPress={(): void => {
                updateFilters({ query: '' });
              }}
              style={({ pressed }): StyleProp<ViewStyle> => {
                return [styles.compactIconButton, pressed ? styles.controlPressed : null];
              }}
            >
              <Icon name="close" />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel="Open filters"
          accessibilityRole="button"
          onPress={toggleFilterMenu}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [
              styles.filterButton,
              activeFilterCount > 0 ? styles.filterButtonActive : null,
              pressed ? styles.controlPressed : null,
            ];
          }}
        >
          <Icon
            name="filter"
            style={activeFilterCount > 0 ? styles.filterButtonTextActive : null}
          />
        </Pressable>
        <Pressable
          accessibilityLabel="Add item"
          accessibilityRole="button"
          onPress={onAddItem}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.addButton, pressed ? styles.controlPressed : null];
          }}
        >
          <Icon name="add" />
        </Pressable>
      </View>

      <View style={styles.utilityRow}>
        {onManageEquipment ? (
          <Pressable
            accessibilityLabel="Open Tools and Glassware"
            accessibilityRole="button"
            onPress={onManageEquipment}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.filterButton, pressed ? styles.controlPressed : null];
            }}
          >
            <Text style={styles.filterButtonText}>Tools</Text>
          </Pressable>
        ) : null}
        {onOpenImportExport ? (
          <Pressable
            accessibilityLabel="Open Import and Export"
            accessibilityRole="button"
            onPress={onOpenImportExport}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.filterButton, pressed ? styles.controlPressed : null];
            }}
          >
            <Text style={styles.filterButtonText}>Import</Text>
          </Pressable>
        ) : null}
        <View style={styles.viewToggle}>
          <SegmentButton
            isActive={filters.viewMode === 'list'}
            label="List"
            onPress={(): void => {
              updateFilters({ viewMode: 'list' });
              updateDraftFilters({ viewMode: 'list' });
            }}
          />
          <SegmentButton
            isActive={filters.viewMode === 'display'}
            label="Display"
            onPress={(): void => {
              updateFilters({ viewMode: 'display' });
              updateDraftFilters({ viewMode: 'display' });
            }}
          />
        </View>
      </View>

      <ActiveFilterChips
        filters={filters}
        onChange={(nextFilters: BarFilterState): void => {
          onFiltersChange(nextFilters);
          setDraftFilters(nextFilters);
        }}
      />

      <Modal
        animationType="slide"
        onRequestClose={toggleFilterMenu}
        transparent
        visible={isFilterMenuOpen}
      >
        <View style={styles.editorBackdrop}>
          <View style={styles.filterSheet}>
            <View style={styles.editorHeader}>
              <Text style={styles.editorTitle}>Filters & Sort</Text>
              <Pressable
                accessibilityLabel="Close filters"
                accessibilityRole="button"
                onPress={toggleFilterMenu}
                style={({ pressed }): StyleProp<ViewStyle> => {
                  return [styles.iconButton, pressed ? styles.controlPressed : null];
                }}
              >
                <Icon name="close" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.filterPanel}>
              <Text style={styles.formLabel}>Inventory status</Text>
              <View style={styles.viewToggle}>
                <SegmentButton
                  isActive={draftFilters.archiveStatus === 'active'}
                  label="Active"
                  onPress={(): void => {
                    updateDraftFilters({ archiveStatus: 'active' });
                  }}
                />
                <SegmentButton
                  isActive={draftFilters.archiveStatus === 'archived'}
                  label="Archived"
                  onPress={(): void => {
                    updateDraftFilters({ archiveStatus: 'archived' });
                  }}
                />
              </View>

              <DropdownFilter
                isOpen={openDropdown === 'type'}
                label="Type"
                selectedSummary={formatSelectedSummary(draftFilters.productTypes, 'All types')}
                onToggle={(): void => {
                  toggleDropdown('type');
                }}
              >
                <MultiSelectOptions
                  options={productTypes}
                  selectedOptions={draftFilters.productTypes}
                  onChange={(selectedOptions: Array<string>): void => {
                    updateDraftFilters({ productTypes: selectedOptions });
                  }}
                />
              </DropdownFilter>

              <DropdownFilter
                isOpen={openDropdown === 'category'}
                label="Category"
                selectedSummary={formatSelectedSummary(
                  draftFilters.categories.map((category: InventoryCategory): string => {
                    return formatFilterLabel(category);
                  }),
                  'All categories',
                )}
                onToggle={(): void => {
                  toggleDropdown('category');
                }}
              >
                <MultiSelectOptions
                  formatOptionLabel={formatFilterLabel}
                  options={allCategories}
                  selectedOptions={draftFilters.categories}
                  onChange={(selectedOptions: Array<InventoryCategory>): void => {
                    updateDraftFilters({ categories: selectedOptions });
                  }}
                />
              </DropdownFilter>

              <DropdownFilter
                isOpen={openDropdown === 'stock'}
                label="Stock"
                selectedSummary={formatSelectedSummary(
                  draftFilters.stockStatuses.map((stockStatus: StockStatus): string => {
                    return formatFilterLabel(stockStatus);
                  }),
                  'All stock',
                )}
                onToggle={(): void => {
                  toggleDropdown('stock');
                }}
              >
                <MultiSelectOptions
                  formatOptionLabel={formatFilterLabel}
                  options={stockFilters}
                  selectedOptions={draftFilters.stockStatuses}
                  onChange={(selectedOptions: Array<StockStatus>): void => {
                    updateDraftFilters({ stockStatuses: selectedOptions });
                  }}
                />
              </DropdownFilter>

              <DropdownFilter
                isOpen={openDropdown === 'sort'}
                label="Sort"
                selectedSummary={getSortLabel(draftFilters)}
                onToggle={(): void => {
                  toggleDropdown('sort');
                }}
              >
                <SortOptions
                  filters={draftFilters}
                  onChange={(sortSelection: SortSelection): void => {
                    updateDraftFilters({
                      sortBy: sortSelection.sortBy,
                      sortDirection: sortSelection.direction,
                    });
                    setOpenDropdown(null);
                  }}
                />
              </DropdownFilter>

              <Pressable
                accessibilityRole="button"
                onPress={applyDraftFilters}
                style={({ pressed }): StyleProp<ViewStyle> => {
                  return [styles.applyButton, pressed ? styles.controlPressed : null];
                }}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={clearFilters}
                style={({ pressed }): StyleProp<ViewStyle> => {
                  return [styles.secondaryButton, pressed ? styles.controlPressed : null];
                }}
              >
                <Text style={styles.secondaryButtonText}>Reset Filters</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type DropdownFilterProps = {
  children: React.ReactNode;
  isOpen: boolean;
  label: string;
  onToggle: () => void;
  selectedSummary: string;
};

function DropdownFilter({
  children,
  isOpen,
  label,
  onToggle,
  selectedSummary,
}: DropdownFilterProps): React.JSX.Element {
  return (
    <View style={styles.dropdown}>
      <Pressable
        accessibilityLabel={`${isOpen ? 'Collapse' : 'Expand'} ${label} filter`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={onToggle}
        style={({ pressed }): StyleProp<ViewStyle> => {
          return [styles.dropdownButton, pressed ? styles.controlPressed : null];
        }}
      >
        <View style={styles.dropdownText}>
          <Text style={styles.filterTitle}>{label}</Text>
          <Text numberOfLines={1} style={styles.dropdownSummary}>
            {selectedSummary}
          </Text>
        </View>
        <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} style={styles.dropdownIcon} />
      </Pressable>

      {isOpen ? <View style={styles.dropdownPanel}>{children}</View> : null}
    </View>
  );
}

function ActiveFilterChips({
  filters,
  onChange,
}: {
  filters: BarFilterState;
  onChange: (filters: BarFilterState) => void;
}): React.JSX.Element | null {
  const chips: Array<{ label: string; onRemove: () => void }> = [];

  if (filters.archiveStatus === 'archived') {
    chips.push({
      label: 'Archived',
      onRemove: (): void => {
        onChange({ ...filters, archiveStatus: 'active' });
      },
    });
  }

  filters.categories.forEach((category: InventoryCategory): void => {
    chips.push({
      label: formatFilterLabel(category),
      onRemove: (): void => {
        onChange({
          ...filters,
          categories: filters.categories.filter((selectedCategory: InventoryCategory): boolean => {
            return selectedCategory !== category;
          }),
        });
      },
    });
  });

  filters.productTypes.forEach((productType: string): void => {
    chips.push({
      label: productType,
      onRemove: (): void => {
        onChange({
          ...filters,
          productTypes: filters.productTypes.filter((selectedType: string): boolean => {
            return selectedType !== productType;
          }),
        });
      },
    });
  });

  filters.stockStatuses.forEach((stockStatus: StockStatus): void => {
    chips.push({
      label: formatFilterLabel(stockStatus),
      onRemove: (): void => {
        onChange({
          ...filters,
          stockStatuses: filters.stockStatuses.filter((selectedStatus: StockStatus): boolean => {
            return selectedStatus !== stockStatus;
          }),
        });
      },
    });
  });

  if (
    filters.sortBy !== initialFilters.sortBy ||
    filters.sortDirection !== initialFilters.sortDirection
  ) {
    chips.push({
      label: getSortLabel(filters),
      onRemove: (): void => {
        onChange({
          ...filters,
          sortBy: initialFilters.sortBy,
          sortDirection: initialFilters.sortDirection,
        });
      },
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <View style={styles.activeChips}>
      {chips.map((chip): React.JSX.Element => {
        return (
          <Pressable
            accessibilityLabel={`Remove ${chip.label} filter`}
            accessibilityRole="button"
            key={chip.label}
            onPress={chip.onRemove}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.activeChip, pressed ? styles.controlPressed : null];
            }}
          >
            <Text style={styles.activeChipText}>{chip.label}</Text>
            <Icon name="close" style={styles.activeChipIcon} />
          </Pressable>
        );
      })}
    </View>
  );
}

type MultiSelectOptionsProps<T extends string> = {
  formatOptionLabel?: (option: T) => string;
  onChange: (selectedOptions: Array<T>) => void;
  options: Array<T>;
  selectedOptions: Array<T>;
};

function MultiSelectOptions<T extends string>({
  formatOptionLabel,
  onChange,
  options,
  selectedOptions,
}: MultiSelectOptionsProps<T>): React.JSX.Element {
  const toggleOption = (option: T): void => {
    if (selectedOptions.includes(option)) {
      onChange(
        selectedOptions.filter((selectedOption: T): boolean => {
          return selectedOption !== option;
        }),
      );

      return;
    }

    onChange([...selectedOptions, option]);
  };

  return (
    <View style={styles.dropdownOptions}>
      {options.map((option: T): React.JSX.Element => {
        const isSelected = selectedOptions.includes(option);

        return (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            key={option}
            onPress={(): void => {
              toggleOption(option);
            }}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [
                styles.dropdownOption,
                isSelected ? styles.dropdownOptionSelected : null,
                pressed ? styles.controlPressed : null,
              ];
            }}
          >
            <View style={[styles.checkbox, isSelected ? styles.checkboxSelected : null]}>
              {isSelected ? <Icon name="check" style={styles.checkboxText} /> : null}
            </View>
            <Text style={styles.dropdownOptionText}>
              {formatOptionLabel ? formatOptionLabel(option) : option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type SortOptionsProps = {
  filters: BarFilterState;
  onChange: (sortSelection: SortSelection) => void;
};

function SortOptions({ filters, onChange }: SortOptionsProps): React.JSX.Element {
  return (
    <View style={styles.dropdownOptions}>
      {sortSelections.map((sortSelection: SortSelection): React.JSX.Element => {
        const isSelected =
          filters.sortBy === sortSelection.sortBy &&
          filters.sortDirection === sortSelection.direction;

        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            key={sortSelection.label}
            onPress={(): void => {
              onChange(sortSelection);
            }}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [
                styles.dropdownOption,
                isSelected ? styles.dropdownOptionSelected : null,
                pressed ? styles.controlPressed : null,
              ];
            }}
          >
            <View style={[styles.radioMark, isSelected ? styles.radioMarkSelected : null]}>
              {isSelected ? <Icon name="check" style={styles.checkboxText} /> : null}
            </View>
            <Text style={styles.dropdownOptionText}>{sortSelection.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type ButtonProps = {
  isActive: boolean;
  label: string;
  onPress: () => void;
};

function SegmentButton({ isActive, label, onPress }: ButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [
          styles.segmentButton,
          isActive ? styles.segmentButtonActive : null,
          pressed ? styles.controlPressed : null,
        ];
      }}
    >
      <Text style={[styles.segmentButtonText, isActive ? styles.segmentButtonTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

type ItemEditorModalProps = {
  catalogItems: Array<InventoryItem>;
  form: ItemFormState;
  mode: EditorMode;
  onChange: (form: ItemFormState) => void;
  onClose: () => void;
  onSave: () => void;
  visible: boolean;
};

function ItemEditorModal({
  catalogItems,
  form,
  mode,
  onChange,
  onClose,
  onSave,
  visible,
}: ItemEditorModalProps): React.JSX.Element {
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState<boolean>(false);
  const [isMoreDetailsOpen, setIsMoreDetailsOpen] = useState<boolean>(false);
  const suggestions = useMemo((): Array<InventoryItem> => {
    const query = form.name.trim().toLowerCase();

    if (query.length < 2) {
      return [];
    }

    return catalogItems
      .filter((item: InventoryItem): boolean => {
        return item.name.toLowerCase().includes(query);
      })
      .slice(0, 6);
  }, [catalogItems, form.name]);

  const updateForm = (partialForm: Partial<ItemFormState>): void => {
    onChange({ ...form, ...partialForm });
  };
  const isCatalogSelected = form.catalogItemId !== null;
  const isAlcoholCategory =
    form.category === 'spirit' ||
    form.category === 'liqueur' ||
    form.category === 'wine' ||
    form.category === 'beer';

  const selectCatalogItem = (item: InventoryItem): void => {
    onChange({
      ...createFormFromItem(item),
      catalogItemId: item.id,
      holdings: form.holdings,
      imageUri: form.imageUri,
      notes: form.notes,
    });
    setIsAutocompleteOpen(false);
  };

  const updateHolding = (
    holdingId: string,
    partialHolding: Partial<ItemHoldingFormState>,
  ): void => {
    updateForm({
      holdings: form.holdings.map((holding: ItemHoldingFormState): ItemHoldingFormState => {
        return holding.id === holdingId ? { ...holding, ...partialHolding } : holding;
      }),
    });
  };

  const addHolding = (label = 'Unopened', amount = '1'): void => {
    updateForm({
      holdings: [
        ...form.holdings,
        {
          amount,
          id: `holding-${Date.now()}`,
          label,
        },
      ],
    });
  };

  const useCustomItem = (): void => {
    updateForm({ catalogItemId: null });
    setIsAutocompleteOpen(false);
  };

  const removeHolding = (holdingId: string): void => {
    updateForm({
      holdings:
        form.holdings.length > 1
          ? form.holdings.filter((holding: ItemHoldingFormState): boolean => {
              return holding.id !== holdingId;
            })
          : form.holdings,
    });
  };

  const pickImage = async (source: 'camera' | 'gallery'): Promise<void> => {
    const result =
      source === 'camera'
        ? await launchCamera({ mediaType: 'photo', quality: 0.8 })
        : await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 });
    const asset: Asset | undefined = result.assets?.[0];

    if (asset?.uri) {
      updateForm({ imageUri: asset.uri });
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.editorBackdrop}>
        <View style={styles.editorPanel}>
          <View style={styles.editorHeader}>
            <Text style={styles.editorTitle}>
              {mode === 'add' ? 'Add bar item' : 'Edit bar item'}
            </Text>
            <Pressable
              accessibilityLabel="Close item editor"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }): StyleProp<ViewStyle> => {
                return [styles.iconButton, pressed ? styles.controlPressed : null];
              }}
            >
              <Icon name="close" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={styles.editorScroll}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Basics</Text>
              <TextInput
                onChangeText={(name: string): void => {
                  updateForm({ name });
                  setIsAutocompleteOpen(true);
                }}
                onFocus={(): void => {
                  setIsAutocompleteOpen(true);
                }}
                placeholder="Search or add item name"
                placeholderTextColor={colors.textSecondary}
                style={styles.editorInput}
                value={form.name}
              />
              {isAutocompleteOpen && suggestions.length > 0 ? (
                <View style={styles.autocompletePanel}>
                  {suggestions.map((item: InventoryItem): React.JSX.Element => {
                    return (
                      <Pressable
                        accessibilityLabel={`Select catalog item ${item.name}`}
                        accessibilityRole="button"
                        key={item.id}
                        onPress={(): void => {
                          selectCatalogItem(item);
                        }}
                        style={({ pressed }): StyleProp<ViewStyle> => {
                          return [
                            styles.autocompleteOption,
                            pressed ? styles.controlPressed : null,
                          ];
                        }}
                      >
                        <Text style={styles.autocompleteTitle}>{item.name}</Text>
                        <Text style={styles.autocompleteSubtitle}>
                          {item.productType ?? formatFilterLabel(item.category)}
                          {item.brand ? ` · ${item.brand}` : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    accessibilityLabel="Use custom item"
                    accessibilityRole="button"
                    onPress={useCustomItem}
                    style={({ pressed }): StyleProp<ViewStyle> => {
                      return [styles.autocompleteOption, pressed ? styles.controlPressed : null];
                    }}
                  >
                    <Text style={styles.autocompleteTitle}>Use custom item</Text>
                    <Text style={styles.autocompleteSubtitle}>
                      Keep the fields you type and manage this item manually.
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              {isCatalogSelected ? (
                <View style={styles.catalogNotice}>
                  <Text style={styles.helperText}>
                    Catalog fields are locked for consistency. Add notes, stock, and visibility
                    below.
                  </Text>
                  <Pressable
                    accessibilityLabel="Clear catalog selection"
                    accessibilityRole="button"
                    onPress={useCustomItem}
                    style={({ pressed }): StyleProp<ViewStyle> => {
                      return [styles.smallInlineButton, pressed ? styles.controlPressed : null];
                    }}
                  >
                    <Text style={styles.smallInlineButtonText}>Clear catalog selection</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Brand</Text>
                <TextInput
                  onChangeText={(brand: string): void => {
                    updateForm({ brand });
                  }}
                  placeholder="Brand"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.editorInput}
                  value={form.brand}
                />
              </View>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Subcategory</Text>
                <TextInput
                  editable={!isCatalogSelected}
                  onChangeText={(subcategory: string): void => {
                    updateForm({ subcategory });
                  }}
                  placeholder="Bourbon"
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.editorInput,
                    isCatalogSelected ? styles.editorInputDisabled : null,
                  ]}
                  value={form.subcategory}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.optionRow}>
                {allCategories.map((category: InventoryCategory): React.JSX.Element => {
                  return (
                    <FormOption
                      isDisabled={isCatalogSelected}
                      key={category}
                      isSelected={form.category === category}
                      label={formatFilterLabel(category)}
                      onPress={(): void => {
                        updateForm({ category });
                      }}
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Pressable
                accessibilityLabel={
                  isMoreDetailsOpen
                    ? 'Hide photo and advanced details'
                    : 'Show photo and advanced details'
                }
                accessibilityRole="button"
                accessibilityState={{ expanded: isMoreDetailsOpen }}
                onPress={(): void => {
                  setIsMoreDetailsOpen((isOpen: boolean): boolean => {
                    return !isOpen;
                  });
                }}
                style={({ pressed }): StyleProp<ViewStyle> => {
                  return [styles.moreDetailsButton, pressed ? styles.controlPressed : null];
                }}
              >
                <Text style={styles.secondaryButtonText}>
                  {isMoreDetailsOpen ? 'Hide Photo & Advanced Details' : 'Photo & Advanced Details'}
                </Text>
              </Pressable>
            </View>

            {isMoreDetailsOpen ? (
              <>
                <View style={styles.formRow}>
                  <View style={styles.formColumn}>
                    <Text style={styles.formLabel}>Type</Text>
                    <TextInput
                      editable={!isCatalogSelected}
                      onChangeText={(productType: string): void => {
                        updateForm({ productType });
                      }}
                      placeholder="Whiskey, glass, tool"
                      placeholderTextColor={colors.textSecondary}
                      style={[
                        styles.editorInput,
                        isCatalogSelected ? styles.editorInputDisabled : null,
                      ]}
                      value={form.productType}
                    />
                  </View>
                  {isAlcoholCategory ? (
                    <View style={styles.formColumn}>
                      <Text style={styles.formLabel}>ABV</Text>
                      <TextInput
                        editable={!isCatalogSelected}
                        keyboardType="numeric"
                        onChangeText={(abv: string): void => {
                          updateForm({ abv });
                        }}
                        placeholder="40"
                        placeholderTextColor={colors.textSecondary}
                        style={[
                          styles.editorInput,
                          isCatalogSelected ? styles.editorInputDisabled : null,
                        ]}
                        value={form.abv}
                      />
                    </View>
                  ) : null}
                </View>

                <View style={styles.formRow}>
                  {isAlcoholCategory ? (
                    <View style={styles.formColumn}>
                      <Text style={styles.formLabel}>Proof</Text>
                      <TextInput
                        editable={!isCatalogSelected}
                        keyboardType="numeric"
                        onChangeText={(proof: string): void => {
                          updateForm({ proof });
                        }}
                        placeholder="80"
                        placeholderTextColor={colors.textSecondary}
                        style={[
                          styles.editorInput,
                          isCatalogSelected ? styles.editorInputDisabled : null,
                        ]}
                        value={form.proof}
                      />
                    </View>
                  ) : null}
                  <View style={styles.formColumn}>
                    <Text style={styles.formLabel}>Size</Text>
                    <TextInput
                      editable={!isCatalogSelected}
                      onChangeText={(size: string): void => {
                        updateForm({ size });
                      }}
                      placeholder={isAlcoholCategory ? '750 ml' : '10 count'}
                      placeholderTextColor={colors.textSecondary}
                      style={[
                        styles.editorInput,
                        isCatalogSelected ? styles.editorInputDisabled : null,
                      ]}
                      value={form.size}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Unit</Text>
                  <View style={styles.optionRow}>
                    {(['bottle', 'ml', 'oz', 'count'] as const).map(
                      (unit: InventoryItem['unit']): React.JSX.Element => {
                        return (
                          <FormOption
                            key={unit}
                            isSelected={form.unit === unit}
                            label={unit}
                            onPress={(): void => {
                              updateForm({ unit });
                            }}
                          />
                        );
                      },
                    )}
                  </View>
                </View>
              </>
            ) : null}

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Stock</Text>
              <Text style={styles.helperText}>
                What you have. Total is calculated from holdings.
              </Text>
              <Text style={styles.formLabel}>Open status</Text>
              <View style={styles.viewToggle}>
                <SegmentButton
                  isActive={!form.isOpen}
                  label="Unopened"
                  onPress={(): void => {
                    updateForm({ isOpen: false });
                  }}
                />
                <SegmentButton
                  isActive={form.isOpen}
                  label="Open"
                  onPress={(): void => {
                    updateForm({ isOpen: true });
                  }}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.formSectionHeader}>
                <Text style={styles.formLabel}>What you have</Text>
                <Text style={styles.totalText}>
                  Total: {calculateHoldingQuantity(form.holdings)} {form.unit}
                </Text>
              </View>
              <View style={styles.formActionRow}>
                <MiniAction
                  label="Add unopened"
                  onPress={(): void => {
                    return addHolding('Unopened', '1');
                  }}
                />
                <MiniAction
                  label="Add open"
                  onPress={(): void => {
                    return addHolding('Open', '1');
                  }}
                />
                <MiniAction
                  label="Add custom"
                  onPress={(): void => {
                    return addHolding('Custom', '0');
                  }}
                />
              </View>
              {form.holdings.map((holding: ItemHoldingFormState): React.JSX.Element => {
                return (
                  <View key={holding.id} style={styles.holdingRow}>
                    <View style={styles.holdingLabelColumn}>
                      <TextInput
                        onChangeText={(label: string): void => {
                          updateHolding(holding.id, { label });
                        }}
                        placeholder="Bottle condition"
                        placeholderTextColor={colors.textSecondary}
                        style={styles.editorInput}
                        value={holding.label}
                      />
                    </View>
                    <View style={styles.holdingAmountColumn}>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={(amount: string): void => {
                          updateHolding(holding.id, {
                            amount: amount.startsWith('-') ? '0' : amount,
                          });
                        }}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                        style={styles.editorInput}
                        value={holding.amount}
                      />
                    </View>
                    <Pressable
                      accessibilityLabel={`Remove ${holding.label || 'holding'}`}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: form.holdings.length <= 1 }}
                      disabled={form.holdings.length <= 1}
                      onPress={(): void => {
                        removeHolding(holding.id);
                      }}
                      style={({ pressed }): StyleProp<ViewStyle> => {
                        return [
                          styles.iconButton,
                          form.holdings.length <= 1 ? styles.formOptionDisabled : null,
                          pressed ? styles.controlPressed : null,
                        ];
                      }}
                    >
                      <Icon name="remove" />
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Photo</Text>
              {form.imageUri ? (
                <Image
                  accessibilityIgnoresInvertColors
                  source={{ uri: form.imageUri }}
                  style={styles.photoPreview}
                />
              ) : null}
              <View style={styles.formActionRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={(): void => {
                    pickImage('camera').catch((error: unknown): void => {
                      logSafeError('Failed to take item photo', error);
                    });
                  }}
                  style={({ pressed }): StyleProp<ViewStyle> => {
                    return [styles.secondaryButton, pressed ? styles.controlPressed : null];
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Take Photo</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={(): void => {
                    pickImage('gallery').catch((error: unknown): void => {
                      logSafeError('Failed to select item photo', error);
                    });
                  }}
                  style={({ pressed }): StyleProp<ViewStyle> => {
                    return [styles.secondaryButton, pressed ? styles.controlPressed : null];
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Choose Photo</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Your rating</Text>
              <RatingPicker
                rating={parseOptionalNumber(form.rating)}
                onChange={(rating: number | undefined): void => {
                  updateForm({ rating: rating?.toString() ?? '' });
                }}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Review</Text>
              <TextInput
                multiline
                onChangeText={(ratingComments: string): void => {
                  updateForm({ ratingComments });
                }}
                placeholder="Add tasting notes or a review"
                placeholderTextColor={colors.textSecondary}
                style={[styles.editorInput, styles.editorTextArea]}
                value={form.ratingComments}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                multiline
                onChangeText={(description: string): void => {
                  updateForm({ description });
                }}
                placeholder="Add your own description"
                placeholderTextColor={colors.textSecondary}
                style={[styles.editorInput, styles.editorTextArea]}
                value={form.description}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Private notes</Text>
              <TextInput
                multiline
                onChangeText={(notes: string): void => {
                  updateForm({ notes });
                }}
                placeholder="Shelf location, substitutions, reminders"
                placeholderTextColor={colors.textSecondary}
                style={[styles.editorInput, styles.editorTextArea]}
                value={form.notes}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Public notes</Text>
              <Text style={styles.helperText}>
                Private notes stay local. Public notes can appear in guest views.
              </Text>
              <TextInput
                multiline
                onChangeText={(publicNotes: string): void => {
                  updateForm({ publicNotes });
                }}
                placeholder="Optional note safe for guests"
                placeholderTextColor={colors.textSecondary}
                style={[styles.editorInput, styles.editorTextArea]}
                value={form.publicNotes}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tags</Text>
              <TextInput
                onChangeText={(tags: string): void => {
                  updateForm({ tags });
                }}
                placeholder="smoky, favorite, top shelf"
                placeholderTextColor={colors.textSecondary}
                style={styles.editorInput}
                value={form.tags}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Visibility</Text>
              <View style={styles.optionRow}>
                {(['private', 'shared', 'guest_visible'] as const).map(
                  (visibility: InventoryVisibility): React.JSX.Element => {
                    return (
                      <VisibilityOption
                        key={visibility}
                        isSelected={form.visibility === visibility}
                        visibility={visibility}
                        onPress={(): void => {
                          updateForm({ visibility });
                        }}
                      />
                    );
                  },
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.editorFooter}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }): StyleProp<ViewStyle> => {
                return [styles.secondaryButton, pressed ? styles.controlPressed : null];
              }}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onSave}
              style={({ pressed }): StyleProp<ViewStyle> => {
                return [styles.applyButton, pressed ? styles.controlPressed : null];
              }}
            >
              <Text style={styles.applyButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type FormOptionProps = {
  isDisabled?: boolean;
  isSelected: boolean;
  label: string;
  onPress: () => void;
};

function FormOption({
  isDisabled = false,
  isSelected,
  label,
  onPress,
}: FormOptionProps): React.JSX.Element {
  return (
    <Pressable
      disabled={isDisabled}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, selected: isSelected }}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [
          styles.formOption,
          isSelected ? styles.formOptionSelected : null,
          isDisabled ? styles.formOptionDisabled : null,
          pressed ? styles.controlPressed : null,
        ];
      }}
    >
      <Text
        style={[
          styles.formOptionText,
          isSelected ? styles.formOptionTextSelected : null,
          isDisabled ? styles.formOptionTextDisabled : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MiniAction({ label, onPress }: { label: string; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [styles.smallInlineButton, pressed ? styles.controlPressed : null];
      }}
    >
      <Text style={styles.smallInlineButtonText}>{label}</Text>
    </Pressable>
  );
}

function RatingPicker({
  onChange,
  rating,
}: {
  onChange: (rating: number | undefined) => void;
  rating: number | undefined;
}): React.JSX.Element {
  return (
    <View
      accessibilityLabel={
        rating === undefined ? 'Rating not set' : `Current rating ${rating} out of 5`
      }
      accessibilityValue={rating === undefined ? undefined : { max: 5, min: 0, now: rating }}
      style={styles.ratingPicker}
    >
      {[1, 2, 3, 4, 5].map((value: number): React.JSX.Element => {
        const isSelected = rating !== undefined && value <= rating;

        return (
          <Pressable
            accessibilityLabel={`Rate ${value} out of 5`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={value}
            onPress={(): void => {
              onChange(value);
            }}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.starButton, pressed ? styles.controlPressed : null];
            }}
          >
            <Icon name="star" style={isSelected ? styles.starSelected : styles.starEmpty} />
          </Pressable>
        );
      })}
      <Pressable
        accessibilityLabel={rating === undefined ? 'Rating not set' : 'Clear rating'}
        accessibilityRole="button"
        onPress={(): void => {
          onChange(undefined);
        }}
        style={({ pressed }): StyleProp<ViewStyle> => {
          return [styles.smallInlineButton, pressed ? styles.controlPressed : null];
        }}
      >
        <Text style={styles.smallInlineButtonText}>
          {rating === undefined ? 'Not rated' : `${rating} / 5 · Clear`}
        </Text>
      </Pressable>
    </View>
  );
}

function VisibilityOption({
  isSelected,
  onPress,
  visibility,
}: {
  isSelected: boolean;
  onPress: () => void;
  visibility: InventoryVisibility;
}): React.JSX.Element {
  const label = formatFilterLabel(visibility);
  const helper =
    visibility === 'private'
      ? 'Only visible to you.'
      : visibility === 'shared'
        ? 'Available for share previews when included.'
        : 'Highlighted for guests.';

  return (
    <Pressable
      accessibilityLabel={`${label}. ${helper}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [
          styles.visibilityOption,
          isSelected ? styles.formOptionSelected : null,
          pressed ? styles.controlPressed : null,
        ];
      }}
    >
      <Text style={[styles.formOptionText, isSelected ? styles.formOptionTextSelected : null]}>
        {label}
      </Text>
      <Text style={styles.visibilityOptionHelper}>{helper}</Text>
    </Pressable>
  );
}

function _EmptyState({ kind }: { kind: EmptyStateKind }): React.JSX.Element {
  const copy = getEmptyStateCopy(kind);

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{copy.title}</Text>
      <Text style={styles.emptyCopy}>{copy.body}</Text>
    </View>
  );
}

function getEmptyStateCopy(kind: EmptyStateKind): { body: string; title: string } {
  if (kind === 'noArchivedItems') {
    return {
      body: 'Archived items will appear here after you archive something from your bar.',
      title: 'No archived items',
    };
  }

  if (kind === 'noSearchResults') {
    return {
      body: 'Try clearing filters, changing the search text, or adding the item as a custom entry.',
      title: 'No matching items',
    };
  }

  return {
    body: 'Tap Add to choose an item from the catalog or create a custom item.',
    title: 'No bar items yet',
  };
}

function createFormFromItem(item: InventoryItem): ItemFormState {
  return {
    abv: item.abv?.toString() ?? '',
    brand: item.brand ?? '',
    catalogItemId: null,
    category: item.category,
    description: item.description ?? '',
    holdings: createHoldingFormFromItem(item),
    imageUri: item.imageUri ?? null,
    isOpen: Boolean(item.isOpen),
    name: item.name,
    notes: item.notes ?? '',
    proof: item.proof?.toString() ?? '',
    productType: item.productType ?? '',
    publicNotes: item.publicNotes ?? '',
    rating: item.rating?.toString() ?? '',
    ratingComments: item.ratingComments ?? '',
    size: item.size ?? '',
    subcategory: item.subcategory ?? '',
    tags: item.tags?.join(', ') ?? '',
    unit: item.unit,
    visibility: item.visibility ?? 'private',
  };
}

function createItemFromForm(form: ItemFormState, id: string): InventoryItem | null {
  const name = form.name.trim();

  if (!name) {
    return null;
  }

  return {
    abv: parseOptionalNumber(form.abv),
    brand: parseOptionalText(form.brand) ?? null,
    category: form.category,
    description: parseOptionalText(form.description),
    holdings: createInventoryHoldings(form.holdings),
    id,
    imageUri: form.imageUri ?? undefined,
    isOpen: form.isOpen,
    minStock: 0,
    name,
    notes: parseOptionalText(form.notes),
    productType: parseOptionalText(form.productType),
    proof: parseOptionalNumber(form.proof) ?? null,
    publicNotes: parseOptionalText(form.publicNotes) ?? null,
    quantity: calculateHoldingQuantity(form.holdings),
    rating: clampRating(parseOptionalNumber(form.rating)),
    ratingComments: parseOptionalText(form.ratingComments),
    size: parseOptionalText(form.size) ?? null,
    subcategory: parseOptionalText(form.subcategory) ?? null,
    tags: parseTags(form.tags),
    unit: form.unit,
    visibility: form.visibility,
  };
}

function createHoldingFormFromItem(item: InventoryItem): Array<ItemHoldingFormState> {
  if (item.holdings && item.holdings.length > 0) {
    return item.holdings.map((holding: InventoryHolding): ItemHoldingFormState => {
      return {
        amount: holding.amount.toString(),
        id: holding.id,
        label: holding.label,
      };
    });
  }

  return [
    {
      amount: item.quantity.toString(),
      id: 'holding-1',
      label: item.quantity >= 1 ? 'Unopened bottle' : 'Partial bottle',
    },
  ];
}

function createInventoryHoldings(holdings: Array<ItemHoldingFormState>): Array<InventoryHolding> {
  return holdings.map((holding: ItemHoldingFormState): InventoryHolding => {
    return {
      amount: Math.max(0, parseNumberOrFallback(holding.amount, 0)),
      id: holding.id,
      label: parseOptionalText(holding.label) ?? 'Bottle',
    };
  });
}

function calculateHoldingQuantity(holdings: Array<ItemHoldingFormState>): number {
  return createInventoryHoldings(holdings).reduce(
    (total: number, holding: InventoryHolding): number => {
      return total + holding.amount;
    },
    0,
  );
}

function createInventoryItemId(name: string): string {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `custom-${normalizedName || 'item'}-${Date.now()}`;
}

function parseOptionalText(value: string): string | undefined {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function parseOptionalNumber(value: string): number | undefined {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNumberOrFallback(value: string, fallback: number): number {
  return parseOptionalNumber(value) ?? fallback;
}

function clampRating(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return Math.min(5, Math.max(0, value));
}

function parseTags(value: string): Array<string> | undefined {
  const tags = value
    .split(',')
    .map((tag: string): string => {
      return tag.trim();
    })
    .filter((tag: string): boolean => {
      return tag.length > 0;
    });

  return tags.length > 0 ? tags : undefined;
}

function getStockStatus(item: InventoryItem): StockStatus {
  if (item.quantity <= 0) {
    return 'outOfStock';
  }

  if (item.quantity <= item.minStock) {
    return 'lowStock';
  }

  return 'inStock';
}

function compareInventoryItems(
  left: InventoryItem,
  right: InventoryItem,
  sortBy: SortOption,
  sortDirection: SortDirection,
): number {
  const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

  if (sortBy === 'rating') {
    return ((left.rating ?? 0) - (right.rating ?? 0)) * directionMultiplier;
  }

  if (sortBy === 'quantity') {
    return (left.quantity - right.quantity) * directionMultiplier;
  }

  if (sortBy === 'updatedAt') {
    return (parseDateValue(left.updatedAt) - parseDateValue(right.updatedAt)) * directionMultiplier;
  }

  return left.name.localeCompare(right.name) * directionMultiplier;
}

function parseDateValue(value: string | undefined): number {
  const parsed = Date.parse(value ?? '');

  return Number.isFinite(parsed) ? parsed : 0;
}

function getSortLabel(filters: BarFilterState): string {
  const selectedSort = sortSelections.find((sortSelection: SortSelection): boolean => {
    return (
      sortSelection.sortBy === filters.sortBy && sortSelection.direction === filters.sortDirection
    );
  });

  return selectedSort?.label ?? 'Name A-Z';
}

function getActiveFilterCount(filters: BarFilterState): number {
  return (
    (filters.archiveStatus === 'archived' ? 1 : 0) +
    filters.categories.length +
    filters.productTypes.length +
    filters.stockStatuses.length +
    (filters.sortBy !== initialFilters.sortBy ||
    filters.sortDirection !== initialFilters.sortDirection
      ? 1
      : 0)
  );
}

function modeLabel(mode: EditorMode): string {
  return mode === 'add' ? 'Item saved.' : 'Item updated.';
}

function formatSelectedSummary(selectedValues: Array<string>, fallback: string): string {
  if (selectedValues.length === 0) {
    return fallback;
  }

  if (selectedValues.length === 1) {
    return selectedValues[0];
  }

  return `${selectedValues.length} selected`;
}

function formatFilterLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (firstLetter: string): string => {
      return firstLetter.toUpperCase();
    });
}

const styles = StyleSheet.create({
  activeChip: {
    alignItems: 'center',
    ...componentTokens.chip,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  activeChipIcon: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  activeChipText: {
    color: colors.textPrimary,
    ...typography.caption,
    fontWeight: '800',
  },
  activeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  addButton: {
    ...componentTokens.primaryButton,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  applyButton: {
    alignItems: 'center',
    ...componentTokens.primaryButton,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  applyButtonText: {
    color: colors.textPrimary,
    ...typography.button,
    fontWeight: '900',
  },
  autocompleteOption: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  autocompletePanel: {
    ...componentTokens.card,
    marginTop: spacing.sm,
    padding: spacing.xs,
  },
  autocompleteSubtitle: {
    color: colors.textSecondary,
    ...typography.caption,
    marginTop: 2,
  },
  autocompleteTitle: {
    color: colors.textPrimary,
    ...typography.bodyStrong,
  },
  catalogNotice: {
    ...componentTokens.card,
    backgroundColor: colors.surfacePressed,
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkboxSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentMuted,
  },
  checkboxText: {
    color: colors.textPrimary,
    ...typography.caption,
    fontWeight: '900',
  },
  compactIconButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  container: {
    ...componentTokens.screen,
    paddingBottom: 28,
  },
  controlPressed: {
    opacity: 0.78,
  },
  controls: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  displayRow: {
    gap: spacing.md,
  },
  dropdown: {
    ...componentTokens.secondaryButton,
    overflow: 'hidden',
  },
  dropdownButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dropdownIcon: {
    color: colors.textPrimary,
    ...typography.sectionTitle,
    fontWeight: '900',
    marginLeft: spacing.md,
  },
  dropdownOption: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownOptionSelected: {
    backgroundColor: colors.highlight,
  },
  dropdownOptionText: {
    color: colors.textPrimary,
    flex: 1,
    ...typography.bodyStrong,
  },
  dropdownOptions: {
    gap: spacing.xs,
  },
  dropdownPanel: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.sm,
  },
  dropdownSummary: {
    color: colors.textSecondary,
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  dropdownText: {
    flex: 1,
  },
  editorBackdrop: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'flex-end',
  },
  editorFooter: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  editorHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  editorInput: {
    ...componentTokens.input,
    ...typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  editorInputDisabled: {
    opacity: 0.62,
  },
  editorPanel: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    maxHeight: '92%',
    ...shadows.modal,
  },
  editorScroll: {
    padding: spacing.lg,
  },
  editorTextArea: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  editorTitle: {
    color: colors.textPrimary,
    ...typography.sectionTitle,
    fontWeight: '900',
  },
  emptyCopy: {
    color: colors.textSecondary,
    ...typography.bodySmall,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    ...componentTokens.card,
    padding: spacing['2xl'],
  },
  emptyTitle: {
    color: colors.textPrimary,
    ...typography.cardTitle,
  },
  feedbackText: {
    ...componentTokens.card,
    backgroundColor: colors.surfacePressed,
    color: colors.textPrimary,
    ...typography.bodySmall,
    fontWeight: '800',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterButton: {
    ...componentTokens.secondaryButton,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentMuted,
  },
  filterButtonText: {
    color: colors.textSecondary,
    ...typography.caption,
    fontWeight: '800',
  },
  filterButtonTextActive: {
    color: colors.textPrimary,
  },
  filterPanel: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  filterSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    maxHeight: '82%',
    ...shadows.modal,
  },
  filterTitle: {
    color: colors.textPrimary,
    ...typography.bodyStrong,
  },
  formActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  formColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  formGroup: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  formLabel: {
    color: colors.accent,
    ...typography.label,
  },
  formOption: {
    ...componentTokens.secondaryButton,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  formOptionDisabled: {
    opacity: 0.55,
  },
  formOptionSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentMuted,
  },
  formOptionText: {
    color: colors.textSecondary,
    ...typography.caption,
    fontWeight: '800',
  },
  formOptionTextDisabled: {
    color: colors.textSecondary,
  },
  formOptionTextSelected: {
    color: colors.textPrimary,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  formSection: {
    ...componentTokens.card,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  formSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formSectionTitle: {
    color: colors.textPrimary,
    ...typography.cardTitle,
    fontWeight: '900',
  },
  helperText: {
    color: colors.textSecondary,
    ...typography.caption,
  },
  holdingAmountColumn: {
    width: 82,
  },
  holdingLabelColumn: {
    flex: 1,
  },
  holdingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  moreDetailsButton: {
    alignItems: 'center',
    ...componentTokens.secondaryButton,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageSubtitle: {
    color: colors.textSecondary,
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  pageTitle: {
    color: colors.textPrimary,
    ...typography.screenTitle,
  },
  photoPreview: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    height: 120,
    width: 120,
  },
  radioMark: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    color: colors.textPrimary,
    ...typography.caption,
    height: 20,
    lineHeight: 18,
    textAlign: 'center',
    width: 20,
  },
  radioMarkSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentMuted,
  },
  ratingPicker: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  searchBox: {
    alignItems: 'center',
    ...componentTokens.input,
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    color: colors.textSecondary,
    ...typography.caption,
  },
  searchInput: {
    color: colors.textPrimary,
    flex: 1,
    ...typography.body,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  searchToolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    alignItems: 'center',
    ...componentTokens.secondaryButton,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    ...typography.caption,
    fontWeight: '900',
  },
  segmentButton: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.accentMuted,
  },
  segmentButtonText: {
    color: colors.textSecondary,
    ...typography.caption,
    fontWeight: '800',
  },
  segmentButtonTextActive: {
    color: colors.textPrimary,
  },
  smallInlineButton: {
    alignItems: 'center',
    ...componentTokens.secondaryButton,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  smallInlineButtonText: {
    color: colors.textPrimary,
    ...typography.caption,
    fontWeight: '900',
  },
  starButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  starEmpty: {
    color: colors.textSecondary,
    ...typography.sectionTitle,
  },
  starSelected: {
    color: colors.warning,
    ...typography.sectionTitle,
  },
  totalText: {
    color: colors.textPrimary,
    ...typography.caption,
    fontWeight: '900',
  },
  utilityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  viewToggle: {
    ...componentTokens.secondaryButton,
    flexDirection: 'row',
    padding: 3,
  },
  visibilityHelper: {
    color: colors.textSecondary,
    ...typography.caption,
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  visibilityOption: {
    ...componentTokens.secondaryButton,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  visibilityOptionHelper: {
    color: colors.textSecondary,
    ...typography.caption,
  },
});

export default BarScreen;
