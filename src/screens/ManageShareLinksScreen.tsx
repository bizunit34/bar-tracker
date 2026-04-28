import Clipboard from '@react-native-clipboard/clipboard';
import React, { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { disableLocalShareLinkRecord, useLocalShareLinks } from '../data/localShareLinkStore';
import { disableShareLink } from '../services/shareLinkService';
import { colors } from '../theme/colors';
import { LocalShareLinkRecord } from '../types/shareLinks';

type ManageShareLinksScreenProps = {
  onCreateNewLink: () => void;
};

function ManageShareLinksScreen({
  onCreateNewLink,
}: ManageShareLinksScreenProps): React.JSX.Element {
  const links = useLocalShareLinks();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const activeLinks = useMemo((): Array<LocalShareLinkRecord> => {
    return links.filter((link: LocalShareLinkRecord): boolean => {
      return !link.disabledAt;
    });
  }, [links]);
  const disabledLinks = useMemo((): Array<LocalShareLinkRecord> => {
    return links.filter((link: LocalShareLinkRecord): boolean => {
      return Boolean(link.disabledAt);
    });
  }, [links]);

  const copyLink = (link: LocalShareLinkRecord): void => {
    Clipboard.setString(link.shareUrl);
    setMessage('Link copied.');
  };

  const shareLink = async (link: LocalShareLinkRecord): Promise<void> => {
    await Share.share({
      message: link.shareUrl,
      url: link.shareUrl,
    });
  };

  const previewLink = async (link: LocalShareLinkRecord): Promise<void> => {
    const canOpen = await Linking.canOpenURL(link.shareUrl);

    if (!canOpen) {
      throw new Error('This device cannot open the share link.');
    }

    await Linking.openURL(link.shareUrl);
  };

  const disableLink = async (link: LocalShareLinkRecord): Promise<void> => {
    setPendingSlug(link.slug);
    setMessage(null);

    try {
      await disableShareLink(link.slug, link.managementToken);
      await disableLocalShareLinkRecord(link.slug);
      setMessage('Share link disabled.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not disable the share link.');
    } finally {
      setPendingSlug(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Share Links</Text>
          <Text style={styles.subtitle}>
            Manage public links created from guest-safe snapshots.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onCreateNewLink}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.primaryButton, pressed ? styles.pressed : null];
          }}
        >
          <Text style={styles.primaryButtonText}>Create New Link</Text>
        </Pressable>
      </View>

      {message ? <Text style={styles.messageText}>{message}</Text> : null}

      <LinkSection
        emptyCopy="Create a public link from Share Preview to see it here."
        links={activeLinks}
        pendingSlug={pendingSlug}
        title="Active"
        onCopy={copyLink}
        onDisable={(link: LocalShareLinkRecord): void => {
          disableLink(link).catch((error: unknown): void => {
            setMessage(
              error instanceof Error ? error.message : 'Could not disable the share link.',
            );
            setPendingSlug(null);
          });
        }}
        onPreview={(link: LocalShareLinkRecord): void => {
          previewLink(link).catch((error: unknown): void => {
            setMessage(error instanceof Error ? error.message : 'Could not preview the link.');
          });
        }}
        onShare={(link: LocalShareLinkRecord): void => {
          shareLink(link).catch((error: unknown): void => {
            setMessage(error instanceof Error ? error.message : 'Could not share the link.');
          });
        }}
      />

      {disabledLinks.length > 0 ? (
        <LinkSection
          emptyCopy=""
          links={disabledLinks}
          pendingSlug={pendingSlug}
          title="Disabled"
          onCopy={copyLink}
          onPreview={(link: LocalShareLinkRecord): void => {
            previewLink(link).catch((error: unknown): void => {
              setMessage(error instanceof Error ? error.message : 'Could not preview the link.');
            });
          }}
          onShare={(link: LocalShareLinkRecord): void => {
            shareLink(link).catch((error: unknown): void => {
              setMessage(error instanceof Error ? error.message : 'Could not share the link.');
            });
          }}
        />
      ) : null}
    </ScrollView>
  );
}

