var fs = require("fs");

// 1. Check Eris Shard.js for dispatch events
var shardSrc = fs.readFileSync("node_modules/eris/lib/gateway/Shard.js", "utf8");
var matches = shardSrc.match(/case "[A-Z_]+"/g);
if (matches) {
  console.log("=== Eris Shard dispatch events ===");
  matches.forEach(function (m) {
    console.log("  " + m);
  });
}

// Check for interaction in dispatch
console.log("\n=== Interaction in Shard.js ===");
var lines = shardSrc.split("\n");
lines.forEach(function (l, i) {
  if (l.toLowerCase().includes("interact")) {
    console.log("  Line " + (i + 1) + ": " + l.trim());
  }
});
console.log("  (end)");

// 2. Check Eris Client.js for interactionCreate registration
var clientSrc = fs.readFileSync("node_modules/eris/lib/Client.js", "utf8");
var ilines = clientSrc.split("\n");
var foundInteract = false;
ilines.forEach(function (l, i) {
  if (l.toLowerCase().includes("interact")) {
    console.log("  Client Line " + (i + 1) + ": " + l.trim());
    foundInteract = true;
  }
});
if (!foundInteract) {
  console.log("  [WARN] No interaction references in Client.js");
}

// 3. Check ComponentInteraction class
var compSrc = fs.readFileSync("node_modules/eris/lib/structures/ComponentInteraction.js", "utf8");
console.log("\n=== ComponentInteraction methods ===");
var cmethods = compSrc.match(/^\s+(async\s+)?\w+\s*\(/gm);
if (cmethods) {
  cmethods.forEach(function (m) {
    console.log("  " + m.trim());
  });
}

// 4. Check if eris-fleet wraps the client
var fleetIdx = fs.readFileSync("node_modules/eris-fleet/dist/index.js", "utf8");
console.log("\n=== eris-fleet interaction handling ===");
var flines = fleetIdx.split("\n");
flines.forEach(function (l, i) {
  if (l.toLowerCase().includes("interact") || l.toLowerCase().includes("component")) {
    console.log("  Line " + (i + 1) + ": " + l.trim());
  }
});

console.log("\n=== Done ===");
