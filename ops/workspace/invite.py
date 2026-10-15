"""Create or recover a named invitation for the existing private Work book.

The invitation receipt must stay outside the repository. The existing owner
invitation, access cookie, static release, and application are preserved.
"""
from pathlib import Path
import argparse
import hashlib
import http.cookiejar
import json
import os
import re
import subprocess
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, build_opener

DOMAIN = "https://w.yourlivesound.com"
SSH = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "-o",
       "StrictHostKeyChecking=yes", "root@yourlivesound.com", "python3 -"]

CREATE = r'''
from pathlib import Path
from datetime import datetime, timezone
import json, os, re, secrets, subprocess

base = Path('/var/www/yls-work')
private = base / 'private'
config_path = Path('/etc/nginx/sites-available/w.yourlivesound.com')
config = config_path.read_text()
owner = (private / 'invite-token').read_text().strip()
assert re.fullmatch(r'[A-Za-z0-9_-]{40,}', owner)
assert 'location = /i/' + owner + ' {' in config
assert (base / 'current/resume/index.html').is_file()
registry = private / 'invitations'
registry.mkdir(mode=0o700, exist_ok=True)
receipt_path = registry / (INVITE_NAME + '.json')

if receipt_path.exists():
    receipt = json.loads(receipt_path.read_text())
    token = receipt['token']
    assert re.fullmatch(r'[A-Za-z0-9_-]{40,}', token)
    assert receipt['name'] == INVITE_NAME
    assert 'location = /i/' + token + ' {' in config, 'Inspect incomplete invitation state'
else:
    token = secrets.token_urlsafe(32)
    receipt = {'name': INVITE_NAME, 'token': token,
               'url': 'https://w.yourlivesound.com/i/' + token,
               'created_at': datetime.now(timezone.utc).isoformat()}
assert token != owner
block = """    location = /i/INVITATION {
        alias /var/www/yls-work/current/resume/index.html;
        default_type text/html;
        charset utf-8;
        add_header Set-Cookie "yls_work_access=OWNER; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax" always;
        add_header Referrer-Policy "no-referrer" always;
        add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
        add_header Cache-Control "private, no-store" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "DENY" always;
    }
""".replace('INVITATION', token).replace('OWNER', owner)
pattern = r'(?ms)^    location = /i/' + re.escape(token) + r' \{\n.*?^    \}\n'
matches = list(re.finditer(pattern, config))
assert len(matches) <= 1, 'Inspect duplicate invitation routes'
if matches:
    match = matches[0]
    candidate = config[:match.start()] + block + config[match.end():]
else:
    assert not receipt_path.exists(), 'Inspect incomplete invitation route'
    anchor = '    location = /closed.html { internal; }'
    assert config.count(anchor) == 1, 'Inspect changed virtual host layout'
    candidate = config.replace(anchor, block + '\n' + anchor)
if candidate != config:
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup = registry / (INVITE_NAME + '-nginx-before-' + stamp + '.conf')
    fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as file:
        file.write(config)
    assert config_path.read_text() == config, 'Virtual host changed during preparation'
    config_path.write_text(candidate)
    config_path.chmod(0o600)
    try:
        subprocess.run(['nginx', '-t'], capture_output=True, check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], capture_output=True, check=True)
    except Exception:
        config_path.write_text(config)
        subprocess.run(['nginx', '-t'], capture_output=True, check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], capture_output=True, check=True)
        raise RuntimeError('Invitation activation failed; previous virtual host restored') from None
    receipt['nginx_backup'] = str(backup)
receipt['delivery'] = 'direct book; cookies optional for reading the book'
temporary = registry / (INVITE_NAME + '.json.next')
fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as file:
    json.dump(receipt, file, indent=2)
os.replace(temporary, receipt_path)
print(json.dumps(receipt))
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", required=True, help="Stable private name; reuse to recover the same invitation")
    parser.add_argument("--receipt", required=True, type=Path, help="Private JSON path outside Git")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", args.name):
        parser.error("Use a lowercase name containing letters, digits, or hyphens")
    receipt_path = args.receipt.resolve()
    repository = Path(__file__).resolve().parents[2]
    if receipt_path == repository or repository in receipt_path.parents:
        parser.error("The invitation receipt must stay outside the repository")
    result = subprocess.run(SSH, input="INVITE_NAME=" + repr(args.name) + "\n" + CREATE,
                            text=True, capture_output=True)
    if result.returncode:
        raise SystemExit("Invitation operation failed; inspect private VPS state before retrying")
    receipt = json.loads(result.stdout)
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(receipt_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    os.fchmod(fd, 0o600)
    with os.fdopen(fd, "w") as file:
        json.dump(receipt, file, ensure_ascii=False, indent=2)
        file.write("\n")
    receipt_path.chmod(0o600)
    jar = http.cookiejar.CookieJar()
    opener = build_opener(HTTPCookieProcessor(jar))
    try:
        # This opener has no cookie storage: the invitation must work by itself.
        with build_opener().open(receipt["url"], timeout=20) as response:
            direct = response.read()
            assert response.status == 200 and response.url == receipt["url"]
            assert response.headers.get_content_type() == "text/html"
            assert "Мой опыт в проектах".encode() in direct
            for header, value in (("Cache-Control", "no-store"),
                                  ("Referrer-Policy", "no-referrer"),
                                  ("X-Robots-Tag", "noindex"),
                                  ("X-Content-Type-Options", "nosniff"),
                                  ("X-Frame-Options", "DENY")):
                assert value in response.headers[header]
        with opener.open(receipt["url"], timeout=20) as response:
            body = response.read()
            assert response.status == 200 and response.url == receipt["url"]
            assert hashlib.sha256(body).digest() == hashlib.sha256(direct).digest()
        assert len(jar) == 1
        with opener.open(DOMAIN + "/resume/", timeout=20) as response:
            assert response.status == 200
            assert hashlib.sha256(response.read()).digest() == hashlib.sha256(direct).digest()
        for path in ("/resume/", "/i/invalid"):
            try:
                build_opener().open(DOMAIN + path, timeout=20)
            except HTTPError as error:
                assert error.code == 403
            else:
                raise AssertionError("Access gate changed")
    except Exception:
        raise SystemExit("Invitation saved privately; live verification incomplete") from None
    print(json.dumps({"invitation": "verified", "name": args.name,
                      "receipt": str(receipt_path), "cookies_required_for_invitation": False,
                      "access_without_invitation": "closed"}))


if __name__ == "__main__":
    main()
