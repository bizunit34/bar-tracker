import React, { useMemo, useState } from 'react';
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
import {
  archiveBarInventoryItem,
  removeBarInventoryItem,
  restoreBarInventoryItem,
  saveBarInventoryItem,
  useBarInventoryItems,
} from '../data/barInventoryStore';
import { colors } from '../theme/colors';
import {
  InventoryCategory,
  InventoryHolding,
  InventoryItem,
  InventoryVisibility,
} from '../types/inventory';

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

function BarScreen(): React.JSX.Element {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<BarFilterState>(initialFilters);
  const inventoryItems = useBarInventoryItems();
  const [editorMode, setEditorMode] = useState<EditorMode>('add');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemFormState>(emptyItemForm);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

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

  const openAddItem = (): void => {
    setEditorMode('add');
    setEditingItemId(null);
    setForm(emptyItemForm);
    setIsEditorOpen(true);
  };

  const openEditItem = (item: InventoryItem): void => {
    setEditorMode('edit');
    setEditingItemId(item.id);
    setForm(createFormFromItem(item));
    setIsEditorOpen(true);
  };

  const closeEditor = (): void => {
    setIsEditorOpen(false);
  };

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
  };

  const removeItem = (itemId: string): void => {
    removeBarInventoryItem(itemId);
    setExpandedItemId(null);
  };

  const archiveItem = (itemId: string): void => {
    archiveBarInventoryItem(itemId);
    setExpandedItemId(null);
  };

  const restoreItem = (itemId: string): void => {
    restoreBarInventoryItem(itemId);
    setExpandedItemId(itemId);
    setFilters({ ...filters, archiveStatus: 'active' });
  };

  const confirmRemoveItem = (item: InventoryItem): void => {
    Alert.alert('Delete item?', `Delete ${item.name} permanently? This cannot be undone.`, [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Delete',
        onPress: (): void => {
          removeItem(item.id);
        },
      },
    ]);
  };

  const duplicateItem = (item: InventoryItem): void => {
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
    setFilters({ ...filters, archiveStatus: 'active' });
  };

  const toggleOpenStatus = (item: InventoryItem): void => {
    saveBarInventoryItem({
      ...item,
      isOpen: !item.isOpen,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleVisibility = (item: InventoryItem): void => {
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
  };

  const emptyStateKind = useMemo((): EmptyStateKind => {
    if (inventoryItems.length === 0) {
      return 'noInventory';
    }

    if (filters.archiveStatus === 'archived') {
      return 'noArchivedItems';
    }

    return 'noSearchResults';
  }, [filters.archiveStatus, inventoryItems.length]);

  const renderItem = ({ item }: ListRenderItemInfo<InventoryItem>): React.JSX.Element => {
    if (filters.viewMode === 'display') {
      return (
        <BarDisplayCard
          item={item}
          onArchive={archiveItem}
          onDuplicate={duplicateItem}
          onEdit={openEditItem}
          onRemove={confirmRemoveItem}
          onRestore={restoreItem}
          onToggleOpen={toggleOpenStatus}
          onToggleVisibility={toggleVisibility}
        />
      );
    }

    return (
      <BarAccordionRow
        onArchive={archiveItem}
        onDuplicate={duplicateItem}
        onEdit={openEditItem}
        isExpanded={item.id === expandedItemId}
        item={item}
        onRemove={confirmRemoveItem}
        onRestore={restoreItem}
        onToggleOpen={toggleOpenStatus}
        onToggleVisibility={toggleVisibility}
        onPress={(): void => {
          setExpandedItemId((currentItemId: string | null): string | null => {
            return currentItemId === item.id ? null : item.id;
          });
        }}
      />
    );
  };

  return (
    <FlatList
      columnWrapperStyle={filters.viewMode === 'display' ? styles.displayRow : undefined}
      contentContainerStyle={styles.container}
      data={visibleItems}
      extraData={expandedItemId}
      key={filters.viewMode}
      keyExtractor={(item: InventoryItem): string => {
        return item.id;
      }}
      ListEmptyComponent={<EmptyState kind={emptyStateKind} />}
      ListHeaderComponent={
        <BarControls
          filters={filters}
          onAddItem={openAddItem}
          productTypes={productTypes}
          resultCount={visibleItems.length}
          onFiltersChange={(nextFilters: BarFilterState): void => {
            setExpandedItemId(null);
            setFilters(nextFilters);
          }}
        />
      }
      numColumns={filters.viewMode === 'display' ? 2 : 1}
      renderItem={renderItem}
      ListFooterComponent={
        <ItemEditorModal
          catalogItems={catalogInventoryItems}
          form={form}
          mode={editorMode}
          visible={isEditorOpen}
          onChange={setForm}
          onClose={closeEditor}
          onSave={saveItem}
        />
      }
    />
  );
}

type BarControlsProps = {
  filters: BarFilterState;
  onAddItem: () => void;
  onFiltersChange: (filters: BarFilterState) => void;
  productTypes: Array<string>;
  resultCount: number;
};

function BarControls({
  filters,
  onAddItem,
  onFiltersChange,
  productTypes,
  resultCount,
}: BarControlsProps): React.JSX.Element {
  const [draftFilters, setDraftFilters] = useState<BarFilterState>(filters);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState<boolean>(false);
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);

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
        </View>
        <View style={styles.controlRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onAddItem}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.addButton, pressed ? styles.controlPressed : null];
            }}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={toggleFilterMenu}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [
                styles.filterButton,
                isFilterMenuOpen ? styles.filterButtonActive : null,
                pressed ? styles.controlPressed : null,
              ];
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                isFilterMenuOpen ? styles.filterButtonTextActive : null,
              ]}
            >
              Filter
            </Text>
          </Pressable>
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
      </View>

      {isFilterMenuOpen ? (
        <View style={styles.filterPanel}>
          <TextInput
            onChangeText={(query: string): void => {
              updateDraftFilters({ query });
            }}
            placeholder="Search name or brand"
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            value={draftFilters.query}
          />

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
        </View>
      ) : null}
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
        accessibilityRole="button"
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
        <Text style={styles.dropdownIcon}>{isOpen ? 'v' : '>'}</Text>
      </Pressable>

      {isOpen ? <View style={styles.dropdownPanel}>{children}</View> : null}
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
              <Text style={styles.checkboxText}>{isSelected ? 'x' : ''}</Text>
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
            <Text style={[styles.radioMark, isSelected ? styles.radioMarkSelected : null]}>
              {isSelected ? 'o' : ''}
            </Text>
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

