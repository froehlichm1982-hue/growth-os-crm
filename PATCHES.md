# Upstream patches (Growth OS CRM, `ds-v2`)

Small accessibility patches inside upstream (Twenty) components. Each is minimal and listed so it can be re-applied or dropped when merging upstream. Everything else is done by overriding values (tokens, CSS), not components.

Paths are relative to `packages/twenty-front/src/`.

| # | File | Change | Why (axe rule) |
|---|---|---|---|
| 1 | `modules/ui/layout/dropdown/components/Dropdown.tsx` | When the trigger contains a native control, `aria-controls` / `aria-expanded` / `aria-haspopup` are set on that control and the wrapper loses `role="button"` (layout effect) | `nested-interactive`, `aria-command-name` (table/board/record toolbars, relation cards) |
| 2 | `modules/ui/utilities/drag-and-drop/components/DragDropItemSortableCell.tsx` | Disabled cells use `role="group"` instead of `role="none"` | `aria-allowed-attr` (dnd-kit adds `aria-roledescription` / `aria-describedby`) |
| 3 | `modules/object-record/record-table/constants/RecordTableColumnDragAndDropWidth.ts` | Row drag handle column 12 → 24 px | `target-size` (WCAG 2.2) |
| 4 | `modules/object-record/record-table/record-table-cell/components/RecordTableCellDragAndDrop.tsx` | `aria-label` "Drag to reorder" on the handle | `aria-command-name` |
| 5 | `modules/object-record/record-board/record-board-card/components/RecordBoardCardHeader.tsx` | `aria-label` "Select card" on the card checkbox | `aria-toggle-field-name` |
| 6 | `modules/object-record/record-field-list/record-detail-section/**` (6 files) | `aria-label` on the hover icon buttons (Edit, Add, Show details, Merge) | `button-name` |
| 7 | `modules/ui/input/components/TextInput.tsx` + `modules/settings/profile/components/EmailField.tsx` | Forward `aria-label` to the `<input>`; the email field uses it | `label` |
| 8 | `modules/settings/profile/components/EmailField.tsx`, `modules/ui/input/components/ImageInput.tsx` | Names for save / cancel / change email and picture upload buttons | `button-name` |
| 9 | `modules/views/view-picker/components/ViewPickerDropdown.tsx` | View count colour → `font.color.tertiary` | `color-contrast` |
| 10 | `modules/ui/feedback/snack-bar-manager/hooks/useSnackBar.ts` | Drop error snackbars while the session-expired modal is open | UX (duplicate "An error occurred") |
| 11 | `modules/ui/navigation/navigation-drawer/components/NavigationDrawer.tsx` | Mobile drawer `inert` / `aria-hidden` + focus trap (`growth-os/shell/useGrowthOsDrawerA11y.ts`); module switcher behind `GROWTH_OS_SHOW_MODULE_SWITCHER` | DS v2.2; white-label standalone |

## Round 2 (axe: nested-interactive, aria-allowed-attr, aria-command-name)

- `ui/utilities/drag-and-drop/components/DragDropItemSortableCell.tsx`, `DragDropItemSortableHandle.tsx`: `role="group"` for enabled cells/handles too (dnd-kit would stamp `role="button"` around cards that contain buttons).
- `ui/layout/dropdown/components/Dropdown.tsx`: optional `clickableAriaLabel`, set on the non-delegated trigger; used by `RecordTableColumnAggregateFooterWithDropdown.tsx` (field label).
- `object-record/record-field/ui/components/FieldDescriptionTooltip.tsx`: `role="group"` + `aria-label` on the focusable span that carries `aria-describedby`.
- `RecordDetailRelationRecordsListItem.tsx`: `aria-label` on the "More options" icon button.
- `SettingsDeviceSessionRowDropdownMenu.tsx`: `aria-label` on the row actions button. `SortOrFilterChip.tsx`: `aria-label` on the remove (x) button.
- `growth-os/shell/GrowthOsDndA11y.tsx` (our own file, mounted in `WorkspaceAppProviders.tsx`): strips `aria-pressed` / `aria-grabbed` / `aria-roledescription` that dnd-kit stamps on `role=group` draggables (axe aria-allowed-attr). No upstream component logic changed.
- `gosOverrides.ts` (value override, not a patch): `--t-color-blue` -> `--gos-info-ink`, `--t-color-green` and the green tag text/background -> `--gos-success-ink` / `--gos-success-soft`, so chip and badge text reaches 4.5:1.

