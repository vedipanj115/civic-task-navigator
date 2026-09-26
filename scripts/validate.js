#!/usr/bin/env node
/**
 * Validates data/sources.json, data/procedures.json, data/steps.json
 * against their schemas in data/schema/, plus cross-file reference checks
 * (procedureId -> procedures, sourceId -> sources, dependsOn -> steps).
 *
 * Usage: node scripts/validate.js
 * Requires: npm install ajv ajv-formats --save-dev
 */
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const dataDir = path.join(__dirname, "..", "data");
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
}

function validateFile(dataFile, schemaFile) {
  const schema = load(path.join("schema", schemaFile));
  const data = load(dataFile);
  const validateFn = ajv.compile(schema);
  let ok = true;
  data.forEach((item, i) => {
    if (!validateFn(item)) {
      ok = false;
      console.error(`\n✗ ${dataFile}[${i}] (_id: ${item._id || "?"}) failed schema:`);
      for (const err of validateFn.errors) {
        console.error(`   ${err.instancePath || "/"} ${err.message}`);
      }
    }
  });
  if (ok) console.log(`✓ ${dataFile} — all ${data.length} entries match ${schemaFile}`);
  return { ok, data };
}

let allOk = true;

const { ok: sourcesOk, data: sources } = validateFile("sources.json", "source.schema.json");
const { ok: proceduresOk, data: procedures } = validateFile("procedures.json", "procedure.schema.json");
const { ok: stepsOk, data: steps } = validateFile("steps.json", "step.schema.json");
allOk = allOk && sourcesOk && proceduresOk && stepsOk;

// Cross-reference checks
const sourceIds = new Set(sources.map(s => s._id));
const procedureIds = new Set(procedures.map(p => p._id));
const stepIds = new Set(steps.map(s => s._id));

procedures.forEach(p => {
  if (!sourceIds.has(p.sourceId)) {
    allOk = false;
    console.error(`\n✗ procedures.json: '${p._id}' references unknown sourceId '${p.sourceId}'`);
  }
});

steps.forEach(s => {
  if (!procedureIds.has(s.procedureId)) {
    allOk = false;
    console.error(`\n✗ steps.json: '${s._id}' references unknown procedureId '${s.procedureId}'`);
  }
  s.dependsOn.forEach(depId => {
    if (!stepIds.has(depId)) {
      allOk = false;
      console.error(`\n✗ steps.json: '${s._id}' has dependsOn reference to unknown step '${depId}'`);
    }
  });
});

console.log(allOk ? "\nAll checks passed.\n" : "\nValidation FAILED — see errors above.\n");
process.exit(allOk ? 0 : 1);
