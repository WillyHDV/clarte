// Professor de IA com provedores de camada gratuita (sem cartão): Google Gemini, Groq e Mistral.
// Todos aceitam chamadas direto do navegador; a chave fica só no aparelho.

export const PROVIDERS = {
  gemini: {
    label: 'Google Gemini', model: 'gemini-3.1-flash-lite', kind: 'gemini', base: 'https://generativelanguage.googleapis.com/v1beta',
    keyUrl: 'aistudio.google.com/apikey', keyHint: 'AIza…', how: 'Entre com sua conta Google em aistudio.google.com/apikey e clique em “Create API key”. Não pede cartão.',
  },
  groq: {
    label: 'Groq', model: 'llama-3.3-70b-versatile', kind: 'openai', base: 'https://api.groq.com/openai/v1',
    keyUrl: 'console.groq.com/keys', keyHint: 'gsk_…', how: 'Crie uma conta em console.groq.com/keys e clique em “Create API Key”. Não pede cartão.',
  },
  mistral: {
    label: 'Mistral', model: 'mistral-small-latest', kind: 'openai', base: 'https://api.mistral.ai/v1',
    keyUrl: 'console.mistral.ai/api-keys', keyHint: '…', how: 'Crie uma conta em console.mistral.ai, escolha o plano gratuito e gere uma chave em API keys.',
  },
};

const BASE = `Tu t'appelles Clara. Tu es une femme, française, et tu es professeure de français langue étrangère (niveau A1, « Français basique 1 »). Quand tu parles de toi, accorde toujours au féminin (je suis contente, ravie, professeure, française) et présente-toi comme « Clara ».
Ton élève est brésilien (portugais du Brésil), s'appelle Willy et prépare la première évaluation orale.
Contenus du cours (reste dans ce cadre):
1. L'alphabet et épeler un prénom ; 2. Expressions pour régler des problèmes de communication (Je ne sais pas, Je ne comprends pas, Répétez s'il vous plaît, Comment ça se dit… en portugais/français ?) ;
3. Se présenter : prénom, métier, nationalité, lieu d'habitation, langues parlées ; 4. Saluer et prendre congé (tu / vous) ;
5. Verbes : être et verbes du 1er groupe au présent (s'appeler, parler, habiter, étudier, travailler, aimer) ; 6. Nationalités et métiers au masculin et au féminin ;
7. Interrogation : intonation, est-ce que, mots interrogatifs (comment, où, qui, pourquoi) ; 8. Négation simple (ne … pas).
Règles de langue : phrases courtes, vocabulaire simple, présent de l'indicatif uniquement. Pas de passé composé ni de futur sauf si l'élève les utilise : alors tu les corriges avec douceur et reformules au présent.
Les nationalités et les langues s'écrivent en minuscules. Ne mélange jamais le portugais dans la partie française de ta réponse.`;

