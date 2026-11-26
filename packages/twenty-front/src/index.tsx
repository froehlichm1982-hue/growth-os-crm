import ReactDOM from 'react-dom/client';

import { App } from '@/app/components/App';
import '@/app/utils/setupMonacoEnvironment';
import { hydrateMetadataStore } from '@/metadata-store/storage/metadataStoreStorage';
import 'react-loading-skeleton/dist/skeleton.css';
import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import '~/gos/generated/tokens.css';
import '~/growth-os/growth-os-product-tokens.css';
import '~/growth-os/growth-os-shell.css';
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
