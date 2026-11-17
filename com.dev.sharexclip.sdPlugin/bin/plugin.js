// ShareX Clip — Stream Deck plugin (no dependencies; needs Node 22+ for global WebSocket).
// Each action runs a named ShareX workflow; ShareX itself does the capture and the clipboard.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

// Action UUID -> ShareX workflow name (the hotkey's "Description" in ShareX > Hotkey settings).
const WORKFLOWS = {
	"com.dev.sharexclip.path": "SD Region - File Path",
	"com.dev.sharexclip.image": "SD Region - Image",
};

const SHAREX_CANDIDATES = [
	path.join(process.env.ProgramFiles || "C:\\Program Files", "ShareX", "ShareX.exe"),
	path.join(process.env.LOCALAPPDATA || "", "Programs", "ShareX", "ShareX.exe"),
];

const logFile = path.join(__dirname, "..", "logs", "plugin.log");
function log(msg) {
	try {
		fs.mkdirSync(path.dirname(logFile), { recursive: true });
		if (fs.existsSync(logFile) && fs.statSync(logFile).size > 256 * 1024) fs.rmSync(logFile);
		fs.appendFileSync(logFile, `${new Date().toISOString()} ${msg}\n`);
	} catch {}
}

function arg(name) {
	const i = process.argv.indexOf(name);
	return i === -1 ? undefined : process.argv[i + 1];
}

const port = arg("-port");
const pluginUUID = arg("-pluginUUID");
const registerEvent = arg("-registerEvent");

const ws = new WebSocket(`ws://127.0.0.1:${port}`);
const send = (obj) => ws.send(JSON.stringify(obj));

ws.addEventListener("open", () => {
	send({ event: registerEvent, uuid: pluginUUID });
	log("registered with Stream Deck");
});

ws.addEventListener("message", (ev) => {
	let msg;
	try {
		msg = JSON.parse(ev.data);
	} catch {
		return;
	}
	if (msg.event !== "keyDown") return;

	const workflow = WORKFLOWS[msg.action];
	if (!workflow) return;

	const exe = SHAREX_CANDIDATES.find((p) => p && fs.existsSync(p));
	if (!exe) {
		log("ShareX.exe not found");
		send({ event: "showAlert", context: msg.context });
		return;
	}

	try {
		const child = spawn(exe, ["-workflow", workflow], { detached: true, stdio: "ignore" });
		child.on("error", (e) => {
			log(`spawn failed: ${e.message}`);
			send({ event: "showAlert", context: msg.context });
		});
		child.unref();
		log(`ran workflow "${workflow}"`);
	} catch (e) {
		log(`spawn threw: ${e.message}`);
		send({ event: "showAlert", context: msg.context });
	}
});

ws.addEventListener("close", () => process.exit(0));
ws.addEventListener("error", () => process.exit(1));
