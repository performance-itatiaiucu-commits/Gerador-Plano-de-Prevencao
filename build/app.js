(function () {
  'use strict';

  /* ============================== UTILITÁRIOS ============================== */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function hojeBR() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function hojeExtenso() { var d = new Date(); return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
  function frag(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function storeDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  var toastTimer = null;
  function toast(msg, err) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'show' + (err ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ''; }, 4200);
  }

  var LOGO_SRC = (document.querySelector('.brand img') || { src: '' }).src; /* logo inline já resolvido no HTML */
  var LS_KEY = 'gpp-plano-v1';

  /* Identificação do responsável técnico pela elaboração.
     Fonte única: reaproveitada na capa ("Elaborado por") e na assinatura (seção 18). */
  var ELAB = {
    nome: 'Peterson da Silva Cassemiro',
    titulo: 'Técnico de Segurança do Trabalho | Reg. MTE nº 45.342/SP',
    empresa: 'Grupo Performance — Medicina e Segurança do Trabalho',
    atuacao: 'Consultor em SST desde 2012 · Acadêmico de Direito — Universidade de Itaúna/MG (em curso)',
    autoria: 'Autor: &quot;A Efetivação dos Direitos Fundamentais à Saúde Mental no Trabalho&quot; — Coleção CAED-JUS 2025 (Editora Pembroke Collins)',
    contato: '(31) 99693-4451 | peterson@performanceocupacional.med.br'
  };
  /* As linhas de currículo complementar (formação, autoria e contato) usam a classe
     .cv-extra, com corpo menor e cor secundária, para não competir com o registro
     profissional — que é o que dá validade técnica ao documento. */
  var ELAB_SIGN =
    ELAB.nome + '<br>' + ELAB.titulo + '<br>' + ELAB.empresa +
    '<span class="cv-extra">' + ELAB.atuacao + '<br>' + ELAB.autoria + '<br>' + ELAB.contato + '</span>';

  /* ============================== ESTADO ============================== */
  var COMPANY_FIELDS = [
    { k: 'razaoSocial', l: 'Razão Social', req: true },
    { k: 'nomeFantasia', l: 'Nome Fantasia' },
    { k: 'ramoAtividade', l: 'Ramo de Atividade' },
    { k: 'cnpj', l: 'CNPJ' },
    { k: 'endereco', l: 'Endereço' },
    { k: 'bairro', l: 'Bairro' },
    { k: 'cep', l: 'CEP' },
    { k: 'cidade', l: 'Cidade' },
    { k: 'estado', l: 'Estado' },
    { k: 'responsavel', l: 'Responsável' },
    { k: 'telefone', l: 'Telefone' },
    { k: 'email', l: 'E-mail', type: 'email' },
    { k: 'colMasculino', l: 'Colaboradores — Masculino' },
    { k: 'colFeminino', l: 'Colaboradores — Feminino' },
    { k: 'colTotal', l: 'Colaboradores — Total' },
    { k: 'horario', l: 'Horário de Trabalho', wide: true },
    { k: 'cnae', l: 'Código da Atividade (CNAE)' },
    { k: 'grauRisco', l: 'Grau de Risco' },
    { k: 'atividadePrincipal', l: 'Atividade Principal', wide: true }
  ];

  var state = {
    company: {},
    channels: {},
    outro: '',
    pdfName: '',
    /* Histórico da capa (tabela livre): [{ num:'00', data:'dd/mm/aaaa', motivo:'' }].
       Todas as linhas são editáveis — inclusive a da elaboração (Rev. 00). */
    historico: []
  };
  COMPANY_FIELDS.forEach(function (f) { state.company[f.k] = ''; });

  var ICON = {
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 6 9-6"/></svg>',
    form: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2.8" width="14" height="18.4" rx="2"/><path d="M9 7.5h6M9 11.5h6M9 15.5h4"/></svg>',
    whats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z"/><path d="M9 9.8c.6 2.4 2.8 4.6 5.2 5.2l1.3-1.3c.3-.3.7-.4 1-.2l1.6.8"/></svg>',
    caixa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8.2 12 3 3 8.2v7.6L12 21l9-5.2z"/><path d="M3.4 8.4 12 13l8.6-4.6"/><path d="M12 13v7.8"/></svg>',
    confia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6"/></svg>',
    externa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.7-3.1 3-4.9 5.5-4.9 1.4 0 2.7.5 3.7 1.4"/><circle cx="17" cy="10.5" r="2.6"/><path d="M13.8 19.5c.5-2.3 2.1-3.7 4-3.7 1.5 0 2.8.8 3.5 2.4"/></svg>',
    ouvidoria: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 13.5v-2a7.5 7.5 0 0 1 15 0v2"/><rect x="2.8" y="12.8" width="4" height="6" rx="1.6"/><rect x="17.2" y="12.8" width="4" height="6" rx="1.6"/><path d="M19.2 18.8c0 1.8-1.6 2.7-4.2 2.7"/></svg>',
    app: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.4"/><path d="M10.5 5h3"/><circle cx="12" cy="18" r="1"/></svg>'
  };

  /* Canais sugeridos no modelo + preenchimento por opção. */
  var CH = [
    {
      id: 'email', icon: ICON.mail, t: 'E-mail exclusivo',
      d: 'Caixa de e-mail destinada ao envio direto de relatos, denúncias ou sugestões, com opção de anonimato.',
      fields: [{ k: 'email', l: 'Endereço do e-mail', ph: 'denuncias@empresa.com.br', type: 'email', req: true }],
      sent: function (v) { return 'E-mail exclusivo com opção de anonimato: <b>' + esc(v.email) + '</b>, destinado ao envio direto de relatos, denúncias ou sugestões.'; }
    },
    {
      id: 'form', icon: ICON.form, t: 'Formulário digital',
      d: 'Formulário digital para registro de denúncias, com acesso facilitado por link e QR Code afixado em pontos estratégicos.',
      fields: [{ k: 'link', l: 'Link do formulário', ph: 'https://forms.empresa.com.br/denuncias', type: 'url', req: true }],
      sent: function (v) { return 'Formulário digital com opção de anonimato, disponível em <b>' + esc(v.link) + '</b>, com acesso facilitado por meio de QR Code afixado em pontos estratégicos de convivência e circulação dos colaboradores, como áreas próximas a bebedouros, copa/cozinha, sanitários e demais locais de grande fluxo interno.'; }
    },
    {
      id: 'whats', icon: ICON.whats, t: 'WhatsApp corporativo exclusivo',
      d: 'Número exclusivo para o canal de denúncias, com possibilidade de envio de mensagem sem identificação nominal.',
      fields: [{ k: 'num', l: 'Número do WhatsApp', ph: '(31) 99999-9999', type: 'tel', req: true }],
      sent: function (v) { return 'WhatsApp corporativo exclusivo: <b>' + esc(v.num) + '</b>, número destinado ao canal de denúncias, com possibilidade de envio de mensagem sem necessidade de identificação nominal.'; }
    },
    {
      id: 'caixa', icon: ICON.caixa, t: 'Caixa física de denúncias',
      d: 'Caixa mantida trancada, com acesso restrito exclusivamente ao responsável designado para gestão das manifestações.',
      fields: [{ k: 'local', l: 'Local de instalação', ph: 'Ex.: recepção / refeitório / portaria', req: true }],
      sent: function (v) { return 'Caixa física de denúncias: instalada em <b>' + esc(v.local) + '</b>, mantida trancada e com acesso restrito exclusivamente ao responsável designado para gestão das manifestações.'; }
    },
    {
      id: 'confia', icon: ICON.confia, t: 'Pessoa de confiança',
      d: 'Profissional devidamente treinado para o acolhimento inicial, escuta qualificada e direcionamento das demandas.',
      fields: [{ k: 'quem', l: 'Cargo / nome da pessoa', ph: 'Ex.: Coordenadora de RH — Fulana de Tal', req: true }],
      sent: function (v) { return 'Pessoa de confiança: <b>' + esc(v.quem) + '</b>, devidamente treinada para realizar o acolhimento inicial, escuta qualificada e direcionamento adequado das demandas recebidas.'; }
    },
    {
      id: 'externa', icon: ICON.externa, t: 'Pessoa designada externa ao setor/empresa',
      d: 'Profissional treinado e imparcial (RH, Jurídico ou consultoria externa) apto a receber relatos preservando identidades.',
      fields: [{ k: 'quem', l: 'Identificação e contato', ph: 'Ex.: Consultoria X — (31) 99999-9999 / contato@consultoria.com.br', req: true }],
      sent: function (v) { return 'Pessoa designada externa ao setor/empresa: <b>' + esc(v.quem) + '</b>, profissional treinado e imparcial apto a receber relatos preservando a identidade do denunciante.'; }
    },
    {
      id: 'ouvidoria', icon: ICON.ouvidoria, t: 'Canal terceirizado de ouvidoria',
      d: 'Empresa especializada recebe as denúncias de forma independente, aumentando a confiança e a imparcialidade do processo.',
      fields: [
        { k: 'empresa', l: 'Empresa contratada', ph: 'Nome da empresa de ouvidoria', req: true },
        { k: 'contato', l: 'Contato (telefone, e-mail ou site)', ph: '(31) 99999-9999 · ouvidoria@empresa.com.br', req: true }
      ],
      sent: function (v) { return 'Canal terceirizado de ouvidoria: <b>' + esc(v.empresa) + '</b>, empresa especializada que recebe as denúncias de forma independente, aumentando a confiança e imparcialidade do processo. Contato: ' + esc(v.contato) + '.'; }
    },
    {
      id: 'app', icon: ICON.app, t: 'Aplicativo de denúncias',
      d: 'Sistema próprio ou contratado, com protocolo de acompanhamento anônimo e envio seguro de informações.',
      fields: [{ k: 'nome', l: 'Aplicativo / sistema (nome ou link)', ph: 'Ex.: App Denúncia — https://appempresa.com.br', req: true }],
      sent: function (v) { return 'Aplicativo de denúncias: <b>' + esc(v.nome) + '</b>, sistema com protocolo de acompanhamento anônimo e envio seguro de informações.'; }
    }
  ];

  CH.forEach(function (c) { state.channels[c.id] = { on: false, v: {} }; });

  /* ============================== RENDER DO FORMULÁRIO ============================== */
  function renderFields() {
    var box = $('#fieldsBox');
    box.innerHTML = '';
    COMPANY_FIELDS.forEach(function (f) {
      var wrap = document.createElement('label');
      wrap.className = 'fld' + (f.wide ? ' wide' : '');
      wrap.innerHTML = '<span>' + esc(f.l) + (f.req ? ' *' : '') + '</span>' +
        '<input type="' + (f.type || 'text') + '" data-k="' + f.k + '" value="' + esc(state.company[f.k]) + '">';
      box.appendChild(wrap);
    });
    $$('input[data-k]', box).forEach(function (inp) {
      inp.addEventListener('input', function () {
        state.company[inp.dataset.k] = inp.value;
        inp.classList.remove('err');
        save();
      });
    });
  }
  function fillFields() {
    $$('#fieldsBox input[data-k]').forEach(function (inp) {
      inp.value = state.company[inp.dataset.k] || '';
    });
  }

  function renderChannels() {
    var g = $('#chanGrid');
    g.innerHTML = '';
    CH.forEach(function (c) {
      var st = state.channels[c.id];
      var el = document.createElement('div');
      el.className = 'chan' + (st.on ? ' on' : '');
      el.dataset.id = c.id;
      el.tabIndex = 0;
      el.setAttribute('role', 'checkbox');
      el.setAttribute('aria-checked', st.on ? 'true' : 'false');
      el.innerHTML =
        '<div class="chan-head">' +
          '<span class="chk" aria-hidden="true"></span>' +
          '<span class="chan-ic" aria-hidden="true">' + c.icon + '</span>' +
          '<span class="chan-tx"><b>' + esc(c.t) + '</b><small>' + esc(c.d) + '</small></span>' +
        '</div>' +
        '<div class="chan-fields"' + (st.on ? '' : ' hidden') + '>' +
          c.fields.map(function (f) {
            return '<label class="fld"><span>' + esc(f.l) + (f.req ? ' *' : '') + '</span>' +
              '<input type="' + (f.type || 'text') + '" data-f="' + f.k + '" placeholder="' + esc(f.ph || '') + '" value="' + esc(st.v[f.k] || '') + '"></label>';
          }).join('') +
        '</div>';
      el.addEventListener('click', function (e) {
        if (e.target.closest('input,textarea')) return;
        toggleChannel(c.id);
      });
      el.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('input,textarea')) { e.preventDefault(); toggleChannel(c.id); }
      });
      $$('input[data-f]', el).forEach(function (inp) {
        inp.addEventListener('input', function () {
          state.channels[c.id].v[inp.dataset.f] = inp.value;
          inp.classList.remove('err');
          save();
        });
      });
      g.appendChild(el);
    });
  }

  function toggleChannel(id) {
    var st = state.channels[id];
    st.on = !st.on;
    var el = $('.chan[data-id="' + id + '"]');
    el.classList.toggle('on', st.on);
    el.setAttribute('aria-checked', st.on ? 'true' : 'false');
    var f = $('.chan-fields', el);
    if (f) f.hidden = !st.on;
    hideAlerts();
    save();
  }

  $('#chanOutro').addEventListener('click', function (e) {
    if (!e.target.closest('textarea')) $('#outroTxt').focus();
  });
  $('#outroTxt').addEventListener('input', function () {
    state.outro = this.value;
    save();
  });

  /* ============================== HISTÓRICO DE REVISÕES ==============================
     Tabela livre: todas as linhas — inclusive a da elaboração (Rev. 00) — são editáveis
     e a capa reproduz exatamente o que estiver preenchido aqui. */
  function pad2(n) { return ('0' + Number(n || 0)).slice(-2); }
  /* Ponto de partida da tabela: a linha da elaboração, já pronta para edição. */
  function historicoPadrao() {
    return [{ num: '00', data: hojeBR(), motivo: 'Elaboração' }];
  }
  /* Linha em branco (sem número, data e motivo) não vai para o documento. */
  function historicoValido() {
    return state.historico.filter(function (r) {
      return String(r.num || '').trim() || String(r.data || '').trim() || String(r.motivo || '').trim();
    });
  }
  /* Nº sugerido para a próxima linha: um a mais que o maior número já preenchido. */
  function proximoNumRev() {
    var max = 0;
    state.historico.forEach(function (r) {
      var n = parseInt(r.num, 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return pad2(max + 1);
  }
  /* Revisão vigente (última linha preenchida) — vai no cabeçalho das páginas. */
  function revAtual() {
    var v = historicoValido();
    if (!v.length) return '00';
    var n = String(v[v.length - 1].num || '').trim();
    return n || '00';
  }

  function renderHistorico() {
    var list = $('#revList');
    list.innerHTML = '';
    state.historico.forEach(function (r, i) {
      var row = document.createElement('div');
      row.className = 'rev-row';
      row.dataset.i = i;
      row.innerHTML =
        '<input class="rev-num" data-c="num" inputmode="numeric" maxlength="4" aria-label="Número da revisão" placeholder="00" value="' + esc(r.num) + '">' +
        '<input class="rev-data" data-c="data" maxlength="10" placeholder="dd/mm/aaaa" aria-label="Data" value="' + esc(r.data) + '">' +
        '<input class="rev-hist" data-c="motivo" placeholder="Descrição — ex.: Elaboração, Revisão geral do Plano…" aria-label="Histórico" value="' + esc(r.motivo) + '">' +
        '<button class="rev-del" type="button" title="Remover linha" aria-label="Remover linha">×</button>';
      list.appendChild(row);
    });
    $('#revEmpty').hidden = state.historico.length > 0;
  }

  $('#btnAddRev').addEventListener('click', function () {
    var num = proximoNumRev();
    state.historico.push({ num: num, data: hojeBR(), motivo: '' });
    renderHistorico();
    save();
    var rows = $$('#revList .rev-row');
    var last = rows[rows.length - 1];
    if (last) $('.rev-hist', last).focus();
    toast('Linha ' + num + ' adicionada — ajuste número, data e descrição.');
  });

  $('#revList').addEventListener('input', function (e) {
    var row = e.target.closest('.rev-row');
    if (!row) return;
    var i = Number(row.dataset.i);
    if (!state.historico[i]) return;
    state.historico[i][e.target.dataset.c] = e.target.value;
    save();
  });

  $('#revList').addEventListener('click', function (e) {
    var btn = e.target.closest('.rev-del');
    if (!btn) return;
    var i = Number(btn.closest('.rev-row').dataset.i);
    state.historico.splice(i, 1);
    renderHistorico();
    save();
  });

  function save() { store(LS_KEY, JSON.stringify({ company: state.company, channels: state.channels, outro: state.outro, pdfName: state.pdfName, historico: state.historico })); }
  function restore() {
    /* Sem sessão salva, a tabela começa com a linha da elaboração pronta para edição. */
    state.historico = historicoPadrao();
    var raw = store(LS_KEY);
    if (!raw) return;
    try {
      var d = JSON.parse(raw);
      COMPANY_FIELDS.forEach(function (f) {
        if (d.company && typeof d.company[f.k] === 'string') state.company[f.k] = d.company[f.k];
      });
      CH.forEach(function (c) {
        if (d.channels && d.channels[c.id]) {
          state.channels[c.id].on = !!d.channels[c.id].on;
          state.channels[c.id].v = d.channels[c.id].v || {};
        }
      });
      state.outro = (d.outro && String(d.outro)) || '';
      state.pdfName = (d.pdfName && String(d.pdfName)) || '';
      /* Compatibilidade: 'revisoes' era o nome do campo quando a linha da elaboração
         (Rev. 00) era fixa e ficava fora da lista — nesse caso ela é reincluída. */
      var bruto = Array.isArray(d.historico) ? d.historico : null;
      var legacy = !bruto && Array.isArray(d.revisoes);
      var linhas = bruto || (legacy ? d.revisoes : null);
      if (linhas === null) {
        state.historico = historicoPadrao();
      } else {
        state.historico = linhas.map(function (r) {
          return { num: String((r && r.num) || ''), data: String((r && r.data) || ''), motivo: String((r && r.motivo) || '') };
        });
        if (legacy) state.historico.unshift(historicoPadrao()[0]);
      }
    } catch (e) {
      state.historico = historicoPadrao();
    }
  }

  /* ============================== PDF (etapa 1) ============================== */
  function setStatus(txt) { $('#statusPdf').textContent = txt; }

  function setupPdfjs() {
    try {
      var code = $('#workerCode').textContent;
      var url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = url;
    } catch (e) { /* usa o fake worker embutido */ }
  }

  function revealFields() {
    $('#fieldsBox').hidden = false;
    $('#fieldsNote').hidden = false;
  }

  function handleFile(file) {
    if (!file) return;
    if (!/pdf/i.test(file.type || '') && !/\.pdf$/i.test(file.name || '')) {
      toast('Selecione um arquivo PDF.', true);
      return;
    }
    setStatus('Lendo PDF…');
    file.arrayBuffer().then(function (buf) {
      return window.pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (doc) {
      var pages = [];
      var chain = Promise.resolve();
      for (var i = 1; i <= doc.numPages; i++) {
        (function (n) {
          chain = chain.then(function () {
            return doc.getPage(n).then(function (p) {
              return p.getTextContent().then(function (tc) {
                pages.push({ index: n, lines: window.Extract.linesFromItems(tc.items) });
              });
            });
          });
        })(i);
      }
      return chain.then(function () {
        var data = window.Extract.extractCompanyData(pages);
        var found = 0;
        COMPANY_FIELDS.forEach(function (f) {
          if (data[f.k]) { state.company[f.k] = data[f.k]; found++; }
        });
        fillFields();
        revealFields();
        state.pdfName = file.name;
        save();
        setStatus('PDF: ' + file.name + ' · ' + doc.numPages + ' pág.');
        var ok = $('#pdfOk');
        ok.hidden = false;
        if (data.razaoSocial) {
          ok.textContent = '✔ Dados identificados na página ' + data.foundPage + ' do PDF (' + found + ' campos). Confira abaixo antes de gerar.';
        } else {
          ok.textContent = '✔ PDF lido (' + doc.numPages + ' páginas), mas os campos de identificação estão vazios ou em branco no arquivo. Preencha os dados manualmente abaixo.';
        }
        toast('PDF processado com sucesso.');
      });
    }).catch(function (err) {
      console.error(err);
      setStatus('Falha ao ler o PDF');
      revealFields();
      toast('Não foi possível ler o PDF neste ambiente. Preencha os dados manualmente abaixo.', true);
    });
  }

  var drop = $('#drop');
  var fileInput = $('#filePdf');
  drop.addEventListener('click', function (e) {
    if (e.target.closest('#btnManual')) return;
    fileInput.click();
  });
  drop.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  $('#btnManual').addEventListener('click', function (e) {
    e.stopPropagation();
    revealFields();
    $('#fieldsBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  fileInput.addEventListener('change', function () { handleFile(this.files[0]); this.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('drag'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('drag'); });
  });
  drop.addEventListener('drop', function (e) {
    var dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) handleFile(dt.files[0]);
  });

  /* ============================== CONTEÚDO DO DOCUMENTO ============================== */
  function X(v) { var t = String(v || '').trim(); return t ? esc(t) : '—'; }

  function buildSections(E, chanList, outroTxt) {
    var EMP = esc(E.razaoSocial.trim() || 'NOME DA EMPRESA');
    var hoje = hojeBR();
    var S = [];

    /* 1 — IDENTIFICAÇÃO DA EMPRESA */
    S.push({ no: 1, blocks: [
      '<section class="blk"><h2 class="sec-t">1. Identificação da empresa</h2>' +
      '<p class="tbl-title">Planilha de apresentação da empresa</p>' +
      '<table class="dt">' +
        '<tr><td class="lab">Razão Social</td><td>' + X(E.razaoSocial) + '</td></tr>' +
        '<tr><td class="lab">Nome Fantasia</td><td>' + X(E.nomeFantasia) + '</td></tr>' +
        '<tr><td class="lab">Ramo de Atividade</td><td>' + X(E.ramoAtividade) + '</td></tr>' +
        '<tr><td class="lab">CNPJ</td><td>' + X(E.cnpj) + '</td></tr>' +
        '<tr><td class="lab">Endereço</td><td>' + X(E.endereco) + '</td></tr>' +
        '<tr><td class="lab">Bairro</td><td>' + X(E.bairro) + '</td></tr>' +
        '<tr><td class="lab">CEP</td><td>' + X(E.cep) + '</td></tr>' +
        '<tr><td class="lab">Cidade</td><td>' + X(E.cidade) + '</td></tr>' +
        '<tr><td class="lab">Estado</td><td>' + X(E.estado) + '</td></tr>' +
        '<tr><td class="lab">Responsável</td><td>' + X(E.responsavel) + '</td></tr>' +
        '<tr><td class="lab">Telefone</td><td>' + X(E.telefone) + '</td></tr>' +
        '<tr><td class="lab">Email</td><td>' + X(E.email) + '</td></tr>' +
      '</table></section>',
      '<section class="blk"><p class="tbl-title">Número de colaboradores</p>' +
      '<table class="dt"><tr><th>Masculino</th><th>Feminino</th><th>Total</th></tr>' +
      '<tr><td>' + X(E.colMasculino) + '</td><td>' + X(E.colFeminino) + '</td><td>' + X(E.colTotal) + '</td></tr></table>' +
      '<p class="tbl-title">Horário de trabalho</p>' +
      '<table class="dt"><tr><td>' + X(E.horario) + '</td></tr></table>' +
      '<p class="tbl-title">Atividade e grau de risco</p>' +
      '<table class="dt">' +
        '<tr><td class="lab">Código da Atividade (CNAE)</td><td>' + X(E.cnae) + '</td></tr>' +
        '<tr><td class="lab">Grau de risco</td><td>' + X(E.grauRisco) + '</td></tr>' +
        '<tr><td class="lab">Atividade Principal</td><td>' + X(E.atividadePrincipal) + '</td></tr>' +
      '</table></section>'
    ]});

    /* 2 — EMPRESA ELABORADORA (fixo Grupo Performance) */
    S.push({ no: 2, blocks: [
      '<section class="blk"><h2 class="sec-t">2. Identificação da empresa elaboradora do plano</h2>' +
      '<p class="tbl-title">Planilha de apresentação da empresa</p>' +
      '<table class="dt">' +
        '<tr><td class="lab">Razão Social</td><td>PERFORMANCE SAÚDE E SEGURANÇA OCUPACIONAL LTDA</td></tr>' +
        '<tr><td class="lab">Ramo de Atividade</td><td>Outras atividades de atenção à saúde humana não especificadas anteriormente</td></tr>' +
        '<tr><td class="lab">CNPJ</td><td>13.583.116/0001-42</td></tr>' +
        '<tr><td class="lab">Inscrição Estadual</td><td>Isento</td></tr>' +
        '<tr><td class="lab">Endereço</td><td>Praça Antônio Quirino da Silva, 28</td></tr>' +
        '<tr><td class="lab">Bairro</td><td>Centro</td></tr>' +
        '<tr><td class="lab">CEP</td><td>35.685-000</td></tr>' +
        '<tr><td class="lab">Cidade</td><td>Itatiaiuçu</td></tr>' +
        '<tr><td class="lab">Estado</td><td>Minas Gerais</td></tr>' +
        '<tr><td class="lab">Responsável</td><td>Robson Luciano Siqueira Sica</td></tr>' +
        '<tr><td class="lab">Telefone</td><td>(31) 3572-1221 / 3572-1818</td></tr>' +
        '<tr><td class="lab">Email</td><td>comercial.ita@performanceocupacional.med.br<br>seguranca.ita@performanceocupacional.med.br</td></tr>' +
        '<tr><td class="lab">Código da Atividade (CNAE)</td><td>86.90-9-99</td></tr>' +
        '<tr><td class="lab">Grau de risco</td><td>01 (um)</td></tr>' +
      '</table></section>',
      '<section class="blk"><p class="dp">Somos um grupo especializado nas áreas de Medicina, Segurança do Trabalho e eSocial, atuando no mercado de Medicina Ocupacional há mais de 12 anos. Atualmente gerenciando mais de 1.500 empresas com média total superior a 25 mil vidas ativas.</p></section>'
    ]});

    /* 3 — TERMOS E DEFINIÇÕES */
    var termos = [
      ['AGU', 'Advocacia Geral da União.'],
      ['BOA FÉ OBJETIVA', 'Conduta de acordo com o padrão ético de confiança e lealdade, estabelecendo que na relação haja cuidado de respeito, informação, cooperação, lealdade e transparência. É um padrão de comportamento ético, leal e de cooperação, exigido nas relações obrigacionais. Impõe deveres anexos, como transparência, informação e lealdade, sem investigar a intenção mental do agente.'],
      ['BOA FÉ SUBJETIVA', 'Estado que deve ser examinado internamente de acordo com o sentimento da pessoa. Pode ser o estado de ignorância ou a crença sincera de não estar violando direito alheio. É comumente aplicada no Direito das Coisas (ex.: possuidor que acredita ser dono).'],
      ['CLT', 'Consolidação das Leis do Trabalho.'],
      ['CSJT', 'Conselho Superior da Justiça do Trabalho.'],
      ['LITIGÂNCIA DE MÁ FÉ', 'Uma das partes age em completa desconformidade com o princípio da lealdade processual.'],
      ['MÁ FÉ OBJETIVA', 'É o comportamento contrário aos deveres de lealdade, honestidade, cooperação e transparência, impostos pela boa-fé objetiva (cláusula geral de conduta).'],
      ['MÁ FÉ SUBJETIVA', 'É o estado de espírito da pessoa que age com a intenção consciente de enganar, prejudicar ou tirar vantagem ilícita.'],
      ['NR', 'Norma Regulamentadora.'],
      ['OIT', 'Organização Internacional do Trabalho.'],
      ['TST', 'Tribunal Superior do Trabalho.']
    ];
    var tBlocks = ['<section class="blk"><h2 class="sec-t">3. Termos e definições</h2>' + termos.slice(0, 4).map(function (t) {
      return '<p class="dp"><b>' + t[0] + ':</b> ' + t[1] + '</p>';
    }).join('') + '</section>'];
    for (var ti = 4; ti < termos.length; ti += 5) {
      tBlocks.push('<section class="blk">' + termos.slice(ti, ti + 5).map(function (t) {
        return '<p class="dp"><b>' + t[0] + ':</b> ' + t[1] + '</p>';
      }).join('') + '</section>');
    }
    S.push({ no: 3, blocks: tBlocks });

    /* 4 — INTRODUÇÃO */
    S.push({ no: 4, blocks: [
      '<section class="blk"><h2 class="sec-t">4. Introdução: a responsabilidade da empresa na criação de um ambiente de trabalho seguro</h2>' +
      '<p class="dp">A implementação de um plano de prevenção e combate ao assédio sexual é uma medida de importância estratégica para qualquer empresa, independentemente do seu porte. Longe de ser apenas uma formalidade para o cumprimento de obrigações legais, esta iniciativa é um pilar fundamental para a construção de um ambiente de trabalho produtivo, seguro e, acima de tudo, respeitoso. A proatividade na gestão de riscos comportamentais protege o capital humano e fortalece a reputação corporativa.</p>' +
      '<p class="dp">A Constituição da República de 1988, ao eleger a dignidade da pessoa humana e os valores sociais do trabalho como fundamentos da República (art. 1º, III e IV), impõe às organizações a responsabilidade de assegurar condições laborais compatíveis com tais princípios. O ambiente de trabalho saudável é desdobramento do direito fundamental à saúde (art. 6º e art. 196), bem como da redução dos riscos inerentes ao trabalho (art. 7º, XXII).</p>' +
      '<p class="dp">No plano infraconstitucional, a Consolidação das Leis do Trabalho impõe ao empregador o dever de cumprir e fazer cumprir as normas de segurança e medicina do trabalho (art. 157), enquanto o Código Civil, em seus artigos 186 e 927, estabelece o dever de reparar o dano decorrente de ato ilícito, inclusive quando configurada culpa por omissão.</p></section>',
      '<section class="blk"><p class="dp">A responsabilidade do empregador na manutenção de um ambiente laboral saudável é inequívoca. Conforme destacou a então presidente do Tribunal Superior do Trabalho (TST), ministra Maria Cristina Peduzzi, é dever da empresa promover a gestão das condições de segurança. A omissão em adotar medidas preventivas pode ser interpretada como uma "conduta culposa".</p>' +
      '<div class="quote">"Cabe ao empregador, assim, coibir o abuso de poder nas relações de trabalho e tomar medidas para impedir tais práticas, de modo que as relações no trabalho se desenvolvam em clima de respeito e harmonia."</div></section>',
      '<section class="blk"><p class="dp">Além do impacto jurídico, o assédio compromete a produtividade, eleva índices de absenteísmo, aumenta a rotatividade, deteriora o clima organizacional e expõe a empresa a riscos reputacionais e financeiros. Portanto, a adoção de política interna estruturada representa mecanismo preventivo essencial à sustentabilidade organizacional.</p>' +
      '<p class="dp">Portanto, a criação de uma cultura de tolerância zero ao assédio não é uma opção, mas uma obrigação. Para combatê-lo de forma eficaz, o primeiro e mais crucial passo é compreender claramente o que constitui o assédio moral e sexual em suas diversas manifestações.</p></section>'
    ]});

    /* 5 — OBJETIVO */
    S.push({ no: 5, blocks: [
      '<section class="blk"><h2 class="sec-t">5. Objetivo</h2>' +
      '<p class="dp">Estabelecer diretrizes institucionais claras, objetivas e proporcionais para prevenir, identificar, acolher, apurar e tratar situações de assédio moral e sexual no ambiente de trabalho, promovendo cultura organizacional pautada na ética, no respeito, na equidade e na integridade.</p>' +
      '<p class="dp">Com relação ao tema da violência e assédio moral no trabalho, a OIT (Organização Internacional do Trabalho) define, segundo a Convenção 190, como conjunto de comportamentos e práticas inaceitáveis ou de suas ameaças, de ocorrência única ou repetida, que visem, causem ou possam causar dano físico, psicológico, sexual ou econômico e inclui a violência e o assédio com base no gênero.</p>' +
      '<p class="dp">Segundo a recomendação 206 da OIT, o termo é tratado de forma única, abrangendo ofensas físicas, psicológicas, morais, sexuais e patrimoniais.</p></section>',
      '<section class="blk"><p class="dh3"><b>Este Plano possui como princípios:</b></p>' +
      '<ul class="dl">' +
        '<li>Proteger a dignidade e a saúde física e mental dos colaboradores;</li>' +
        '<li>Garantir tratamento imparcial e técnico às denúncias;</li>' +
        '<li>Assegurar contraditório e ampla defesa às partes envolvidas;</li>' +
        '<li>Mitigar riscos jurídicos e reputacionais;</li>' +
        '<li>Fortalecer a cultura organizacional baseada em valores institucionais.</li>' +
      '</ul>' +
      '<p class="dp">O presente instrumento reafirma o compromisso da <b>' + EMP + '</b> com a escuta responsável, a gestão adequada de conflitos e a adoção de medidas proporcionais à gravidade dos fatos, compatíveis com sua estrutura organizacional.</p></section>'
    ]});

    /* 6 — ASSÉDIO MORAL */
    S.push({ no: 6, blocks: [
      '<section class="blk"><h2 class="sec-t">6. Assédio moral: entenda e saiba identificar</h2>' +
      '<p class="dp">No mundo do trabalho, os termos "violência e assédio" referem-se a comportamentos e práticas inaceitáveis que causem (ou possam causar) dano físico, psicológico, sexual ou financeiro a alguém. Isso inclui, também, a violência e o assédio com base no gênero, ou seja, quando esses comportamentos se dirigem às pessoas em razão do seu sexo ou gênero.</p>' +
      '<p class="dp">Assediar é ofender, humilhar, ameaçar ou intimidar alguém, seja física ou verbalmente, entre outras condutas.</p>' +
      '<p class="dp">Também é assédio e discriminação fazer piadas ou comentários indesejáveis sobre:</p>' +
      '<ul class="dl">' +
        '<li>Raça, nacionalidade, origem étnica;</li>' +
        '<li>Cor;</li>' +
        '<li>Religião;</li>' +
        '<li>Idade;</li>' +
        '<li>Sexo, gênero, orientação sexual e expressão de gênero;</li>' +
        '<li>Estado civil;</li>' +
        '<li>Deficiência;</li>' +
        '<li>Situação econômica; e</li>' +
        '<li>Qualquer condição que discrimine o indivíduo.</li>' +
      '</ul></section>',
      '<section class="blk"><p class="dp">Essas práticas abusivas são um reflexo da violência na sociedade e representam ameaças aos direitos fundamentais de todas as pessoas, como, por exemplo, a sua dignidade e privacidade.</p>' +
      '<p class="dp">No trabalho, essas condutas criam um ambiente hostil e podem afetar a vida profissional e pessoal de quem sofre o assédio. Os relacionamentos ficam comprometidos e a vítima se sente sozinha. Além disso, há danos à saúde física, mental e social, que podem evoluir para o adoecimento físico ou mental, a incapacidade, o desemprego ou mesmo a morte.</p></section>',
      '<section class="blk"><p class="dh3"><b>Formas de assédio moral</b></p>' +
      '<p class="dp">O assédio moral manifesta-se de três modos distintos:</p>' +
      '<p class="dp"><b>VERTICAL:</b> relações de trabalho marcadas pela diferença de posição hierárquica. Pode ser descendente (assédio praticado por superior hierárquico) ou ascendente (assédio praticado por subordinado);</p>' +
      '<p class="dp"><b>HORIZONTAL:</b> relações de trabalho sem distinção hierárquica, ou seja, entre colegas de trabalho sem relação de subordinação;</p>' +
      '<p class="dp"><b>MISTO:</b> consiste na cumulação do assédio moral vertical e do horizontal. A pessoa é assediada por superiores hierárquicos e também por colegas de trabalho com os quais não mantém relação de subordinação.</p></section>'
    ]});

    /* 7 — ASSÉDIO SEXUAL */
    S.push({ no: 7, blocks: [
      '<section class="blk"><h2 class="sec-t">7. Assédio sexual: entenda e saiba identificar</h2>' +
      '<p class="dp">O assédio sexual é definido, de forma geral, como o constrangimento com conotação sexual no ambiente de trabalho, em que, como regra, o agente utiliza sua posição hierárquica superior ou sua influência para obter o que deseja. Em 2019, essa prática foi tema de 4.786 processos na Justiça do Trabalho.</p>' +
      '<p class="dp">Segundo a presidente do TST e do CSJT, ministra Maria Cristina Peduzzi, é dever do empregador promover a gestão racional das condições de segurança e saúde do trabalho. "Ao deixar de providenciar essas medidas, ele viola o dever objetivo de cuidado, configurando-se a conduta culposa", assinala a ministra Peduzzi. "Cabe ao empregador, assim, coibir o abuso de poder nas relações de trabalho e tomar medidas para impedir tais práticas, de modo que as relações no trabalho se desenvolvam em clima de respeito e harmonia".</p></section>',
      '<section class="blk"><p class="dh3"><b>Categorias</b></p>' +
      '<p class="dp">O assédio sexual pode ser de duas categorias. Por <b>chantagem</b>, quando a aceitação ou a rejeição de uma investida sexual é determinante para que o assediador tome uma decisão favorável ou prejudicial para a situação de trabalho da pessoa assediada.</p>' +
      '<p class="dp"><b>Assédio Sexual no Trabalho: reconheça os indícios.</b> Receber propostas constrangedoras que violem a sua liberdade sexual, ser vítima de chantagem em troca de benefícios ou para evitar prejuízos, passar por intimidação e humilhação.</p>' +
      '<p class="dp">Já o <b>assédio por intimidação</b> abrange todas as condutas que resultem num ambiente de trabalho hostil, intimidativo ou humilhante. Essas condutas podem não se dirigir a uma pessoa ou a um grupo de pessoas em particular, e pode ser representada com a exibição de material pornográfico no local de trabalho.</p>' +
      '<p class="dp">O ministro Augusto César, do Tribunal Superior do Trabalho (TST), em seu livro Direito do Trabalho: Curso e Discurso, observa que o assédio sexual por intimidação se aproxima do assédio moral horizontal — no caso, qualificando-se pela motivação sexual.</p></section>',
      '<section class="blk"><p class="dh3"><b>Crime</b></p>' +
      '<p class="dp">No Brasil, o assédio sexual é crime, definido no artigo 216-A do Código Penal como "constranger alguém com o intuito de obter vantagem ou favorecimento sexual, prevalecendo-se o agente da sua condição de superior hierárquico ou ascendência inerentes ao exercício de emprego, cargo ou função". A pena prevista é de detenção de um a dois anos.</p>' +
      '<p class="dp">De acordo com a lei, o assédio é crime quando praticado por superior hierárquico ou ascendente. Há duas interpretações em relação à prática do ato: o assédio pode ocorrer pelo simples constrangimento da vítima ou pela prática contínua de atos constrangedores.</p>' +
      '<p class="dp">O gênero da vítima não é determinante para a caracterização do assédio como crime. "A tipificação específica é de 2001, quando se introduziu o artigo 216-A no Código Penal, e a prática é punível independentemente do gênero", explica a presidente do TST, ministra Maria Cristina Peduzzi. No entanto, estatisticamente, a prática se dá preponderantemente em relação às mulheres.</p></section>',
      '<section class="blk"><p class="dh3"><b>Legislação trabalhista</b></p>' +
      '<p class="dp">Embora o processo criminal decorrente do assédio sexual seja da competência da Justiça Comum, a prática tem reflexos também no Direito do Trabalho. Ela se enquadra, por exemplo, nas hipóteses de não cumprimento das obrigações contratuais (artigo 483, alínea "e", da CLT) ou de prática de ato lesivo contra a honra e boa fama (artigo 482, alínea "b").</p>' +
      '<p class="dp">Nessa situação, a vítima pode obter a rescisão indireta do contrato de trabalho, motivada por falta grave do empregador, e terá o direito de extinguir o vínculo trabalhista e de receber todas as parcelas devidas na dispensa imotivada (aviso prévio, férias e 13º salário proporcional, FGTS com multa de 40%, etc.).</p></section>',
      '<section class="blk"><p class="dp">Caracterizado o dano e configurado o assédio sexual, a vítima tem direito também a indenização para reparação do dano (artigo 927 do Código Civil). Nesse caso, a competência é da Justiça do Trabalho, pois o pedido tem como origem a relação de trabalho (artigo 114, inciso VI, da Constituição da República).</p>' +
      '<p class="dp">Embora, no Direito Penal, a relação hierárquica faça parte da caracterização do crime, a Justiça do Trabalho pode reconhecer o dano e o direito à reparação, ainda que a vítima não seja subordinada ao assediador.</p>' +
      '<p class="dp">São os casos de assédio horizontal, entre colegas de trabalho. A responsabilidade pela reparação é da empresa (artigo 932, inciso III, do Código Civil), e o empregador poderá ajuizar ação de regresso (ressarcimento) contra o agente assediador.</p></section>'
    ]});

    /* 8 — CANAIS DE DENÚNCIA (dinâmico) */
    var canaisHtml = '';
    chanList.forEach(function (c) {
      canaisHtml += '<div class="chan-doc">' + c.sent(state.channels[c.id].v) + '</div>';
    });
    if (outroTxt) {
      canaisHtml += '<div class="chan-doc"><b>Outro canal (definido pela empresa):</b> ' + esc(outroTxt) + '.</div>';
    }
    S.push({ no: 8, blocks: [
      '<section class="blk"><h2 class="sec-t">8. Canais de denúncia</h2>' +
      '<p class="dp">A empresa disponibiliza canais seguros e confidenciais para o registro de denúncias, garantindo a proteção do denunciante e a vedação de qualquer forma de retaliação.</p>' +
      '<p class="dh3"><b>Canais disponíveis</b></p>' + canaisHtml + '</section>'
    ]});

    /* 9 — DIRETRIZES DOS CANAIS */
    S.push({ no: 9, blocks: [
      '<section class="blk"><h2 class="sec-t">9. Diretrizes dos canais de denúncia</h2>' +
      '<ul class="dl">' +
        '<li>As denúncias podem ser identificadas ou anônimas, conforme opção do denunciante;</li>' +
        '<li>Todas serão tratadas com sigilo, respeito e imparcialidade;</li>' +
        '<li>A boa-fé do denunciante será sempre presumida;</li>' +
        '<li>É expressamente proibida qualquer forma de retaliação contra pessoa que denuncie, participe de apuração ou atue como testemunha, ainda que a denúncia não resulte em confirmação de assédio;</li>' +
        '<li>Denúncias comprovadamente falsas e realizadas de má-fé poderão ensejar responsabilização.</li>' +
      '</ul></section>'
    ]});

    /* 10 — FLUXO DE APURAÇÃO */
    S.push({ no: 10, blocks: [
      '<section class="blk"><h2 class="sec-t">10. Fluxo de apuração</h2>' +
      '<p class="dh3"><b>Recebimento e acolhimento</b></p>' +
      '<ul class="dl">' +
        '<li>A denúncia será recebida pelo responsável designado;</li>' +
        '<li>Será realizado acolhimento inicial, com escuta ativa e respeitosa;</li>' +
        '<li>O denunciante receberá orientações sobre o processo e prazos.</li>' +
      '</ul>' +
      '<p class="dh3"><b>Análise preliminar</b></p>' +
      '<ul class="dl">' +
        '<li>Verificação da consistência da denúncia às definições deste Plano de prevenção e enfrentamento ao assédio moral;</li>' +
        '<li>Avaliação inicial da gravidade e necessidade de medidas imediatas de proteção.</li>' +
      '</ul></section>',
      '<section class="blk"><p class="dh3"><b>Apuração</b></p>' +
      '<ul class="dl">' +
        '<li>Coleta de informações e relatos das partes envolvidas;</li>' +
        '<li>Oitiva do denunciado, assegurando direito de defesa;</li>' +
        '<li>Análise imparcial dos fatos.</li>' +
      '</ul>' +
      '<p class="dh3"><b>Prazos</b></p>' +
      '<ul class="dl">' +
        '<li>Início da apuração: até 5 dias úteis após o recebimento;</li>' +
        '<li>Conclusão da apuração: até 30 dias, podendo ser prorrogado mediante justificativa.</li>' +
      '</ul>' +
      '<p class="dh3"><b>Comunicação do resultado</b></p>' +
      '<ul class="dl">' +
        '<li>As partes serão informadas, de forma reservada, sobre a conclusão do processo e as medidas adotadas.</li>' +
      '</ul></section>'
    ]});

    /* 11 — COMISSÃO / COMITÊ */
    S.push({ no: 11, blocks: [
      '<section class="blk"><h2 class="sec-t">11. Comissão / comitê de apuração</h2>' +
      '<p class="dp">A <b>' + EMP + '</b> poderá criar uma comissão / comitê de apuração interna designada formalmente, com possibilidade de assessoramento jurídico externo e critérios de impedimento por conflito de interesses.</p></section>'
    ]});

    /* 12 — SAÚDE MENTAL */
    S.push({ no: 12, blocks: [
      '<section class="blk"><h2 class="sec-t">12. Diretrizes de proteção à saúde mental</h2>' +
      '<p class="dp">A <b>' + EMP + '</b> se responsabilizará pela proteção da saúde mental de seus colaboradores durante o desempenho do ofício de suas atividades, direcionando as seguintes ações:</p>' +
      '<ul class="dl">' +
        '<li>Encaminhamento para apoio psicológico quando necessário;</li>' +
        '<li>Avaliação de impacto organizacional após casos confirmados;</li>' +
        '<li>Integração com o PGR (Programa de Gerenciamento de Riscos).</li>' +
      '</ul></section>'
    ]});

    /* 13 — CONFLITOS INTERPESSOAIS X ASSÉDIO */
    S.push({ no: 13, blocks: [
      '<section class="blk"><h2 class="sec-t">13. Conflitos interpessoais × assédio</h2>' +
      '<p class="dp">É importante distinguir o assédio dos conflitos interpessoais inerentes à convivência no trabalho. Divergências pontuais de opinião, cobranças legítimas de resultados, críticas técnicas construtivas e discussões sobre a melhor forma de executar o trabalho, quando conduzidas sem abuso, humilhação ou perseguição, não configuram assédio.</p>' +
      '<p class="dp">O assédio caracteriza-se pela repetição de condutas abusivas — ou pela gravidade de conduta isolada —, pelo efeito de humilhar, desestabilizar, ameaçar ou constranger a pessoa, e, com frequência, pelo desequilíbrio de poder (vertical ou horizontal) que compromete a dignidade do trabalhador.</p>' +
      '<p class="dp">Em caso de dúvida sobre a natureza da situação vivenciada, o trabalhador poderá utilizar os canais de denúncia descritos neste Plano, cabendo ao responsável pela apuração a análise técnica e imparcial dos fatos.</p></section>'
    ]});

    /* 14 — MEDIDAS DISCIPLINARES */
    S.push({ no: 14, blocks: [
      '<section class="blk"><h2 class="sec-t">14. Medidas disciplinares</h2>' +
      '<p class="dp">Comprovada a ocorrência de assédio, a empresa adotará medidas proporcionais à gravidade da conduta, observando a legislação trabalhista e o direito de defesa.</p>' +
      '<p class="dp">A aplicação de qualquer sanção disciplinar pressupõe a conclusão do procedimento apuratório interno, assegurado ao trabalhador acusado o direito ao contraditório e ampla defesa, em consonância com os princípios constitucionais previstos no art. 5º, LIV e LV, da Constituição Federal de 1988.</p>' +
      '<p class="dh3"><b>Fundamento constitucional e trabalhista</b></p>' +
      '<p class="dp">A Constituição Federal (art. 5º, incisos I, X e XLI) e a CLT (arts. 444, 474 e 482) conferem ao empregador o poder diretivo e disciplinar, exercido de forma proporcional, razoável e não discriminatória. O assédio moral e sexual configura violação à dignidade da pessoa humana (art. 1º, III, CF/88) e pode ensejar responsabilidade civil, trabalhista e penal.</p></section>',
      '<section class="blk"><p class="dh3"><b>Princípios orientadores da sanção disciplinar</b></p>' +
      '<p class="dp">A escolha e a aplicação da medida disciplinar obedecerão aos seguintes princípios:</p>' +
      '<ul class="dl">' +
        '<li><b>Proporcionalidade e razoabilidade:</b> a sanção deve ser compatível com a gravidade da falta, os antecedentes funcionais e as circunstâncias do caso concreto (art. 5º, LIV, CF/88);</li>' +
        '<li><b>Non bis in idem:</b> é vedada a dupla punição pelo mesmo fato;</li>' +
        '<li><b>Imediaticidade:</b> a punição deve ser aplicada em prazo razoável após a ciência do fato pelo empregador, sob pena de configurar perdão tácito;</li>' +
        '<li><b>Ampla defesa e contraditório:</b> garantia constitucional extensível às relações de emprego;</li>' +
        '<li><b>Gradação da pena:</b> em regra, as sanções devem ser progressivas, salvo nos casos de falta grave tipificada no art. 482 da CLT;</li>' +
        '<li><b>Unicidade da punição:</b> uma única falta enseja uma única penalidade, vedada a aplicação cumulativa de sanções pelo mesmo ato.</li>' +
      '</ul></section>',
      '<section class="blk"><p class="dh3"><b>Medidas disciplinares aplicáveis</b></p>' +
      '<p class="dp">As medidas abaixo serão adotadas de forma escalonada e proporcional, podendo ser suprimidas etapas intermediárias diante da gravidade da conduta apurada.</p>' +
      '<p class="dp"><b>Orientação formal e registro interno:</b> medida educativa e preventiva, aplicável nas hipóteses de primeira ocorrência de comportamento inadequado de natureza leve, ainda não tipificado como assédio consumado. Consiste em comunicação formal ao trabalhador, com registro no prontuário funcional.</p>' +
      '<p class="dp"><b>Advertência formal:</b> a advertência escrita configura sanção disciplinar leve a moderada, formalizando a reprovação da conduta pelo empregador. Deve ser entregue pessoalmente ao empregado, que terá ciência por escrito, preservando-se o documento em seu prontuário. A recusa em assinar não invalida a advertência, bastando que duas testemunhas atestem a entrega.</p></section>',
      '<section class="blk"><p class="dp"><b>Suspensão disciplinar:</b> a suspensão disciplinar sem remuneração pode ser aplicada por até 30 (trinta) dias corridos, na forma do art. 474 da CLT. A medida é cabível nos casos de reincidência em faltas moderadas ou na ocorrência de assédio comprovado de gravidade intermediária.</p>' +
      '<p class="dp"><b>Rescisão contratual por justa causa:</b> a demissão por justa causa é a sanção mais grave dentro da relação de emprego, privando o trabalhador das verbas rescisórias como aviso prévio, 13º salário proporcional, férias proporcionais acrescidas de 1/3 e levantamento do FGTS com multa de 40%.</p>' +
      '<p class="dp">Aplicável quando a conduta de assédio for caracterizada como:</p>' +
      '<ul class="dl">' +
        '<li><b>Incontinência de conduta ou mau procedimento</b> (art. 482, "b", CLT) — abrangendo o assédio moral e sexual;</li>' +
        '<li><b>Ato lesivo da honra ou boa fama</b> (art. 482, "j", CLT) — ofensas praticadas no ambiente de trabalho;</li>' +
        '<li><b>Violação de segredo da empresa</b> (art. 482, "g", CLT) — quando o assédio envolve uso indevido de informações confidenciais;</li>' +
        '<li><b>Ato de improbidade</b> (art. 482, "a", CLT) — nos casos de abuso de autoridade hierárquica com fim de obter vantagem.</li>' +
      '</ul></section>',
      '<section class="blk"><p class="dh3"><b>Comunicação às autoridades competentes</b></p>' +
      '<p class="dp">Quando os fatos apurados configurarem, em tese, ilícito penal ou infração a normas de ordem pública, a empresa comunicará imediatamente às autoridades competentes, independentemente da sanção disciplinar aplicada, podendo fazê-lo por meio de:</p>' +
      '<ul class="dl">' +
        '<li><b>Delegacia especializada (DEAMs — Delegacias Especializadas no Atendimento à Mulher)</b>, nos casos de assédio sexual;</li>' +
        '<li><b>Autoridade Nacional de Proteção de Dados (ANPD)</b>, quando o assédio envolver tratamento indevido de dados pessoais da vítima.</li>' +
      '</ul></section>'
    ]});

    /* 15 — AÇÕES PREVENTIVAS */
    S.push({ no: 15, blocks: [
      '<section class="blk"><h2 class="sec-t">15. Ações preventivas</h2>' +
      '<p class="dp">A prevenção constitui eixo central deste Plano. A <b>' + EMP + '</b> adotará ações contínuas e estruturadas, tais como:</p>' +
      '<ul class="dl ok">' +
        '<li>Treinamentos periódicos sobre ética, respeito e convivência profissional, inclusive na integração de novos colaboradores;</li>' +
        '<li>Inserção do tema na gestão de riscos ocupacionais, em consonância com a Norma Regulamentadora nº 1;</li>' +
        '<li>Divulgação ampla deste Plano;</li>' +
        '<li>Campanhas educativas internas;</li>' +
        '<li>Reforço das diretrizes de conduta em reuniões periódicas;</li>' +
        '<li>Monitoramento do clima organizacional;</li>' +
        '<li>Capacitação de lideranças para gestão humanizada e prevenção de riscos psicossociais.</li>' +
      '</ul></section>'
    ]});

    /* 16 — LISTA DE PRESENÇA */
    /* Resumo do conteúdo programático: fica dentro da própria tabela (linha própria),
       seguindo o modelo em PDF — antes era um parágrafo solto abaixo da tabela. */
    var CONTEUDO_PROG =
      'Resumo dos temas apresentados durante a divulgação do Plano de Prevenção e Enfrentamento ao Assédio Moral e Sexual: ' +
      'identificação da empresa e da empresa elaboradora do Plano; termos e definições; ' +
      'introdução: a responsabilidade da empresa na criação de um ambiente de trabalho seguro; objetivo do Plano; ' +
      'assédio moral: conceito e como identificar; assédio sexual: conceito e como identificar; ' +
      'canais de denúncia e suas diretrizes; fluxo de apuração e comissão/comitê de apuração; ' +
      'diretrizes de proteção à saúde mental; conflitos interpessoais × assédio; medidas disciplinares aplicáveis; ' +
      'ações preventivas e formas de divulgação do Plano.';
    var presRows = '';
    for (var pr = 1; pr <= 10; pr++) {
      presRows += '<tr><td style="text-align:center">' + pr + '</td><td></td><td></td><td></td></tr>';
    }
    S.push({ no: 16, blocks: [
      '<section class="blk"><h2 class="sec-t">16. Lista de presença para divulgação</h2>' +
      '<p class="dp">A <b>' + EMP + '</b> adotará a divulgação contínua e estruturada deste Plano, registrando a participação dos colaboradores.</p>' +
      '<p class="tbl-title">Lista de presença para divulgação</p>' +
      '<table class="dt dt--form">' +
        '<tr><td class="lab">Razão social</td><td colspan="3">' + X(E.razaoSocial) + '</td></tr>' +
        '<tr><td class="lab">CNPJ</td><td colspan="3">' + X(E.cnpj) + '</td></tr>' +
        '<tr><td class="lab">Divulgação</td><td colspan="3">Divulgação do Plano de Prevenção e Enfrentamento ao Assédio Moral e Sexual</td></tr>' +
        '<tr><td class="lab">Responsável pela divulgação</td><td colspan="3" class="write"></td></tr>' +
        '<tr><td class="lab">Data</td><td class="write"></td><td class="void" colspan="2"></td></tr>' +
        '<tr><td class="lab">Conteúdo programático abordado</td><td colspan="3" class="fine">' + CONTEUDO_PROG + '</td></tr>' +
      '</table></section>',
      '<section class="blk"><table class="dt cfixed">' +
        '<tr><th style="width:10mm;text-align:center">Nº</th><th>Nome</th><th>CPF</th><th style="width:42%">Assinatura</th></tr>' +
        presRows +
      '</table></section>'
    ]});

    /* 17 — BIBLIOGRAFIA */
    S.push({ no: 17, blocks: [
      '<section class="blk"><h2 class="sec-t">17. Bibliografia</h2>' +
      '<p class="ref">ADVOCACIA-GERAL DA UNIÃO. <b>AGU explica – boa-fé objetiva e subjetiva.</b> Disponível em: https://www.youtube.com/watch?v=mXocXrbS7ss. Acesso em: 6 mar. 2026.</p>' +
      '<p class="ref">ADVOCACIA-GERAL DA UNIÃO. <b>AGU explica – litigância de má-fé.</b> Disponível em: https://www.youtube.com/watch?v=pVo5XuaCsbA. Acesso em: 6 mar. 2026.</p>' +
      '<p class="ref">BRASIL. Conselho Nacional do Ministério Público. <b>Cartilha: assédio moral e sexual: previna-se.</b> Brasília: CNMP, 2016.</p>' +
      '<p class="ref">BRASIL. Ministério do Trabalho. <b>Guia de informações sobre os fatores psicossociais relacionados ao trabalho.</b> Brasília: Ministério do Trabalho, abr. 2025.</p></section>',
      '<section class="blk"><p class="ref">BRASIL. Ministério Público do Trabalho. <b>Violência e assédio moral no trabalho: perguntas e respostas.</b> Coordenadoria Nacional de Promoção da Igualdade de Oportunidades e Eliminação da Discriminação no Trabalho. Redação original: Sandra Lia Simón et al.; redação atualizada: Danielle Olivares Corrêa et al. Brasília: Ministério Público do Trabalho, 2025. 54 p.</p>' +
      '<p class="ref">BRASIL. Senado Federal. <b>Cartilha: assédio moral e sexual no trabalho.</b> Brasília: Senado Federal, 2016.</p>' +
      '<p class="ref">BRASIL. Tribunal Superior do Trabalho; Conselho Superior da Justiça do Trabalho. <b>Guia prático por um ambiente de trabalho + positivo: prevenção e enfrentamento das violências, dos assédios e das discriminações.</b> Brasília: TST; CSJT, maio 2024.</p>' +
      '<p class="ref">BRASIL. Tribunal Superior do Trabalho; Conselho Superior da Justiça do Trabalho. <b>Liderança responsável: guia para prevenir e enfrentar o assédio, a violência e a discriminação.</b> Brasília: TST; CSJT, maio 2024.</p></section>'
    ]});

    /* 18 — DISPOSIÇÕES FINAIS */
    var localData = [E.cidade.trim(), E.estado.trim()].filter(Boolean).map(esc).join(', ') || 'Itatiaiuçu';
    S.push({ no: 18, blocks: [
      '<section class="blk"><h2 class="sec-t">18. Disposições finais</h2>' +
      '<p class="dp">Este Plano de prevenção e enfrentamento ao assédio moral e sexual entra em vigor na data de sua aprovação e deverá ser amplamente divulgado a todos os colaboradores. O descumprimento das diretrizes aqui estabelecidas será tratado com seriedade, sempre com foco na prevenção, na proteção das pessoas e na manutenção de um ambiente de trabalho saudável.</p>' +
      '<p class="dp">A <b>' + EMP + '</b> reafirma seu compromisso com a dignidade, o respeito e a integridade no ambiente de trabalho.</p>' +
      '<p class="dp">Este Plano de prevenção e enfrentamento ao assédio moral e sexual foi elaborado e aprovado por:</p>' +
      '<p class="dp" style="margin-top:8mm">' + localData + ', ' + hojeExtenso() + '.</p>' +
      '<div class="signs">' +
        '<div class="sign"><div class="sline">Elaboração</div>' + ELAB_SIGN + '</div>' +
        '<div class="sign"><div class="sline">Aprovado</div>Responsável pela empresa ou preposto<br><b>' + EMP + '</b><br>Responsável por estabelecer, implementar e assegurar o cumprimento deste plano.</div>' +
      '</div></section>'
    ]});

    return S;
  }

  /* ============================== GERADOR DO DOCUMENTO ============================== */
  var pages = [];

  function footerOne() {
    return frag(
      '<footer class="footer">' +
        '<div class="footer-title">Nossa unidade</div>' +
        '<div class="units units--one">' +
          '<div class="unit">' +
            '<b>Itatiaiuçu / MG</b>' +
            '<address>Praça Antônio Quirino da Silva, 28 – Centro<br>Itatiaiuçu/MG – CEP 35.685-000</address>' +
            '<span class="phone">(31) 3572-1818 / (31) 3572-1221</span>' +
          '</div>' +
        '</div>' +
        '<div class="website">WWW.PERFORMANCEOCUPACIONAL.COM.BR</div>' +
      '</footer>'
    );
  }

  function overflow(p) { return p.body.scrollHeight > p.body.clientHeight + 1; }

  function buildDoc() {
    var E = state.company;
    var chanList = CH.filter(function (c) { return state.channels[c.id].on; });
    var outroTxt = state.outro.trim();
    var REV_ATUAL = revAtual();

    var root = $('#printRoot');
    root.innerHTML = '';
    root.classList.add('building'); /* off-screen mas renderizado: permite medir a paginação */
    document.body.appendChild(root);
    pages = [];

    function mkSheet(kind) {
      var no = pages.length + 1;
      var sh = document.createElement('section');
      sh.className = 'sheet';
      var head;
      if (kind === 'cover') {
        head = frag('<header class="letterhead"><img alt="Grupo Performance — Medicina e Segurança do Trabalho" src="' + LOGO_SRC + '">' +
          '<div class="identity"><b>Saúde e segurança ocupacional</b><span>Medicina e segurança do trabalho</span></div></header>');
      } else {
        head = frag('<header class="docHead"><img alt="" src="' + LOGO_SRC + '">' +
          '<div class="dh-t"><b>Plano de Prevenção e Enfrentamento ao Assédio Moral e Sexual</b>' +
          '<span>' + esc(E.razaoSocial.trim() || '—') + '</span></div>' +
          '<div class="dh-r"><span>Rev. ' + esc(REV_ATUAL) + '</span><b>Pág. ' + no + '</b></div></header>');
      }
      var body = document.createElement('div');
      body.className = 'dbody' + (kind === 'cover' ? ' cover-body' : '');
      sh.appendChild(head);
      sh.appendChild(body);
      sh.appendChild(footerOne());
      var p = { sh: sh, body: body, no: no };
      pages.push(p);
      root.appendChild(sh);
      return p;
    }

    /* ---- Página 1: capa ---- */
    var cov = mkSheet('cover');
    var cnpjLine = [E.cnpj.trim(), [E.cidade.trim(), E.estado.trim()].filter(Boolean).join(' / ')]
      .filter(Boolean).join(' · ');
    cov.body.appendChild(frag(
      '<div class="cover-hero">' +
        '<div class="cover-kick">Grupo Performance · Medicina e Segurança do Trabalho</div>' +
        '<div class="cover-title">PLANO DE PREVENÇÃO E ENFRENTAMENTO AO ASSÉDIO MORAL E SEXUAL</div>' +
        '<div class="cover-rule"></div>' +
        '<div class="cover-sub">Este documento deverá estar disponível na empresa para acesso a todos os trabalhadores empregados.</div>' +
        '<div class="cover-card">' +
          '<div class="cl">Razão social empresa cliente</div>' +
          '<div class="cv">' + esc(E.razaoSocial.trim() || '—') + '</div>' +
          (cnpjLine ? '<div class="cm">' + esc(cnpjLine) + '</div>' : '') +
        '</div>' +
      '</div>'
    ));
    /* Histórico da capa: reproduce exatamente as linhas preenchidas na etapa 3,
       na ordem Rev. | Data | Histórico. Linhas em branco são ignoradas; se não
       sobrar nenhuma, a tabela sai apenas com o quadro "Elaborado por". */
    var revRows = '';
    historicoValido().forEach(function (r) {
      revRows += '<tr>' +
        '<td style="text-align:center">' + esc(String(r.num).trim()) + '</td>' +
        '<td>' + esc(String(r.data).trim()) + '</td>' +
        '<td>' + esc(String(r.motivo).trim()) + '</td>' +
      '</tr>';
    });
    cov.body.appendChild(frag(
      '<table class="dt" style="margin-top:2mm">' +
        (revRows ? '<tr><th style="width:12%;text-align:center">Rev.</th><th style="width:20%">Data</th><th>Histórico</th></tr>' + revRows : '') +
        '<tr><th colspan="3">Elaborado por</th></tr>' +
        '<tr><td colspan="3">' + ELAB_SIGN + '</td></tr>' +
      '</table>'
    ));

    /* ---- Página 2: índice (preenchido após a paginação) ---- */
    var idxPage = mkSheet('index');

    /* ---- Páginas de conteúdo ---- */
    var sections = buildSections(E, chanList, outroTxt);
    var secPages = {};
    var cur = mkSheet('content');

    sections.forEach(function (sec) {
      var first = true;
      sec.blocks.forEach(function (html) {
        var el = frag(html);
        cur.body.appendChild(el);
        if (overflow(cur)) {
          cur.body.removeChild(el);
          cur = mkSheet('content');
          cur.body.appendChild(el);
        }
        if (first) { secPages[sec.no] = cur.no; first = false; }
      });
    });

    /* ---- Preenche o índice ---- */
    idxPage.body.appendChild(frag('<h2 class="sec-t">Índice analítico</h2>'));
    sections.forEach(function (sec) {
      var mTitle = sec.blocks[0].match(/<h2 class="sec-t">(?:\d+\.\s*)?([\s\S]*?)<\/h2>/);
      idxPage.body.appendChild(frag(
        '<div class="idx-item"><span class="n">' + sec.no + '.</span>' +
        '<span class="t">' + (mTitle ? mTitle[1] : '') + '</span>' +
        '<span class="dots"></span><span class="pg">' + (secPages[sec.no] || '—') + '</span></div>'
      ));
    });

    return root;
  }

  /* ============================== VALIDAÇÃO + GERAÇÃO ============================== */
  function hideAlerts() { var a = $('#alerts'); a.classList.remove('show'); a.innerHTML = ''; }

  function validate() {
    var errs = [];
    $$('#fieldsBox input[data-k]').forEach(function (i) { i.classList.remove('err'); });
    $$('.chan input[data-f]').forEach(function (i) { i.classList.remove('err'); });

    if (!state.company.razaoSocial.trim()) {
      errs.push('Informe ao menos a <b>Razão Social</b> da empresa na etapa 1 (anexe o PDF ou preencha manualmente).');
      var inp = $('#fieldsBox input[data-k="razaoSocial"]');
      if (inp) inp.classList.add('err');
    }
    var any = false;
    CH.forEach(function (c) {
      var st = state.channels[c.id];
      if (!st.on) return;
      any = true;
      c.fields.forEach(function (f) {
        if (!String(st.v[f.k] || '').trim()) {
          errs.push('Canal <b>' + esc(c.t) + '</b>: preencha "' + esc(f.l) + '".');
          var box = $('.chan[data-id="' + c.id + '"]');
          var i2 = box ? $('input[data-f="' + f.k + '"]', box) : null;
          if (i2) i2.classList.add('err');
        }
      });
    });
    if (state.outro.trim()) any = true;
    if (!any) errs.push('Selecione pelo menos um <b>canal de denúncia</b> ou descreva um canal próprio na etapa 2.');
    return errs;
  }

  function showErrors(errs) {
    var a = $('#alerts');
    a.innerHTML = '<ul>' + errs.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul>';
    a.classList.add('show');
    a.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function generate() {
    var errs = validate();
    if (errs.length) { showErrors(errs); toast('Verifique os itens pendentes.', true); return; }
    hideAlerts();
    var root = buildDoc();
    openModal(root);
  }

  /* ============================== MODAL / ZOOM / IMPRESSÃO ============================== */
  var modal = $('#docModal');
  var preview = $('#docPreview');
  var zoom = 1;

  function applyZoom() {
    preview.style.setProperty('--z', zoom);
    $('#zPct').textContent = Math.round(zoom * 100) + '%';
  }
  function fitZoom() {
    var base = 793.7; /* 210mm em px @96dpi */
    var avail = preview.clientWidth - 24;
    zoom = Math.max(0.25, Math.min(1.15, avail / base));
    applyZoom();
  }
  $('#zIn').addEventListener('click', function () { zoom = Math.min(1.6, zoom * 1.15); applyZoom(); });
  $('#zOut').addEventListener('click', function () { zoom = Math.max(0.25, zoom / 1.15); applyZoom(); });

  function openModal(root) {
    preview.appendChild(root);             /* move para a pré-visualização */
    root.classList.remove('building');
    document.body.classList.add('previewing');
    modal.hidden = false;
    fitZoom();
    preview.scrollTop = 0;
  }
  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('previewing');
    document.body.appendChild($('#printRoot')); /* devolve para o body */
  }
  $('#btnFechar').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });
  window.addEventListener('resize', function () { if (!modal.hidden) fitZoom(); });

  function printDoc() {
    var root = $('#printRoot');
    var wasInPreview = root.parentElement === preview;
    document.body.appendChild(root);   /* fora do modal para a impressão */
    root.classList.add('building');    /* invisível na tela, visível na impressão */
    var done = false;
    var restore = function () {
      if (done) return;
      done = true;
      window.removeEventListener('afterprint', restore);
      root.classList.remove('building');
      if (wasInPreview && !modal.hidden) preview.appendChild(root);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(restore, 120000); /* segurança caso o navegador não dispare afterprint */
    setTimeout(function () { window.print(); }, 30);
  }
  $('#btnPrint').addEventListener('click', printDoc);
  $('#btnGerarTop').addEventListener('click', generate);
  $('#btnGerar').addEventListener('click', generate);

  /* ============================== LIMPAR ============================== */
  $('#btnLimpar').addEventListener('click', function () {
    if (!window.confirm('Limpar todos os dados preenchidos?')) return;
    storeDel(LS_KEY);
    COMPANY_FIELDS.forEach(function (f) { state.company[f.k] = ''; });
    CH.forEach(function (c) { state.channels[c.id] = { on: false, v: {} }; });
    state.outro = '';
    state.pdfName = '';
    state.historico = historicoPadrao();
    renderFields();
    renderChannels();
    renderHistorico();
    $('#outroTxt').value = '';
    $('#fieldsBox').hidden = true;
    $('#fieldsNote').hidden = true;
    $('#pdfOk').hidden = true;
    setStatus('Nenhum PDF anexado');
    hideAlerts();
    toast('Dados limpos.');
  });

  /* ============================== INICIALIZAÇÃO ============================== */
  setupPdfjs();
  restore();
  renderFields();
  renderChannels();
  renderHistorico();
  $('#outroTxt').value = state.outro;
  if (state.pdfName) setStatus('Sessão anterior: ' + state.pdfName + ' (reanexe o PDF para recarregar os dados)');
  var hasCompany = COMPANY_FIELDS.some(function (f) { return state.company[f.k].trim(); });
  if (hasCompany || state.pdfName) revealFields();
})();
