/* ContactBook — agenda com foto, busca, grupos e exportação/importação em JSON */

const $ = (s) => document.querySelector(s);
const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const banco = {
  ler(k, padrao) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; } catch { return padrao; } },
  salvar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};
const norm = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const digitos = (t) => String(t ?? '').replace(/\D/g, '');

const GRUPOS = { familia: 'Família', amigos: 'Amigos', trabalho: 'Trabalho', clientes: 'Clientes', outros: 'Outros' };
const CORES = ['#0f8b8d', '#e8590c', '#7048e8', '#d6336c', '#2b8a3e', '#1971c2', '#c2255c', '#5f3dc4', '#e67700'];

const EXEMPLOS = [
  { id: 1, nome: 'Ana Beatriz Souza', tel: '51987654321', email: 'ana.souza@email.com', empresa: 'Estúdio Aurora', grupo: 'clientes', niver: '1994-03-12', notas: 'Site institucional, contato preferido: WhatsApp.', fav: true, foto: '' },
  { id: 2, nome: 'Bruno Carvalho', tel: '51991234567', email: 'bruno@carvalhoadv.com.br', empresa: 'Carvalho Advocacia', grupo: 'clientes', niver: '', notas: '', fav: false, foto: '' },
  { id: 3, nome: 'Carla Mendes', tel: '51999887766', email: 'carla.m@email.com', empresa: '', grupo: 'amigos', niver: '1996-11-30', notas: '', fav: false, foto: '' },
  { id: 4, nome: 'Diego Ramos', tel: '11988776655', email: 'diego.ramos@techsul.com', empresa: 'TechSul', grupo: 'trabalho', niver: '', notas: 'Responsável pela infraestrutura.', fav: false, foto: '' },
  { id: 5, nome: 'Eduarda Lima', tel: '51984561230', email: '', empresa: '', grupo: 'familia', niver: '2001-07-08', notas: '', fav: true, foto: '' },
  { id: 6, nome: 'Fernando Alves', tel: '51993332211', email: 'fernando@barbeariaalves.com', empresa: 'Barbearia Alves', grupo: 'clientes', niver: '', notas: 'Quer integrar agendamento online.', fav: false, foto: '' },
  { id: 7, nome: 'Gabriela Nunes', tel: '48996665544', email: 'gabi.nunes@email.com', empresa: '', grupo: 'amigos', niver: '', notas: '', fav: false, foto: '' },
  { id: 8, nome: 'Marcos Pereira', tel: '51985554433', email: 'marcos.p@email.com', empresa: 'Lava Rápido Brilho', grupo: 'clientes', niver: '', notas: '', fav: false, foto: '' },
  { id: 9, nome: 'Patrícia Rocha', tel: '51997776655', email: 'patricia@clinicaroch.com.br', empresa: 'Clínica Rocha', grupo: 'trabalho', niver: '', notas: '', fav: false, foto: '' },
  { id: 10, nome: 'Rafael Costa', tel: '51982223344', email: 'rafa.costa@email.com', empresa: '', grupo: 'familia', niver: '1990-01-21', notas: '', fav: false, foto: '' }
];
let contatos = banco.ler('cb_contatos', null) ?? EXEMPLOS;
const salvar = () => { if (!banco.salvar('cb_contatos', contatos)) toast('Espaço do navegador cheio. Use fotos menores.'); };
const estado = { busca: '', grupo: 'todos', aberto: null };

