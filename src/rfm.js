export const RFM_KEY = 'abody:measurements';
export const RFM_PREFIX = 'abody:measurement:';
export const METHOD = 'RFM-2018-v1';
export const PROTOCOL = 'iliac-crest-horizontal-normal-expiration-v1';
export const QUALITY = 'repeat-1cm-closest-pair-v1';

export function number(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return NaN;
  if (String(value).trim() === '') return NaN;
  const text = String(value).trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
}
export function calculateRfm(height, waist, sex, unit = 'cm') {
  if (!['cm', 'm'].includes(unit) || ![0, 1].includes(sex) || !Number.isFinite(height) || !Number.isFinite(waist) || height <= 0 || waist <= 0) throw new Error('Medidas ou categoria inválidas.');
  const result = 64 - 20 * (height / waist) + 12 * sex;
  if (result <= 0 || result >= 100) throw new Error('Resultado fora do intervalo utilizável. Confira as medidas; não há estimativa válida.');
  return result;
}
export function createMeasurement(form, date = new Date().toISOString()) {
  const age = number(form.age), height = number(form.height), weight = number(form.weight);
  if (!Number.isInteger(age) || age < 20 || age > 69) throw new Error('Este fluxo usa a validação original em adultos de 20 a 69 anos.');
  if (form.applicable !== 'yes') throw new Error('Confirme a aplicabilidade antes de calcular.');
  if (form.protocolConfirmed !== true) throw new Error('Confirme o ponto anatômico e o protocolo. Medida umbilical antiga não serve automaticamente.');
  if (!['0', '1'].includes(form.sex)) throw new Error('Escolha a categoria usada pela equação.');
  if (![height, weight].every(x => Number.isFinite(x) && x > 0)) throw new Error('Informe altura em cm e peso em kg, positivos e finitos.');
  if (height < 100 || height > 250 || weight < 20 || weight > 400) throw new Error('Altura ou peso fora dos limites de entrada do app. Confira as unidades ou procure avaliação profissional. Estes limites não são limites de validação do estudo.');
  const readings = [number(form.waist1), number(form.waist2)];
  if (!readings.every(x => Number.isFinite(x) && x > 0)) throw new Error('Faça duas medidas válidas de cintura em cm.');
  if (readings.some(x => x < 30 || x > 250)) throw new Error('Confira a cintura em centímetros (limites de entrada: 30 a 250 cm).');
  let selected = [0, 1];
  if (Math.abs(readings[0] - readings[1]) > 1) {
    readings.push(number(form.waist3));
    if (!Number.isFinite(readings[2]) || readings[2] <= 0) throw new Error('A diferença passou de 1 cm: faça a terceira medida.');
    if (readings[2] < 30 || readings[2] > 250) throw new Error('Confira a terceira cintura em centímetros.');
    selected = [[0,1], [0,2], [1,2]].sort((a,b) => Math.abs(readings[a[0]]-readings[a[1]])-Math.abs(readings[b[0]]-readings[b[1]]))[0];
    if (Math.abs(readings[selected[0]] - readings[selected[1]]) > 1) throw new Error('Nenhum par concorda dentro de 1 cm. Refaça as medidas.');
  }
  const waist = (readings[selected[0]] + readings[selected[1]]) / 2;
  return { id:globalThis.crypto.randomUUID(), date, method:METHOD, protocol:PROTOCOL, qualityRule:QUALITY, units:{height:'cm',waist:'cm',weight:'kg'}, age, height, weight, sex:Number(form.sex), waistReadings:readings, selectedReadings:selected, waist, estimatedBodyFatPercent:calculateRfm(height, waist, Number(form.sex)), protocolConfirmed:true, applicabilityConfirmed:true };
}
export function appendMeasurement(history, entry) {
  if (!Array.isArray(history)) throw new Error('Histórico inválido. Nada foi sobrescrito.');
  return history.some(x => x.id === entry.id) ? history : [...history, entry];
}
export function mergeMeasurements(legacy, records) {
  if (!Array.isArray(legacy) || !Array.isArray(records)) throw new Error('Histórico inválido. Nada foi sobrescrito.');
  const result = [...legacy];
  for (const entry of records) {
    if (!entry || typeof entry.id !== 'string' || !entry.date) throw new Error('Registro de medidas inválido.');
    if (!result.some(x => x.id === entry.id)) result.push(entry);
  }
  return result.sort((a,b) => String(a.date || '').localeCompare(String(b.date || '')));
}
export function comparable(a,b) {
  return !!a && !!b && a.method===METHOD && b.method===METHOD && a.protocol===PROTOCOL && b.protocol===PROTOCOL && a.qualityRule===QUALITY && b.qualityRule===QUALITY && a.sex===b.sex && a.units?.waist==='cm' && b.units?.waist==='cm';
}
