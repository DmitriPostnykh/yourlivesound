"""Verify the hosted private workspace without printing its invite credential."""
from pathlib import Path
import argparse
import hashlib
import http.cookiejar
import json
import re
import subprocess
import traceback
from urllib.error import HTTPError
from urllib.request import Request, build_opener, HTTPCookieProcessor, HTTPRedirectHandler, urlopen

DOMAIN = "https://w.yourlivesound.com"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def read(opener, path, headers=None):
    try:
        response = opener.open(Request(DOMAIN + path, headers=headers or {}), timeout=20)
    except HTTPError as error:
        response = error
    with response:
        return response.code, response.headers, response.read()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--book", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    expected = hashlib.sha256(args.book.read_bytes()).hexdigest()
    plain = build_opener()
    for path in ("/", "/resume/", "/resume/index.html", "/i/invalid"):
        code, _, body = read(plain, path)
        assert code == 403 and "закрытое рабочее пространство".encode() in body
    assert read(plain, "/resume/", {"Cookie": "yls_work_access=forged"})[0] == 403
    result = subprocess.run(
        ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "-o",
         "StrictHostKeyChecking=yes", "root@yourlivesound.com", "python3 -"],
        input="from pathlib import Path\nprint(Path('/var/www/yls-work/private/invite-token').read_text().strip())\n",
        text=True, capture_output=True, check=True,
    )
    token = result.stdout.strip()
    assert re.fullmatch(r"[A-Za-z0-9_-]{40,}", token)
    code, headers, _ = read(build_opener(NoRedirect()), "/i/" + token)
    assert code == 303 and headers["Location"] in ("/resume/", DOMAIN + "/resume/")
    cookie = headers["Set-Cookie"]
    assert all(flag in cookie for flag in ("Secure", "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=2592000"))
    assert "Domain=" not in cookie
    cookies = http.cookiejar.CookieJar()
    authorized = build_opener(HTTPCookieProcessor(cookies))
    code, headers, hosted = read(authorized, "/i/" + token)
    assert code == 200 and hashlib.sha256(hosted).hexdigest() == expected
    assert read(authorized, "/")[0] == 200
    for header, value in (("X-Robots-Tag", "noindex"), ("Referrer-Policy", "no-referrer"), ("Cache-Control", "no-store")):
        assert value in headers[header]
    text = hosted.decode()
    assert "file:" not in text and not re.search(r"/(?:Users|Volumes|root|home)/", text)
    assert 'href="data/' not in text
    with urlopen("https://yourlivesound.com/", timeout=20) as response:
        assert response.status == 200
    report = {
        "domain": DOMAIN,
        "unauthenticated_access": "PASS: portal, book, direct HTML and invalid invitation are closed",
        "forged_cookie": "PASS: rejected",
        "invite_cookie": "PASS: host-only, Secure, HttpOnly, SameSite=Lax, 30 days",
        "https_validation": "PASS: normal client certificate validation",
        "hosted_book_sha256": expected,
        "prepared_book_match": "PASS",
        "local_paths_and_raw_downloads": "PASS: absent from hosted book",
        "main_site": "PASS: HTTP 200",
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    args.report.chmod(0o600)
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        line = traceback.extract_tb(error.__traceback__)[-1].lineno
        raise SystemExit("Workspace verification failed: " + type(error).__name__ + " at line " + str(line)) from None