/* Formatação de telefone brasileiro */
function formatarTel(t) {
  const d = digitos(t).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
const iniciais = (n) => n.trim().split(/\s+/).filter(Boolean).map((p) => p[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase();
const corDe = (n) => CORES[[...n].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES.length];
const avatar = (c, cls = '') => `<span class="avatar ${cls}" style="--cor:${corDe(c.nome)}" aria-hidden="true">${c.foto ? `<img src="${c.foto}" alt="">` : escapar(iniciais(c.nome))}</span>`;
function destacar(texto, termo) {
  if (!termo) return escapar(texto);
  const i = norm(texto).indexOf(norm(termo));
  if (i < 0) return escapar(texto);
  return escapar(texto.slice(0, i)) + '<mark>' + escapar(texto.slice(i, i + termo.length)) + '</mark>' + escapar(texto.slice(i + termo.length));
}
const letraDe = (n) => { const l = norm(n).charAt(0).toUpperCase(); return /[A-Z]/.test(l) ? l : '#'; };

function filtrados() {
  const t = norm(estado.busca), td = digitos(estado.busca);
  return contatos.filter((c) => {
    if (estado.grupo === 'favoritos' && !c.fav) return false;
    if (estado.grupo !== 'todos' && estado.grupo !== 'favoritos' && c.grupo !== estado.grupo) return false;
    if (!t) return true;
    return norm(c.nome).includes(t) || norm(c.email).includes(t) || norm(c.empresa).includes(t) || (td.length >= 3 && digitos(c.tel).includes(td));
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function desenharLista() {
  const cont = (g) => contatos.filter((c) => (g === 'favoritos' ? c.fav : c.grupo === g)).length;
  $('#grupos').innerHTML = [['todos', `Todos ${contatos.length}`], ['favoritos', `★ Favoritos`], ...Object.entries(GRUPOS).filter(([k]) => cont(k)).map(([k, v]) => [k, v])]
    .map(([k, v]) => `<button data-grupo="${k}" aria-pressed="${estado.grupo === k}">${v}</button>`).join('');

  const l = filtrados();
  const favs = !estado.busca && estado.grupo === 'todos' ? l.filter((c) => c.fav) : [];
  let html = '', letraAtual = '';
  const linha = (c) => {
    const tel = digitos(estado.busca).length >= 3 && digitos(c.tel).includes(digitos(estado.busca));
    const sub = tel ? formatarTel(c.tel) : (c.empresa || formatarTel(c.tel) || c.email);
    return `<li><button class="contato" data-id="${c.id}" aria-current="${estado.aberto === c.id}">${avatar(c)}<span><b>${destacar(c.nome, estado.busca)}</b><small>${tel ? '<mark>' + escapar(sub) + '</mark>' : destacar(sub, estado.busca)}</small></span>${c.fav ? '<span class="estrela" aria-label="Favorito">★</span>' : ''}</button></li>`;
  };
  if (favs.length) html += `<li class="letra" id="letra-fav">★ Favoritos</li>${favs.map(linha).join('')}`;
  const letras = new Set();
  l.forEach((c) => {
    const L = letraDe(c.nome);
    if (L !== letraAtual) { letraAtual = L; letras.add(L); html += `<li class="letra" id="letra-${L}">${L}</li>`; }
    html += linha(c);
  });
  $('#lista').innerHTML = l.length ? html : `<li class="vazio">${contatos.length ? 'Nenhum contato encontrado.' : 'Nenhum contato ainda.<br>Toque em + para adicionar.'}</li>`;
  $('#indice').innerHTML = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map((L) => `<button data-letra="${L}" ${letras.has(L) ? '' : 'disabled'} aria-label="Letra ${L}">${L}</button>`).join('');
  $('#total').textContent = `${l.length} de ${contatos.length} ${contatos.length === 1 ? 'contato' : 'contatos'}`;
}

const ICO = {
  tel: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  zap: '<svg viewBox="0 0 24 24"><path d="M3 21l1.6-5A9 9 0 1 1 8 19.4L3 21Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.5-1.5-2-1-1 1a4 4 0 0 1-2.5-2.5l1-1-1-2Z"/></svg>',
  email: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  estrela: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>'
};
function desenharDetalhe() {
  const c = contatos.find((x) => x.id === estado.aberto);
  if (!c) {
    $('#detalhe').innerHTML = `<div class="det-vazio"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><p>Selecione um contato para ver os detalhes.</p></div>`;
    $('#app').classList.remove('vendo');
    return;
  }
  const tel = digitos(c.tel), zap = tel.length >= 10 ? `https://wa.me/55${tel}` : '';
  const idade = c.niver ? Math.floor((Date.now() - new Date(c.niver + 'T12:00')) / 31557600000) : null;
  const niverTxt = c.niver ? new Date(c.niver + 'T12:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) + (idade > 0 && idade < 120 ? ` · ${idade} anos` : '') : '';
  const campo = (rot, val, copiar) => val ? `<div class="campo"><span>${rot}</span><b>${escapar(val)}</b>${copiar ? `<button data-copiar="${escapar(copiar)}">Copiar</button>` : ''}</div>` : '';
  $('#detalhe').innerHTML = `
    <button class="voltar" id="voltar">‹ Contatos</button>
    <div class="det-topo">${avatar(c, 'enorme')}<h2>${escapar(c.nome)}</h2>${c.empresa ? `<p>${escapar(c.empresa)}</p>` : ''}<span class="tag">${GRUPOS[c.grupo] || 'Outros'}</span></div>
    <div class="atalhos">
      <a href="tel:+55${tel}" class="${tel ? '' : 'desligado'}">${ICO.tel}Ligar</a>
      <a href="${zap || '#'}" target="_blank" rel="noopener" class="${zap ? '' : 'desligado'}">${ICO.zap}WhatsApp</a>
      <a href="mailto:${escapar(c.email)}" class="${c.email ? '' : 'desligado'}">${ICO.email}E-mail</a>
      <button id="fav" class="${c.fav ? 'fav-on' : ''}" aria-pressed="${c.fav}">${ICO.estrela}${c.fav ? 'Favorito' : 'Favoritar'}</button>
    </div>
    <div class="campos">
      ${campo('Telefone', formatarTel(c.tel), formatarTel(c.tel))}
      ${campo('E-mail', c.email, c.email)}
      ${campo('Aniversário', niverTxt)}
      ${campo('Observações', c.notas)}
      ${!c.tel && !c.email && !c.niver && !c.notas ? '<div class="campo"><span>Sem outras informações</span></div>' : ''}
    </div>
    <div class="det-acoes"><button class="btn sec" id="editar">Editar</button><button class="btn perigo" id="excluir">Excluir</button></div>`;
  $('#app').classList.add('vendo');
}

function abrirContato(id) { estado.aberto = id; desenharLista(); desenharDetalhe(); }

/* Eventos da lista */
$('#lista').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) abrirContato(+b.dataset.id); });
$('#indice').addEventListener('click', (e) => { const b = e.target.closest('[data-letra]'); if (b) $(`#letra-${CSS.escape(b.dataset.letra)}`)?.scrollIntoView({ block: 'start' }); });
$('#grupos').addEventListener('click', (e) => { const b = e.target.closest('[data-grupo]'); if (b) { estado.grupo = b.dataset.grupo; desenharLista(); } });
$('#busca').addEventListener('input', (e) => { estado.busca = e.target.value.trim(); desenharLista(); });
$('#busca').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { const p = filtrados()[0]; if (p) abrirContato(p.id); }
  if (e.key === 'Escape') { e.target.value = ''; estado.busca = ''; desenharLista(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.target.matches('input, textarea') && !$('#dlg').open) { e.preventDefault(); $('#busca').focus(); }
});

/* Eventos do detalhe */
let confirmaExcluir = false;
$('#detalhe').addEventListener('click', async (e) => {
  const c = contatos.find((x) => x.id === estado.aberto);
  if (e.target.closest('#voltar')) { estado.aberto = null; desenharLista(); desenharDetalhe(); return; }
  if (!c) return;
  if (e.target.closest('#fav')) { c.fav = !c.fav; salvar(); desenharLista(); desenharDetalhe(); return; }
  if (e.target.closest('#editar')) { abrirForm(c); return; }
  const ex = e.target.closest('#excluir');
  if (ex) {
    if (!confirmaExcluir) { confirmaExcluir = true; ex.textContent = 'Confirmar exclusão'; ex.classList.add('confirmar'); setTimeout(() => { confirmaExcluir = false; if (ex.isConnected) { ex.textContent = 'Excluir'; ex.classList.remove('confirmar'); } }, 3000); return; }
    confirmaExcluir = false;
    contatos = contatos.filter((x) => x !== c); salvar();
    estado.aberto = null; desenharLista(); desenharDetalhe(); toast(`${c.nome} excluído`);
    return;
  }
  const cp = e.target.closest('[data-copiar]');
  if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copiar); toast('Copiado!'); } catch { toast('Não foi possível copiar'); } }
});

