import { Image, type ImageStyle, type StyleProp } from 'react-native';

interface WordmarkProps {
  height?: number;
  style?: StyleProp<ImageStyle>;
}

const ASPECT_RATIO = 2400 / 652; // assets/wordmark-gold.png's real proportions

/**
 * The real "Curia" wordmark — vector letterforms traced from the same
 * Cormorant Garamond glyphs the app already sets text in (not a redrawn
 * approximation), gold-on-transparent so it drops onto any of this
 * dark-mode-only app's background variants. Replaces plain
 * `<Kicker>Curia</Kicker>` at the screens where the brand mark itself is
 * the content — auth and onboarding headers. Compound kickers like "Curia
 * Membership" or "Curia Admin" stay as text; the image only stands in for
 * the bare wordmark.
 */
export function Wordmark({ height = 16, style }: WordmarkProps) {
  return (
    <Image
      source={require('../../../assets/wordmark-gold.png')}
      style={[{ width: height * ASPECT_RATIO, height }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Curia"
    />
  );
}
