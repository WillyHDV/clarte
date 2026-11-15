import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comIntervaloMinimo } from '../js/update.js';

test('consulta de versão: a primeira chamada passa e as seguintes esperam o intervalo', () => {
  let agora = 1_000_000; let chamadas = 0; const MIN = 60 * 1000;
  const consultar = comIntervaloMinimo(30 * MIN, () => { chamadas++; }, () => agora);
  assert.equal(consultar(), true); assert.equal(chamadas, 1, 'na abertura consulta');
  agora += 5 * MIN; assert.equal(consultar(), false); agora += 24 * MIN; assert.equal(consultar(), false); assert.equal(chamadas, 1, 'voltar ao app várias vezes em 29 minutos não consulta de novo');
  agora += 1 * MIN; assert.equal(consultar(), true); assert.equal(chamadas, 2, 'aos 30 minutos consulta');
  assert.equal(consultar(), false); assert.equal(chamadas, 2, 'e a contagem recomeça dali');
});

test('consulta de versão: relógio que anda para trás não trava para sempre', () => {
  let agora = 5_000_000; let chamadas = 0; const consultar = comIntervaloMinimo(1000, () => { chamadas++; }, () => agora);
  consultar(); agora -= 10_000_000; assert.equal(consultar(), false, 'dentro da janela mesmo com relógio atrasado'); agora += 20_000_000; assert.equal(consultar(), true); assert.equal(chamadas, 2, 'a primeira e a depois do salto');
});
