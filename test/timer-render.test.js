import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("descanso não atualiza estado do App a cada segundo; a contagem vive no RestScreen", () => {
  assert.doesNotMatch(app, /setRestSec\(falta\)/);
  const rest = app.slice(app.indexOf("export function RestScreen("), app.indexOf("// ─── BODY REPORT"));
  assert.match(rest, /setInterval\(\(\) => setSeconds\(restante\(\)\), 250\)/);
  assert.match(app, /<RestScreen endsAt=\{restEndsAtRef\.current\|\|Date\.now\(\)\+restSec\*1000\}/);
});

test("rascunho não é regravado a cada tique dos cronômetros", () => {
  const deps = app.match(/const timer = setTimeout\(\(\)=>salvarRascunhoRef\.current\(\),180\);[\s\S]*?\},\[([^\]]*)\]\);/)[1].split(",");
  for (const tique of ["seriesElapsed", "isoSec", "restSec"]) assert.ok(!deps.includes(tique), tique);
  assert.match(app, /setInterval\(\(\)=>salvarRascunhoRef\.current\(\),5000\)/);
});
