import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("descanso mostra a carga de referência da próxima série e o set já vem com ela", () => {
  assert.match(app, /const cargaReferencia=\(ex,sIdx\)=>\{ const hoje=ex&&!ex\.iso\?currentWeights\[ex\._key\]\?\.\[sIdx-1\]:null; return hoje!=null\?String\(hoje\):pesoAnterior\(ex,sIdx\); \};/);
  assert.match(app, /<RestScreen [^\n]*lastLoad=\{cargaReferencia\(queue\[0\],setIdx\)\} suggestedLoad=\{sugestaoCarga\(queue\[0\]\)\?\.sugerido\}/);
  assert.match(app, /const advanceAfterRest=\(\)=>\{ setWeightInput\(cargaReferencia\(queue\[0\], setIdx\)\)/);
  assert.match(app, /<dt>Carga de referência<\/dt>/);
});
