import ReactDOM from 'react-dom/client';

// Design System v2.9 CRM-scoped build. Two sheets, both generated from the DS by scripts/growth-os-sync-design-system.sh
// (never edit by hand, see PATCHES.md): gos.tokens-root.css = the custom properties only, on :root, so the --t-* bridge
// (gosOverrides.ts) resolves; gos.scoped.css = every other DS rule, under `.gos`. `.gos` is mounted only on DS screens
// (auth shell) and on our own screens/portals via GrowthOsGosScope, never on <html>/<body>, so upstream screens are
// untouched. Loaded first so same-specificity host rules (linaria/emotion classes) keep winning over the DS resets.
import '~/gos/css/gos.tokens-root.css';
import '~/gos/css/gos.scoped.css';

import { App } from '@/app/components/App';
import '@/app/utils/setupMonacoEnvironment';
import { hydrateMetadataStore } from '@/metadata-store/storage/metadataStoreStorage';
import 'react-loading-skeleton/dist/skeleton.css';
import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import '~/growth-os/growth-os-product-tokens.css';
import '~/growth-os/growth-os-shell.css';
import '~/growth-os/growth-os-auth.css';
import '~/growth-os/mobile/growth-os-touch.css';
import './index.css';
import { applyGosThemeOverrides } from '~/growth-os/theme/gosOverrides';

applyGosThemeOverrides();

const renderApp = () => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') ?? document.body,
  );

  root.render(<App />);
};

hydrateMetadataStore().then(renderApp, renderApp);
