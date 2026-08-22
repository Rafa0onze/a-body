import test from "node:test";
import assert from "node:assert/strict";
import { isUnilateralExercise } from "../src/workout-timing.js";

test("identifica exercícios que exigem cronômetro por lado", () => {
  assert.equal(isUnilateralExercise({ name:"Prancha Lateral" }), true);
  assert.equal(isUnilateralExercise({ name:"Remada unilateral (halter)" }), true);
  assert.equal(isUnilateralExercise({ name:"Afundo com halteres" }), true);
  assert.equal(isUnilateralExercise({ name:"Stiff" }), false);
  assert.equal(isUnilateralExercise({ name:"Prancha lateral", unilateral:false }), false);
});
