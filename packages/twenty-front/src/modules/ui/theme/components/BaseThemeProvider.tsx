import { type JSX, createContext } from 'react';

import { UI_SCALE_MULTIPLIERS } from '@/ui/theme/constants/UiScaleMultipliers';
import { useSystemColorScheme } from '@/ui/theme/hooks/useSystemColorScheme';
import { persistedColorSchemeState } from '@/ui/theme/states/persistedColorSchemeState';
import { persistedUiScaleStepState } from '@/ui/theme/states/persistedUiScaleStepState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { type ColorScheme } from 'twenty-ui/input';
import { ThemeProvider } from 'twenty-ui/theme-constants';
import { setGosDataTheme } from '~/growth-os/theme/gosOverrides';

type BaseThemeProviderProps = {
  children: JSX.Element | JSX.Element[];
};

export const ThemeSchemeContext = createContext<(theme: ColorScheme) => void>(
  () => {},
);

export const BaseThemeProvider = ({ children }: BaseThemeProviderProps) => {
  const [persistedColorScheme, setPersistedColorScheme] = useAtomState(
    persistedColorSchemeState,
  );
  const persistedUiScaleStep = useAtomStateValue(persistedUiScaleStepState);
  const systemColorScheme = useSystemColorScheme();
  const effectiveColorScheme =
    persistedColorScheme === 'System'
      ? systemColorScheme
      : persistedColorScheme;
  const colorScheme = effectiveColorScheme === 'Dark' ? 'dark' : 'light';

  // Growth OS DS v2: html[data-theme] follows the user's colour-scheme setting
  // before the theme provider resolves its CSS variables.
  setGosDataTheme(colorScheme);

  return (
    <ThemeSchemeContext.Provider value={setPersistedColorScheme}>
      <ThemeProvider
        colorScheme={colorScheme}
        scale={UI_SCALE_MULTIPLIERS[persistedUiScaleStep]}
      >
        {children}
      </ThemeProvider>
    </ThemeSchemeContext.Provider>
  );
};
