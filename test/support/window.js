// `window` vazio, para importar módulos que consultam recursos do navegador (voz, microfone) só na hora de carregar.
globalThis.window ??= {};
