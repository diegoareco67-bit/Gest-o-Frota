/**
 * Checagem pura de sobreposição de dois intervalos de tempo.
 * Aceita strings de data ou data+hora ISO (as mesmas usadas nos formulários).
 * Antes esta lógica estava triplicada em Solicitar/Salas/Equipamentos.
 */
export function intervalosSobrepoem(aInicio: string, aFim: string, bInicio: string, bFim: string): boolean {
  const ai = new Date(aInicio).getTime(), af = new Date(aFim).getTime();
  const bi = new Date(bInicio).getTime(), bf = new Date(bFim).getTime();
  return ai < bf && af > bi;
}
