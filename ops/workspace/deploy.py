"""Deploy the private static Work portal through the existing VPS's Nginx.

Only the w.yourlivesound.com virtual host and /var/www/yls-work are managed.
The invite secret stays on the VPS; it is never printed by this helper.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import json
import subprocess

SSH = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "-o", "StrictHostKeyChecking=yes", "root@yourlivesound.com"]

PREPARE = r'''
from pathlib import Path
import grp, os, subprocess, json
base=Path('/var/www/yls-work')
assert not Path('/etc/nginx/sites-available/w.yourlivesound.com').exists(), 'Existing vhost must be inspected before changing it'
base.mkdir(mode=0o750,exist_ok=False)
gid=grp.getgrnam('www-data').gr_gid
os.chown(base,0,gid)
for name in ('releases','private'):
 p=base/name;p.mkdir(mode=0o750 if name=='releases' else 0o700)
 if name=='releases':os.chown(p,0,gid)
http="""server {
    listen 80;
    listen [::]:80;
    server_name w.yourlivesound.com;
    access_log off;
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        try_files $uri =404;
    }
    location / { return 403; }
}
"""
path=Path('/etc/nginx/sites-available/w.yourlivesound.com')
path.write_text(http);path.chmod(0o600)
link=Path('/etc/nginx/sites-enabled/w.yourlivesound.com')
link.symlink_to(path)
tested=subprocess.run(['nginx','-t'],capture_output=True,text=True)
if tested.returncode:
 link.unlink();path.unlink()
 raise RuntimeError(tested.stderr)
subprocess.run(['systemctl','reload','nginx'],check=True)
print(json.dumps({'http_vhost':'prepared','content_public':False,'nginx_test':'PASS'}))
'''

ACTIVATE = r'''
from pathlib import Path
import os, grp, secrets, subprocess, json, hashlib
base=Path('/var/www/yls-work')
release=base/'releases'/RELEASE_NAME
assert (release/'resume/index.html').is_file()
assert Path('/etc/letsencrypt/live/w.yourlivesound.com/fullchain.pem').is_file()
gid=grp.getgrnam('www-data').gr_gid
for p in [release,*release.rglob('*')]:
 os.chown(p,0,gid);p.chmod(0o750 if p.is_dir() else 0o640)
secret_path=base/'private'/'invite-token'
if secret_path.exists():token=secret_path.read_text().strip()
else:
 token=secrets.token_urlsafe(32)
 secret_path.write_text(token);secret_path.chmod(0o600)
assert len(token)>=40 and all(c.isalnum() or c in '-_' for c in token)
config="""map $cookie_yls_work_access $yls_work_allowed {
    default 0;
    "INVITE_TOKEN" 1;
}
server {
    listen 80;
    listen [::]:80;
    server_name w.yourlivesound.com;
    access_log off;
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        try_files $uri =404;
    }
    location / { return 301 https://w.yourlivesound.com$request_uri; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name w.yourlivesound.com;
    root /var/www/yls-work/current;
    index index.html;
    access_log off;
    error_log /var/www/yls-work/private/nginx-error.log crit;
    ssl_certificate /etc/letsencrypt/live/w.yourlivesound.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/w.yourlivesound.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Cache-Control "private, no-store" always;
    error_page 403 /closed.html;
    location = /i/INVITE_TOKEN {
        add_header Set-Cookie "yls_work_access=INVITE_TOKEN; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax" always;
        add_header Referrer-Policy "no-referrer" always;
        add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
        add_header Cache-Control "private, no-store" always;
        return 303 /resume/;
    }
    location = /closed.html { internal; }
    location = /robots.txt { try_files $uri =404; }
    location / {
        if ($yls_work_allowed = 0) { return 403; }
        try_files $uri $uri/ =404;
    }
}
""".replace('INVITE_TOKEN',token)
config_path=Path('/etc/nginx/sites-available/w.yourlivesound.com')
old_config=config_path.read_text()
backup=base/'private'/('nginx-before-'+RELEASE_NAME+'.conf')
backup.write_text(old_config);backup.chmod(0o600)
current=base/'current'
assert not current.exists(), 'Active release must be inspected before changing it'
current.symlink_to(release)
config_path.write_text(config);config_path.chmod(0o600)
result=subprocess.run(['nginx','-t'],capture_output=True,text=True)
if result.returncode:
 config_path.write_text(old_config);current.unlink()
 raise RuntimeError('Nginx candidate failed validation')
subprocess.run(['systemctl','reload','nginx'],check=True)
state={'domain':'w.yourlivesound.com','release':RELEASE_NAME,'book_sha256':hashlib.sha256((release/'resume/index.html').read_bytes()).hexdigest(),'access':'invite cookie, HTTPS only','nginx_test':'PASS'}
(base/'private/deployment.json').write_text(json.dumps(state,indent=2))
print(json.dumps(state))
'''

UPDATE = r'''
from pathlib import Path
import os, grp, subprocess, json, hashlib
base=Path('/var/www/yls-work')
release=base/'releases'/RELEASE_NAME
current=base/'current'
assert current.is_symlink(), 'Inspect the current deployment before updating'
assert (release/'resume/index.html').is_file()
gid=grp.getgrnam('www-data').gr_gid
for p in [release,*release.rglob('*')]:
 os.chown(p,0,gid);p.chmod(0o750 if p.is_dir() else 0o640)
previous=str(current.resolve())
old=base/'private'/('previous-'+RELEASE_NAME+'.json')
old.write_text(json.dumps({'previous_release':previous}));old.chmod(0o600)
next_link=base/'next-release'
assert not next_link.exists() and not next_link.is_symlink()
next_link.symlink_to(release)
os.replace(next_link,current)
state={'domain':'w.yourlivesound.com','release':RELEASE_NAME,'previous_release':previous,'book_sha256':hashlib.sha256((release/'resume/index.html').read_bytes()).hexdigest(),'access':'invite cookie, HTTPS only'}
p=base/'private/deployment.json';p.write_text(json.dumps(state,indent=2));p.chmod(0o600)
print(json.dumps(state))
'''

def remote(code):
    subprocess.run(SSH + ["python3 -"], input=code, text=True, check=True)

parser=argparse.ArgumentParser()
parser.add_argument('phase',choices=('prepare','upload','activate','update'))
parser.add_argument('--bundle-dir',type=Path,required=True,help='Private prepared static directory')
parser.add_argument('--state-file',type=Path,required=True,help='Private deployment-state JSON outside Git')
args=parser.parse_args()
state_path=args.state_file.resolve()
bundle=args.bundle_dir.resolve()
assert (bundle/'resume/index.html').is_file(), 'Prepared resume book is missing'
state_path.parent.mkdir(parents=True,exist_ok=True)

if args.phase=='prepare':
    remote(PREPARE)
elif args.phase in ('upload','update'):
    release=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    destination='/var/www/yls-work/releases/'+release
    remote('from pathlib import Path\nPath('+repr(destination)+').mkdir(mode=0o750)\n')
    subprocess.run(['scp','-q','-r','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes',str(bundle)+'/.','root@yourlivesound.com:'+destination+'/'],check=True)
    state_path.write_text(json.dumps({'domain':'w.yourlivesound.com','release':release,'stage':'uploaded'},indent=2)+'\n')
    state_path.chmod(0o600)
    print(json.dumps({'uploaded_release':release}))
    if args.phase=='update':
        remote('RELEASE_NAME='+repr(release)+'\n'+UPDATE)
        state=json.loads(state_path.read_text());state['stage']='active'
        state_path.write_text(json.dumps(state,indent=2)+'\n')
elif args.phase=='activate':
    state=json.loads(state_path.read_text())
    remote('RELEASE_NAME='+repr(state['release'])+'\n'+ACTIVATE)
    state['stage']='active'
    state_path.write_text(json.dumps(state,indent=2)+'\n')
