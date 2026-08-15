/**
 * Checks the index declarations on every model without needing a database.
 *
 * Mongoose builds these automatically on start-up, so a bad definition would
 * only surface as a runtime index-build failure against a live server. The two
 * rules worth enforcing ahead of that:
 *
 *  1. MongoDB refuses a compound index that spans two *parallel* arrays
 *     (error 171). Fields inside one array of subdocuments are fine —
 *     `completions.user` + `completions.status` share a single array — but
 *     `assignedMembers` + `completions` in one index would be rejected.
 *  2. An index whose key list is a prefix of another is dead weight: the longer
 *     index already serves it.
 *
 * Run with: node scripts/verify-indexes.mjs
 */

import mongoose from "mongoose";

const MODELS = [
  ["Note", "../models/noteModel.js"],
  ["Todo", "../models/todoModel.js"],
  ["Group", "../models/groupModel.js"],
  ["GroupInvite", "../models/groupinviteModel.js"],
  ["Activity", "../models/acctivityLogModel.js"],
  ["User", "../models/userModel.js"],
  ["Message", "../models/chatModels/messageModel.js"],
  ["Conversation", "../models/chatModels/conversationModel.js"],
  ["UserStatus", "../models/chatModels/userStatusModel.js"],
  ["Post", "../models/forumModels/postModel.js"],
  ["Comment", "../models/forumModels/commentModel.js"],
];

/** Every path in the schema that is (or is nested under) an array. */
function arrayRoots(schema) {
  const roots = new Set();
  schema.eachPath((path, type) => {
    if (type.instance === "Array" || type.$isMongooseArray) roots.add(path);
  });
  return roots;
}

/** The array a key traverses, if any: "completions.user" -> "completions". */
function arrayRootOf(key, roots) {
  if (roots.has(key)) return key;
  for (const root of roots) if (key.startsWith(`${root}.`)) return root;
  return null;
}

let problems = 0;
const report = (msg) => {
  problems += 1;
  console.log(`  PROBLEM  ${msg}`);
};

for (const [name, path] of MODELS) {
  const model = (await import(path)).default;
  const schema = model.schema;
  const roots = arrayRoots(schema);
  const declared = schema.indexes();

  console.log(`\n${name}  (${declared.length} declared)`);

  const keyLists = [];

  for (const [keys, options = {}] of declared) {
    const fields = Object.keys(keys);
    keyLists.push(fields);

    // Rule 1 — parallel arrays.
    const touchedArrays = new Set(
      fields.map((f) => arrayRootOf(f, roots)).filter(Boolean)
    );
    if (touchedArrays.size > 1) {
      report(
        `${name}: index {${fields.join(", ")}} spans parallel arrays ` +
          `[${[...touchedArrays].join(", ")}] — MongoDB will reject this`
      );
    }

    // Every indexed field must actually exist on the schema.
    for (const field of fields) {
      if (!schema.path(field) && !arrayRootOf(field, roots)) {
        report(`${name}: index field "${field}" is not a path on the schema`);
      }
    }

    const flags = [];
    if (touchedArrays.size === 1) flags.push(`multikey:${[...touchedArrays][0]}`);
    if (options.unique) flags.push("unique");
    if (options.sparse) flags.push("sparse");
    if (options.expireAfterSeconds !== undefined) flags.push("ttl");
    console.log(
      `  { ${fields.map((f) => `${f}: ${keys[f]}`).join(", ")} }` +
        (flags.length ? `   [${flags.join(", ")}]` : "")
    );
  }

  // Rule 2 — redundant prefixes.
  for (let i = 0; i < keyLists.length; i += 1) {
    for (let j = 0; j < keyLists.length; j += 1) {
      if (i === j) continue;
      const short = keyLists[i];
      const long = keyLists[j];
      if (short.length >= long.length) continue;
      if (short.every((f, k) => f === long[k])) {
        report(
          `${name}: {${short.join(", ")}} is a prefix of ` +
            `{${long.join(", ")}} — the shorter one is redundant`
        );
      }
    }
  }
}

console.log(
  problems === 0
    ? "\nAll index definitions are valid.\n"
    : `\n${problems} problem(s) found.\n`
);
process.exit(problems === 0 ? 0 : 1);