type BarAccordionRowProps = {
  isExpanded: boolean;
  item: InventoryItem;
  onArchive: (itemId: string) => void;
  onDuplicate: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onPress: () => void;
  onRemove: (item: InventoryItem) => void;
  onRestore: (itemId: string) => void;
  onToggleOpen: (item: InventoryItem) => void;
  onToggleVisibility: (item: InventoryItem) => void;
};

function BarAccordionRow({
  isExpanded,
  item,
  onArchive,
  onDuplicate,
  onEdit,
  onPress,
  onRemove,
  onRestore,
  onToggleOpen,
  onToggleVisibility,
}: BarAccordionRowProps): React.JSX.Element {
  return (
    <View style={styles.accordionCard}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }): StyleProp<ViewStyle> => {
          return [styles.accordionSummary, pressed ? styles.controlPressed : null];
        }}
      >
        <Text style={[styles.expandIcon, isExpanded ? styles.expandIconOpen : null]}>{'>'}</Text>
        <StatusIcon item={item} />
        <View style={styles.summaryText}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemType}>
            {[item.brand, item.productType ?? formatFilterLabel(item.category)]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <View style={styles.summaryBadges}>
            <Text style={styles.summaryBadge}>
              {formatFilterLabel(item.visibility ?? 'private')}
            </Text>
            {item.isArchived ? <Text style={styles.summaryBadge}>Archived</Text> : null}
            {item.isOpen ? <Text style={styles.summaryBadge}>Open</Text> : null}
          </View>
        </View>
        <Text style={styles.ratingText}>{formatRating(item.rating)}</Text>
      </Pressable>

      {isExpanded ? (
        <ProductDetails
          item={item}
          onArchive={onArchive}
          onDuplicate={onDuplicate}
          onEdit={onEdit}
          onRemove={onRemove}
          onRestore={onRestore}
          onToggleOpen={onToggleOpen}
          onToggleVisibility={onToggleVisibility}
        />
      ) : null}
    </View>
  );
}

type ProductCardProps = {
  item: InventoryItem;
};

type ProductActionsProps = ProductCardProps & {
  onArchive?: (itemId: string) => void;
  onDuplicate: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onRemove?: (item: InventoryItem) => void;
  onRestore?: (itemId: string) => void;
  onToggleOpen: (item: InventoryItem) => void;
  onToggleVisibility: (item: InventoryItem) => void;
};

