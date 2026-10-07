/* PetVida — camada de dados (persistência local + regras de negócio) */
(function () {
  const U = PV.util;
  const KEY = 'petvida:v2';
  const ATIVO = a => a.status !== 'cancelado' && a.status !== 'faltou';

  const store = {
    state: null,

    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const s = JSON.parse(raw);
          const ok = s && s.versao === 1 && Array.isArray(s.pets) && s.pets.length &&
            Array.isArray(s.historico) && Array.isArray(s.agendamentos) && s.enviados && typeof s.enviados === 'object' &&
            s.agendamentos.every(a => PV.SERVICOS.some(x => x.id === a.servicoId) && s.pets.some(pt => pt.id === a.petId));
          if (ok) { store.state = s; return; }
        }
      } catch (e) { /* armazenamento indisponível ou dados corrompidos: recomeça com dados novos */ }
      try { localStorage.removeItem('petvida:v1'); } catch (e) { /* ignora */ }
      store.reset();
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(store.state)); } catch (e) { /* modo privado */ }
    },
    reset() { store.state = PV.gerarSeed(); store.save(); },

    /* ---------- consultas simples ---------- */
    pet: id => store.state.pets.find(p => p.id === id),
    servico: id => PV.SERVICOS.find(s => s.id === id),
    prof: id => PV.PROFISSIONAIS.find(p => p.id === id),
    novoId: p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),

    doDia(data) {
      return store.state.agendamentos
        .filter(a => a.data === data && a.status !== 'cancelado')
        .sort((a, b) => a.inicio.localeCompare(b.inicio));
    },
    fim(a) { return U.min(a.inicio) + store.servico(a.servicoId).duracao; },

    /* ---------- regra central: nada de choque de horários ---------- */
    conflitos(ag, ignorarId) {
      const erros = [];
      const serv = store.servico(ag.servicoId);
      const prof = store.prof(ag.profissionalId);
      const ini = U.min(ag.inicio);
      const fim = ini + serv.duracao;
      if (prof && prof.area !== serv.area) erros.push(`${prof.curto} não realiza ${serv.nome.toLowerCase()}.`);
      if (ini < PV.HORARIO.abre) erros.push('A clínica abre às 08:00.');
      if (fim > PV.HORARIO.fecha) erros.push(`O atendimento terminaria às ${U.hhmm(fim)}, depois do fechamento (18:00).`);
      if (U.parse(ag.data).getDay() === 0) erros.push('A clínica não abre aos domingos.');
      store.state.agendamentos.forEach(o => {
        if (o.id === ignorarId || o.data !== ag.data || !ATIVO(o)) return;
        const oi = U.min(o.inicio), of = store.fim(o);
        if (!(ini < of && oi < fim)) return;
        const op = store.pet(o.petId), os = store.servico(o.servicoId);
        const faixa = `${o.inicio} às ${U.hhmm(of)}`;
        if (o.profissionalId === ag.profissionalId) erros.push(`${prof.curto} já atende ${op.nome} (${os.nome.toLowerCase()}) das ${faixa}.`);
        else if (o.petId === ag.petId) erros.push(`${op.nome} já está com ${os.nome.toLowerCase()} das ${faixa}.`);
      });
      return erros;
    },

    /* procura o primeiro encaixe sem conflito, a partir de uma data/hora */
    proximoLivre({ petId, servicoId, profissionalId, data, inicio }) {
      const serv = store.servico(servicoId);
      const profs = profissionalId ? [store.prof(profissionalId)] : PV.PROFISSIONAIS.filter(p => p.area === serv.area);
      for (let d = 0; d < 21; d++) {
        const dia = U.addDias(data, d);
        if (U.parse(dia).getDay() === 0) continue;
        let t = d === 0 ? Math.max(PV.HORARIO.abre, U.min(inicio || '08:00')) : PV.HORARIO.abre;
        if (dia === U.hojeISO()) {
          const agora = new Date(); const m = agora.getHours() * 60 + agora.getMinutes();
          t = Math.max(t, Math.ceil(m / 30) * 30);
        }
        for (; t + serv.duracao <= PV.HORARIO.fecha; t += PV.HORARIO.passo) {
          for (const p of profs) {
            const cand = { petId, servicoId, profissionalId: p.id, data: dia, inicio: U.hhmm(t) };
            if (!store.conflitos(cand).length) return cand;
          }
        }
      }
      return null;
    },

    /* ---------- escrita ---------- */
    agendar(ag) {
      const novo = { id: store.novoId('a'), status: 'agendado', ...ag };
      store.state.agendamentos.push(novo);
      store.save();
      return novo;
    },
    status(id, status) {
      const a = store.state.agendamentos.find(x => x.id === id);
      if (a) { a.status = status; store.save(); }
      return a;
    },
    concluir(id, extra) {
      const a = store.status(id, 'concluido');
      const serv = store.servico(a.servicoId);
      store.state.historico.push({
        id: store.novoId('h'), petId: a.petId, data: a.data, servicoId: a.servicoId, area: serv.area,
        profissionalId: a.profissionalId, origem: a.id, ...extra
      });
      store.save();
    },
    registrar(reg) {
      store.state.historico.push({ id: store.novoId('h'), area: store.servico(reg.servicoId).area, ...reg });
      store.save();
    },
    novoPet(p) {
      const pet = { id: store.novoId('p'), ...p };
      store.state.pets.push(pet);
      store.save();
      return pet;
    },
    atualizarPet(id, dados) { Object.assign(store.pet(id), dados); store.save(); },
    marcarEnviado(chave) { store.state.enviados[chave] = U.hojeISO(); store.save(); },

    /* ---------- prontuário único: saúde + estética ---------- */
    historicoDoPet(petId) {
      return store.state.historico.filter(h => h.petId === petId).sort((a, b) => b.data.localeCompare(a.data));
    },
    futurosDoPet(petId) {
      const hoje = U.hojeISO();
      return store.state.agendamentos
        .filter(a => a.petId === petId && a.data >= hoje && a.status === 'agendado')
        .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
    },
    resumoPet(petId) {
      const hist = store.historicoDoPet(petId);
      const vac = hist.find(h => h.servicoId === 'vacina' && h.proximaData);
      const banho = hist.find(h => h.area === 'estetica');
      const prox = store.futurosDoPet(petId)[0];
      return { vac, banho, prox };
    },

    /* ---------- lembretes automáticos ---------- */
    lembretes() {
      const hoje = U.hojeISO();
      const out = [];
      store.state.pets.forEach(pet => {
        const fut = store.futurosDoPet(pet.id);
        const hist = store.historicoDoPet(pet.id);

        const vac = hist.find(h => h.servicoId === 'vacina' && h.proximaData);
        if (vac && U.diff(vac.proximaData, hoje) <= 15 && !fut.some(a => a.servicoId === 'vacina')) {
          out.push({ tipo: 'vacina', pet, data: vac.proximaData, servicoId: 'vacina',
            titulo: `${vac.vacina || 'Vacina'} ${U.diff(vac.proximaData, hoje) < 0 ? 'vencida' : 'vence'} ${U.relativo(vac.proximaData)}`,
            msg: `Olá, ${pet.tutor.split(' ')[0]}! Aqui é da Clínica PetVida. A vacina ${vac.vacina || ''} do(a) ${pet.nome} ${U.diff(vac.proximaData, hoje) < 0 ? 'venceu' : 'vence'} em ${U.fmtData(vac.proximaData)}. Podemos agendar a dose? Temos horários esta semana.` });
        }

        const ret = hist.find(h => h.retorno);
        if (ret && U.diff(ret.retorno, hoje) <= 7 && U.diff(ret.retorno, hoje) >= -30 && !hist.some(h => h.servicoId === 'retorno' && h.data >= ret.data) && !fut.some(a => a.servicoId === 'retorno' || a.servicoId === 'consulta')) {
          out.push({ tipo: 'retorno', pet, data: ret.retorno, servicoId: 'retorno',
            titulo: `Retorno previsto ${U.relativo(ret.retorno)}`,
            msg: `Olá, ${pet.tutor.split(' ')[0]}! Aqui é da Clínica PetVida. Está na hora do retorno do(a) ${pet.nome}, previsto para ${U.fmtData(ret.retorno)}. Qual o melhor dia para vocês?` });
        }

        if (pet.freqBanho) {
          const ult = hist.find(h => h.area === 'estetica');
          const devido = ult ? U.addDias(ult.data, pet.freqBanho) : hoje;
          if (U.diff(devido, hoje) <= 3 && !fut.some(a => store.servico(a.servicoId).area === 'estetica')) {
            out.push({ tipo: 'banho', pet, data: devido, servicoId: 'banho',
              titulo: `Banho de rotina ${U.diff(devido, hoje) < 0 ? 'atrasado' : 'previsto'} ${U.relativo(devido)}`,
              msg: `Olá, ${pet.tutor.split(' ')[0]}! Aqui é da PetVida. O último banho do(a) ${pet.nome} foi em ${ult ? U.fmtData(ult.data) : '-'}. Quer que a gente reserve um horário? Temos vaga ${U.diff(devido, hoje) <= 0 ? 'ainda esta semana' : 'para os próximos dias'}.` });
          }
        }
      });
      out.forEach(l => { l.chave = `${l.tipo}:${l.pet.id}:${l.data}`; l.enviado = store.state.enviados[l.chave] || null; });
      return out.sort((a, b) => a.data.localeCompare(b.data));
    },

    /* ---------- indicadores ---------- */
    indicadores(data) {
      const ags = store.doDia(data).filter(ATIVO);
      const jornada = PV.HORARIO.fecha - PV.HORARIO.abre;
      const porArea = { saude: { min: 0, n: 0, cap: 0 }, estetica: { min: 0, n: 0, cap: 0 } };
      PV.PROFISSIONAIS.forEach(p => { porArea[p.area].cap += jornada; });
      let receita = 0;
      ags.forEach(a => {
        const s = store.servico(a.servicoId);
        porArea[s.area].min += s.duracao; porArea[s.area].n++; receita += s.preco;
      });
      const porProf = PV.PROFISSIONAIS.map(p => {
        const m = ags.filter(a => a.profissionalId === p.id).reduce((t, a) => t + store.servico(a.servicoId).duracao, 0);
        return { prof: p, ocupado: m, livre: jornada - m };
      });
      return { ags, porArea, receita, porProf };
    },
    receitaPeriodo(inicio, dias) {
      let total = 0;
      for (let i = 0; i < dias; i++) total += store.indicadores(U.addDias(inicio, i)).receita;
      return total;
    }
  };

  PV.store = store;
})();
