const FORMATO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;

// 'AAAA-MM-DDTHH:MM[:SS]' → 'DD/MM/AAAA HH:MM', lendo o texto (sem fuso, sem Date).
// null, undefined ou '' → '—'. Texto fora do formato → devolvido sem mudança.
export function formatarDataHora(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }
  if (typeof valor !== "string") {
    return valor;
  }
  const partes = FORMATO.exec(valor);
  if (!partes) {
    return valor;
  }
  const [, ano, mes, dia, hora, minuto] = partes;
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
}
