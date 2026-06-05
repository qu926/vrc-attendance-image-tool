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
  "electron-main.js",
  "vercel.json",
  path.join("api", "data.js")
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
  "remoteLoadBtn",
  "remoteSaveBtn",
  "remoteHint",
  "statusMessage"
];

const requiredFunctions = [
  "init",
  "createBuiltinMembers",
  "mergeBuiltinMembers",
  "addPeopleFromFiles",
  "renderLists",
  "drawPreview",
  "drawPersonMemo",
  "downloadPng",
  "downloadInstancePng",
  "exportJson",
  "importJsonFile",
  "saveDraft",
  "loadDraft",
  "saveRemoteState",
  "loadRemoteState",
  "scheduleRemoteSave",
  "startRemoteSyncLoop",
  "hasSameOriginRemoteApi",
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

check("member display memo is editable, saved, and drawn instead of names", () => {
  const js = readText("app.js");
  const css = readText("styles.css");
  assert(js.includes("person-card__memo"), "member cards should include a display memo input");
  assert(js.includes("person.memo = memoInput.value"), "memo input should update person.memo");
  assert(js.includes("memo: person.memo || \"\""), "exported member data should include memo");
  assert(js.includes("memo: stringOr(person.memo || person.note || person.comment"), "imported member data should restore memo");
  assert(js.includes("drawPersonMemo(ctx, person.memo"), "instance poster should draw person.memo");
  assert(js.includes("drawPersonMemo(ctx, item.person.memo"), "other layouts should draw person.memo");
  assert(!js.includes("drawPosterName(ctx, person.name"), "poster output must not draw person.name below cards");
  assert(!js.includes("fitText(ctx, item.person.name || \"名前未設定\""), "grid output must not draw person.name below images");
  assert(css.includes(".person-card__memo"), "styles.css should style member memo input");
  assert(css.includes(".assignment-row__memo"), "styles.css should style assignment memo text");
});

check("shared DB sync is always on when API-backed", () => {
  const html = readText("index.html");
  const js = readText("app.js");
  const api = readText(path.join("api", "data.js"));
  assert(html.includes("共有DB"), "index.html should expose shared DB controls");
  assert(!html.includes("remoteUrlInput"), "shared DB should not require users to enter an API URL");
  assert(!html.includes("remoteDocInput"), "shared DB should not require users to enter a shared ID");
  assert(!html.includes("remoteKeyInput"), "shared DB should not require users to enter a passphrase");
  assert(!html.includes("remoteAutoSyncInput"), "shared DB should not require users to toggle auto sync");
  assert(!js.includes("remoteAutoSync"), "shared DB auto sync should not be optional in app.js");
  assert(!js.includes("REMOTE_AUTO_SYNC_KEY"), "shared DB auto sync preference should not be stored");
  assert(js.includes("REMOTE_API_URL"), "app.js should define a fixed remote API URL setting");
  assert(js.includes("REMOTE_SYNC_KEY"), "app.js should define a fixed remote sync key");
  assert(js.includes("startRemoteSyncLoop"), "app.js should poll for shared DB updates");
  assert(js.includes("window.setInterval"), "app.js should periodically load shared DB updates");
  assert(js.includes("remoteLocalDirty"), "app.js should avoid overwriting unsaved local edits while polling");
  assert(js.includes("remoteLastSeenUpdatedAt"), "app.js should skip already-seen remote updates");
  assert(js.includes("hasSameOriginRemoteApi"), "app.js should detect whether the current host can serve the API");
  assert(js.includes("github.io"), "app.js should avoid calling /api/data on GitHub Pages");
  assert(js.includes("remoteLoadBtn.disabled"), "shared DB buttons should be disabled when the API is unavailable");
  assert(js.includes("x-sync-pass"), "app.js should send a shared sync key to the API");
  assert(js.includes("window.fetch(remoteEndpoint()"), "app.js should use fetch for shared DB sync");
  assert(js.includes("remoteSaveSuspended"), "app.js should prevent remote load/save loops");
  assert(api.includes("KV_REST_API_URL"), "api/data.js should use Vercel KV URL from environment");
  assert(api.includes("KV_REST_API_TOKEN"), "api/data.js should use Vercel KV token from environment");
  assert(api.includes("vrcAttendanceImageTool_"), "api/data.js should store this app under its own KV namespace");
});

check("shared DB implementation avoids frontend secrets and Node-only browser code", () => {
  const frontend = readText("index.html") + "\n" + readText("app.js");
  ["SERVICE_ROLE", "PRIVATE_KEY", "KV_REST_API_TOKEN", "process.env", "require(", "ipcRenderer"].forEach((word) => {
    assert(!frontend.includes(word), "frontend must not contain: " + word);
  });
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
  ["使い方", "初期メンバー20名", "GitHub Pages", "exe", "JSON", "PNG", "インスタンスごと", "表示メモ", "共有DB", "Vercel KV"].forEach((word) => {
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
