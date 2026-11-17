// Adds the two Stream Deck workflows to ShareX's HotkeysConfig.json (idempotent).
// Run with ShareX closed: ShareX rewrites this file from memory when it exits.
const fs = require("node:fs");
const path = require("node:path");

const file = process.argv[2] || path.join(process.env.USERPROFILE, "Documents", "ShareX", "HotkeysConfig.json");
const WORKFLOWS = [
	{ name: "SD Region - File Path", after: "SaveImageToFile, CopyFilePathToClipboard" },
	{ name: "SD Region - Image", after: "CopyImageToClipboard, SaveImageToFile" },
];

const cfg = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
const template = cfg.Hotkeys.find((h) => h.TaskSettings.Job === "RectangleRegion") || cfg.Hotkeys[0];
if (!template) throw new Error("No existing hotkey to use as a template");

let added = 0;
for (const wf of WORKFLOWS) {
	let entry = cfg.Hotkeys.find((h) => h.TaskSettings.Description === wf.name);
	if (!entry) {
		entry = structuredClone(template);
		cfg.Hotkeys.push(entry);
		added++;
	}
	entry.HotkeyInfo = { Hotkey: "None", Win: false };
	Object.assign(entry.TaskSettings, {
		Description: wf.name,
		Job: "RectangleRegion",
		UseDefaultAfterCaptureJob: false,
		AfterCaptureJob: wf.after,
	});
}

fs.copyFileSync(file, file + ".pre-streamdeck.bak");
fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
console.log(`added ${added}, total hotkeys ${cfg.Hotkeys.length}`);
