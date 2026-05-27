#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "README.md",
  "package.json",
  "electron-main.js"
];

const requiredDomIds = [
  "titleInput",
  "subtitleInput",
  "dateInput",
  "noteInput",
  "templateSelect",
  "canvasSizeSelect",
  "layoutSelect",
  "backgroundInput",
  "accentColor",
  "addPeopleInput",
  "importJsonInput",
  "peopleGrid",
  "searchInput",
  "instance1List",
  "instance2List",
  "unassignedList",
  "previewCanvas",
  "downloadBtn",
  "downloadInstance1Btn",
  "downloadInstance2Btn",
  "resetAssignmentBtn",
  "exportJsonBtn",
  "clearAllBtn",
  "sampleBtn",
  "saveDraftBtn",
  "loadDraftBtn",
  "statusMessage"
];

const requiredFunctions = [
  "init",
  "createBuiltinMembers",
  "mergeBuiltinMembers",
  "addPeopleFromFiles",
  "renderLists",
  "drawPreview",
  "downloadPng",
  "downloadInstancePng",
  "exportJson",
  "importJsonFile",
  "saveDraft",
  "loadDraft",
  "resetAssignments",
  "clearAllData",
  "addSamplePeople"
];

const builtInMemberAssets = [
  "mitsuru.png",
  "justaway.png",
  "kujo-rin.png",
  "daito.png",
  "romiland.png",
  "akatsuki-minato.png",
  "sumeragi-mikado.png",
  "mikage-hallow.png",
  "solne.png",
  "unchi.png",
  "futaba-fukurou.png",
  "yozora-kirito.png",
  "aqua.png",
  "kai-shirato.png",
  "sendou-kaguya.png",
  "jey.png",
  "setoken.png",
  "hatsune-miku.png",
  "rutile.png",
  "kuga-toko.png"
];

const results = [];

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function check(name, run) {
  try {
    run();
    results.push({ ok: true, name });
  } catch (error) {
    results.push({ ok: false, name, message: error.message });
  }
}

function hasDomId(html, id) {
  return new RegExp("\\bid\\s*=\\s*['\"]" + escapeRegExp(id) + "['\"]").test(html);
}

function hasFunction(js, name) {
  const escaped = escapeRegExp(name);
  return new RegExp("\\bfunction\\s+" + escaped + "\\s*\\(").test(js)
    || new RegExp("\\b(?:const|let|var)\\s+" + escaped + "\\s*=").test(js);
}

function hasReference(text, fileName) {
  return new RegExp("['\"][^'\"]*" + escapeRegExp(fileName) + "(?:\\?[^'\"]*)?['\"]", "i").test(text);
}

check("required project files exist", () => {
  const missing = requiredFiles.filter((file) => !exists(file));
  assert(missing.length === 0, "Missing files: " + missing.join(", "));
});

