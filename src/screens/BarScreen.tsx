import React, { useMemo, useState } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { sampleInventory } from '../data/sampleInventory';
import { colors } from '../theme/colors';
import { InventoryCategory, InventoryItem } from '../types/inventory';

type ViewMode = 'list' | 'display';

type StockStatus = 'inStock' | 'lowStock' | 'outOfStock';

type SortOption = 'name' | 'rating' | 'quantity';

type SortDirection = 'asc' | 'desc';

type OpenDropdown = 'category' | 'sort' | 'stock' | 'type' | null;

type BarFilterState = {
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

const allCategories: Array<InventoryCategory> = [
  'spirit',
  'liqueur',
  'mixer',
  'garnish',
  'bitter',
  'other',
];

const stockFilters: Array<StockStatus> = ['inStock', 'lowStock', 'outOfStock'];

const sortSelections: Array<SortSelection> = [
  { direction: 'asc', label: 'Name A-Z', sortBy: 'name' },
  { direction: 'desc', label: 'Name Z-A', sortBy: 'name' },
  { direction: 'desc', label: 'Rating high-low', sortBy: 'rating' },
  { direction: 'asc', label: 'Rating low-high', sortBy: 'rating' },
  { direction: 'desc', label: 'Quantity high-low', sortBy: 'quantity' },
  { direction: 'asc', label: 'Quantity low-high', sortBy: 'quantity' },
];

const initialFilters: BarFilterState = {
  categories: [],
  productTypes: [],
  query: '',
  sortBy: 'name',
  sortDirection: 'asc',
  stockStatuses: [],
  viewMode: 'list',
};

function BarScreen(): React.JSX.Element {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<BarFilterState>(initialFilters);

  const productTypes = useMemo((): Array<string> => {
    return Array.from(
      new Set(
        sampleInventory.map((item: InventoryItem): string => {
          return item.productType ?? formatFilterLabel(item.category);
        }),
      ),
    ).sort((left: string, right: string): number => {
      return left.localeCompare(right);
    });
  }, []);

  const visibleItems = useMemo((): Array<InventoryItem> => {
    const normalizedQuery = filters.query.trim().toLowerCase();

    return sampleInventory
      .filter((item: InventoryItem): boolean => {
        const productType = item.productType ?? formatFilterLabel(item.category);

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
          item.category,
          item.productType,
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
  }, [filters]);

  const renderItem = ({ item }: ListRenderItemInfo<InventoryItem>): React.JSX.Element => {
    if (filters.viewMode === 'display') {
      return <BarDisplayCard item={item} />;
    }

    return (
      <BarAccordionRow
        isExpanded={item.id === expandedItemId}
        item={item}
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
      ListEmptyComponent={<EmptyState />}
      ListHeaderComponent={
        <BarControls
          filters={filters}
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
    />
  );
}

type BarControlsProps = {
  filters: BarFilterState;
  onFiltersChange: (filters: BarFilterState) => void;
  productTypes: Array<string>;
  resultCount: number;
};

function BarControls({
  filters,
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
          <Text style={styles.pageSubtitle}>{resultCount} stocked items</Text>
        </View>
        <View style={styles.controlRow}>
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
            placeholder="Search products"
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            value={draftFilters.query}
          />

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
  onPress: () => void;
};

function BarAccordionRow({ isExpanded, item, onPress }: BarAccordionRowProps): React.JSX.Element {
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
            {item.productType ?? formatFilterLabel(item.category)}
          </Text>
        </View>
        <Text style={styles.ratingText}>{formatRating(item.rating)}</Text>
      </Pressable>

      {isExpanded ? <ProductDetails item={item} /> : null}
    </View>
  );
}

type ProductCardProps = {
  item: InventoryItem;
};

function BarDisplayCard({ item }: ProductCardProps): React.JSX.Element {
  return (
    <View style={styles.displayCard}>
      <View style={styles.displayStatusRow}>
        <StatusIcon item={item} />
        <Text style={styles.displayRating}>{formatRating(item.rating)}</Text>
      </View>
      <Text style={styles.displayName}>{item.name}</Text>
      <Text style={styles.itemType}>{item.productType ?? formatFilterLabel(item.category)}</Text>
      <Text style={styles.displayQuantity}>
        {item.quantity} {item.unit}
      </Text>
    </View>
  );
}

function ProductDetails({ item }: ProductCardProps): React.JSX.Element {
  return (
    <View style={styles.details}>
      <DetailLine label="Stock" value={`${item.quantity} ${item.unit} available`} />
      <DetailLine label="Minimum" value={`${item.minStock} ${item.unit}`} />
      {item.abv !== undefined ? <DetailLine label="ABV" value={`${item.abv}%`} /> : null}
      {item.description ? <DetailBlock label="Description" value={item.description} /> : null}
      {item.ratingComments ? (
        <DetailBlock label="Rating notes" value={item.ratingComments} />
      ) : null}
      {item.notes ? <DetailBlock label="Bar notes" value={item.notes} /> : null}
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

function EmptyState(): React.JSX.Element {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No matching bar items</Text>
      <Text style={styles.emptyCopy}>Adjust the filters or search to see more inventory.</Text>
    </View>
  );
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

  return left.name.localeCompare(right.name) * directionMultiplier;
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
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (firstLetter: string): string => {
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
