import { Platform, ViewStyle } from 'react-native';

export const shadows = {
  card:
    Platform.select<ViewStyle>({
      android: {
        elevation: 3,
      },
      default: {},
      ios: {
        shadowColor: '#000',
        shadowOffset: { height: 6, width: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
    }) ?? {},
  modal:
    Platform.select<ViewStyle>({
      android: {
        elevation: 8,
      },
      default: {},
      ios: {
        shadowColor: '#000',
        shadowOffset: { height: 10, width: 0 },
        shadowOpacity: 0.28,
        shadowRadius: 20,
      },
    }) ?? {},
  none: {},
} as const;

export type Shadows = typeof shadows;
