/* PetVida — dados de referência e gerador de dados de exemplo */
window.PV = window.PV || {};

/* ---------- Utilitários de data, hora e formatação ---------- */
PV.util = {
  toISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  },
  hojeISO() { return PV.util.toISO(new Date()); },
  parse(iso) { return new Date(iso + 'T12:00:00'); },
  addDias(iso, n) {
    const d = PV.util.parse(iso);
    d.setDate(d.getDate() + n);
    return PV.util.toISO(d);
  },
  diff(aISO, bISO) { // dias de b até a
    return Math.round((PV.util.parse(aISO) - PV.util.parse(bISO)) / 86400000);
  },
  min(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; },
  hhmm(min) { return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; },
  fmtData(iso) { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; },
  fmtCurta(iso) { const [, m, d] = iso.split('-'); return `${d}/${m}`; },
  fmtLonga(iso) {
    const t = PV.util.parse(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  },
  moeda(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); },
  idade(iso) {
    const anos = Math.floor(PV.util.diff(PV.util.hojeISO(), iso) / 365.25);
    if (anos >= 1) return `${anos} ano${anos > 1 ? 's' : ''}`;
    const meses = Math.max(1, Math.floor(PV.util.diff(PV.util.hojeISO(), iso) / 30));
    return `${meses} ${meses > 1 ? 'meses' : 'mês'}`;
  },
  relativo(iso) {
    const n = PV.util.diff(iso, PV.util.hojeISO());
    if (n === 0) return 'hoje';
    if (n === 1) return 'amanhã';
    if (n === -1) return 'ontem';
    return n > 0 ? `em ${n} dias` : `há ${-n} dias`;
  }
};

/* ---------- Configuração da clínica ---------- */
PV.HORARIO = { abre: 8 * 60, fecha: 18 * 60, passo: 30 };

PV.AREAS = {
  saude: { nome: 'Saúde' },
  estetica: { nome: 'Estética' }
};

PV.PROFISSIONAIS = [
  { id: 'gabriel', nome: 'Dr. Gabriel Santos', curto: 'Dr. Gabriel', area: 'saude', papel: 'Veterinário, sócio' },
  { id: 'camila', nome: 'Dra. Camila Paes', curto: 'Dra. Camila', area: 'saude', papel: 'Veterinária, sócia' },
  { id: 'rafael', nome: 'Dr. Rafael Lima', curto: 'Dr. Rafael', area: 'saude', papel: 'Plantonista' },
  { id: 'julia', nome: 'Dra. Júlia Moreira', curto: 'Dra. Júlia', area: 'saude', papel: 'Plantonista' },
  { id: 'bruno', nome: 'Bruno Alves', curto: 'Bruno', area: 'estetica', papel: 'Tosador' },
  { id: 'patricia', nome: 'Patrícia Gomes', curto: 'Patrícia', area: 'estetica', papel: 'Tosadora' },
  { id: 'diego', nome: 'Diego Ramos', curto: 'Diego', area: 'estetica', papel: 'Tosador' }
];

PV.SERVICOS = [
  { id: 'consulta', nome: 'Consulta clínica', area: 'saude', duracao: 30, preco: 180 },
  { id: 'vacina', nome: 'Vacinação', area: 'saude', duracao: 30, preco: 120 },
  { id: 'retorno', nome: 'Retorno', area: 'saude', duracao: 30, preco: 0 },
  { id: 'cirurgia', nome: 'Cirurgia de pequeno porte', area: 'saude', duracao: 120, preco: 950 },
  { id: 'banho', nome: 'Banho', area: 'estetica', duracao: 60, preco: 70 },
  { id: 'banho_tosa', nome: 'Banho e tosa', area: 'estetica', duracao: 90, preco: 120 },
  { id: 'tosa_higienica', nome: 'Tosa higiênica', area: 'estetica', duracao: 30, preco: 45 }
];

