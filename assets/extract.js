/* Módulo universal (browser/Node): extrai dados da empresa das páginas de texto de um PDF.
   Lida com fontes de codificação corrompida (ex.: «=ç, √=Ã, Á=Ç, ⁄=Ú, „=ã …) comuns em
   documentos PT-BR gerados no Word, e com layouts de formulário (label e valor na mesma
   linha, em linhas separadas ou campos em branco). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Extract = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Caracteres corrompidos → ASCII (para casar padrões). 'Á' ambíguo (legítimo ou 'Ç'
     corrompido) é resolvido por contexto: depois de letra = 'c'. */
  var FIX_ASCII = {
    '„': 'a', '«': 'c', '√': 'a', '…': 'e', '⁄': 'u', '¡': 'a', '‡': 'a',
    'Ù': 'o', '·': 'a', 'Û': 'o', 'ı': 'o', 'È': 'e', 'Ì': 'i', '˙': 'u', '‚': 'a', '”': 'o'
  };
  /* Restauração para exibição. */
  var FIX_DISP = [
    [/„/g, 'ã'], [/«/g, 'ç'], [/√/g, 'Ã'], [/…/g, 'É'], [/⁄/g, 'Ú'], [/¡/g, 'Á'],
    [/‡/g, 'à'], [/Ù/g, 'ô'], [/·/g, 'á'], [/Û/g, 'ó'], [/ı/g, 'õ'], [/È/g, 'Ê'],
    [/Ì/g, 'Í'], [/˙/g, 'ú'], [/‚/g, 'â'], [/”/g, 'Ó']
  ];

  function dispFix(s) {
    var t = String(s == null ? '' : s);
    FIX_DISP.forEach(function (p) { t = t.replace(p[0], p[1]); });
    /* 'Á' no meio da palavra é 'Ç' corrompido: EndereÁo→Endereço, refeiÁ„o→refeição.
       Em palavra toda maiúscula restaura como 'Ç'; em palavra com minúsculas, 'ç'. */
    t = t.replace(/\S*Á\S*/g, function (w) {
      return /[a-z\u00E0-\u00FF]/.test(w) ? w.replace(/Á/g, 'ç') : w.replace(/Á/g, 'Ç');
    });
    return t;
  }
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function dekey(s) {
    var t = String(s == null ? '' : s)
      .replace(/([A-Za-z\u00C0-\u024F])Á/g, '$1c')
      .replace(/[„«√…⁄¡‡ÁÙ·ÛıÈÌ˙‚”]/g, function (c) { return FIX_ASCII[c] || c; });
    return norm(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  /* Linhas estruturais/cabeçalhos — nunca são valores. */
  var HARD_RE = /(razao social empresa cliente|repetir razao social|identificacao da empresa|planilha de apresentacao|plano de prevencao e enfrentamento|indice analitico|incluir logo|numero de colaboradores|horario de trabalho|atividade e grau de risco|codigo da atividade)/;
  /* Rodapés/cabeçalhos do modelo Grupo Performance. */
  var SOFT_RE = /(grupo performance|performanceocupacional|praca antonio quirino|revisao|^pagina|www )/;

  var LABEL_SEQS = [
    ['razao', 'social', 'razaoSocial'],
    ['nome', 'fantasia', 'nomeFantasia'],
    ['ramo', 'de', 'atividade', 'ramoAtividade'],
    ['inscricao', 'estadual', 'inscricaoEstadual'],
    ['cnpj', 'cnpj'],
    ['endereco', 'endereco'],
    ['bairro', 'bairro'],
    ['cep', 'cep'],
    ['cidade', 'cidade'],
    ['estado', 'estado'],
    ['responsavel', 'responsavel'],
    ['telefone', 'telefone'],
    ['email', 'email'],
    ['e', 'mail', 'email']
  ];

  /* Converte itens do getTextContent() em linhas visuais (texto cru, sem dispFix). */
  function linesFromItems(items) {
    var rows = [];
    (items || []).forEach(function (it) {
      if (typeof it.str !== 'string' || !it.str.trim()) return;
      var tr = it.transform || [1, 0, 0, 1, 0, 0];
      var y = tr[5], x = tr[4];
      var row = null;
      for (var i = 0; i < rows.length; i++) {
        if (Math.abs(rows[i].y - y) <= 2.6) { row = rows[i]; break; }
      }
      if (!row) { row = { y: y, parts: [] }; rows.push(row); }
      row.parts.push({ x: x, w: it.width || 0, s: it.str });
    });
    rows.sort(function (a, b) { return b.y - a.y; });
    return rows.map(function (r) {
      r.parts.sort(function (a, b) { return a.x - b.x; });
      var out = '';
      var prevEnd = null;
      r.parts.forEach(function (p) {
        if (out && prevEnd != null && (p.x - prevEnd) > 1.0 && !/\s$/.test(out)) out += ' ';
        out += p.s;
        prevEnd = p.x + p.w;
      });
      return norm(out);
    }).filter(Boolean);
  }

  function tokenKeys(line) { return line.split(/\s+/).map(dekey); }

  function findLabels(tokKeys) {
    var found = [];
    for (var i = 0; i < tokKeys.length; i++) {
      var best = null;
      for (var j = 0; j < LABEL_SEQS.length; j++) {
        var seq = LABEL_SEQS[j];
        var n = seq.length - 1;
        if (i + n > tokKeys.length) continue;
        var ok = true;
        for (var k = 0; k < n; k++) if (tokKeys[i + k] !== seq[k]) { ok = false; break; }
        if (ok) { best = { field: seq[n], start: i, end: i + n }; break; }
      }
      if (best) { found.push(best); i = best.end - 1; }
    }
    return found;
  }

  function isJunkLine(line) {
    var d = dekey(line);
    if (!d) return true;
    if (HARD_RE.test(d)) return true;
    if (/[@]|https?:/i.test(line)) return false;
    if (/^[^a-zA-Z0-9\u00C0-\u024F]+$/.test(line)) return true;
    if (SOFT_RE.test(d)) return true;
    return false;
  }

  function extractCompanyData(pages) {
    var out = {
      razaoSocial: '', nomeFantasia: '', ramoAtividade: '', cnpj: '', inscricaoEstadual: '',
      endereco: '', bairro: '', cep: '', cidade: '', estado: '', responsavel: '', telefone: '', email: '',
      colMasculino: '', colFeminino: '', colTotal: '', horario: '', cnae: '', grauRisco: '',
      atividadePrincipal: '', foundPage: -1
    };
    if (!pages || !pages.length) return out;

    /* 1) Página "1. IDENTIFICAÇÃO DA EMPRESA" (cliente), evitando a da elaboradora. */
    var idIdx = -1;
    for (var i = 0; i < pages.length; i++) {
      var joined = dekey(pages[i].lines.join(' | '));
      if (/identificacao da empresa/.test(joined) && !/empresa elaboradora/.test(joined)) { idIdx = i; break; }
    }
    if (idIdx < 0) {
      for (var j = 0; j < pages.length; j++) {
        if (/razao social/.test(dekey(pages[j].lines.join(' | ')))) { idIdx = j; break; }
      }
    }
    if (idIdx < 0) idIdx = Math.min(2, pages.length - 1);
    out.foundPage = idIdx + 1;

    /* 2) Campos rotulados na página de identificação. */
    var lines = pages[idIdx].lines;
    var pending = [];
    for (var m = 0; m < lines.length; m++) {
      var line = lines[m];
      var dkLine = dekey(line);
      if (/numero de colaboradores/.test(dkLine) || /horario de trabalho/.test(dkLine) || /codigo da atividade/.test(dkLine)) break;
      if (HARD_RE.test(dkLine)) continue;
      var tok = line.split(/\s+/);
      var labels = findLabels(tokenKeys(line));
      /* Linha sem labels: aplica filtros de rodapé/lixo antes de usar como valor. */
      if (!labels.length) {
        if (isJunkLine(line)) continue;
        if (pending.length) out[pending.shift()] = dispFix(norm(line));
        continue;
      }
      pending = []; /* novo label cancela pendências (campos vazios) */
      labels.forEach(function (lab, li) {
        var segEnd = li + 1 < labels.length ? labels[li + 1].start : tok.length;
        var val = norm(tok.slice(lab.end, segEnd).join(' ')).replace(/:$/, '').trim();
        if (val) { if (!out[lab.field]) out[lab.field] = dispFix(val); }
        else pending.push(lab.field);
      });
    }

    /* 3) Escopo estendido: página da identificação + próxima (até a seção da elaboradora). */
    var scopeLines = lines.slice();
    if (idIdx + 1 < pages.length) {
      var nxt = pages[idIdx + 1].lines;
      for (var q = 0; q < nxt.length; q++) {
        if (/identificacao da empresa/.test(dekey(nxt[q]))) break;
        scopeLines.push(nxt[q]);
      }
    }
    var dscope = scopeLines.map(dekey);

    /* Número de colaboradores */
    scopeLines.forEach(function (ln) {
      var mo;
      if (!out.colMasculino && (mo = ln.match(/masculino\D{0,6}(\d{1,5})/i))) out.colMasculino = mo[1];
      if (!out.colFeminino && (mo = ln.match(/feminino\D{0,6}(\d{1,5})/i))) out.colFeminino = mo[1];
      if (!out.colTotal && (mo = ln.match(/total\D{0,6}(\d{1,5})/i))) out.colTotal = mo[1];
    });

    /* Horário de trabalho */
    for (var h = 0; h < scopeLines.length; h++) {
      if (!/horario de trabalho/.test(dscope[h])) continue;
      var seg = '';
      for (var w = h + 1; w < Math.min(scopeLines.length, h + 4); w++) {
        var d = dscope[w];
        if (/atividade|numero de colaboradores/.test(d)) break;
        if (isJunkLine(scopeLines[w])) continue;
        if (findLabels(tokenKeys(scopeLines[w])).length) break;
        seg += (seg ? ' ' : '') + norm(scopeLines[w]);
      }
      if (seg) out.horario = dispFix(seg);
      break;
    }

    /* CNAE, grau de risco, atividade principal */
    for (var c = 0; c < scopeLines.length; c++) {
      var ln2 = scopeLines[c], d2 = dscope[c], v;
      if (!out.cnae && /codigo da atividade/.test(d2)) {
        v = /\(?cnae/i.test(ln2) ? norm(ln2.replace(/^.*?cnae\)?\s*:?\s*/i, ''))
                                 : norm(ln2.replace(/^.*?atividade\s*:?\s*/i, ''));
        if (v && !/^\(?\s*cnae\s*\)?$/i.test(dekey(v))) out.cnae = dispFix(v);
      }
      if (!out.grauRisco && /grau de risco/.test(d2) && !/atividade/.test(d2)) {
        v = norm(ln2.replace(/^.*?grau de risco\s*:?\s*/i, ''));
        if (v) out.grauRisco = dispFix(v);
      }
      if (!out.atividadePrincipal && /^atividade principal\b/i.test(norm(ln2))) {
        v = norm(ln2.replace(/^atividade principal\s*:?\s*/i, ''));
        if (v) out.atividadePrincipal = dispFix(v);
      }
    }

    /* 4) Fallbacks por padrão (sem linhas de rodapé/cabeçalho). */
    var blob = norm(scopeLines.filter(function (l) { return !isJunkLine(l); }).join(' • '));
    if (!out.cnpj) { var c2 = blob.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/); if (c2) out.cnpj = c2[0]; }
    if (!out.cep) { var e2 = blob.match(/\d{5}-?\d{3}/); if (e2) out.cep = e2[0]; }
    if (!out.email) { var e3 = blob.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i); if (e3) out.email = e3[0]; }
    if (!out.telefone) { var e4 = blob.match(/\(\d{2}\)\s?\d{4,5}-?\d{4}/); if (e4) out.telefone = e4[0]; }
    return out;
  }

  return {
    linesFromItems: linesFromItems,
    extractCompanyData: extractCompanyData,
    norm: norm,
    dispFix: dispFix
  };
});
