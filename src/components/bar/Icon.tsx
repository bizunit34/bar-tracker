import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { colors, typography } from '../../theme';

export type BarIconName =
  | 'add'
  | 'archive'
  | 'camera'
  | 'check'
  | 'chevronDown'
  | 'chevronRight'
  | 'close'
  | 'duplicate'
  | 'edit'
  | 'filter'
  | 'guestVisible'
  | 'image'
  | 'more'
  | 'private'
  | 'remove'
  | 'restore'
  | 'search'
  | 'shared'
  | 'sort'
  | 'star'
  | 'stockIn'
  | 'stockLow'
  | 'stockOut'
  | 'trash';

const iconGlyphs: Record<BarIconName, string> = {
  add: '+',
  archive: 'box',
  camera: 'cam',
  check: '✓',
  chevronDown: '⌄',
  chevronRight: '›',
  close: '×',
  duplicate: 'copy',
  edit: 'edit',
  filter: 'filter',
  guestVisible: 'guest',
  image: 'img',
  more: '•••',
  private: 'private',
  remove: '−',
  restore: 'back',
  search: 'search',
  shared: 'share',
  sort: 'sort',
  star: '★',
  stockIn: 'in',
  stockLow: 'low',
  stockOut: 'out',
  trash: 'trash',
};

type IconProps = {
  name: BarIconName;
  style?: StyleProp<TextStyle>;
};

function Icon({ name, style }: IconProps): React.JSX.Element {
  return <Text style={[styles.icon, style]}>{iconGlyphs[name]}</Text>;
}

const styles = StyleSheet.create({
  icon: {
    color: colors.textPrimary,
    ...typography.caption,
    fontWeight: '900',
    textAlign: 'center',
  },
});

export default Icon;
