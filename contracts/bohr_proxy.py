import http.server
import socketserver
import urllib.request
import ssl
import sys

TARGET_IP = "52.192.240.118"
TARGET_HOST = "rpc.bohr.life"
PORT = 8545

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len)

        req = urllib.request.Request(
            f"https://{TARGET_IP}/",
            data=body,
            headers={
                "Content-Type": "application/json",
                "Host": TARGET_HOST
            }
        )

        try:
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                resp_data = resp.read()
                self.send_response(resp.status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp_data)))
                self.end_headers()
                self.wfile.write(resp_data)
        except Exception as e:
            err_msg = f'{{"jsonrpc":"2.0","error":{{"code":-32603,"message":"{str(e)}"}},"id":null}}'.encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(err_msg)))
            self.end_headers()
            self.wfile.write(err_msg)

    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), ProxyHandler) as httpd:
        print(f"Bohr RPC proxy running on http://127.0.0.1:{PORT} -> https://{TARGET_IP} ({TARGET_HOST})")
        sys.stdout.flush()
        httpd.serve_forever()