const MODES = {
  free: `${BASE}

MODE : conversation libre.
Format STRICT de chaque réponse :
1) D'abord ta réponse en français (1 à 3 phrases courtes), qui se termine par UNE question simple pour continuer la conversation.
2) Ensuite, seulement s'il y a des erreurs (grammaire, accord masculin/féminin, élision, orthographe, ordre des mots), une ligne contenant exactement --- puis une courte correction EN PORTUGAIS : « Você escreveu: … → Melhor: … » avec une explication d'une phrase.
Si l'élève n'a fait aucune erreur, n'écris pas de ---. Si l'élève écrit en portugais ou demande de l'aide, aide en portugais, brièvement, puis relance en français.`,
  exam: `${BASE}

MODE : simulation de l'ÉVALUATION ORALE. Tu es l'examinatrice (la professeure Clara). L'élève répond à voix haute.
Pose UNE question à la fois, dans cet ordre approximatif, en variant : saluer (utilise « vous » au début) → prénom et épeler le prénom → nationalité → ville/quartier → métier → langues parlées → l'élève doit te poser une question (ex. « Posez-moi une question avec est-ce que ») → une phrase négative (« Vous êtes brésilien ? » « Non, … ») → prendre congé.
Après chaque réponse de l'élève : réagis très brièvement en français (« Très bien. », « D'accord. »), puis pose la question suivante. NE corrige PAS pendant l'examen (comme dans un vrai examen). Si l'élève ne comprend pas, reformule plus simplement.
Quand l'élève écrit « [FIN] », arrête l'examen et donne l'évaluation EN PORTUGAIS, avec exactement cette structure :
**Nota geral:** X/10
Depois, uma linha para cada critério, com nota de 0 a 5 e uma frase: Compréhension des questions · Capacité à répondre · Vocabulaire · Correction linguistique · Prononciation (estimada pelo texto reconhecido; avise que é uma estimativa) · Aisance à l'oral.
**Erros para corrigir:** lista com « você disse → correto » e a regra em uma frase.
**O que treinar antes da prova:** 3 itens objetivos.
Au tout début (premier message), salue l'élève en français avec « vous » et pose la première question.`,
  voice: `${BASE}

MODE : CONVERSATION PAR VOIX (comme un appel téléphonique). Ta mission : apprendre à Willy à PARLER et à bien PRONONCER. Tout ce que tu écris avant la ligne --- est lu à voix haute par une synthèse vocale.
Partie parlée (avant ---) :
- 1 à 3 phrases très courtes (12 mots maximum chacune), rythme lent, UNE seule question à la fin. Pas d'emoji, pas de markdown, pas de parenthèses, pas de listes, aucun mot en portugais.
- Utilise « tu ». Varie les sujets du cours : se présenter, nationalité, ville, métier, langues, poser des questions, négation, épeler un prénom.
- Le texte de l'élève vient d'une reconnaissance vocale : ignore la ponctuation, les majuscules et les homophones (parle/parles/parlent, est/es). Ne corrige que de vraies erreurs de grammaire, de vocabulaire ou de mots manquants.
- Corrige UNE seule erreur à la fois, la plus importante. Sois chaleureuse et encourageante ; l'élève a du mal à parler, ne le presse jamais.
- Pour les questions ouvertes, donne un début de phrase à compléter : « Tu peux dire : J'habite à… ».
- Si l'élève fait une erreur : d'abord un indice très court SANS donner la réponse (« Presque ! Avec « habiter », on ne dit pas « suis ». Essaie encore. ») et laisse-le s'auto-corriger. S'il se trompe encore, ou s'il dit « Je ne sais pas » : dis la phrase modèle : « On dit : … Répète, s'il te plaît. » et utilise la ligne >>.
- Si l'élève dit « Je ne comprends pas » : reformule avec des mots plus simples, plus lentement, ou donne la phrase à répéter.
- Si l'élève répond par un seul mot, accepte-le et élargis avec une question très simple.
- Si le message de l'élève contient une « Note de l'application » avec le résultat d'une répétition : s'il a bien répété (correspondance d'au moins 75 %), félicite très brièvement (« Très bien ! ») et passe à une nouvelle question. Sinon, choisis UN mot mal reconnu, dis-le lentement (« Écoute : … ») et demande de répéter la phrase encore une fois. Ne cite jamais de pourcentage.
- Si l'élève ne comprend pas ou ne dit presque rien : reformule plus simplement, avec des mots faciles.
Après la partie parlée, seulement si tu as corrigé ou demandé de répéter, ajoute une ligne contenant exactement --- puis une courte note EN PORTUGAIS (1 à 2 phrases) : l'erreur et la règle. Cette note est seulement affichée, jamais lue.
Quand tu demandes de répéter une phrase, ajoute à la toute fin une ligne qui commence par >> suivie de la phrase exacte à répéter, sans guillemets. Exemple : >> J'habite à Maceió.
Si l'élève ne fait pas d'erreur et ne doit rien répéter, n'écris ni --- ni >>.`,
  duvidas: `Você é a professora Clara, uma mulher francesa, professora de francês para brasileiros, nível A1 (Français basique 1). Fale de si sempre no feminino. O aluno se chama Willy e está se preparando para a primeira avaliação oral.
Responda sempre em PORTUGUÊS do Brasil, de forma curta e clara, com exemplos em francês. Dê no máximo 1 exemplo extra e 1 mini-exercício de verificação ao final.
Conteúdo do curso: alfabeto, expressões de comunicação, apresentação, saudações/despedidas (tu × vous), être e verbos em -er no presente, nacionalidades e profissões (masculino/feminino), interrogação (entonação, est-ce que, inversão, où/qui/comment/pourquoi), negação ne…pas.
Se a pergunta fugir muito do nível A1, responda de forma simples e diga que será visto mais adiante.`,
};

// prova oral por voz: mesmas regras da prova, com falas curtas e sem formatação (a avaliação final em português só é exibida)
MODES.examVoice = `${MODES.exam}

Important : tout ce que tu écris avant l'évaluation finale est lu à voix haute. Fais des phrases courtes, sans emoji, sans markdown, sans parenthèses.`;

