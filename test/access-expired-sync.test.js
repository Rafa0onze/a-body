import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const save = app.slice(app.indexOf("async function cloudSave("), app.indexOf("async function cloudLoad("));
const load = app.slice(app.indexOf("async function loadStorage("), app.indexOf("const repairJSON"));

test("login do Access vencido é detectado e oferece entrar de novo", () => {
  assert.match(app, /fetch\(`\$\{SUPA_URL\}\/auth\/v1\/user`,\{redirect:'manual',cache:'no-store'\}\);return r\.type==='opaqueredirect';/);
  assert.match(save, /detail:expirou\?ACESSO_EXPIRADO:/);
  assert.match(app, /syncWarning===ACESSO_EXPIRADO\?<button className="ab-secondary-action" onClick=\{\(\)=>location\.reload\(\)\}>Entrar de novo<\/button>/);
});

test("gravação pendente sobrevive ao recarregar e é enviada em vez de sobrescrita pela nuvem", () => {
  assert.match(save, /pendingSync\.set\(key,\{value,options\}\);marcarPendente\(key,true\);/);
  assert.equal((save.match(/marcarPendente\(key,false\)/g) || []).length, 2, "os dois caminhos de sucesso limpam a pendência");
  const envia = load.indexOf("lerPendentes().includes(key)"), nuvem = load.indexOf("if (cloud !== null) {");
  assert.ok(envia > 0 && envia < nuvem, "pendência local vem antes de aceitar a cópia da nuvem");
});
