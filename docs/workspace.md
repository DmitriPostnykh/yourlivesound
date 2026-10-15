# Work workspace

`https://w.yourlivesound.com/` is a separate workspace on the existing VPS.
The project-experience book lives at `/resume/`; later client sections can be
added without changing the book's address or the Spring Boot application.

## DNS and HTTPS

The authoritative DNS provider is Fozzy. The `yourlivesound.com` zone contains
an `A` record named `w`, pointing to `199.80.55.54`, with a 300-second TTL.
Only this record was added; the existing root, mail, and other service records
were preserved.

The virtual host is `/etc/nginx/sites-available/w.yourlivesound.com`, enabled by
the matching symlink in `sites-enabled`. The shared `nginx.conf` and the existing
application virtual host are outside this operation's scope.

The certificate is managed by Certbot under
`/etc/letsencrypt/live/w.yourlivesound.com/`. Renewal uses the webroot
`/var/www/letsencrypt`, through the HTTP ACME challenge location. The initial
certificate expires on 2027-01-12; this date is a deployment observation, not a
promise that a future renewal has succeeded.

## Private access

Each invitation contains an unguessable access token. A shared book invitation
serves the self-contained book directly at its exact URL, without redirecting
or requiring stored cookies. This also works when an embedded browser does not
retain cookies. It additionally sets a host-only cookie with `Secure`,
`HttpOnly`, `SameSite=Lax`, and a 30-day lifetime for ordinary workspace visits.
The original owner invitation still sets that cookie and redirects to `/resume/`.
Without an invitation or the accepted cookie, the portal and `/resume/` return
HTTP 403 and a closed-access page.

Invitations are bearer access: anyone holding one can use it. There are no
individual client accounts or per-client permissions yet. Introduce those
before hosting materials that require separate access for different clients.

The token and deployment receipts are root-only under
`/var/www/yls-work/private/`. Request logging is disabled for this virtual host
to avoid recording invitation URLs. The workspace sends `noindex` and
`no-referrer` headers. These complement the access gate; they do not replace it.

Do not copy invite tokens, cookies, live Nginx configuration, private books,
inventories, personal contact records, or credentials into this repository.

To create a separate invitation for sharing the book, use a stable private name
and save its receipt outside this repository:

```sh
python3 ops/workspace/invite.py --name book-colleague \
  --receipt /absolute/private/book-colleague-invitation.json
```

The helper preserves the original invitation and adds an exact invitation URL
to this virtual host. It validates and reloads Nginx, then checks direct book
access without cookie storage, ordinary access after accepting the cookie, and
closed access without either. Reusing the same name recovers the existing URL
and upgrades a legacy redirecting invitation to direct book delivery. The URL is in the private receipt;
share that complete URL, including `/i/` and its token. Sharing only the domain
or the address after redirection to `/resume/` does not grant a new visitor access.

Invitation receipts and configuration backups are also kept root-only under
`/var/www/yls-work/private/invitations/`. Additional invitations use the same
workspace cookie and 30-day session as the owner invitation. They are separate
entry links, not separate user accounts or independently revocable sessions.
Content updates preserve these invitations; initial activation must not be
rerun over the active workspace.

## Static content and updates

Prepared content has this structure:

```text
index.html          workspace portal
closed.html         closed-access page
robots.txt
resume/index.html   self-contained private book
```

The prepared book omits local workstation paths and links to raw inventory
downloads. It preserves project chapters, source observations, and verified
GitHub links. The original local book and inventories remain separately stored.

The book's header includes RU and EN buttons. The complete reader text, project
descriptions, search results, statuses, and observation labels are bundled in
both languages; identifiers, filenames, and verified source links are preserved.
Switching language keeps the current chapter. Each opening selects the first
supported language in the browser's ordered language preferences. If none
matches Russian or English, English is used. The RU and EN buttons change the
current reading session without requiring cookies or browser storage.
The private book tools and reviewed translations remain with the original book
outside this repository.

Reusable reader assets and localization assembly are versioned in
`ops/workspace/reader/`. The private book's `tools/` directory links to those
assets; its generator, reviewed English project descriptions, and inventory
remain with the private book. Do not add those private inputs to this repository.

Prepare the existing self-contained book with Python 3.9+ and `lxml`; keep the
manifest outside the directory that will be served:

```sh
python3 ops/workspace/prepare_book.py \
  --book /absolute/private/original-book.html \
  --output /absolute/private/prepared-directory \
  --manifest /absolute/private/prepared-manifest.json
```

The deployment helper accepts that private bundle and a private state file:

```sh
python3 ops/workspace/deploy.py update \
  --bundle-dir /absolute/private/prepared-directory \
  --state-file /absolute/private/deployment.json
```

It uploads a versioned static release, grants Nginx read access, preserves the
previous release location, and atomically switches `/var/www/yls-work/current`.
It preserves the existing access token and TLS configuration. It uses the
operator's existing SSH key; it does not store passwords or SSH keys.

Initial setup is bounded to the same virtual host: run `prepare`, create the
DNS record, obtain the certificate with the existing Certbot account, run
`upload`, and then `activate`. `prepare` and `activate` stop when existing state
needs inspection. Do not rerun initial setup over an active workspace.

## Verification and rollback

After every content update, verify the public hostname with normal certificate
validation. Confirm that an unauthenticated request to `/resume/` returns 403,
an authorized invitation opens the expected book, a forged cookie is rejected,
and the hosted book's SHA-256 matches the prepared file. Check the root portal,
book navigation, search, and the size needed by the user. Confirm that the main
Your Live Sound site still responds normally.

The verifier reads the workspace's invite secret through the existing SSH
connection and keeps it only in memory. It prints the verification report
without exposing the invitation:

```sh
python3 ops/workspace/verify.py \
  --book /absolute/private/prepared-directory/resume/index.html \
  --report /absolute/private/verification.json
```

The initial book was checked in a browser at 768 × 1024: no horizontal overflow,
working project menu, technology search, and chapter navigation. This is browser
layout evidence; an actual iPad acceptance check remains with the user.

For a content rollback, read the root-only `previous-<release>.json` receipt,
check the indicated release, and atomically repoint `current` to it. No application
container restart or global Docker cleanup is needed. Keep the previous release
until the new book has been verified. Initial activation also saves the prior
HTTP-only virtual-host configuration in the private directory.
