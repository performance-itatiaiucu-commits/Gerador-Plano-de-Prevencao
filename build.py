#!/usr/bin/env python3
"""Monta o app em um único HTML autocontido (logo + pdf.js + worker + extrator + app inline)."""
import base64, pathlib

ROOT = pathlib.Path('/home/user')
tpl = (ROOT / 'build/template.html').read_text(encoding='utf-8')
logo = base64.b64encode((ROOT / 'assets/logo.png').read_bytes()).decode()
pdfjs = (ROOT / 'assets/pdf.min.js').read_text(encoding='utf-8')
worker = (ROOT / 'assets/pdf.worker.min.js').read_text(encoding='utf-8')
extract = (ROOT / 'assets/extract.js').read_text(encoding='utf-8')
app = (ROOT / 'build/app.js').read_text(encoding='utf-8')

assert '</script' not in pdfjs and '</script' not in worker and '</script' not in extract and '</script' not in app, 'bloco </script inesperado'

out = (tpl
       .replace('{{LOGO}}', 'data:image/png;base64,' + logo)
       .replace('{{PDFJS}}', pdfjs)
       .replace('{{WORKER}}', worker)
       .replace('{{EXTRACT}}', extract)
       .replace('{{APP}}', app))

for tok in ('{{LOGO}}', '{{PDFJS}}', '{{WORKER}}', '{{EXTRACT}}', '{{APP}}'):
    assert tok not in out, f'token residual: {tok}'

(ROOT / 'site').mkdir(exist_ok=True)
(ROOT / 'site/index.html').write_text(out, encoding='utf-8')
(ROOT / 'Gerador-Plano-de-Prevencao.html').write_text(out, encoding='utf-8')
print('OK —', len(out), 'bytes')
