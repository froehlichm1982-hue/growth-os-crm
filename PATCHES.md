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
