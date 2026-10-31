// Lembretes de calendário (.ics, RFC 5545) para as avaliações: abre no Google Agenda ou no calendário do celular.
// Cada avaliação vira um evento de dia inteiro, com dois alertas: na véspera às 9h e no dia às 7h.
const pad = (n) => String(n).padStart(2, '0');
const compact = (iso) => iso.replace(/-/g, '');
// DTEND de evento de dia inteiro é exclusivo: o dia seguinte
function nextDay(iso) {
  const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + 1));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`;
}
const stamp = (now) => `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
// texto de campo: barra, ponto e vírgula, vírgula e quebra de linha precisam de escape
const text = (s) => String(s).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([;,])/g, '\\$1');
// linhas com mais de 75 bytes são dobradas (CRLF + espaço), sem cortar um caractere ao meio
function fold(line) {
  const enc = new TextEncoder(); if (enc.encode(line).length <= 75) return line;
  const out = []; let cur = ''; let len = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length; const limit = out.length ? 74 : 75; // a linha de continuação já começa com 1 espaço
    if (len + b > limit) { out.push(cur); cur = ''; len = 0; }
    cur += ch; len += b;
  }
  out.push(cur); return out.join('\r\n ');
}

// evs: [{ id, title, date: 'AAAA-MM-DD', kind }]
export function buildIcs(evs, { now = new Date() } = {}) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Clarté//Avaliações//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${text('Clarté — avaliações')}`];
  for (const e of evs) {
    const nome = `${e.title}${e.kind === 'oral' ? ' (prova oral)' : ''}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}-${compact(e.date)}@clarte`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      `DTEND;VALUE=DATE:${nextDay(e.date)}`,
      `SUMMARY:${text(nome)}`,
      `DESCRIPTION:${text('Revise no Clarté: treino inteligente, Folha de revisão e uma simulação da prova oral com a Clara.')}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${text(`Amanhã: ${nome}`)}`, 'TRIGGER:-PT15H', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${text(`Hoje: ${nome}. Bonne chance !`)}`, 'TRIGGER:PT7H', 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