function BarDisplayCard({
  item,
  onArchive,
  onDuplicate,
  onEdit,
  onRemove,
  onRestore,
  onToggleOpen,
  onToggleVisibility,
}: ProductActionsProps): React.JSX.Element {
  return (
    <View style={styles.displayCard}>
      <View style={styles.displayStatusRow}>
        <StatusIcon item={item} />
        <Text style={styles.displayRating}>{formatRating(item.rating)}</Text>
      </View>
      <Text style={styles.displayName}>{item.name}</Text>
      <Text style={styles.itemType}>
        {[item.brand, item.productType ?? formatFilterLabel(item.category)]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <Text style={styles.displayQuantity}>
        {item.quantity} {item.unit}
      </Text>
      <View style={styles.summaryBadges}>
        <Text style={styles.summaryBadge}>{formatFilterLabel(item.visibility ?? 'private')}</Text>
        {item.isArchived ? <Text style={styles.summaryBadge}>Archived</Text> : null}
        {item.isOpen ? <Text style={styles.summaryBadge}>Open</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={(): void => {
          onEdit(item);
        }}
        style={({ pressed }): StyleProp<ViewStyle> => {
          return [styles.secondaryButton, pressed ? styles.controlPressed : null];
        }}
      >
        <Text style={styles.secondaryButtonText}>Edit</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={(): void => {
          onDuplicate(item);
        }}
        style={({ pressed }): StyleProp<ViewStyle> => {
          return [styles.secondaryButton, pressed ? styles.controlPressed : null];
        }}
      >
        <Text style={styles.secondaryButtonText}>Duplicate</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={(): void => {
          onToggleOpen(item);
        }}
        style={({ pressed }): StyleProp<ViewStyle> => {
          return [styles.secondaryButton, pressed ? styles.controlPressed : null];
        }}
      >
        <Text style={styles.secondaryButtonText}>
          {item.isOpen ? 'Mark Unopened' : 'Mark Open'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={(): void => {
          onToggleVisibility(item);
        }}
        style={({ pressed }): StyleProp<ViewStyle> => {
          return [styles.secondaryButton, pressed ? styles.controlPressed : null];
        }}
      >
        <Text style={styles.secondaryButtonText}>
          Visibility: {formatFilterLabel(item.visibility ?? 'private')}
        </Text>
      </Pressable>
      {item.isArchived ? (
        <Pressable
          accessibilityRole="button"
          onPress={(): void => {
            onRestore?.(item.id);
          }}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.secondaryButton, pressed ? styles.controlPressed : null];
          }}
        >
          <Text style={styles.secondaryButtonText}>Restore</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={(): void => {
            onArchive?.(item.id);
          }}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.secondaryButton, pressed ? styles.controlPressed : null];
          }}
        >
          <Text style={styles.secondaryButtonText}>Archive</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={(): void => {
          onRemove?.(item);
        }}
        style={({ pressed }): StyleProp<ViewStyle> => {
          return [styles.dangerButton, pressed ? styles.controlPressed : null];
        }}
      >
        <Text style={styles.dangerButtonText}>Delete</Text>
      </Pressable>
    </View>
  );
}