/* Formulário */
const dlg = $('#dlg');
let editando = null, fotoForm = '';
$('#f-grupo').innerHTML = Object.entries(GRUPOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
function previaAvatar() {
  const nome = $('#f-nome').value.trim() || '?';
  $('#f-avatar').style.setProperty('--cor', corDe(nome));
  $('#f-avatar').innerHTML = fotoForm ? `<img src="${fotoForm}" alt="">` : escapar(iniciais(nome) || '?');
  $('#f-tirar-foto').hidden = !fotoForm;
}
function abrirForm(c = null) {
  editando = c; fotoForm = c?.foto || '';
  $('#dlg-titulo').textContent = c ? 'Editar contato' : 'Novo contato';
  $('#f-nome').value = c?.nome || ''; $('#f-tel').value = formatarTel(c?.tel || ''); $('#f-email').value = c?.email || '';
  $('#f-empresa').value = c?.empresa || ''; $('#f-grupo').value = c?.grupo || 'amigos'; $('#f-niver').value = c?.niver || ''; $('#f-notas').value = c?.notas || '';
  $('#f-erro').textContent = '';
  ['#f-nome', '#f-email', '#f-tel'].forEach((s) => $(s).removeAttribute('aria-invalid'));
  previaAvatar();
  dlg.showModal();
  $('#f-nome').focus();
}
$('#novo').addEventListener('click', () => abrirForm());
$('#f-nome').addEventListener('input', previaAvatar);
$('#f-tel').addEventListener('input', (e) => { e.target.value = formatarTel(e.target.value); });
$('#f-tirar-foto').addEventListener('click', () => { fotoForm = ''; previaAvatar(); });

// Reduz a foto para 200 px em um canvas antes de salvar
$('#f-foto').addEventListener('change', (e) => {
  const arq = e.target.files[0];
  e.target.value = '';
  if (!arq || !arq.type.startsWith('image/')) return;
  const img = new Image();
  img.onload = () => {
    const lado = 200, cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    cv.width = cv.height = lado;
    const m = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, lado, lado);
    fotoForm = cv.toDataURL('image/jpeg', 0.82);
    URL.revokeObjectURL(img.src);
    previaAvatar();
  };
  img.onerror = () => toast('Não foi possível ler essa imagem');
  img.src = URL.createObjectURL(arq);
});