type LinkSectionProps = {
  emptyCopy: string;
  links: Array<LocalShareLinkRecord>;
  onCopy: (link: LocalShareLinkRecord) => void;
  onDisable?: (link: LocalShareLinkRecord) => void;
  onPreview: (link: LocalShareLinkRecord) => void;
  onShare: (link: LocalShareLinkRecord) => void;
  pendingSlug: string | null;
  title: string;
};

function LinkSection({
  emptyCopy,
  links,
  onCopy,
  onDisable,
  onPreview,
  onShare,
  pendingSlug,
  title,
}: LinkSectionProps): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {links.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyCopy}>{emptyCopy}</Text>
        </View>
      ) : (
        links.map((link: LocalShareLinkRecord): React.JSX.Element => {
          return (
            <ShareLinkCard
              key={link.slug}
              link={link}
              isPending={pendingSlug === link.slug}
              onCopy={(): void => {
                onCopy(link);
              }}
              onDisable={
                onDisable
                  ? (): void => {
                      onDisable(link);
                    }
                  : undefined
              }
              onPreview={(): void => {
                onPreview(link);
              }}
              onShare={(): void => {
                onShare(link);
              }}
            />
          );
        })
      )}
    </View>
  );
}

type ShareLinkCardProps = {
  isPending: boolean;
  link: LocalShareLinkRecord;
  onCopy: () => void;
  onDisable?: () => void;
  onPreview: () => void;
  onShare: () => void;
};

function ShareLinkCard({
  isPending,
  link,
  onCopy,
  onDisable,
  onPreview,
  onShare,
}: ShareLinkCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardCopy}>
          <Text style={styles.linkTitle}>{link.title}</Text>
          <Text style={styles.dateText}>Created {formatDate(link.createdAt)}</Text>
          {link.disabledAt ? (
            <Text style={styles.disabledText}>Disabled {formatDate(link.disabledAt)}</Text>
          ) : null}
        </View>
        <View style={[styles.statusBadge, link.disabledAt ? styles.statusDisabled : null]}>
          <Text style={styles.statusText}>{link.disabledAt ? 'Disabled' : 'Active'}</Text>
        </View>
      </View>

      {link.description ? <Text style={styles.descriptionText}>{link.description}</Text> : null}

      <Text selectable style={styles.urlText}>
        {link.shareUrl}
      </Text>

      <View style={styles.actions}>
        <ActionButton label="Copy" onPress={onCopy} />
        <ActionButton label="Preview" onPress={onPreview} />
        <ActionButton label="Share" onPress={onShare} />
        {onDisable ? (
          <ActionButton
            danger
            disabled={isPending}
            label={isPending ? 'Disabling...' : 'Disable'}
            onPress={onDisable}
          />
        ) : null}
      </View>
    </View>
  );
}

type ActionButtonProps = {
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

function ActionButton({
  danger = false,
  disabled = false,
  label,
  onPress,
}: ActionButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [
          styles.actionButton,
          danger ? styles.dangerButton : null,
          pressed ? styles.pressed : null,
          disabled ? styles.disabledButton : null,
        ];
      }}
    >
      <Text style={[styles.actionButtonText, danger ? styles.dangerButtonText : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  cardCopy: {
    flex: 1,
    gap: 4,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  container: {
    gap: 16,
    padding: 20,
  },
  dangerButton: {
    borderColor: colors.dangerBorder,
  },
  dangerButtonText: {
    color: colors.dangerText,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  descriptionText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  disabledButton: {
    opacity: 0.55,
  },
  disabledText: {
    color: colors.dangerText,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 18,
  },
  headerCopy: {
    flex: 1,
    gap: 5,
  },
  linkTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  messageText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '900',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  statusBadge: {
    backgroundColor: colors.success,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDisabled: {
    backgroundColor: colors.highlight,
  },
  statusText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  urlText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
});

export default ManageShareLinksScreen;