## Mail base v3 (not upstream patches, listed for the merge)

- `packages/twenty-emails/src/components/kit/KitEmail.tsx` + `gos/emailBaseV3.generated.ts` (synced from `design-system/email/base.html`) + `gos/emailCardsV3.ts`: all 17 system mails plus the deal mail render through the DS v2.8 base. `vite.config.ts` keeps `react-dom/server` external.
- `twenty-server/.../email/drivers/smtp.driver.ts`: nothing is sent unless `SEND_EMAILS=true` (default off); adds the CID header attachments (`get-growth-os-email-attachments.util.ts`). Transport stays SMTP (Resend SMTP with `EMAIL_SMTP_PASSWORD`/`RESEND_API_KEY` from env). No Resend API call exists in the code.
- `twenty-server/.../growth-os/utils/billing-portal-link.util.ts`: signed `/portal` link builder (test vector from `billing-service/docs/integration/portal-link.md`).

## Design System v2.9 (PR 3: auth + CRM-scoped CSS)

**CSS rebuild step (never hand-edit `gos.scoped.css`).** The Design System ships one sheet for the CRM, `css/gos.scoped.css` (every rule under `.gos`; `html`/`body`/`:root` map to `.gos`; fonts renamed "GOS Geist*"). It is generated, not written:

```
bash scripts/growth-os-sync-design-system.sh        # DS=/workspace/projects/growth-os/design-system by default
```

The script runs `python3 $DS/scripts/build_scoped.py --root .gos --out packages/twenty-front/src/gos/css/gos.scoped.css`, copies the fonts, `crm-theme.mjs`/`tokens.mjs`/`tokens.email.json`, the CRM mail headers, derives `gos.tokens-root.css`, and writes `src/gos/DS-VERSION`. To move to a new DS release: pull the DS, run the script, run tsgo + vite build + `check-white-label`, re-shoot. `gos.css` and `tokens.css` are never loaded (`generated/tokens.css` is gone).

**How the sheet is mounted (decision, revised after the pixel-diff gate).**
- `.gos` is **not** on `<html>` or `<body>`. Mounting it there changed every upstream screen (pixel diff vs the pre-v2.9 head 489fce0963a: 22/22 files, 9 to 35 %; 2 to 20 % with `.gos` only on body), because the scoped sheet's resets and base type then apply to the whole app. Now `.gos` lives only on the DS screen roots (`GrowthOsAuthShell`, the system/maintenance/licence pages) and on our own screens and portals through `GrowthOsGosScope` / `withGosScope` (`display: contents`, so layout and typography are untouched).
- The app's theme bridge (`--t-*` in `gosOverrides.ts`) is declared on `html:root`, so the custom properties must exist on `<html>`. `src/gos/css/gos.tokens-root.css` is **derived** by `scripts/growth-os-scoped-tokens.py` (run by the sync script) from `gos.scoped.css`: only custom-property rules, mapped `.gos` -> `:root`, `.gos[data-theme=X]` -> `:root[data-theme=X]`, `.gos [data-m=M]` -> `[data-m=M]`, plus the `@font-face` blocks under their original names ("Geist", "Geist Mono", "Geist Fallback"), which the app theme uses. Never hand-edited. **DS request:** ship a tokens-only scoped file so this derivation is not needed.
- `src/index.tsx` imports `gos.tokens-root.css`, then `gos.scoped.css`, first, so the app's own (linaria) classes win ties against the DS element resets.
- `index.html`: `<html class="light" data-theme="light" data-m="crm">`, plain `<body>` (the v2.7 `<body class="gos">` is gone; it had no rule behind it before v2.9). `src/index.css` is unchanged from before v2.9.
- `setGosDataTheme()` keeps `html[data-theme]` / `data-m` in step with ThemeProvider (which only toggles `light`/`dark`).
- The auth art panel is live DOM (`GrowthOsAuthArt.tsx`, container-query sizes, no ellipsis, tag clearance in padding), not the DS raster crops (those clipped text and cannot translate); `public/images/growth-os/auth/*` is removed and `scripts/growth-os-sync-design-system.sh` no longer copies it. `ds2-shots.mjs` flags a shot (error list) if text in the art panel is ellipsised, wraps, or overflows its card (`artClip`).
- Local legacy classes that clashed with the DS (`gos-icon`, `gos-spinner`, `gos-linklike`, `gos-form-note`, `gos-toast-region`, ...) are renamed `growth-os-*`; `gos-btn-*` / `gos-alert-*` use the DS modifiers (`--secondary`, `--lg`, `--ok`, ...). `growth-os-icon` (createGosIcon) is deliberately not `gos-icon`, so app icons are not resized by the DS 20px rule.
- Removed: the local PENDING touch / drawer / top-align port in `growth-os-auth.css` and `growth-os-auth-fields.css` (deleted), the local `[data-m]` role block in `growth-os-shell.css`. `growth-os-auth.css` is now glue only (zoom-safe auth height, link-like buttons, spinner, form note, OTP slots).
- `gos.js` is not loaded. Its drawer behaviour exists as the React hook `growth-os/shell/useGrowthOsDrawerA11y.ts` (patch 11); the DS pattern behaviour for the password toggle, caps-lock hint, meter and rules is implemented in `GrowthOsAuthFields.tsx` with the DS markup and classes.

