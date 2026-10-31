import './support/storage.js';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeCapacitor } from './support/capacitor.js';

// o navegador (Chrome) e o WebView do app Android expõem a mesma API de reconhecimento de fala
globalThis.window = { SpeechRecognition: class {} };
const V = await import('../js/speech.js');

afterEach(() => { delete globalThis.Capacitor; });

test('no navegador com reconhecimento de fala, ele é usado e dá para falar sem chave', () => {
  assert.equal(V.canListen, true); assert.equal(V.browserRec(), true); assert.equal(V.canTalk(), true);
});

test('dentro do app Android o reconhecimento do WebView não é usado: falar depende de gravação + chave', () => {
  fakeCapacitor();
  assert.equal(V.canListen, true, 'a API existe no WebView'); assert.equal(V.browserRec(), false); assert.equal(V.canTalk(), false, 'sem gravação/chave não há como falar');
});
