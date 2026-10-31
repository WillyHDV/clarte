// Folha de revisão (imprimível) e diagnóstico do aparelho.
import { I } from '../ui.js';
import { folhaHtml } from '../folha.js';
import { diagHtml, initDiag } from '../diag.js';
import { $app, cur } from '../core.js';

export function folhaPage() {
  $app.innerHTML = `<div class="noprint"><button class="back" data-go="#/" aria-label="Voltar">${I('back')}</button></div>${folhaHtml()}`;
  document.getElementById('fprint').onclick = () => window.print();
}
export function diagPage() { $app.innerHTML = diagHtml(); initDiag($app, { cur }); }
