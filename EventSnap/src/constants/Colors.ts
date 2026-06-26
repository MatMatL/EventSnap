export const COLORS = {
  bgLight: '#E3EAE5',
  bgCream: '#F5F3EB',
  teal: '#335C58',
  tealLight: '#2BA8A2',
  yellow: '#FFD23F',
  coral: '#EF6C4A',
  white: '#FFFFFF',
  border: '#E8E5DC',
  inputBg: '#F4F2EB',
  muted: '#A0A0A0',
  dark: '#1A1A1A',
} as const;

/** Alias utilisé par les composants carte / onglets */
export const Colors = {
  background: COLORS.bgCream,
  primary: COLORS.teal,
  accent: COLORS.tealLight,
  coral: COLORS.coral,
  white: COLORS.white,
  muted: COLORS.muted,
  border: COLORS.border,
} as const;

export const REACTION_EMOJIS = ['❤️', '🔥', '😂', '🙌'] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
