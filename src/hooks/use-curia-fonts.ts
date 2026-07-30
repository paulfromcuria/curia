import {
  useFonts,
  CormorantGaramond_300Light,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import { Jost_300Light, Jost_400Regular, Jost_500Medium } from '@expo-google-fonts/jost';

/**
 * The Curia type system is exactly two families — Cormorant Garamond (serif)
 * and Jost (sans) — per CLAUDE.md's Design tokens section. No third/mono
 * family exists anywhere in the reference prototype; don't add one here.
 */
export function useCuriaFonts() {
  return useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    Jost_300Light,
    Jost_400Regular,
    Jost_500Medium,
  });
}