check("index.html references styles.css and app.js", () => {
  const html = readText("index.html");
  assert(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/i.test(html), "stylesheet link is missing");
  assert(hasReference(html, "styles.css"), "styles.css reference is missing");
  assert(/<script\b[^>]*src=["'][^"']*app\.js(?:\?[^"']*)?["'][^>]*>/i.test(html), "app.js script reference is missing");
});

check("index.html contains required DOM ids", () => {
  const html = readText("index.html");
  const missing = requiredDomIds.filter((id) => !hasDomId(html, id));
  assert(missing.length === 0, "Missing DOM ids: " + missing.join(", "));
});

check("index.html contains instance poster layout option", () => {
  const html = readText("index.html");
  assert(/<option\b[^>]*value=["']instance-poster["'][^>]*>/i.test(html), "instance-poster option is missing");
});

check("member upload input accepts multiple images", () => {
  const html = readText("index.html");
  assert(/id=["']addPeopleInput["'][^>]*type=["']file["']/i.test(html)
    || /type=["']file["'][^>]*id=["']addPeopleInput["']/i.test(html), "addPeopleInput must be a file input");
  assert(/id=["']addPeopleInput["'][^>]*multiple/i.test(html), "addPeopleInput must support multiple files");
  assert(/id=["']addPeopleInput["'][^>]*accept=["']image\/\*/i.test(html), "addPeopleInput must accept images");
});

check("app.js parses as JavaScript", () => {
  const js = readText("app.js");
  new Function(js);
});

check("app.js contains expected feature functions", () => {
  const js = readText("app.js");
  const missing = requiredFunctions.filter((name) => !hasFunction(js, name));
  assert(missing.length === 0, "Missing functions: " + missing.join(", "));
});

check("app.js references all required DOM ids", () => {
  const js = readText("app.js");
  const missing = requiredDomIds.filter((id) => !js.includes('"' + id + '"') && !js.includes("'" + id + "'"));
  assert(missing.length === 0, "app.js does not reference ids: " + missing.join(", "));
});

check("app.js references instance poster layout", () => {
  const js = readText("app.js");
  assert(js.includes('"instance-poster"') || js.includes("'instance-poster'"), "app.js does not reference instance-poster");
});

check("built-in member assets exist and are referenced", () => {
  const js = readText("app.js");
  assert(builtInMemberAssets.length === 20, "built-in member asset list should contain 20 members");
  const missingFiles = builtInMemberAssets.filter((file) => !exists(path.join("assets", "members", file)));
  assert(missingFiles.length === 0, "Missing built-in assets: " + missingFiles.join(", "));

  const missingReferences = builtInMemberAssets.filter((file) => !js.includes("assets/members/" + file));
  assert(missingReferences.length === 0, "app.js does not reference assets: " + missingReferences.join(", "));
  assert((js.match(/builtin-/g) || []).length >= builtInMemberAssets.length, "app.js should define built-in member ids");
});

check("selected assignment button style exists", () => {
  const js = readText("app.js");
  const css = readText("styles.css");
  assert(js.includes("is-selected"), "app.js should add is-selected to current assignment buttons");
  assert(css.includes(".mini-btn.is-selected"), "styles.css should style selected assignment buttons");
});

check("member order controls exist", () => {
  const js = readText("app.js");
  const css = readText("styles.css");
  assert(hasFunction(js, "reorderPerson"), "app.js should include reorderPerson");
  assert(hasFunction(js, "canReorderPerson"), "app.js should include canReorderPerson");
  assert(js.includes("掲載順を上げる"), "app.js should include an up order control");
  assert(js.includes("掲載順を下げる"), "app.js should include a down order control");
  assert(css.includes(".mini-btn:disabled"), "styles.css should style disabled order controls");
});

check("clear all keeps members empty after reload", () => {
  const js = readText("app.js");
  assert(hasFunction(js, "createEmptyState"), "app.js should include createEmptyState");
  assert(js.includes("builtinsDisabled"), "app.js should persist the cleared built-in member state");
  assert(js.includes("removeItem(DRAFT_KEY)"), "clear all should remove saved drafts");
  assert(js.includes("すべてのメンバー、背景、設定をクリアしました。"), "clear all status should describe a real clear");
});

check("styles.css contains core layout and preview styles", () => {
  const css = readText("styles.css");
  assert(/\.workspace\b/.test(css), ".workspace style is missing");
  assert(/\.people-grid\b/.test(css), ".people-grid style is missing");
  assert(/#previewCanvas\b/.test(css), "#previewCanvas style is missing");
  assert(/@media\b/.test(css), "responsive media queries are missing");
});

check("package.json has Electron scripts and includes assets", () => {
  const packageJson = JSON.parse(readText("package.json"));
  assert(packageJson.name === "vrc-attendance-image-tool", "package name is unexpected");
  assert(packageJson.scripts && packageJson.scripts.start, "scripts.start is missing");
  assert(packageJson.scripts && packageJson.scripts.pack, "scripts.pack is missing");
  assert(packageJson.scripts && packageJson.scripts.dist, "scripts.dist is missing");
  assert(JSON.stringify(packageJson.build || {}).includes("assets/**/*"), "Electron build should include assets");
});

check("README explains usage, built-in members, GitHub Pages, exe, JSON, and PNG", () => {
  const readme = readText("README.md");
  ["使い方", "初期メンバー20名", "GitHub Pages", "exe", "JSON", "PNG", "インスタンスごと"].forEach((word) => {
    assert(readme.includes(word), "README is missing: " + word);
  });
});

console.log("Static app checks");
console.log("Project: " + rootDir);

results.forEach((result) => {
  console.log((result.ok ? "OK" : "NG") + "  " + result.name);
  if (!result.ok) console.log("    " + result.message);
});

const failed = results.filter((result) => !result.ok).length;
if (failed > 0) {
  console.log("\n" + failed + " check(s) failed.");
  process.exit(1);
}

console.log("\nAll " + results.length + " checks passed.");