**Upstream components touched by the auth screens** (all under `packages/twenty-front/src/`):

| # | File | Change |
|---|---|---|
| 12 | `modules/auth/sign-in-up/components/SignInUpStandardContent.tsx` | Renders the DS `.head` (h1 + `.sub`) + form; the 2FA challenge renders as a `.gos-auth-status` card; workspace logo/title props unused |
| 13 | `modules/auth/sign-in-up/components/internal/SignInUpTwoFactorAuthenticationVerification.tsx` | DS-styled challenge: 6-digit input-otp with `aria-label`, `autocomplete=one-time-code`, "Verify", "Back to sign in" returns to the e-mail step (it used to jump to the provisioning step) |
| 14 | `modules/auth/sign-in-up/components/EmailVerificationSent.tsx`, `pages/auth/PasswordReset.tsx`, `pages/auth/SignInUp.tsx` | DS status layout, copy with the real token lifetimes, CTA "Save and sign in", 2FA title/subtitle; the full-height `StyledBackground` / `ModalContent` wrappers are dropped (the shell owns layout) |
| 15 | `modules/auth/sign-in-up/components/internal/SignInUpWithCredentials.tsx`, `SignInUpPasswordField.tsx`, `SignInUpWithGoogle.tsx`, `SignInUpWithMicrosoft.tsx` | DS form/field/button classes; forgot-password and mode-switch links on 44px `.gos-tap` targets; the invisible separator between the provider buttons is gone |
| 16 | `modules/auth/components/StyledOnboardingContentContainer.ts` | `display: grid; gap: 10px; width: 100%` (DS `.gos-stack` rhythm for the upstream onboarding screens) |
| 17 | `twenty-server/.../twenty-config/config-variables.ts` + `.env.example` | `EMAIL_VERIFICATION_TOKEN_EXPIRES_IN` default `1h` → `30m` so the screen and the mail ("works once, for 30 minutes") are true; `PASSWORD_RESET_TOKEN_EXPIRES_IN` stays `60m` |

Mail: `send-email-verification-link.email.tsx` preheader now says "The link works once, for 30 minutes." (EN source + all `.po`, DE translated).

**Not adopted from the DS auth patterns (product decisions, not omissions).** No magic link and no sign-in code (Markus: not for the CRM). The two-factor pattern's "trust this device for 30 days" and "use a recovery code" are not offered (upstream Twenty has neither). The locked state stays the inline alert with the live countdown, not a separate page. TOTP 2FA stays optional.
