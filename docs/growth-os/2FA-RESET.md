# Support: resetting a user's authenticator (TOTP)

Growth OS CRM ships optional TOTP two-step sign-in (Settings → Profile → Two Factor Authentication). **There are no recovery codes at launch.** A user who lost the authenticator app cannot sign in until support removes the TOTP method. Upstream offers no admin button for this: a user can delete only **their own** method (`deleteTwoFactorAuthenticationMethod` checks `userWorkspace.userId === caller`), and that needs a signed-in session. The reset is therefore one SQL statement run by a person with database access, after an identity check.

## 1. Verify the person (no exceptions)
- The request must come from the account's e-mail address, or support must call back / write to that address and get a reply from it.
- If the user is a workspace admin, a second workspace admin confirms in writing. Never reset on a bare chat or phone request.
- Write a ticket line: who asked, how identity was checked, who ran the reset, when (Europe/Berlin).

## 2. Look at the rows first (read only)
```sql
SELECT t.id, t.status, t.strategy, w."displayName", t."createdAt"
FROM core."twoFactorAuthenticationMethod" t
JOIN core."userWorkspace" uw ON uw.id = t."userWorkspaceId"
JOIN core."user" u ON u.id = uw."userId"
JOIN core.workspace w ON w.id = uw."workspaceId"
WHERE lower(u.email) = lower('USER@EXAMPLE.COM');
```
`status` is `VERIFIED` (sign-in asks for a code) or `PENDING` (setup started, never confirmed; sign-in does not ask for a code).

## 3. Remove the method
Run in a transaction and check the row count before committing:
```sql
BEGIN;
DELETE FROM core."twoFactorAuthenticationMethod" t
USING core."userWorkspace" uw, core."user" u
WHERE t."userWorkspaceId" = uw.id AND uw."userId" = u.id
  AND lower(u.email) = lower('USER@EXAMPLE.COM')
  AND t.strategy = 'TOTP'
RETURNING t.id, t.status, t."workspaceId";
-- expect 1 row per workspace the user has set up TOTP in; then:
COMMIT;   -- or ROLLBACK; if the count is not what you expect
```
Use a hard `DELETE` (the table also has a `deletedAt` column, but the unique index on `(userWorkspaceId, strategy)` would block a fresh setup if a soft-deleted row stayed). To reset one workspace only, add `AND t."workspaceId" = '<workspace id>'`. The statement was dry-run against the local database (rolled back) while writing this doc.

## 4. Clear a sign-in lock, if the user is also locked out (optional)
After 5 wrong passwords sign-in pauses for 15 minutes (Redis key `growth-os:sign-in-failures:<lower-case e-mail>`, expires on its own):
```
redis-cli --scan --pattern '*sign-in-failures:USER@EXAMPLE.COM*' | xargs -r redis-cli del
```

## 5. What the user does next
They sign in with e-mail + password only, then re-enable the authenticator in Settings → Profile → Two Factor Authentication (new QR code; the old app entry no longer works). If the workspace enforces 2FA (`workspace."isTwoFactorAuthenticationEnforced"`), sign-in sends them straight to the setup screen. Tell them to remove the old entry from their app.

## Rules
- Never read or paste the `secret` column (it is encrypted, `enc:v2:…`, and not needed).
- One reset per verified request; log it in the ticket.
- This stays the launch path until recovery codes exist.

## Backlog: recovery codes
- Generate 10 one-time codes when TOTP is verified (store hashed, show once, "Download / copy"), accept one as an alternative to the 6-digit code on the challenge screen (the DS two-factor pattern already has the "use a recovery code" link), mark the code used, notify by mail when one is used.
- Settings → Profile: "Regenerate codes" (needs a fresh TOTP).
- Optional admin action: "Reset two-step sign-in" for workspace admins (audited), replacing the SQL above.
- "Trust this device for 30 days" stays out (decision 27 Nov 2026).
