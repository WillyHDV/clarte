import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs } from '../js/ics.js';

const NOW = new Date(Date.UTC(2026, 10, 1, 13, 5, 9));
const ev = (over = {}) => ({ id: 'eval1', title: 'Évaluation 1', date: '2026-11-04', kind: 'oral', ...over });
const ics = (evs, opts) => buildIcs(evs, { now: NOW, ...opts });
const linhas = (s) => s.split('\r\n');
// desfaz a dobra de linhas (CRLF + espaço) para conferir o conteúdo real
const desdobrar = (s) => s.replace(/\r\n /g, '');

test('calendário válido: abre e fecha, usa só CRLF e termina com quebra de linha', () => {
  const s = ics([ev()]);
  assert.equal(linhas(s)[0], 'BEGIN:VCALENDAR'); assert.equal(linhas(s).at(-2), 'END:VCALENDAR'); assert.equal(linhas(s).at(-1), '');
  assert.ok(!/(^|[^\r])\n/.test(s), 'LF solto: o formato exige CRLF');
  for (const campo of ['VERSION:2.0', 'PRODID:-//Clarté//Avaliações//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']) assert.ok(linhas(s).includes(campo), campo);
});

test('evento de dia inteiro: início, fim exclusivo, identificador e carimbo estáveis', () => {
  const l = linhas(ics([ev()]));
  assert.ok(l.includes('DTSTART;VALUE=DATE:20261104')); assert.ok(l.includes('DTEND;VALUE=DATE:20261105'), 'DTEND é o dia seguinte');
  assert.ok(l.includes('UID:eval1-20261104@clarte')); assert.ok(l.includes('DTSTAMP:20261101T130509Z'));
  assert.ok(l.includes('SUMMARY:Évaluation 1 (prova oral)')); assert.ok(l.includes('TRANSP:TRANSPARENT'), 'não marca o dia como ocupado');
});

test('o dia seguinte vira o mês, o ano e o ano bissexto corretamente', () => {
  const fim = (date) => linhas(ics([ev({ date })])).find((x) => x.startsWith('DTEND')).split(':')[1];
  assert.equal(fim('2026-11-30'), '20261201'); assert.equal(fim('2026-12-31'), '20270101');
  assert.equal(fim('2028-02-28'), '20280229'); assert.equal(fim('2027-02-28'), '20270301'); assert.equal(fim('2026-02-28'), '20260301');
});

test('dois alertas por avaliação: véspera às 9h e no dia às 7h', () => {
  const l = linhas(ics([ev(), ev({ id: 'eval2', title: 'Évaluation 2', date: '2026-12-02' })]));
  assert.equal(l.filter((x) => x === 'BEGIN:VEVENT').length, 2); assert.equal(l.filter((x) => x === 'BEGIN:VALARM').length, 4);
  assert.equal(l.filter((x) => x === 'TRIGGER:-PT15H').length, 2, '24h − 15h = 9h da véspera'); assert.equal(l.filter((x) => x === 'TRIGGER:PT7H').length, 2);
  const cont = (tag) => l.filter((x) => x === `BEGIN:${tag}`).length === l.filter((x) => x === `END:${tag}`).length;
  assert.ok(cont('VEVENT') && cont('VALARM') && cont('VCALENDAR'), 'BEGIN/END desequilibrados');
  assert.equal(new Set(l.filter((x) => x.startsWith('UID:'))).size, 2, 'cada evento tem UID próprio');
});

test('texto é escapado: vírgula, ponto e vírgula, barra e quebra de linha', () => {
  const s = desdobrar(ics([ev({ title: 'Prova; parte 1, oral\\final\nnova linha' })]));
  assert.ok(s.includes('SUMMARY:Prova\\; parte 1\\, oral\\\\final\\nnova linha (prova oral)'), s.split('\r\n').find((x) => x.startsWith('SUMMARY')));
});

test('linhas longas são dobradas em 75 bytes sem partir caracteres acentuados', () => {
  const titulo = 'Évaluation très longue avec des accents é è ê ç à — ' + 'ação '.repeat(30);
  const s = ics([ev({ title: titulo })]); const enc = new TextEncoder();
  for (const l of linhas(s)) assert.ok(enc.encode(l).length <= 75, `linha com ${enc.encode(l).length} bytes: ${l.slice(0, 40)}`);
  assert.ok(desdobrar(s).includes(titulo.trim().replace(/\s+$/, '')), 'ao desdobrar, o título volta inteiro');
  assert.ok(s.includes('\r\n '), 'houve dobra');
  assert.ok(!s.includes('�'), 'nenhum caractere quebrado');
});

test('sem avaliações o calendário continua válido e vazio', () => {
  const l = linhas(ics([])); assert.ok(!l.includes('BEGIN:VEVENT')); assert.equal(l[0], 'BEGIN:VCALENDAR'); assert.equal(l.at(-2), 'END:VCALENDAR');
});

test('avaliação que não é oral não ganha "(prova oral)"', () => {
  assert.ok(linhas(ics([ev({ kind: 'escrita' })])).includes('SUMMARY:Évaluation 1'));
});
