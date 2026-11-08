import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const save = app.slice(app.indexOf("async function cloudSave("), app.indexOf("async function cloudLoad("));
const load = app.slice(app.indexOf("async function loadStorage("), app.indexOf("const repairJSON"));

test("celular sem chave é detectado e oferece parear", () => {
  assert.match(app, /fetch\(`\$\{SUPA_URL\}\/auth\/v1\/user`,\{redirect:'manual',cache:'no-store'\}\);return r\.type==='opaqueredirect'\|\|r\.status===401;\}/);
  assert.match(app, /useEffect\(\(\)=>\{parearSeNecessario\(\)\.then\(acessoExpirado\)/);
  assert.match(save, /detail:expirou\?ACESSO_EXPIRADO:/);
  assert.match(app, /syncWarning===ACESSO_EXPIRADO\?<button className="ab-secondary-action" onClick=\{\(\)=>\{localStorage\.removeItem\('abody:pareado'\);location\.href='\/parear';\}\}>Parear este celular<\/button>/);
});

test("gravação pendente sobrevive ao recarregar e é enviada em vez de sobrescrita pela nuvem", () => {
  assert.match(save, /pendingSync\.set\(key,\{value,options\}\);marcarPendente\(key,true\);/);
  assert.equal((save.match(/marcarPendente\(key,false\)/g) || []).length, 2, "os dois caminhos de sucesso limpam a pendência");
  const envia = load.indexOf("lerPendentes().includes(key)"), nuvem = load.indexOf("if (cloud !== null) {");
  assert.ok(envia > 0 && envia < nuvem, "pendência local vem antes de aceitar a cópia da nuvem");
});
