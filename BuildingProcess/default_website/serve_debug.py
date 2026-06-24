import http.server
import socketserver
import json
import subprocess
import os

PORT = 4981
INDEX = "FWITD/BuildingProcess/default_website/index.html"
TASKS_JSON = ".vscode/tasks.json"

class SingleFileHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        with open(INDEX, "rb") as f:
            content = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, format, *args):
        pass  # suppress console logs

def open_chrome():
    url = f"http://localhost:{PORT}"
    subprocess.Popen(["cmd", "/c", "start", "chrome", url], shell=False)

def should_open_chrome():
    try:
        with open(TASKS_JSON, "r") as f:
            # strip jsonc line comments before parsing
            lines = [l for l in f if not l.strip().startswith("//")]
            config = json.loads("".join(lines))
            return config.get("openChromeBrowserOnServeDebugWebsite", False)
    except Exception as e:
        print(f"Could not read {TASKS_JSON}: {e}")
        return False

with socketserver.TCPServer(("", PORT), SingleFileHandler) as httpd:
    print(f"Serving on http://localhost:{PORT}")
    if should_open_chrome():
        open_chrome()
    httpd.serve_forever()