function ProductDetails({
  item,
  onArchive,
  onDuplicate,
  onEdit,
  onRemove,
  onRestore,
  onToggleOpen,
  onToggleVisibility,
}: ProductActionsProps): React.JSX.Element {
  return (
    <View style={styles.details}>
      <DetailLine label="Stock" value={`${item.quantity} ${item.unit} available`} />
      {item.brand ? <DetailLine label="Brand" value={item.brand} /> : null}
      {item.subcategory ? <DetailLine label="Subcategory" value={item.subcategory} /> : null}
      {item.size ? <DetailLine label="Size" value={item.size} /> : null}
      {item.proof !== null && item.proof !== undefined ? (
        <DetailLine label="Proof" value={`${item.proof}`} />
      ) : null}
      <DetailLine label="Open" value={item.isOpen ? 'Yes' : 'No'} />
      <DetailLine label="Visibility" value={formatFilterLabel(item.visibility ?? 'private')} />
      {item.tags && item.tags.length > 0 ? (
        <DetailLine label="Tags" value={item.tags.join(', ')} />
      ) : null}
      {item.holdings?.map((holding: InventoryHolding): React.JSX.Element => {
        return (
          <DetailLine
            key={holding.id}
            label={holding.label}
            value={`${holding.amount} ${item.unit}`}
          />
        );
      })}
      {item.abv !== undefined ? <DetailLine label="ABV" value={`${item.abv}%`} /> : null}
      {item.description ? <DetailBlock label="Description" value={item.description} /> : null}
      {item.ratingComments ? (
        <DetailBlock label="Rating notes" value={item.ratingComments} />
      ) : null}
      {item.notes ? <DetailBlock label="Bar notes" value={item.notes} /> : null}
      <View style={styles.itemActionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={(): void => {
            onEdit(item);
          }}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.secondaryButton, pressed ? styles.controlPressed : null];
          }}
        >
          <Text style={styles.secondaryButtonText}>Edit</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={(): void => {
            onDuplicate(item);
          }}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.secondaryButton, pressed ? styles.controlPressed : null];
          }}
        >
          <Text style={styles.secondaryButtonText}>Duplicate</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={(): void => {
            onToggleOpen(item);
          }}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.secondaryButton, pressed ? styles.controlPressed : null];
          }}
        >
          <Text style={styles.secondaryButtonText}>
            {item.isOpen ? 'Mark Unopened' : 'Mark Open'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={(): void => {
            onToggleVisibility(item);
          }}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.secondaryButton, pressed ? styles.controlPressed : null];
          }}
        >
          <Text style={styles.secondaryButtonText}>
            Visibility: {formatFilterLabel(item.visibility ?? 'private')}
          </Text>
        </Pressable>
        {item.isArchived ? (
          <Pressable
            accessibilityRole="button"
            onPress={(): void => {
              onRestore?.(item.id);
            }}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.secondaryButton, pressed ? styles.controlPressed : null];
            }}
          >
            <Text style={styles.secondaryButtonText}>Restore</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={(): void => {
              onArchive?.(item.id);
            }}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.secondaryButton, pressed ? styles.controlPressed : null];
            }}
          >
            <Text style={styles.secondaryButtonText}>Archive</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={(): void => {
            onRemove?.(item);
          }}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.dangerButton, pressed ? styles.controlPressed : null];
          }}
        >
          <Text style={styles.dangerButtonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

type DetailProps = {
  label: string;
  value: string;
};

function DetailLine({ label, value }: DetailProps): React.JSX.Element {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function DetailBlock({ label, value }: DetailProps): React.JSX.Element {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailCopy}>{value}</Text>
    </View>
  );
}

function StatusIcon({ item }: ProductCardProps): React.JSX.Element {
  const status = getStockStatus(item);

  return (
    <View style={[styles.statusIcon, getStatusIconStyle(status)]}>
      <Text style={styles.statusIconText}>{getStatusIconLabel(status)}</Text>
    </View>
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

  const addHolding = (): void => {
    updateForm({
      holdings: [
        ...form.holdings,
        {
          amount: '1',
          id: `holding-${Date.now()}`,
          label: 'Unopened bottle',
        },
      ],
    });
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
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }): StyleProp<ViewStyle> => {
                return [styles.iconButton, pressed ? styles.controlPressed : null];
              }}
            >
              <Text style={styles.iconButtonText}>x</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={styles.editorScroll}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Item</Text>
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
                        </Text>
                      </Pressable>
                    );
                  })}
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

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Type</Text>
                <TextInput
                  editable={!isCatalogSelected}
                  onChangeText={(productType: string): void => {
                    updateForm({ productType });
                  }}
                  placeholder="Whiskey"
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.editorInput,
                    isCatalogSelected ? styles.editorInputDisabled : null,
                  ]}
                  value={form.productType}
                />
              </View>
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
            </View>

            <View style={styles.formRow}>
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
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Size</Text>
                <TextInput
                  editable={!isCatalogSelected}
                  onChangeText={(size: string): void => {
                    updateForm({ size });
                  }}
                  placeholder="750 ml"
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

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Bottle status</Text>
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
                <Text style={styles.formLabel}>Quantity</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={addHolding}
                  style={({ pressed }): StyleProp<ViewStyle> => {
                    return [styles.secondaryButton, pressed ? styles.controlPressed : null];
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Add</Text>
                </Pressable>
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
                          updateHolding(holding.id, { amount });
                        }}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                        style={styles.editorInput}
                        value={holding.amount}
                      />
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={(): void => {
                        removeHolding(holding.id);
                      }}
                      style={({ pressed }): StyleProp<ViewStyle> => {
                        return [styles.iconButton, pressed ? styles.controlPressed : null];
                      }}
                    >
                      <Text style={styles.iconButtonText}>-</Text>
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
                      console.error('Failed to take item photo.', error);
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
                      console.error('Failed to select item photo.', error);
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
              <TextInput
                keyboardType="numeric"
                onChangeText={(rating: string): void => {
                  updateForm({ rating });
                }}
                placeholder="0-5"
                placeholderTextColor={colors.textSecondary}
                style={styles.editorInput}
                value={form.rating}
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
                      <FormOption
                        key={visibility}
                        isSelected={form.visibility === visibility}
                        label={formatFilterLabel(visibility)}
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
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
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

