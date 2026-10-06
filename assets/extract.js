/* Módulo universal (browser/Node): extrai dados da empresa das páginas de texto de um PDF.
   Lida com fontes de codificação corrompida (ex.: «=ç, √=Ã, Á=Ç, ⁄=Ú, „=ã …) comuns em
   documentos PT-BR gerados no Word, e com layouts de formulário (label e valor na mesma
   linha, em linhas separadas ou campos em branco).
   A inscrição é detectada com tipo (CNPJ, CPF ou CAEPF) a partir do rótulo e/ou da
   máscara do número. */
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

  /* ================= Inscrição: CNPJ / CPF / CAEPF =================
     Formatos oficiais (Receita Federal):
       CNPJ : NN.NNN.NNN/NNNN-NN (14 dígitos, 4 após a barra)
       CPF  : NNN.NNN.NNN-NN     (11 dígitos, sem barra)
       CAEPF: NNN.NNN.NNN/NNN-NN (14 dígitos, 3 após a barra)
     CNPJ e CAEPF têm 14 dígitos; com máscara a barra desempata. Sem máscara
     (só dígitos) usa-se o rótulo do campo e, em último caso, a validação dos
     dígitos verificadores — com padrão CNPJ (caso mais comum). */
  function onlyDigits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function allSameDigits(d) { return /^(\d)\1*$/.test(d); }

  function validarCPF(v) {
    var d = onlyDigits(v);
    if (d.length !== 11 || allSameDigits(d)) return false;
    var i, s, r;
    s = 0;
    for (i = 0; i < 9; i++) s += parseInt(d.charAt(i), 10) * (10 - i);
    r = s % 11;
    if (parseInt(d.charAt(9), 10) !== (r < 2 ? 0 : 11 - r)) return false;
    s = 0;
    for (i = 0; i < 10; i++) s += parseInt(d.charAt(i), 10) * (11 - i);
    r = s % 11;
    return parseInt(d.charAt(10), 10) === (r < 2 ? 0 : 11 - r);
  }

  function validarCNPJ(v) {
    var d = onlyDigits(v);
    if (d.length !== 14 || allSameDigits(d)) return false;
    var w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    var w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    var i, s, r;
    s = 0;
    for (i = 0; i < 12; i++) s += parseInt(d.charAt(i), 10) * w1[i];
    r = s % 11;
    if (parseInt(d.charAt(12), 10) !== (r < 2 ? 0 : 11 - r)) return false;
    s = 0;
    for (i = 0; i < 13; i++) s += parseInt(d.charAt(i), 10) * w2[i];
    r = s % 11;
    return parseInt(d.charAt(13), 10) === (r < 2 ? 0 : 11 - r);
  }

  /* CAEPF: DV módulo 11 com pesos 9..2 cíclicos a partir da unidade; resto 10
     vale 0. Calculados os dois dígitos, soma-se 12 (mód. 100) ao par. */
  function validarCAEPF(v) {
    var d = onlyDigits(v);
    if (d.length !== 14 || allSameDigits(d)) return false;
    var base = d.slice(0, 12);
    var rev = [];
    var i;
    for (i = base.length - 1; i >= 0; i--) rev.push(parseInt(base.charAt(i), 10));
    function calc(arr) {
      var mod = 9, sum = 0, j;
      for (j = 0; j < arr.length; j++) {
        sum += arr[j] * mod;
        mod = mod > 2 ? mod - 1 : 9;
      }
      var r = sum % 11;
      return r === 10 ? 0 : r;
    }
    var dv1 = calc(rev);
    var dv2 = calc([dv1].concat(rev));
    var dv = dv1 * 10 + dv2 + 12;
    if (dv > 99) dv -= 100;
    var dvStr = dv < 10 ? '0' + dv : '' + dv;
    return d.slice(12, 14) === dvStr;
  }

  /* Detecta o tipo pela máscara/dígitos. Hint ('cnpj'|'cpf'|'caepf') é o rótulo
     do campo no PDF e só desempatia 14 dígitos sem máscara. Retorna
     { tipo: 'CNPJ'|'CPF'|'CAEPF'|'', valido: bool, digitos: string }. */
  function detectarTipoInscricao(valor, hint) {
    var d = onlyDigits(valor);
    var h = String(hint || '').toLowerCase();
    var H = h === 'cnpj' ? 'CNPJ' : h === 'cpf' ? 'CPF' : h === 'caepf' ? 'CAEPF' : '';
    if (d.length === 11) return { tipo: 'CPF', valido: validarCPF(d), digitos: d };
    if (d.length === 14) {
      var s = String(valor == null ? '' : valor);
      var slashLen = -1;
      var si = s.indexOf('/');
      if (si >= 0) {
        var mm = s.slice(si + 1).match(/^\s*(\d+)/);
        if (mm) slashLen = mm[1].length;
      }
      if (slashLen === 4) return { tipo: 'CNPJ', valido: validarCNPJ(d), digitos: d };
      if (slashLen === 3) return { tipo: 'CAEPF', valido: validarCAEPF(d), digitos: d };
      if (H === 'CNPJ') return { tipo: 'CNPJ', valido: validarCNPJ(d), digitos: d };
      if (H === 'CAEPF') return { tipo: 'CAEPF', valido: validarCAEPF(d), digitos: d };
      var vc = validarCNPJ(d), va = validarCAEPF(d);
      if (va && !vc) return { tipo: 'CAEPF', valido: true, digitos: d };
      if (vc && !va) return { tipo: 'CNPJ', valido: true, digitos: d };
      return { tipo: 'CNPJ', valido: vc, digitos: d };
    }
    if (d.length > 0 && H) return { tipo: H, valido: false, digitos: d };
    return { tipo: '', valido: false, digitos: d };
  }

  function formatarInscricao(valor, tipo) {
    var d = onlyDigits(valor);
    var t = String(tipo || '').toUpperCase();
    if (d.length === 11 && (t === 'CPF' || t === '')) {
      return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
    }
    if (d.length === 14) {
      if (t === 'CAEPF') return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '/' + d.slice(9, 12) + '-' + d.slice(12);
      if (t === 'CNPJ' || t === '') return d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/' + d.slice(8, 12) + '-' + d.slice(12);
    }
    return String(valor == null ? '' : valor).trim();
  }

  /* Localiza um número de inscrição em texto livre (valor rotulado ou bloco
     corrido). Máscaras com barra primeiro (não se confundem), depois 14
     dígitos sem barra e por fim CPF. Retorna { valor, tipo, valido } ou null. */
  function extrairInscricaoDeTexto(texto, hint) {
    if (texto == null) return null;
    var t = String(texto);
    if (!t) return null;
    var m, det;
    m = t.match(/\b\d{3}\.\d{3}\.\d{3}\/\d{3}-\d{2}\b/);
    if (m) { det = detectarTipoInscricao(m[0], hint); return { valor: m[0], tipo: 'CAEPF', valido: det.valido }; }
    m = t.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
    if (m) { det = detectarTipoInscricao(m[0], hint); return { valor: m[0], tipo: 'CNPJ', valido: det.valido }; }
    m = t.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
    if (m) { det = detectarTipoInscricao(m[0], hint); return { valor: m[0], tipo: 'CPF', valido: det.valido }; }
    m = t.match(/\b\d{3}\.?\d{3}\.?\d{3}\/\d{3}-?\d{2}\b/);
    if (m) { det = detectarTipoInscricao(m[0], hint); return { valor: m[0], tipo: 'CAEPF', valido: det.valido }; }
    m = t.match(/\b\d{2}\.?\d{3}\.?\d{3}\/\d{4}-?\d{2}\b/);
    if (m) { det = detectarTipoInscricao(m[0], hint); return { valor: m[0], tipo: 'CNPJ', valido: det.valido }; }
    /* 14 dígitos sem barra (pontuação parcial ou só dígitos). Telefones, CEP,
       datas e CNAE não têm 14 dígitos corridos: falso positivo improvável. */
    m = t.match(/\b\d{2}\.?\d{3}\.?\d{3}\.?\d{4}-?\d{2}\b/);
    if (m) { det = detectarTipoInscricao(m[0], hint); return { valor: m[0], tipo: det.tipo || 'CNPJ', valido: det.valido }; }
    m = t.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/);
    if (m) { det = detectarTipoInscricao(m[0], hint); return { valor: m[0], tipo: 'CPF', valido: det.valido }; }
    return null;
  }

  var LABEL_SEQS = [
    ['razao', 'social', 'razaoSocial'],
    ['nome', 'fantasia', 'nomeFantasia'],
    ['ramo', 'de', 'atividade', 'ramoAtividade'],
    ['inscricao', 'estadual', 'inscricaoEstadual'],
    ['cnpj', 'inscricao'],
    ['cpf', 'inscricao'],
    ['caepf', 'inscricao'],
    /* Rótulo genérico ("Inscrição", "CNPJ/CPF/CAEPF"): depois das específicas. */
    ['inscricao', 'inscricao'],
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

  /* Tokenização: divide a linha em tokens originais (para recortar valores com a
     máscara intacta) e em chaves achatadas (para casar rótulos como
     "CNPJ/CPF/CAEPF:", que o dekey expande em várias chaves). Map relaciona
     cada chave ao índice do token original. */
  function tokenize(line) {
    var raw = String(line == null ? '' : line).split(/\s+/);
    var tok = [];
    var r;
    for (r = 0; r < raw.length; r++) if (raw[r]) tok.push(raw[r]);
    var keys = [];
    var map = [];
    for (var i = 0; i < tok.length; i++) {
      var dk = dekey(tok[i]);
      if (!dk) { keys.push(''); map.push(i); }
      else {
        var parts = dk.split(' ');
        var any = false;
        for (var j = 0; j < parts.length; j++) {
          if (parts[j]) { keys.push(parts[j]); map.push(i); any = true; }
        }
        if (!any) { keys.push(''); map.push(i); }
      }
    }
    return { tok: tok, keys: keys, map: map };
  }
  function tokenKeys(line) { return tokenize(line).keys; }

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
        if (ok) {
          var fld = seq[n];
          best = { field: fld, start: i, end: i + n, kind: fld === 'inscricao' ? seq[0] : '' };
          break;
        }
      }
      if (best) { found.push(best); i = best.end - 1; }
    }
    return found;
  }

  /* Funde rótulos adjacentes do mesmo campo ("CNPJ / CPF / CAEPF" vira um rótulo
     único). Tipos distintos fundidos marcam kind='*' (sem dica específica). */
  function mergeLabels(labels, keys) {
    var merged = [];
    labels.forEach(function (l) {
      var prev = merged[merged.length - 1];
      if (prev && prev.field === l.field) {
        var gapOk = l.start === prev.end ||
          (l.start === prev.end + 1 && !keys[prev.end]);
        if (gapOk) {
          prev.end = l.end;
          if (prev.kind !== l.kind) prev.kind = '*';
          return;
        }
      }
      merged.push({ field: l.field, start: l.start, end: l.end, kind: l.kind });
    });
    return merged;
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

  /* Guarda a inscrição extraída de um valor rotulado (ou da linha seguinte),
     isolando o número quando há texto extra e detectando o tipo. */
  function setInscricao(out, valorBruto, hint) {
    if (out.inscricao) return;
    var cand = extrairInscricaoDeTexto(valorBruto, hint);
    var v = cand ? cand.valor : norm(valorBruto);
    if (!v) return;
    var det = detectarTipoInscricao(v, hint);
    out.inscricao = dispFix(norm(v));
    out.tipoInscricao = det.tipo;
    out.inscricaoValida = det.valido;
  }

  function extractCompanyData(pages) {
    var out = {
      razaoSocial: '', nomeFantasia: '', ramoAtividade: '',
      inscricao: '', tipoInscricao: '', inscricaoValida: true, cnpj: '',
      inscricaoEstadual: '',
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
      var tk = tokenize(line);
      var tok = tk.tok;
      var labels = mergeLabels(findLabels(tk.keys), tk.keys);
      /* Linha sem labels: aplica filtros de rodapé/lixo antes de usar como valor. */
      if (!labels.length) {
        if (isJunkLine(line)) continue;
        if (pending.length) {
          var pend = pending.shift();
          if (pend.field === 'inscricao') setInscricao(out, line, pend.kind);
          else out[pend.field] = dispFix(norm(line));
        }
        continue;
      }
      pending = []; /* novo label cancela pendências (campos vazios) */
      labels.forEach(function (lab, li) {
        var tokEnd = tk.map[lab.end - 1] + 1;
        var segEnd = li + 1 < labels.length ? tk.map[labels[li + 1].start] : tok.length;
        var val = norm(tok.slice(tokEnd, segEnd).join(' ')).replace(/:$/, '').replace(/^[:\-\s]+/, '').trim();
        if (lab.field === 'inscricao') {
          var hint = (lab.kind === '*' || lab.kind === 'inscricao' || !lab.kind) ? '' : lab.kind;
          if (val) setInscricao(out, val, hint);
          else pending.push({ field: 'inscricao', kind: hint });
        } else {
          if (val) { if (!out[lab.field]) out[lab.field] = dispFix(val); }
          else pending.push({ field: lab.field, kind: '' });
        }
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
    if (!out.inscricao) {
      var fb = extrairInscricaoDeTexto(blob, '');
      if (fb) {
        out.inscricao = fb.valor;
        out.tipoInscricao = fb.tipo;
        out.inscricaoValida = fb.valido;
      }
    }
    out.cnpj = out.inscricao || ''; /* compat: alias legado da inscrição */
    /* CEP/e-mail/telefone: fora da inscrição e do telefone já lido (o CEP não
       casa parte de um CPF nem de um telefone como "(31) 99999-9999"). */
    var blobNI = blob;
    if (out.inscricao) blobNI = blobNI.split(out.inscricao).join(' ');
    if (out.telefone) blobNI = blobNI.split(out.telefone).join(' ');
    if (!out.cep) { var e2 = blobNI.match(/\d{5}-?\d{3}/); if (e2) out.cep = e2[0]; }
    if (!out.email) { var e3 = blobNI.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i); if (e3) out.email = e3[0]; }
    if (!out.telefone) { var e4 = blobNI.match(/\(\d{2}\)\s?\d{4,5}-?\d{4}/); if (e4) out.telefone = e4[0]; }
    return out;
  }

  return {
    linesFromItems: linesFromItems,
    extractCompanyData: extractCompanyData,
    norm: norm,
    dispFix: dispFix,
    onlyDigits: onlyDigits,
    validarCPF: validarCPF,
    validarCNPJ: validarCNPJ,
    validarCAEPF: validarCAEPF,
    detectarTipoInscricao: detectarTipoInscricao,
    formatarInscricao: formatarInscricao,
    extrairInscricaoDeTexto: extrairInscricaoDeTexto
  };
});
