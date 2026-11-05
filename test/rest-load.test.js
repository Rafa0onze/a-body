import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const tela = app.slice(app.indexOf("export function WorkoutScreen("), app.indexOf("// ─── SUB MODAL"));

test("descanso mostra a carga (ou tempo) de referência e a série já vem com ela", () => {
  assert.match(app, /const cargaReferencia=\(ex,sIdx\)=>\{ const hoje=ex\?currentWeights\[ex\._key\]\?\.\[sIdx-1\]:null; return hoje!=null\?String\(hoje\):registroAnterior\(ex,sIdx\); \};/);
  assert.match(app, /<RestScreen [^\n]*lastLoad=\{cargaReferencia\(queue\[0\],setIdx\)\} suggestedLoad=\{sugestaoCarga\(queue\[0\]\)\?\.sugerido\}/);
  assert.match(app, /const advanceAfterRest=\(\)=>\{ setWeightInput\(cargaReferencia\(queue\[0\], setIdx\)\)/);
  assert.match(app, /prox\.iso \? "Tempo de referência" : "Carga de referência"/);
});

test("isometria começa no tempo de referência e aceita ajuste de 5 s antes de iniciar", () => {
  assert.match(app, /const alvo=Number\(cargaReferencia\(ex,sIdx\)\)\|\|ex\.isoSec\|\|45;setIsoTotal\(alvo\);setIsoSec\(alvo\);/);
  assert.match(app, /initTimer\(queue\[0\],shouldAutoStartSeries\(setIdx\),setIdx\)/);
  assert.match(app, /const ajustarTempoIso=\(d\)=>\{ if\(isoRunning\|\|isoSec!==isoTotal\|\|unilateralSide!==0\)return;/);
  assert.match(tela, /onAdjustIso\(-5\)/);
  assert.match(tela, /onAdjustIso\(5\)/);
});

test("troca de lado não fica travada: carga sem exigir cronômetro, isometria a qualquer momento após iniciar", () => {
  assert.match(app, /if\(cur\.iso&&elapsed<=0\)return;/);
  assert.doesNotMatch(tela, /disabled=\{elapsed <= 0\} onClick=\{onNextSide\}/);
  assert.match(tela, /unilateralSide === 0 && \(isoDone \|\| isoSec < isoTotal\) && <button[^>]*onClick=\{onNextSide\}/);
  assert.match(tela, /const sideReady=!unilateral\|\|unilateralSide===1;/);
});
