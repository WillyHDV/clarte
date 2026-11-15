// Correções da Clara: achar "frase errada → frase certa" nos textos dela.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extrairCorrecoes } from '../js/correcoes.js';

test('formato da conversa: "Você escreveu: … → Melhor: …. Explicação."', () => {
  assert.deepEqual(extrairCorrecoes("Você escreveu: Je suis 20 ans → Melhor: J'ai 20 ans. Em francês, a idade usa avoir, não être."),
    [{ erro: 'Je suis 20 ans', certa: "J'ai 20 ans.", explicacao: 'Em francês, a idade usa avoir, não être.' }]);
  assert.deepEqual(extrairCorrecoes('Você escreveu: tu es brésilien → Melhor: Tu es brésilienne'), [{ erro: 'tu es brésilien', certa: 'Tu es brésilienne', explicacao: '' }], 'sem explicação');
  assert.deepEqual(extrairCorrecoes("Você escreveu: Je habite à Maceió -> Melhor: J'habite à Maceió (elisão: je + vogal vira j')"), [{ erro: 'Je habite à Maceió', certa: "J'habite à Maceió", explicacao: "elisão: je + vogal vira j'" }], 'seta -> e explicação entre parênteses');
});

test('ligação: "Você disse: …" e texto antes do rótulo', () => {
  assert.deepEqual(extrairCorrecoes("Atenção ao verbo. Você disse: Il s'appelle Marie → Melhor: Elle s'appelle Marie. Marie é feminino."), [{ erro: "Il s'appelle Marie", certa: "Elle s'appelle Marie.", explicacao: 'Marie é feminino.' }]);
});

test('aspas «», marcas de lista e negrito não entram na frase', () => {
  const r = extrairCorrecoes('- **Você escreveu:** «Je suis étudiante» → Melhor: «Je suis étudiant.» Você é homem, então masculino.');
  assert.deepEqual(r, [{ erro: 'Je suis étudiante', certa: 'Je suis étudiant.', explicacao: 'Você é homem, então masculino.' }]);
});

test('lista da avaliação da prova oral: uma correção por linha', () => {
  const t = ['**Nota geral:** 7/10', 'Compréhension des questions: 4/5 → bom', '**Erros para corrigir:**', '- você disse "Je suis 20 ans" → correto: "J\'ai 20 ans" (avoir para idade)', '2. você disse "Tu es brésilienne" → "Tu es brésilien" — masculino', '**O que treinar antes da prova:** 3 itens'].join('\n');
  assert.deepEqual(extrairCorrecoes(t), [
    { erro: 'Je suis 20 ans', certa: "J'ai 20 ans", explicacao: 'avoir para idade' },
    { erro: 'Tu es brésilienne', certa: 'Tu es brésilien', explicacao: 'masculino' },
  ]);
});

test('só vale a primeira seta, e outras setas na explicação não atrapalham', () => {
  assert.deepEqual(extrairCorrecoes('Você escreveu: Je parle portugais → Melhor: Je parle portugais. Dica: verbo → forma do je.'), [], 'frases iguais não são correção');
  assert.deepEqual(extrairCorrecoes("Você escreveu: Nous parlons français et espagnol → Melhor: Nous parlons français et espagnol. Mas veja: Nous parlons → conjugação"), [], 'iguais de novo');
  assert.deepEqual(extrairCorrecoes('Você escreveu: Tu habites ici → Melhor: Vous habitez ici. Tu → vous muda o verbo.'), [{ erro: 'Tu habites ici', certa: 'Vous habitez ici.', explicacao: 'Tu → vous muda o verbo.' }]);
});

test('o que não é correção é ignorado', () => {
  for (const t of ['', null, undefined, 'Très bien ! Où habites-tu ?', 'Nota: 8 → 9', '→ bonjour', 'avoir →', '8/10 → 9/10', 'a → b', 'Você escreveu: 12 → 13']) assert.deepEqual(extrairCorrecoes(t), [], String(t));
  assert.deepEqual(extrairCorrecoes('x'.repeat(200) + ' → ' + 'y'.repeat(20)), [], 'texto longo demais para ser uma frase');
  assert.deepEqual(extrairCorrecoes('um dois três quatro cinco seis sete oito nove dez onze doze treze catorze quinze dezesseis dezessete → bonjour'), [], 'mais de 16 palavras');
});

test('repetidas somem e o máximo é 6 por texto', () => {
  const linhas = Array.from({ length: 9 }, (_, i) => `Você escreveu: Je mange pomme${i} → Melhor: Je mange une pomme${i}.`);
  assert.equal(extrairCorrecoes(linhas.join('\n')).length, 6);
  assert.equal(extrairCorrecoes(`${linhas[0]}\n${linhas[0]}\nVocê escreveu: Je mange pomme0 → Melhor: JE MANGE UNE POMME0`).length, 1, 'mesma frase certa, só uma vez (sem diferenciar maiúscula nem pontuação)');
});

test('a explicação é cortada em 160 letras', () => {
  const r = extrairCorrecoes(`Você escreveu: Je suis 20 ans → Melhor: J'ai 20 ans. ${'Muito importante. '.repeat(30)}`);
  assert.equal(r[0].explicacao.length, 160);
});