export const opening = {
  free: 'Bonjour ! Je m’appelle Clara et je suis ta professeure de français. Je suis contente de te parler ! Comment tu t’appelles ?',
  exam: null,
  duvidas: 'Oi, Willy! Eu sou a Clara, sua professora. Pode perguntar qualquer dúvida de gramática, vocabulário ou pronúncia. 😊',
};

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

async function* sse(res) {
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.search(/\r?\n\r?\n/)) >= 0) {
      const block = buf.slice(0, i); buf = buf.slice(i).replace(/^\r?\n\r?\n/, '');
      const data = block.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('\n');
      if (data) yield data;
    }
  }
}

async function ensureOk(res) {
  if (res.ok) return;
  let msg = res.statusText;
  try { const j = await res.json(); msg = (j.error && (j.error.message || j.error)) || j.message || msg; } catch (e) { /* sem corpo */ }
  throw new HttpError(res.status, typeof msg === 'string' ? msg : JSON.stringify(msg));
}

// messages: [{role:'user'|'assistant', content}] → devolve o texto completo
export async function chat({ provider, apiKey, model, mode, messages, onText, signal: outer }) {
  // limite de tempo: se o modelo não começar a responder em 25 s, aborta com uma mensagem clara
  const ctl = new AbortController(); let timedOut = false;
  if (outer) outer.addEventListener('abort', () => ctl.abort());
  const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, 25000);
  const signal = ctl.signal;
  const gotText = (d) => { clearTimeout(timer); onText && onText(d); };
  try { return await run({ provider, apiKey, model, mode, messages, gotText, signal }); } catch (e) {
    if (timedOut) throw new HttpError(408, 'timeout');
    throw e;
  } finally { clearTimeout(timer); }
}