function EmptyState({ kind }: { kind: EmptyStateKind }): React.JSX.Element {
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
      amount: parseNumberOrFallback(holding.amount, 0),
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

function getStatusIconLabel(status: StockStatus): string {
  if (status === 'outOfStock') {
    return '!';
  }

  if (status === 'lowStock') {
    return '-';
  }

  return '+';
}

function getStatusIconStyle(status: StockStatus): ViewStyle {
  if (status === 'outOfStock') {
    return styles.statusOut;
  }

  if (status === 'lowStock') {
    return styles.statusLow;
  }

  return styles.statusIn;
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

function formatSelectedSummary(selectedValues: Array<string>, fallback: string): string {
  if (selectedValues.length === 0) {
    return fallback;
  }

  if (selectedValues.length === 1) {
    return selectedValues[0];
  }

  return `${selectedValues.length} selected`;
}

function formatRating(rating: number | undefined): string {
  if (rating === undefined) {
    return 'Not rated';
  }

  return `${rating.toFixed(1)} / 5`;
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
  accordionCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accordionSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  addButton: {
    backgroundColor: colors.accentMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  applyButton: {
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  applyButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  autocompleteOption: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  autocompletePanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    padding: 4,
  },
  autocompleteSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  autocompleteTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 4,
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
    fontSize: 12,
    fontWeight: '900',
  },
  container: {
    backgroundColor: colors.background,
    padding: 20,
    paddingBottom: 28,
  },
  controlPressed: {
    opacity: 0.78,
  },
  controlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  controls: {
    gap: 12,
    marginBottom: 16,
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dangerButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '900',
  },
  detailBlock: {
    marginTop: 12,
  },
  detailCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  detailLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  details: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: 14,
    paddingTop: 12,
  },
  displayCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginBottom: 12,
    padding: 14,
  },
  displayName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  displayQuantity: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  displayRating: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  displayRow: {
    gap: 12,
  },
  displayStatusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownIcon: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 12,
  },
  dropdownOption: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  dropdownOptionSelected: {
    backgroundColor: colors.highlight,
  },
  dropdownOptionText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownOptions: {
    gap: 4,
  },
  dropdownPanel: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: 8,
  },
  dropdownSummary: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
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
    gap: 10,
    justifyContent: 'flex-end',
    padding: 14,
  },
  editorHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  editorInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  editorInputDisabled: {
    opacity: 0.62,
  },
  editorPanel: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    maxHeight: '92%',
  },
  editorScroll: {
    padding: 16,
  },
  editorTextArea: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  editorTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  expandIcon: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    width: 14,
  },
  expandIconOpen: {
    transform: [{ rotate: '90deg' }],
  },
  filterButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterButtonActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentMuted,
  },
  filterButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  filterButtonTextActive: {
    color: colors.textPrimary,
  },
  filterPanel: {
    gap: 12,
  },
  filterTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  formActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formColumn: {
    flex: 1,
    gap: 6,
  },
  formGroup: {
    gap: 6,
    marginBottom: 14,
  },
  formLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  formOption: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    fontSize: 13,
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
    gap: 10,
    marginBottom: 14,
  },
  formSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  itemActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  itemName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  itemType: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  photoPreview: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 120,
    width: 120,
  },
  radioMark: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 8,
    height: 20,
    lineHeight: 18,
    textAlign: 'center',
    width: 20,
  },
  radioMarkSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentMuted,
  },
  ratingText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentButton: {
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  segmentButtonActive: {
    backgroundColor: colors.accentMuted,
  },
  segmentButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  segmentButtonTextActive: {
    color: colors.textPrimary,
  },
  statusIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  statusIconText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '900',
  },
  statusIn: {
    backgroundColor: colors.success,
  },
  statusLow: {
    backgroundColor: colors.warning,
  },
  statusOut: {
    backgroundColor: colors.danger,
  },
  summaryBadge: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  summaryBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 7,
  },
  summaryText: {
    flex: 1,
  },
  viewToggle: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  },
});

export default BarScreen;