/* Pets com histórico detalhado (alertas de saúde que a estética precisa conhecer) */
PV.PETS_BASE = [
  { id: 'p01', nome: 'Thor', especie: 'Cão', raca: 'Golden Retriever', nascimento: '2019-03-12', tutor: 'Mariana Costa', telefone: '(41) 99812-3401', freqBanho: 14, alertas: 'Dermatite atópica. Usar shampoo hipoalergênico, nunca o perfumado.' },
  { id: 'p02', nome: 'Mel', especie: 'Cão', raca: 'Shih-tzu', nascimento: '2021-07-02', tutor: 'Carlos Eduardo Ramos', telefone: '(41) 99734-1102', freqBanho: 7, alertas: '' },
  { id: 'p03', nome: 'Luna', especie: 'Gato', raca: 'Siamês', nascimento: '2020-11-20', tutor: 'Fernanda Oliveira', telefone: '(41) 98845-2203', freqBanho: 0, alertas: 'Cardiopata. Evitar estresse e contenção prolongada.' },
  { id: 'p04', nome: 'Bob', especie: 'Cão', raca: 'SRD', nascimento: '2018-01-15', tutor: 'João Pedro Martins', telefone: '(41) 99621-0904', freqBanho: 15, alertas: '' },
  { id: 'p05', nome: 'Nina', especie: 'Cão', raca: 'Poodle', nascimento: '2016-05-30', tutor: 'Ana Beatriz Souza', telefone: '(41) 99177-6605', freqBanho: 7, alertas: 'Otite recorrente. Proteger os ouvidos com algodão no banho.' },
  { id: 'p06', nome: 'Pipoca', especie: 'Cão', raca: 'Lhasa Apso', nascimento: '2022-02-08', tutor: 'Ricardo Nunes', telefone: '(41) 98402-7706', freqBanho: 10, alertas: '' },
  { id: 'p07', nome: 'Simba', especie: 'Gato', raca: 'Persa', nascimento: '2019-09-14', tutor: 'Juliana Rocha', telefone: '(41) 99955-8807', freqBanho: 30, alertas: '' },
  { id: 'p08', nome: 'Max', especie: 'Cão', raca: 'Bulldog Francês', nascimento: '2020-04-22', tutor: 'Lucas Ferreira', telefone: '(41) 99288-9908', freqBanho: 14, alertas: 'Braquicefálico. Secador morno e pausas para respirar.' },
  { id: 'p09', nome: 'Amora', especie: 'Cão', raca: 'Spitz Alemão', nascimento: '2023-01-10', tutor: 'Gabriela Lins', telefone: '(41) 99310-1009', freqBanho: 7, alertas: '' },
  { id: 'p10', nome: 'Fred', especie: 'Cão', raca: 'Dachshund', nascimento: '2017-08-03', tutor: 'Roberto Almeida', telefone: '(41) 98767-2110', freqBanho: 21, alertas: 'Hérnia de disco. Apoiar a coluna, não levantar pelas patas dianteiras.' },
  { id: 'p11', nome: 'Belinha', especie: 'Cão', raca: 'Maltês', nascimento: '2015-12-19', tutor: 'Sônia Teixeira', telefone: '(41) 99043-3211', freqBanho: 7, alertas: 'Idosa, catarata bilateral. Falar antes de tocar.' },
  { id: 'p12', nome: 'Zeca', especie: 'Cão', raca: 'Border Collie', nascimento: '2021-10-27', tutor: 'André Vieira', telefone: '(41) 99586-4312', freqBanho: 30, alertas: '' }
];