async function run({ provider, apiKey, model, mode, messages, gotText, signal }) {
  const p = PROVIDERS[provider]; const system = MODES[mode]; let text = '';
  const onText = gotText;
  if (p.kind === 'gemini') {
    const res = await fetch(`${p.base}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
      method: 'POST', signal, headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
      }),
    });
    await ensureOk(res);
    let blocked = '';
    for await (const data of sse(res)) {
      const j = JSON.parse(data);
      if (j.promptFeedback && j.promptFeedback.blockReason) blocked = j.promptFeedback.blockReason;
      const c = j.candidates && j.candidates[0];
      if (c && c.finishReason && /SAFETY|PROHIBITED|BLOCK/.test(c.finishReason) && !text) blocked = c.finishReason;
      const d = c && c.content && c.content.parts ? c.content.parts.filter((x) => !x.thought).map((x) => x.text || '').join('') : '';
      if (d) { text += d; onText && onText(d); }
    }
    if (!text && blocked) throw new Error('A resposta foi bloqueada pelo filtro do provedor. Reformule a mensagem.');
  } else {
    const res = await fetch(`${p.base}/chat/completions`, {
      method: 'POST', signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, stream: true, temperature: 0.6, max_tokens: 1500, messages: [{ role: 'system', content: system }, ...messages] }),
    });
    await ensureOk(res);
    for await (const data of sse(res)) {
      if (data === '[DONE]') break;
      const j = JSON.parse(data); const d = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
      if (d) { text += d; onText && onText(d); }
    }
  }
  if (!text.trim()) throw new Error('O modelo não devolveu texto. Tente de novo ou troque de modelo.');
  return { text };
}

// ---------- transcrição da fala gravada ----------
// Gemini e Groq (Whisper) entendem áudio; o Mistral não, então a Clara usa o provedor que tiver chave.
export function transcribeProvider(settings) {
  const keys = settings.keys || {};
  return [settings.provider, 'gemini', 'groq'].find((p, i, a) => (p === 'gemini' || p === 'groq') && keys[p] && a.indexOf(p) === i) || null;
}

const toBase64 = async (blob) => {
  const buf = new Uint8Array(await blob.arrayBuffer()); let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
};
// converte a gravação (webm/opus) para WAV 16 kHz mono, formato aceito pelo Gemini
async function toWav16k(blob) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const dec = await ctx.decodeAudioData(await blob.arrayBuffer()); try { ctx.close(); } catch (e) { /* ignore */ }
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(dec.duration * 16000)), 16000);
  const src = off.createBufferSource(); src.buffer = dec; src.connect(off.destination); src.start();
  const f = (await off.startRendering()).getChannelData(0);
  const pcm = new Int16Array(f.length); for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
  const h = new DataView(new ArrayBuffer(44)); const w = (o, t) => [...t].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); h.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
  h.setUint32(24, 16000, true); h.setUint32(28, 32000, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, 'data'); h.setUint32(40, pcm.length * 2, true);
  return new Blob([h, pcm], { type: 'audio/wav' });
}

const TRANSCRIBE_PROMPT = 'Transcreva exatamente o que a pessoa disse em francês. Ela é uma aprendiz brasileira iniciante e pode fazer pausas, hesitar e cometer erros de gramática: NÃO corrija nada, escreva as palavras como foram ditas. Se houver palavras em português, mantenha-as. Responda SOMENTE com a transcrição, sem aspas e sem comentários. Se não houver fala compreensível, responda exatamente: <vazio>';

export async function transcribe({ provider, apiKey, model, blob, signal: outer }) {
  const ctl = new AbortController(); let timedOut = false;
  if (outer) outer.addEventListener('abort', () => ctl.abort());
  const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, 30000);
  try {
    const p = PROVIDERS[provider]; let text = '';
    if (provider === 'gemini') {
      let audio = blob;
      try { audio = await toWav16k(blob); } catch (e) { /* manda o original */ }
      const res = await fetch(`${p.base}/models/${encodeURIComponent(model || p.model)}:generateContent`, {
        method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: TRANSCRIBE_PROMPT }, { inlineData: { mimeType: audio.type.split(';')[0], data: await toBase64(audio) } }] }], generationConfig: { temperature: 0, maxOutputTokens: 800 } }),
      });
      await ensureOk(res); const j = await res.json();
      text = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).filter((x) => !x.thought).map((x) => x.text || '').join('');
    } else if (provider === 'groq') {
      const fd = new FormData(); fd.append('file', blob, 'fala.webm'); fd.append('model', 'whisper-large-v3-turbo'); fd.append('language', 'fr'); fd.append('temperature', '0'); fd.append('response_format', 'json');
      const res = await fetch(`${p.base}/audio/transcriptions`, { method: 'POST', signal: ctl.signal, headers: { authorization: `Bearer ${apiKey}` }, body: fd });
      await ensureOk(res); text = (await res.json()).text || '';
    } else throw new Error('Este provedor não transcreve áudio.');
    text = text.replace(/^["“«\s]+|["”»\s]+$/g, '').trim();
    return /^<?\s*vazio\s*>?\.?$/i.test(text) ? '' : text;
  } catch (e) { if (timedOut) throw new HttpError(408, 'timeout'); throw e; } finally { clearTimeout(timer); }
}

// lista os modelos disponíveis para a chave (para o seletor em Ajustes)
export async function listModels(provider, apiKey) {
  const p = PROVIDERS[provider];
  if (p.kind === 'gemini') {
    const res = await fetch(`${p.base}/models?pageSize=200`, { headers: { 'x-goog-api-key': apiKey } }); await ensureOk(res);
    const j = await res.json();
    return (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent')).map((m) => m.name.replace(/^models\//, ''))
      .filter((n) => /^gemini/.test(n) && !/image|tts|embed|live|audio|robotics|computer/i.test(n));
  }
  const res = await fetch(`${p.base}/models`, { headers: { authorization: `Bearer ${apiKey}` } }); await ensureOk(res);
  const j = await res.json();
  return (j.data || []).map((m) => m.id).filter((n) => !/whisper|guard|tts|embed|moderation|ocr|transcri|vision-preview|orpheus|prompt-guard/i.test(n)).sort();
}

export function friendlyError(e) {
  const s = e && e.status;
  if (e && e.name === 'AbortError') return 'Cancelado.';
  if (e instanceof TypeError) return 'Sem conexão com a internet (o professor precisa de rede).';
  if (s === 400 && /api key|key not valid|invalid/i.test(e.message)) return 'Chave da API inválida. Confira em Ajustes.';
  if (s === 400) return 'Pedido recusado pelo provedor: ' + e.message;
  if (s === 401 || s === 403) return 'Chave inválida ou sem permissão. Confira em Ajustes.';
  if (s === 404) return 'Modelo não encontrado. Em Ajustes, toque em “Carregar modelos” e escolha outro.';
  if (s === 408) return 'O modelo demorou demais para responder. Em Ajustes, escolha outro modelo (ex.: gemini-3.1-flash-lite) ou outro provedor.';
  if (s === 429) return 'Limite gratuito atingido por agora. Espere cerca de 1 minuto, ou troque de modelo/provedor em Ajustes.';
  if (s >= 500) return 'O servidor do provedor está instável. Tente de novo em instantes.';
  return (e && e.message) || 'Erro desconhecido.';
}
