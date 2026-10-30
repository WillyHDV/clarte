"""Servidor local do app (http://localhost:5173). Igual ao http.server, mas sem cache,
para o navegador sempre carregar a versão mais recente dos arquivos."""
import http.server
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(("", 5173), Handler).serve_forever()
