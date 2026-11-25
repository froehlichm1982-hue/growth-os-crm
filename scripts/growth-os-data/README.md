# Growth OS: offline breached/common password list

`common-passwords-8plus.txt` = SecLists `10k-most-common.txt` + `xato-net-10-million-passwords-100000.txt`
(MIT, © 2018 Daniel Miessler), lower-cased, ASCII only, 8–64 characters, de-duplicated (38,457 entries).
Shorter entries are dropped because the length rule (min 8) already rejects them.

Regenerate the bundled modules after changing the list:

    npx tsx scripts/growth-os-generate-password-list.ts

This writes the same data to the server (`growth-os/password/growth-os-common-passwords.generated.ts`)
and the front (`src/growth-os/auth/growthOsCommonPasswords.generated.ts`, lazy-loaded chunk).
No network call is made at runtime; nothing leaves the server.
