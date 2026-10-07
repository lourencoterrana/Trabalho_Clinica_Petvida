/* PetVida — interface */
(function () {
  const S = PV.store;
  const U = PV.util;
  const SLOT = 36; // altura (px) de 30 minutos na agenda
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const view = $('#view');
  const modal = $('#modal');
  const ui = { dataAgenda: U.hojeISO(), area: 'todas', busca: '', filtroLembrete: 'pendentes' };

  const waLink = (tel, msg) => `https://wa.me/55${tel.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  const areaDe = a => S.servico(a.servicoId).area;
  const icone = {
    saude: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 1h4v5h5v4h-5v5H6v-5H1V6h5z"/></svg>',
    estetica: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.6 10 12 1M10.4 10 4 1" stroke="currentColor" stroke-width="1.6"/></svg>'
  };

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
  }

  /* ---------- roteamento ---------- */
  function rota() {
    try { desenhar(); } catch (erro) {
      console.error(erro);
      view.innerHTML = `<div class="carregando"><h1>Não foi possível abrir esta tela</h1>
        <p class="sub">Os dados salvos neste navegador podem estar incompatíveis com esta versão. Restaure os dados de exemplo para continuar.</p>
        <p><button class="btn primario" id="corrigir">Restaurar dados de exemplo</button></p>
        <p class="muted">Detalhe técnico: ${esc(erro.message)}</p></div>`;
      $('#corrigir').onclick = () => { S.reset(); location.hash = '#/hoje'; rota(); };
    }
  }
  function desenhar() {
    const [, nome = 'hoje', param] = (location.hash || '#/hoje').split('/');
    $$('.nav a').forEach(a => a.classList.toggle('ativo', a.dataset.rota === nome));
    const pend = S.lembretes().filter(l => !l.enviado).length;
    $('#badge-lembretes').textContent = pend || '';
    ({ hoje: telaHoje, agenda: telaAgenda, pets: () => telaPets(param), lembretes: telaLembretes }[nome] || telaHoje)();
    view.focus({ preventScroll: true });
  }
  const recarregar = () => rota();

  /* ===================================================== HOJE */
  function telaHoje() {
    const hoje = U.hojeISO();
    const ind = S.indicadores(hoje);
    const agora = new Date().getHours() * 60 + new Date().getMinutes();
    const lista = ind.ags.filter(a => a.status === 'agendado');
    const proximos = lista.filter(a => S.fim(a) > agora).slice(0, 8);
    const lemb = S.lembretes().filter(l => !l.enviado);
    const livres = ind.porProf.reduce((t, p) => t + Math.floor(p.livre / 30), 0);
    const pct = a => Math.round(ind.porArea[a].min / ind.porArea[a].cap * 100) || 0;

    view.innerHTML = `
      <header class="topo">
        <div>
          <h1>${U.fmtLonga(hoje)}</h1>
          <p class="sub">${ind.ags.length} atendimentos marcados: ${ind.porArea.saude.n} na saúde e ${ind.porArea.estetica.n} na estética.</p>
        </div>
        <button class="btn primario" data-novo>Novo agendamento</button>
      </header>

      <section class="faixa-numeros">
        <div><strong>${pct('estetica')}%</strong><span>da agenda de banho e tosa ocupada</span></div>
        <div><strong>${pct('saude')}%</strong><span>da agenda clínica ocupada</span></div>
        <div><strong>${livres}</strong><span>meias-horas livres para encaixe</span></div>
        <div><strong>${U.moeda(ind.receita)}</strong><span>previstos hoje, ${U.moeda(S.receitaPeriodo(hoje, 7))} nos próximos 7 dias</span></div>
      </section>

      <div class="duas-colunas">
        <section class="bloco">
          <header class="bloco-head"><h2>A seguir</h2><a href="#/agenda">Abrir agenda</a></header>
          ${proximos.length ? `<ol class="fila">${proximos.map(linhaFila).join('')}</ol>`
            : '<p class="vazio">Nenhum atendimento pendente para o resto do dia. Use os horários livres para encaixes.</p>'}
        </section>

        <div class="pilha">
          <section class="bloco">
            <header class="bloco-head"><h2>Lembretes para enviar</h2><a href="#/lembretes">Ver todos (${lemb.length})</a></header>
            ${lemb.length ? `<ul class="mini-lembretes">${lemb.slice(0, 5).map(l => `
              <li><span class="pill ${l.tipo}">${l.tipo}</span><a href="#/pets/${l.pet.id}">${esc(l.pet.nome)}</a><span class="muted">${esc(l.titulo)}</span></li>`).join('')}</ul>`
              : '<p class="vazio">Todos os tutores já foram avisados.</p>'}
          </section>
          <section class="bloco">
            <header class="bloco-head"><h2>Tempo livre por profissional</h2></header>
            <ul class="barras">${ind.porProf.map(p => `
              <li>
                <span class="nome">${esc(p.prof.curto)}</span>
                <span class="barra ${p.prof.area}"><i style="width:${Math.round(p.ocupado / (p.ocupado + p.livre) * 100)}%"></i></span>
                <span class="muted num">${p.livre >= 60 ? `${Math.floor(p.livre / 60)}h${p.livre % 60 ? p.livre % 60 : ''}` : `${p.livre}min`} livre</span>
              </li>`).join('')}</ul>
          </section>
        </div>
      </div>`;
    ligarAcoesFila();
  }

  function linhaFila(a) {
    const pet = S.pet(a.petId), s = S.servico(a.servicoId), p = S.prof(a.profissionalId);
    return `<li class="item-fila ${s.area}">
      <span class="hora num">${a.inicio}</span>
      <div class="info">
        <a href="#/pets/${pet.id}" class="pet">${esc(pet.nome)}</a>
        <span class="muted">${esc(s.nome)} com ${esc(p.curto)}</span>
        ${pet.alertas ? `<span class="alerta-inline">${esc(pet.alertas)}</span>` : ''}
      </div>
      <div class="acoes">
        <button class="btn mini" data-concluir="${a.id}">Concluir</button>
        <button class="btn mini fantasma" data-faltou="${a.id}">Faltou</button>
      </div>
    </li>`;
  }
  function ligarAcoesFila() {
    $$('[data-concluir]').forEach(b => b.onclick = () => abrirConcluir(b.dataset.concluir));
    $$('[data-faltou]').forEach(b => b.onclick = () => { S.status(b.dataset.faltou, 'faltou'); toast('Falta registrada. O horário ficou livre para encaixe.'); recarregar(); });
    $$('[data-novo]').forEach(b => b.onclick = () => abrirAgendamento({}));
  }

  /* ===================================================== AGENDA */
  function telaAgenda() {
    const data = ui.dataAgenda;
    const profs = PV.PROFISSIONAIS.filter(p => ui.area === 'todas' || p.area === ui.area);
    const ags = S.doDia(data);
    const domingo = U.parse(data).getDay() === 0;
    const slots = (PV.HORARIO.fecha - PV.HORARIO.abre) / 30;
    const horas = Array.from({ length: slots }, (_, i) => U.hhmm(PV.HORARIO.abre + i * 30));
    const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();
    const mostraAgora = data === U.hojeISO() && agoraMin > PV.HORARIO.abre && agoraMin < PV.HORARIO.fecha;

    view.innerHTML = `
      <header class="topo">
        <div>
          <h1>Agenda</h1>
          <p class="sub">Clique em um horário vazio para agendar. Choques de horário são bloqueados.</p>
        </div>
        <button class="btn primario" data-novo>Novo agendamento</button>
      </header>
      <div class="barra-agenda">
        <div class="navega-data">
          <button class="btn icone" id="ant" aria-label="Dia anterior">‹</button>
          <input type="date" id="dia" value="${data}" aria-label="Data da agenda">
          <button class="btn icone" id="prox" aria-label="Próximo dia">›</button>
          <button class="btn fantasma" id="hoje">Hoje</button>
          <strong class="data-extenso">${U.fmtLonga(data)}</strong>
        </div>
        <div class="segmentado" role="group" aria-label="Filtrar por área">
          ${[['todas', 'Todos'], ['saude', 'Saúde'], ['estetica', 'Estética']].map(([v, t]) =>
            `<button class="${ui.area === v ? 'on' : ''}" data-area="${v}">${t}</button>`).join('')}
        </div>
      </div>
      ${domingo ? '<p class="aviso">A clínica não abre aos domingos.</p>' : `
      <div class="grade-wrap">
        <div class="grade" style="--cols:${profs.length}">
          <div class="col-horas">
            <div class="col-head"></div>
            <div class="horas" style="height:${slots * SLOT}px">${horas.map((h, i) => `<span style="top:${i * SLOT}px">${i % 2 ? '' : h}</span>`).join('')}</div>
          </div>
          ${profs.map(p => `
          <div class="col">
            <div class="col-head ${p.area}"><strong>${esc(p.curto)}</strong><small>${esc(p.papel)}</small></div>
            <div class="col-corpo" data-prof="${p.id}" style="height:${slots * SLOT}px" title="Clique para agendar com ${esc(p.curto)}">
              ${ags.filter(a => a.profissionalId === p.id).map(blocoAgenda).join('')}
              ${mostraAgora ? `<div class="agora" style="top:${(agoraMin - PV.HORARIO.abre) / 30 * SLOT}px"></div>` : ''}
            </div>
          </div>`).join('')}
        </div>
      </div>`}`;

    const ir = d => { ui.dataAgenda = d; telaAgenda(); };
    $('#ant').onclick = () => ir(U.addDias(data, -1));
    $('#prox').onclick = () => ir(U.addDias(data, 1));
    $('#hoje').onclick = () => ir(U.hojeISO());
    $('#dia').onchange = e => e.target.value && ir(e.target.value);
    $$('[data-area]').forEach(b => b.onclick = () => { ui.area = b.dataset.area; telaAgenda(); });
    $$('[data-novo]').forEach(b => b.onclick = () => abrirAgendamento({ data }));
    $$('.col-corpo').forEach(col => col.onclick = e => {
      if (e.target !== col) return;
      const min = PV.HORARIO.abre + Math.floor(e.offsetY / SLOT) * 30;
      abrirAgendamento({ data, inicio: U.hhmm(min), profissionalId: col.dataset.prof });
    });
    $$('.evento').forEach(b => b.onclick = () => abrirDetalhe(b.dataset.id));
  }

  function blocoAgenda(a) {
    const s = S.servico(a.servicoId), pet = S.pet(a.petId);
    const top = (U.min(a.inicio) - PV.HORARIO.abre) / 30 * SLOT;
    const h = s.duracao / 30 * SLOT - 3;
    return `<button class="evento ${s.area} ${a.status} ${h < 40 ? 'curto' : ''}" data-id="${a.id}" title="${esc(pet.nome)}: ${esc(s.nome)}, ${a.inicio}" style="top:${top}px;height:${h}px">
      <span class="ev-pet">${esc(pet.nome)}${pet.alertas ? ' <span class="ponto-alerta" title="Tem alerta de saúde">!</span>' : ''}</span>
      ${h > 40 ? `<span class="ev-serv">${esc(s.nome)}</span>` : ''}
      <span class="ev-hora num">${a.inicio}</span>
    </button>`;
  }

  /* ===================================================== PETS */
  function telaPets(petId) {
    const termo = ui.busca.trim().toLowerCase();
    const pets = [...S.state.pets]
      .filter(p => !termo || `${p.nome} ${p.tutor} ${p.raca}`.toLowerCase().includes(termo))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    const atual = petId && S.pet(petId);

    view.innerHTML = `
      <header class="topo">
        <div><h1>Pets e tutores</h1><p class="sub">Um único histórico por pet: consultas, vacinas, banhos e tosas.</p></div>
        <button class="btn primario" id="novo-pet">Cadastrar pet</button>
      </header>
      <div class="pets-layout ${atual ? 'com-detalhe' : ''}">
        <aside class="lista-pets">
          <input type="search" id="busca" placeholder="Buscar por pet, tutor ou raça" value="${esc(ui.busca)}" aria-label="Buscar pets">
          <ul>${pets.map(p => `
            <li><a href="#/pets/${p.id}" class="${atual && atual.id === p.id ? 'on' : ''}">
              <strong>${esc(p.nome)}</strong>${p.alertas ? '<span class="ponto-alerta" title="Tem alerta de saúde">!</span>' : ''}
              <span class="muted">${esc(p.tutor)}</span>
            </a></li>`).join('') || '<li class="vazio">Nenhum pet encontrado. Confira a grafia ou cadastre um novo pet.</li>'}</ul>
        </aside>
        <section class="detalhe-pet">${atual ? detalhePet(atual) : '<p class="vazio grande">Escolha um pet na lista para ver o histórico completo.</p>'}</section>
      </div>`;

    const busca = $('#busca');
    busca.oninput = e => { ui.busca = e.target.value; const pos = e.target.selectionStart; telaPets(petId); const b = $('#busca'); b.focus(); b.setSelectionRange(pos, pos); };
    $('#novo-pet').onclick = () => abrirPet();
    if (atual) {
      $('#agendar-pet').onclick = () => abrirAgendamento({ petId: atual.id });
      $('#registrar').onclick = () => abrirRegistro(atual.id);
      $('#editar-pet').onclick = () => abrirPet(atual);
      $$('.voltar-lista').forEach(b => b.onclick = () => { location.hash = '#/pets'; });
    }
  }

  function detalhePet(p) {
    const { vac, banho, prox } = S.resumoPet(p.id);
    const hist = S.historicoDoPet(p.id);
    const fut = S.futurosDoPet(p.id);
    const vacTxt = vac ? `${esc(vac.vacina || 'Vacina')}: ${U.fmtData(vac.proximaData)} <span class="muted">(${U.relativo(vac.proximaData)})</span>` : 'Sem registro';
    return `
      <button class="btn fantasma voltar-lista">Voltar à lista</button>
      <header class="pet-head">
        <div>
          <h2>${esc(p.nome)}</h2>
          <p class="muted">${esc(p.especie)}, ${esc(p.raca)}, ${U.idade(p.nascimento)}</p>
          <p>Tutor: <strong>${esc(p.tutor)}</strong> <a href="${waLink(p.telefone, `Olá, ${p.tutor.split(' ')[0]}! Aqui é da Clínica PetVida.`)}" target="_blank" rel="noopener">${esc(p.telefone)}</a></p>
        </div>
        <div class="acoes-pet">
          <button class="btn primario" id="agendar-pet">Agendar</button>
          <button class="btn" id="registrar">Registrar atendimento</button>
          <button class="btn fantasma" id="editar-pet">Editar cadastro</button>
        </div>
      </header>
      ${p.alertas ? `<div class="alerta-saude"><strong>Alerta de saúde para toda a equipe</strong><p>${esc(p.alertas)}</p></div>` : ''}
      <dl class="resumo">
        <div><dt>Próxima vacina</dt><dd>${vacTxt}</dd></div>
        <div><dt>Último banho</dt><dd>${banho ? `${U.fmtData(banho.data)} <span class="muted">(${U.relativo(banho.data)})</span>` : 'Sem registro'}</dd></div>
        <div><dt>Rotina de banho</dt><dd>${p.freqBanho ? `A cada ${p.freqBanho} dias` : 'Não faz banho na clínica'}</dd></div>
        <div><dt>Próximo atendimento</dt><dd>${prox ? `${U.fmtCurta(prox.data)} às ${prox.inicio}, ${esc(S.servico(prox.servicoId).nome.toLowerCase())}` : 'Nada agendado'}</dd></div>
      </dl>
      <h3 class="titulo-linha">Linha do cuidado</h3>
      <ol class="linha">
        ${fut.map(a => itemLinha({ data: a.data, servicoId: a.servicoId, profissionalId: a.profissionalId, futuro: true, inicio: a.inicio })).join('')}
        ${hist.map(itemLinha).join('') || '<li class="vazio">Sem atendimentos registrados.</li>'}
      </ol>`;
  }

  function itemLinha(h) {
    const s = S.servico(h.servicoId), p = S.prof(h.profissionalId);
    const extra = [];
    if (h.vacina) extra.push(`${esc(h.vacina)}, próxima dose em ${U.fmtData(h.proximaData)}`);
    if (h.retorno) extra.push(`Retorno indicado para ${U.fmtData(h.retorno)}`);
    return `<li class="${s.area} ${h.futuro ? 'futuro' : ''}">
      <span class="marca">${icone[s.area]}</span>
      <div>
        <div class="linha-topo"><strong>${esc(s.nome)}</strong><span class="muted num">${U.fmtData(h.data)}${h.inicio ? `, ${h.inicio}` : ''}</span>${h.futuro ? '<span class="pill agendado">agendado</span>' : ''}</div>
        <span class="muted">${p ? esc(p.nome) : ''}</span>
        ${h.nota ? `<p>${esc(h.nota)}</p>` : ''}
        ${extra.map(e => `<p class="extra">${e}</p>`).join('')}
      </div>
    </li>`;
  }

  /* ===================================================== LEMBRETES */
  function telaLembretes() {
    const todos = S.lembretes();
    const lista = todos.filter(l => ui.filtroLembrete === 'pendentes' ? !l.enviado : l.enviado);
    const cont = { vacina: 0, banho: 0, retorno: 0 };
    todos.filter(l => !l.enviado).forEach(l => cont[l.tipo]++);
    view.innerHTML = `
      <header class="topo">
        <div><h1>Lembretes</h1>
        <p class="sub">Gerados automaticamente a partir do histórico: vacinas a vencer, retornos e banhos de rotina sem horário marcado.</p></div>
      </header>
      <div class="barra-agenda">
        <p class="contagem">${cont.vacina} de vacina, ${cont.retorno} de retorno e ${cont.banho} de banho aguardando envio.</p>
        <div class="segmentado" role="group" aria-label="Filtrar lembretes">
          ${[['pendentes', 'Para enviar'], ['enviados', 'Enviados']].map(([v, t]) => `<button class="${ui.filtroLembrete === v ? 'on' : ''}" data-f="${v}">${t}</button>`).join('')}
        </div>
      </div>
      ${lista.length ? `<ul class="lembretes">${lista.map(l => `
        <li class="lembrete">
          <span class="pill ${l.tipo}">${l.tipo}</span>
          <div class="info">
            <a href="#/pets/${l.pet.id}"><strong>${esc(l.pet.nome)}</strong></a> <span class="muted">de ${esc(l.pet.tutor)}</span>
            <span>${esc(l.titulo)}</span>
            ${l.enviado ? `<span class="muted">Enviado em ${U.fmtData(l.enviado)}</span>` : ''}
          </div>
          <div class="acoes">
            <a class="btn wpp" href="${waLink(l.pet.telefone, l.msg)}" target="_blank" rel="noopener" data-enviar="${esc(l.chave)}">${l.enviado ? 'Enviar de novo' : 'Enviar no WhatsApp'}</a>
            <button class="btn fantasma" data-agendar="${l.pet.id}" data-serv="${l.servicoId}">Agendar</button>
          </div>
        </li>`).join('')}</ul>`
        : `<p class="vazio grande">${ui.filtroLembrete === 'pendentes' ? 'Nenhum lembrete pendente. Todos os tutores com vencimento próximo já foram avisados ou têm horário marcado.' : 'Nenhum lembrete enviado ainda.'}</p>`}`;

    $$('[data-f]').forEach(b => b.onclick = () => { ui.filtroLembrete = b.dataset.f; telaLembretes(); });
    $$('[data-enviar]').forEach(a => a.addEventListener('click', () => {
      S.marcarEnviado(a.dataset.enviar);
      toast('Lembrete marcado como enviado.');
      setTimeout(recarregar, 50);
    }));
    $$('[data-agendar]').forEach(b => b.onclick = () => {
      const sug = S.proximoLivre({ petId: b.dataset.agendar, servicoId: b.dataset.serv, data: U.hojeISO() });
      abrirAgendamento(sug || { petId: b.dataset.agendar, servicoId: b.dataset.serv });
    });
  }

  /* ===================================================== MODAIS */
  function abrirModal(html, ligar) {
    modal.innerHTML = html;
    $$('[data-fechar]', modal).forEach(b => b.onclick = () => modal.close());
    ligar && ligar();
    if (!modal.open) modal.showModal();
    const primeiro = $('select, input, textarea', modal);
    primeiro && primeiro.focus();
  }
  const cabecalho = t => `<header class="modal-head"><h2>${t}</h2><button type="button" class="x" data-fechar aria-label="Fechar">×</button></header>`;
  const opcoesServico = sel => Object.keys(PV.AREAS).map(ar => `<optgroup label="${PV.AREAS[ar].nome}">${PV.SERVICOS.filter(s => s.area === ar).map(s =>
    `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${s.nome} (${s.duracao} min)</option>`).join('')}</optgroup>`).join('');

  function abrirAgendamento(pre) {
    const pets = [...S.state.pets].sort((a, b) => a.nome.localeCompare(b.nome));
    const v = { petId: pets[0].id, servicoId: 'consulta', data: U.hojeISO(), inicio: '08:00', ...pre };
    if (pre.profissionalId && !pre.servicoId) v.servicoId = S.prof(pre.profissionalId).area === 'saude' ? 'consulta' : 'banho';
    const horas = [];
    for (let t = PV.HORARIO.abre; t < PV.HORARIO.fecha; t += 30) horas.push(U.hhmm(t));

    abrirModal(`<form class="form" id="f-ag" novalidate>
      ${cabecalho('Novo agendamento')}
      <label>Pet<select name="petId">${pets.map(p => `<option value="${p.id}" ${p.id === v.petId ? 'selected' : ''}>${esc(p.nome)} (tutor: ${esc(p.tutor)})</option>`).join('')}</select></label>
      <label>Serviço<select name="servicoId">${opcoesServico(v.servicoId)}</select></label>
      <label>Profissional<select name="profissionalId"></select></label>
      <div class="linha-campos">
        <label>Data<input type="date" name="data" value="${v.data}" required></label>
        <label>Horário<select name="inicio">${horas.map(h => `<option ${h === v.inicio ? 'selected' : ''}>${h}</option>`).join('')}</select></label>
      </div>
      <div id="ag-alerta"></div>
      <div id="ag-status" aria-live="polite"></div>
      <footer class="modal-pe">
        <button type="button" class="btn fantasma" id="sugerir">Sugerir próximo horário livre</button>
        <button type="submit" class="btn primario" id="salvar">Agendar</button>
      </footer>
    </form>`, () => {
      const f = $('#f-ag');
      const preencherProfs = () => {
        const area = S.servico(f.servicoId.value).area;
        const atual = f.profissionalId.value || v.profissionalId;
        const lista = PV.PROFISSIONAIS.filter(p => p.area === area);
        f.profissionalId.innerHTML = lista.map(p => `<option value="${p.id}" ${p.id === atual ? 'selected' : ''}>${esc(p.nome)}</option>`).join('');
      };
      const dados = () => ({ petId: f.petId.value, servicoId: f.servicoId.value, profissionalId: f.profissionalId.value, data: f.data.value, inicio: f.inicio.value });
      const validar = () => {
        const d = dados();
        const pet = S.pet(d.petId), s = S.servico(d.servicoId);
        $('#ag-alerta').innerHTML = pet.alertas ? `<div class="alerta-saude compacto"><strong>Alerta de saúde de ${esc(pet.nome)}</strong><p>${esc(pet.alertas)}</p></div>` : '';
        const erros = d.data ? S.conflitos(d) : ['Escolha uma data.'];
        $('#ag-status').innerHTML = erros.length
          ? `<div class="conflito"><strong>Horário indisponível</strong><ul>${erros.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>`
          : `<div class="livre">Horário livre. ${s.duracao} min, de ${d.inicio} às ${U.hhmm(U.min(d.inicio) + s.duracao)}${s.preco ? `, ${U.moeda(s.preco)}` : ', sem custo'}.</div>`;
        $('#salvar').disabled = erros.length > 0;
      };
      preencherProfs(); validar();
      f.servicoId.onchange = () => { preencherProfs(); validar(); };
      ['petId', 'profissionalId', 'data', 'inicio'].forEach(n => f[n].onchange = validar);
      $('#sugerir').onclick = () => {
        const d = dados();
        const sug = S.proximoLivre({ ...d, profissionalId: null });
        if (!sug) { toast('Sem horários livres nas próximas três semanas.'); return; }
        f.data.value = sug.data; f.inicio.value = sug.inicio; v.profissionalId = sug.profissionalId; f.profissionalId.value = sug.profissionalId;
        validar();
        toast(`Encontrado: ${U.fmtCurta(sug.data)} às ${sug.inicio} com ${S.prof(sug.profissionalId).curto}.`);
      };
      f.onsubmit = e => {
        e.preventDefault();
        const d = dados();
        if (S.conflitos(d).length) return validar();
        S.agendar(d);
        modal.close();
        ui.dataAgenda = d.data;
        toast(`Agendado: ${S.pet(d.petId).nome}, ${U.fmtCurta(d.data)} às ${d.inicio}.`);
        recarregar();
      };
    });
  }

  function abrirDetalhe(id) {
    const a = S.state.agendamentos.find(x => x.id === id);
    const pet = S.pet(a.petId), s = S.servico(a.servicoId), p = S.prof(a.profissionalId);
    const rotulo = { agendado: 'Agendado', concluido: 'Concluído', faltou: 'Faltou', cancelado: 'Cancelado' }[a.status];
    abrirModal(`<div class="form">
      ${cabecalho(`${esc(pet.nome)}: ${esc(s.nome)}`)}
      <p>${U.fmtLonga(a.data)}, das ${a.inicio} às ${U.hhmm(S.fim(a))}, com ${esc(p.nome)}.</p>
      <p>Tutor: ${esc(pet.tutor)}, ${esc(pet.telefone)}. Situação: <strong>${rotulo}</strong>.</p>
      ${pet.alertas ? `<div class="alerta-saude compacto"><strong>Alerta de saúde</strong><p>${esc(pet.alertas)}</p></div>` : ''}
      <footer class="modal-pe">
        <a class="btn fantasma" href="#/pets/${pet.id}" data-fechar>Ver histórico</a>
        ${a.status === 'agendado' ? `
          <button class="btn fantasma" id="cancelar">Cancelar</button>
          <button class="btn fantasma" id="faltou">Faltou</button>
          <button class="btn primario" id="concluir">Concluir</button>` : ''}
      </footer>
    </div>`, () => {
      if (a.status !== 'agendado') return;
      $('#cancelar').onclick = () => { S.status(id, 'cancelado'); modal.close(); toast('Agendamento cancelado. O horário ficou livre.'); recarregar(); };
      $('#faltou').onclick = () => { S.status(id, 'faltou'); modal.close(); toast('Falta registrada.'); recarregar(); };
      $('#concluir').onclick = () => abrirConcluir(id);
    });
  }

  function camposClinicos(servicoId, especie) {
    if (servicoId === 'vacina') return `<div class="linha-campos">
      <label>Vacina aplicada<input name="vacina" value="${especie === 'Gato' ? 'V4 felina' : 'V10'}" required></label>
      <label>Próxima dose<input type="date" name="proximaData" value="${U.addDias(U.hojeISO(), 365)}" required></label></div>`;
    if (servicoId === 'consulta' || servicoId === 'cirurgia') return `<label>Retorno (opcional)<input type="date" name="retorno"></label>`;
    return '';
  }
  function lerExtras(f) {
    const ex = { nota: f.nota.value.trim() };
    if (f.vacina) { ex.vacina = f.vacina.value.trim(); ex.proximaData = f.proximaData.value; }
    if (f.retorno && f.retorno.value) ex.retorno = f.retorno.value;
    return ex;
  }

  function abrirConcluir(id) {
    const a = S.state.agendamentos.find(x => x.id === id);
    const pet = S.pet(a.petId), s = S.servico(a.servicoId);
    abrirModal(`<form class="form" id="f-conc">
      ${cabecalho(`Concluir: ${esc(pet.nome)}, ${esc(s.nome.toLowerCase())}`)}
      <p class="muted">O registro entra na linha do cuidado do pet e alimenta os próximos lembretes.</p>
      <label>Observações<textarea name="nota" rows="3" placeholder="${s.area === 'estetica' ? 'Ex.: tosa na máquina 7, pele sem lesões' : 'Ex.: exame clínico sem alterações'}"></textarea></label>
      ${camposClinicos(a.servicoId, pet.especie)}
      <footer class="modal-pe"><button type="button" class="btn fantasma" data-fechar>Voltar</button><button class="btn primario">Concluir atendimento</button></footer>
    </form>`, () => {
      const f = $('#f-conc');
      f.onsubmit = e => {
        e.preventDefault();
        if (!f.reportValidity()) return;
        S.concluir(id, lerExtras(f));
        modal.close();
        toast(`Atendimento de ${pet.nome} concluído e registrado no histórico.`);
        recarregar();
      };
    });
  }

  function abrirRegistro(petId) {
    const pet = S.pet(petId);
    abrirModal(`<form class="form" id="f-reg">
      ${cabecalho(`Registrar atendimento de ${esc(pet.nome)}`)}
      <div class="linha-campos">
        <label>Serviço<select name="servicoId">${opcoesServico('consulta')}</select></label>
        <label>Data<input type="date" name="data" value="${U.hojeISO()}" required></label>
      </div>
      <label>Profissional<select name="profissionalId">${PV.PROFISSIONAIS.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></label>
      <label>Observações<textarea name="nota" rows="3"></textarea></label>
      <div id="campos-clinicos">${camposClinicos('consulta', pet.especie)}</div>
      <footer class="modal-pe"><button type="button" class="btn fantasma" data-fechar>Voltar</button><button class="btn primario">Salvar registro</button></footer>
    </form>`, () => {
      const f = $('#f-reg');
      f.servicoId.onchange = () => { $('#campos-clinicos').innerHTML = camposClinicos(f.servicoId.value, pet.especie); };
      f.onsubmit = e => {
        e.preventDefault();
        if (!f.reportValidity()) return;
        S.registrar({ petId, servicoId: f.servicoId.value, data: f.data.value, profissionalId: f.profissionalId.value, ...lerExtras(f) });
        modal.close(); toast('Registro salvo na linha do cuidado.'); recarregar();
      };
    });
  }

  function abrirPet(pet) {
    const p = pet || { nome: '', especie: 'Cão', raca: '', nascimento: '', tutor: '', telefone: '', freqBanho: 14, alertas: '' };
    abrirModal(`<form class="form" id="f-pet">
      ${cabecalho(pet ? `Editar ${esc(pet.nome)}` : 'Cadastrar pet')}
      <div class="linha-campos">
        <label>Nome do pet<input name="nome" value="${esc(p.nome)}" required></label>
        <label>Espécie<select name="especie">${['Cão', 'Gato', 'Outro'].map(e => `<option ${e === p.especie ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
      </div>
      <div class="linha-campos">
        <label>Raça<input name="raca" value="${esc(p.raca)}" placeholder="SRD"></label>
        <label>Nascimento<input type="date" name="nascimento" value="${p.nascimento}" required></label>
      </div>
      <div class="linha-campos">
        <label>Tutor<input name="tutor" value="${esc(p.tutor)}" required></label>
        <label>WhatsApp do tutor<input name="telefone" value="${esc(p.telefone)}" placeholder="(41) 99999-0000" required pattern=".*\\d{8,}.*|.*\\d{4,5}-\\d{4}.*"></label>
      </div>
      <label>Banho de rotina<select name="freqBanho">${[[0, 'Não faz banho na clínica'], [7, 'Toda semana'], [10, 'A cada 10 dias'], [14, 'A cada 14 dias'], [15, 'A cada 15 dias'], [21, 'A cada 21 dias'], [30, 'Uma vez por mês']].map(([n, t]) => `<option value="${n}" ${+p.freqBanho === n ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Alerta de saúde (visível para veterinários e tosadores)<textarea name="alertas" rows="2" placeholder="Ex.: alergia a shampoo perfumado, cardiopata, pós-operatório">${esc(p.alertas)}</textarea></label>
      <footer class="modal-pe"><button type="button" class="btn fantasma" data-fechar>Voltar</button><button class="btn primario">${pet ? 'Salvar alterações' : 'Cadastrar pet'}</button></footer>
    </form>`, () => {
      const f = $('#f-pet');
      f.onsubmit = e => {
        e.preventDefault();
        if (!f.reportValidity()) return;
        const d = { nome: f.nome.value.trim(), especie: f.especie.value, raca: f.raca.value.trim() || 'SRD', nascimento: f.nascimento.value, tutor: f.tutor.value.trim(), telefone: f.telefone.value.trim(), freqBanho: +f.freqBanho.value, alertas: f.alertas.value.trim() };
        let id;
        if (pet) { S.atualizarPet(pet.id, d); id = pet.id; toast('Cadastro atualizado.'); }
        else { id = S.novoPet(d).id; toast(`${d.nome} cadastrado.`); }
        modal.close();
        location.hash = `#/pets/${id}`;
        recarregar();
      };
    });
  }

  /* ---------- inicialização ---------- */
  try { S.load(); } catch (e) { console.error(e); S.reset(); }
  $('#resetar').onclick = () => {
    if (confirm('Apagar as alterações feitas neste navegador e voltar aos dados de exemplo?')) { S.reset(); toast('Dados de exemplo restaurados.'); recarregar(); }
  };
  window.addEventListener('hashchange', rota);
  rota();
})();