$('#form').addEventListener('submit', (e) => {
  if (e.submitter?.value !== 'salvar') return;
  const nome = $('#f-nome').value.trim(), email = $('#f-email').value.trim(), tel = digitos($('#f-tel').value);
  let erro = '';
  ['#f-nome', '#f-email', '#f-tel'].forEach((s) => $(s).removeAttribute('aria-invalid'));
  if (!nome) { erro = 'Informe o nome.'; $('#f-nome').setAttribute('aria-invalid', 'true'); }
  else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erro = 'E-mail inválido.'; $('#f-email').setAttribute('aria-invalid', 'true'); }
  else if (tel && tel.length < 10) { erro = 'Telefone precisa ter DDD + número.'; $('#f-tel').setAttribute('aria-invalid', 'true'); }
  else if (!tel && !email) { erro = 'Informe pelo menos telefone ou e-mail.'; $('#f-tel').setAttribute('aria-invalid', 'true'); }
  if (erro) { e.preventDefault(); $('#f-erro').textContent = erro; }
});
dlg.addEventListener('close', () => {
  if (dlg.returnValue !== 'salvar') return;
  const dados = {
    nome: $('#f-nome').value.trim(), tel: digitos($('#f-tel').value), email: $('#f-email').value.trim(), empresa: $('#f-empresa').value.trim(),
    grupo: $('#f-grupo').value, niver: $('#f-niver').value, notas: $('#f-notas').value.trim(), foto: fotoForm
  };
  let id;
  if (editando) { Object.assign(editando, dados); id = editando.id; }
  else { id = Date.now(); contatos.push({ id, fav: false, ...dados }); }
  salvar(); abrirContato(id); toast(editando ? 'Contato atualizado' : 'Contato salvo');
});
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

/* Exportar e importar JSON */
$('#exportar').addEventListener('click', () => {
  const dados = { app: 'ContactBook', versao: 1, exportado: new Date().toISOString(), contatos };
  const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `contatos-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${contatos.length} contatos exportados`);
});
$('#importar').addEventListener('change', async (e) => {
  const arq = e.target.files[0];
  e.target.value = '';
  if (!arq) return;
  try {
    const j = JSON.parse(await arq.text());
    const lista = Array.isArray(j) ? j : j.contatos;
    if (!Array.isArray(lista)) throw new Error();
    let novos = 0;
    lista.forEach((c, i) => {
      if (!c || typeof c.nome !== 'string' || !c.nome.trim()) return;
      const dup = contatos.some((x) => norm(x.nome) === norm(c.nome) && digitos(x.tel) === digitos(c.tel));
      if (dup) return;
      contatos.push({
        id: Date.now() + i, nome: c.nome.trim().slice(0, 60), tel: digitos(c.tel).slice(0, 11), email: String(c.email || '').slice(0, 80),
        empresa: String(c.empresa || '').slice(0, 50), grupo: GRUPOS[c.grupo] ? c.grupo : 'outros', niver: /^\d{4}-\d{2}-\d{2}$/.test(c.niver) ? c.niver : '',
        notas: String(c.notas || '').slice(0, 300), fav: !!c.fav, foto: typeof c.foto === 'string' && c.foto.startsWith('data:image/') ? c.foto : ''
      });
      novos++;
    });
    salvar(); desenharLista(); toast(novos ? `${novos} contatos importados` : 'Nenhum contato novo no arquivo');
  } catch { toast('Arquivo inválido. Use um JSON exportado pelo ContactBook.'); }
});

let timerToast;
function toast(msg) {
  const t = $('#toast'); (document.querySelector('dialog[open]') || document.body).append(t);
  t.textContent = msg; t.hidden = false; clearTimeout(timerToast); timerToast = setTimeout(() => { t.hidden = true; }, 2600);
}

desenharLista();
// No computador já abre o primeiro contato
if (matchMedia('(min-width: 761px)').matches && contatos.length) abrirContato(filtrados()[0].id); else desenharDetalhe();