/* ---------- Gerador de dados de exemplo (relativos à data de hoje) ---------- */
PV.gerarSeed = function () {
  const U = PV.util;
  const hoje = U.hojeISO();
  let semente = 20261006;
  const rnd = () => { // mulberry32: aleatório determinístico
    semente |= 0; semente = (semente + 0x6D2B79F5) | 0;
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  let seq = 0;
  const id = p => `${p}${(++seq).toString(36)}`;

  /* Pets adicionais: uma clínica com 30+ banhos/dia atende centenas de pets */
  const nomes = ['Bidu', 'Pandora', 'Toddy', 'Kiara', 'Paçoca', 'Billy', 'Lola', 'Marley', 'Cookie', 'Jade', 'Duque', 'Frida', 'Bento', 'Mia', 'Rex', 'Chica', 'Apolo', 'Maya', 'Tobias', 'Lili', 'Hulk', 'Pérola', 'Ozzy', 'Dora', 'Nescau', 'Kira', 'Bolinha', 'Sushi', 'Floquinho', 'Cacau', 'Princesa', 'Snoopy', 'Teddy', 'Lua', 'Jack', 'Mel', 'Bela', 'Fiona', 'Joca', 'Tom', 'Nala', 'Brisa', 'Theo', 'Sansão', 'Laila', 'Biscoito', 'Polenta', 'Gaia', 'Pingo', 'Lupi', 'Estrela', 'Baruk', 'Mostarda', 'Juju', 'Valente', 'Tequila', 'Pudim', 'Chocolate', 'Fumaça', 'Bartô', 'Quindim', 'Malu', 'Romeu', 'Julieta', 'Zara', 'Scooby', 'Pituca', 'Thor Jr.', 'Bruce', 'Lady', 'Faísca', 'Uva'];
  const primeiros = ['Aline', 'Bruna', 'Caio', 'Daniela', 'Eduardo', 'Elaine', 'Felipe', 'Gisele', 'Henrique', 'Isabela', 'Jorge', 'Karina', 'Leandro', 'Luciana', 'Marcelo', 'Natália', 'Otávio', 'Paula', 'Renato', 'Sabrina', 'Thiago', 'Vanessa', 'Wagner', 'Yasmin', 'Rodrigo', 'Cláudia', 'Murilo', 'Tatiane', 'Vinícius', 'Letícia'];
  const sobrenomes = ['Prado', 'Castro', 'Mendes', 'Freitas', 'Pires', 'Moura', 'Barros', 'Duarte', 'Sales', 'Cunha', 'Batista', 'Lopes', 'Reis', 'Farias', 'Teles', 'Brito', 'Campos', 'Siqueira', 'Kuhn', 'Bassi', 'Zanetti', 'Wolff', 'Kowalski', 'Andrade'];
  const racas = ['SRD', 'SRD', 'Yorkshire', 'Shih-tzu', 'Shih-tzu', 'Labrador', 'Pug', 'Beagle', 'Poodle', 'Maltês', 'Lhasa Apso', 'Golden Retriever', 'Schnauzer', 'Spitz Alemão'];
  const pets = PV.PETS_BASE.map(p => ({ ...p }));
  for (let i = 0; i < 140; i++) {
    const gato = i % 8 === 5;
    pets.push({
      id: `p${String(i + 13).padStart(3, '0')}`,
      nome: nomes[i % nomes.length],
      especie: gato ? 'Gato' : 'Cão',
      raca: gato ? pick(['SRD', 'Persa', 'Maine Coon']) : pick(racas),
      nascimento: U.addDias(hoje, -Math.floor(300 + rnd() * 4000)),
      tutor: `${primeiros[(i * 7) % primeiros.length]} ${sobrenomes[(i * 5 + Math.floor(i / 24)) % sobrenomes.length]}`,
      telefone: `(41) 9${Math.floor(8000 + rnd() * 1999)}-${String(Math.floor(rnd() * 9999)).padStart(4, '0')}`,
      freqBanho: gato ? 0 : pick([7, 7, 10, 14, 14, 15, 21, 30]),
      alertas: ''
    });
  }

  /* Histórico clínico e estético */
  const historico = [];
  const notasConsulta = [
    'Exame clínico geral sem alterações. Peso estável.',
    'Prurido leve. Prescrito antialérgico por 7 dias.',
    'Check-up anual. Recomendado exame de sangue no próximo retorno.',
    'Tártaro moderado. Orientada limpeza dentária.',
    'Vômito ocasional. Ajuste na dieta e acompanhamento.'
  ];
  const vets = PV.PROFISSIONAIS.filter(p => p.area === 'saude');
  const tosadores = PV.PROFISSIONAIS.filter(p => p.area === 'estetica');
  pets.forEach((p, i) => {
    // vacina: o vencimento cai entre ~15 dias atrás e ~60 dias à frente
    const venc = U.addDias(hoje, Math.floor(-15 + ((i * 37) % 330)));
    historico.push({
      id: id('h'), petId: p.id, data: U.addDias(venc, -365), servicoId: 'vacina', area: 'saude',
      profissionalId: pick(vets).id, vacina: p.especie === 'Gato' ? 'V4 felina' : 'V10',
      proximaData: venc, nota: 'Dose anual aplicada sem reações.'
    });
    // consulta recente
    const dConsulta = U.addDias(hoje, -Math.floor(20 + rnd() * 150));
    const temRetorno = i % 14 === 1;
    historico.push({
      id: id('h'), petId: p.id, data: dConsulta, servicoId: 'consulta', area: 'saude',
      profissionalId: pick(vets).id, nota: pick(notasConsulta),
      retorno: temRetorno ? U.addDias(hoje, (i % 5) - 2) : null
    });
    // banhos anteriores, respeitando a frequência do pet
    if (p.freqBanho) {
      const atraso = Math.floor(rnd() * (p.freqBanho + 4));
      for (let k = 1; k <= 3; k++) {
        historico.push({
          id: id('h'), petId: p.id, data: U.addDias(hoje, -(atraso + p.freqBanho * (k - 1)) - 1),
          servicoId: k === 2 ? 'banho_tosa' : 'banho', area: 'estetica',
          profissionalId: pick(tosadores).id, nota: k === 2 ? 'Tosa na máquina 7, acabamento na tesoura.' : 'Banho completo, unhas cortadas.'
        });
      }
    }
  });
  if (PV.PETS_BASE.length) {
    historico.push({ id: id('h'), petId: 'p01', data: U.addDias(hoje, -40), servicoId: 'consulta', area: 'saude', profissionalId: 'camila', nota: 'Crise de dermatite. Iniciado tratamento e troca de shampoo. Avisar a estética.', retorno: null });
    historico.push({ id: id('h'), petId: 'p10', data: U.addDias(hoje, -95), servicoId: 'cirurgia', area: 'saude', profissionalId: 'gabriel', nota: 'Exérese de nódulo cutâneo benigno. Recuperação sem intercorrências.', retorno: null });
  }

  /* Agenda: de 2 dias atrás até 6 dias à frente, sem choques e respeitando a rotina de cada pet */
  const agendamentos = [];
  const pesos = {
    saude: ['consulta', 'consulta', 'consulta', 'consulta', 'vacina', 'vacina', 'retorno', 'cirurgia'],
    estetica: ['banho', 'banho', 'banho', 'banho', 'banho_tosa', 'banho_tosa', 'tosa_higienica']
  };
  const ultimo = {}; // petId -> { area: data }
  const marcar = (petId, area, data) => { (ultimo[petId] = ultimo[petId] || {})[area] = data; };
  historico.forEach(h => { const u = (ultimo[h.petId] || {})[h.area]; if (!u || h.data > u) marcar(h.petId, h.area, h.data); });
  const pode = (pet, area, data) => {
    const u = (ultimo[pet.id] || {})[area];
    if (area === 'estetica' && !pet.freqBanho) return false;
    const intervalo = area === 'estetica' ? Math.max(6, pet.freqBanho - 2) : 12;
    return !u || Math.abs(U.diff(data, u)) >= intervalo;
  };
  const novo = (pet, serv, prof, data, t, off) => {
    const ag = { id: id('a'), petId: pet.id, servicoId: serv.id, profissionalId: prof.id, data, inicio: U.hhmm(t), status: off < 0 ? 'concluido' : 'agendado' };
    if (off < 0 && rnd() < 0.07) ag.status = 'faltou';
    agendamentos.push(ag);
    marcar(pet.id, serv.area, data);
    if (ag.status === 'concluido') {
      historico.push({ id: id('h'), petId: pet.id, data, servicoId: serv.id, area: serv.area, profissionalId: prof.id, nota: serv.area === 'estetica' ? 'Atendimento sem intercorrências.' : 'Atendimento realizado.', origem: ag.id });
    }
  };
  // demonstração da integração: Thor (alerta de dermatite) no banho de hoje às 08:00
  const thor = pets.find(p => p.id === 'p01');
  if (thor && U.parse(hoje).getDay() !== 0) {
    historico.filter(h => h.petId === 'p01' && h.area === 'estetica').sort((a, b) => b.data.localeCompare(a.data)).forEach((h, k) => { h.data = U.addDias(hoje, -15 - k * 14); });
    marcar('p01', 'estetica', '0000-01-01');
    novo(thor, PV.SERVICOS.find(s => s.id === 'banho'), PV.PROFISSIONAIS.find(p => p.id === 'bruno'), hoje, PV.HORARIO.abre, 0);
  }
  for (let off = -2; off <= 6; off++) {
    const data = U.addDias(hoje, off);
    if (U.parse(data).getDay() === 0) continue; // domingo fechado
    const ocupacao = off <= 0 ? 0.85 : Math.max(0.3, 0.78 - off * 0.08);
    PV.PROFISSIONAIS.forEach(prof => {
      let t = PV.HORARIO.abre;
      const jaTem = agendamentos.filter(a => a.data === data && a.profissionalId === prof.id);
      while (t < PV.HORARIO.fecha) {
        const ocupadoAte = jaTem.map(a => [U.min(a.inicio), U.min(a.inicio) + PV.SERVICOS.find(s => s.id === a.servicoId).duracao]).find(([i, f]) => t >= i && t < f);
        if (ocupadoAte) { t = ocupadoAte[1]; continue; }
        const fator = prof.area === 'saude' ? 0.7 : 1;
        if (rnd() > ocupacao * fator) { t += 30; continue; }
        const servId = pick(pesos[prof.area]);
        const serv = PV.SERVICOS.find(s => s.id === servId);
        if (t + serv.duracao > PV.HORARIO.fecha) { t += 30; continue; }
        const candidatos = pets.filter(p => pode(p, prof.area, data));
        if (!candidatos.length) break;
        novo(pick(candidatos), serv, prof, data, t, off);
        t += serv.duracao;
      }
    });
  }

  return { versao: 1, criadoEm: hoje, pets, historico, agendamentos, enviados: {} };
};
