import ReactDOM from 'react-dom/client';

// Design System v2.9 CRM-scoped build: every rule sits under `.gos`, which is the <html> element (index.html), so
// the tokens reach the app and its portals. Loaded FIRST so that same-specificity host rules (linaria/emotion
// classes) keep winning over the DS reset rules (`.gos :where(a|button|input)`). Never edit by hand, see PATCHES.md.
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
