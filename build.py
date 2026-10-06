#!/usr/bin/env python3
"""Monta o app em um único HTML autocontido (logo + pdf.js + worker + extrator + app inline).

Fontes (todas versionadas):
    build/template.html  — casca HTML/CSS com os tokens {{LOGO}} {{PDFJS}} {{WORKER}} {{EXTRACT}} {{APP}}
    build/app.js         — lógica da aplicação
    assets/logo.png      — logo embutida como data URI
    assets/extract.js    — extrator de dados do PDF (universal browser/Node)
    assets/pdf.min.js    — pdf.js (vendor)
    assets/pdf.worker.min.js — worker do pdf.js (vendor)

Saídas:
    index.html       — artefato publicado na raiz (GitHub Pages)
    site/index.html  — cópia idêntica usada no deploy

Uso:
    python3 build.py            # regenera as saídas
    python3 build.py --check    # apenas verifica se as saídas estão em dia (não escreve)
"""

from __future__ import annotations

import base64
import pathlib
import sys

# Raiz do repositório, resolvida a partir deste arquivo (não depende do cwd).
ROOT = pathlib.Path(__file__).resolve().parent

TEMPLATE = ROOT / "build" / "template.html"
APP = ROOT / "build" / "app.js"
LOGO = ROOT / "assets" / "logo.png"
EXTRACT = ROOT / "assets" / "extract.js"
PDFJS = ROOT / "assets" / "pdf.min.js"
WORKER = ROOT / "assets" / "pdf.worker.min.js"

OUTPUTS = (ROOT / "index.html", ROOT / "site" / "index.html")

TOKENS = ("{{LOGO}}", "{{PDFJS}}", "{{WORKER}}", "{{EXTRACT}}", "{{APP}}")


def read_text(path: pathlib.Path) -> str:
    if not path.is_file():
        sys.exit(f"erro: arquivo de origem ausente: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def render() -> str:
    """Monta o HTML final a partir das fontes em build/ e assets/."""
    template = read_text(TEMPLATE)
    pdfjs = read_text(PDFJS)
    worker = read_text(WORKER)
    extract = read_text(EXTRACT)
    app = read_text(APP)

    if not LOGO.is_file():
        sys.exit("erro: arquivo de origem ausente: assets/logo.png")
    logo = base64.b64encode(LOGO.read_bytes()).decode()

    # Um "</script" dentro de um bloco inline encerraria o <script> prematuramente.
    for name, code in (
        ("pdf.min.js", pdfjs),
        ("pdf.worker.min.js", worker),
        ("extract.js", extract),
        ("app.js", app),
    ):
        if "</script" in code:
            sys.exit(f"erro: bloco '</script' inesperado em {name}")

    out = (
        template.replace("{{LOGO}}", "data:image/png;base64," + logo)
        .replace("{{PDFJS}}", pdfjs)
        .replace("{{WORKER}}", worker)
        .replace("{{EXTRACT}}", extract)
        .replace("{{APP}}", app)
    )

    for token in TOKENS:
        if token in out:
            sys.exit(f"erro: token residual no HTML gerado: {token}")

    return out


def main(argv: list[str]) -> int:
    check_only = "--check" in argv[1:]
    out = render()

    stale = []
    for target in OUTPUTS:
        current = target.read_text(encoding="utf-8") if target.is_file() else None
        if current != out:
            stale.append(target)

    if check_only:
        if stale:
            for target in stale:
                print(f"DESATUALIZADO — {target.relative_to(ROOT)}")
            print("\nExecute `python3 build.py` para regenerar.")
            return 1
        print(f"OK — saídas em dia ({len(out)} bytes)")
        return 0

    for target in OUTPUTS:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(out, encoding="utf-8")

    changed = ", ".join(str(t.relative_to(ROOT)) for t in stale) if stale else "nenhuma alteração"
    print(f"OK — {len(out)} bytes ({changed})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
