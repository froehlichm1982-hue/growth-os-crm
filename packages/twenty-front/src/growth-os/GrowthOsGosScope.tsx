import { type ComponentType, type ReactNode } from 'react';

// Design System v2.9 is loaded as a CRM-scoped sheet: every DS rule sits under `.gos`. The app itself
// (shell, tables, boards, records, settings, menus) is NOT under `.gos`, so upstream screens render
// exactly as before (pixel diff 0). Our own screens and portals that use DS classes (gos-btn,
// gos-alert, gos-icon, gos-toast, ...) mount inside this scope. `display: contents` (growth-os-auth.css)
// keeps layout and the surrounding typography untouched; the DS auth/system screens that want DS
// typography use a plain `.gos` root instead (GrowthOsAuthShell).
export const GrowthOsGosScope = ({ children }: { children: ReactNode }) => (
  <div className="gos growth-os-gos-scope" data-m="crm">
    {children}
  </div>
);

export const withGosScope =
  <P extends object>(Component: ComponentType<P>) =>
  (props: P) => (
    <GrowthOsGosScope>
      <Component {...props} />
    </GrowthOsGosScope>
  );
