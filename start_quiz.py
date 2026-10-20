"""Serve the bundled quiz on localhost. Python standard library only."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
import argparse, socket, webbrowser, urllib.request, sys

def main():
    args=argparse.ArgumentParser(description='CNXHKH offline quiz')
    args.add_argument('--no-open',action='store_true')
    args.add_argument('--port',type=int,default=8766)
    opt=args.parse_args()
    root=Path(__file__).resolve().parent
    url=f'http://127.0.0.1:{opt.port}/'
    try:
        with urllib.request.urlopen(url+'icon.svg',timeout=1) as response:
            if b'#164b3e' in response.read():
                if not opt.no_open:webbrowser.open(url)
                print('CNXHKH is already available at '+url);return
    except Exception:pass
    class Handler(SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header('Cache-Control','no-cache')
            self.send_header('X-Content-Type-Options','nosniff')
            super().end_headers()
        def list_directory(self,path):
            self.send_error(404);return None
    try:server=ThreadingHTTPServer(('127.0.0.1',opt.port),partial(Handler,directory=str(root)))
    except OSError:
        print(f'Port {opt.port} is busy. Run with --port 8767 or open index.html directly.');return
    print('CNXHKH: '+url,flush=True)
    if not opt.no_open:webbrowser.open(url)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()

if __name__=='__main__':main()
