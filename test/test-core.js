const assert = require("assert");
const {
	getCardColor,
	matchCards,
	shuffleArray,
	formatGameSetting,
	formatOption,
	formatLanguage,
	updatePosition
} = require("../utils/functions");

var passed = 0;
var failed = 0;

function test(name, fn) {
	try {
		fn();
		passed++;
		console.log(`  PASS: ${name}`);
	} catch (e) {
		failed++;
		console.log(`  FAIL: ${name} - ${e.message}`);
	}
}

console.log("Testing getCardColor...");
test("red card returns red", () => {
	assert.strictEqual(getCardColor("red5"), "red");
});
test("blue card returns blue", () => {
	assert.strictEqual(getCardColor("blue0"), "blue");
});
test("green card returns green", () => {
	assert.strictEqual(getCardColor("greendraw2"), "green");
});
test("yellow card returns yellow", () => {
	assert.strictEqual(getCardColor("yellowreverse"), "yellow");
});
test("wild card returns a color string (raw=false)", () => {
	var color = getCardColor("wild");
	assert.strictEqual(typeof color, "string");
});
test("wilddraw4 returns a color string (raw=false)", () => {
	assert.strictEqual(typeof getCardColor("wilddraw4"), "string");
});
test("wild card returns false (raw=true)", () => {
	assert.strictEqual(getCardColor("wild", true), false);
});
test("null card returns false", () => {
	assert.strictEqual(getCardColor(null), false);
});

console.log("\nTesting matchCards...");
test("same color matches", async () => {
	assert.strictEqual(await matchCards("red1", "red5"), true);
});
test("different color no match", async () => {
	assert.strictEqual(await matchCards("red1", "blue1"), true);
});
test("same number matches across colors", async () => {
	assert.strictEqual(await matchCards("red3", "blue3"), true);
});
test("draw2 matches draw2", async () => {
	assert.strictEqual(await matchCards("reddraw2", "bluedraw2"), true);
});
test("wild matches anything", async () => {
	assert.strictEqual(await matchCards("wild", "red5"), true);
});
test("wilddraw4 matches anything", async () => {
	assert.strictEqual(await matchCards("wilddraw4", "blue7"), true);
});
test("reverse matches reverse", async () => {
	assert.strictEqual(await matchCards("redreverse", "bluereverse"), true);
});
test("skip matches skip", async () => {
	assert.strictEqual(await matchCards("redskip", "blueskip"), true);
});
test("no match returns false", async () => {
	assert.strictEqual(await matchCards("red1", "yellow5"), false);
});

console.log("\nTesting shuffleArray...");
test("array length preserved", () => {
	var arr = [1, 2, 3, 4, 5];
	var shuffled = shuffleArray([...arr]);
	assert.strictEqual(shuffled.length, arr.length);
});
test("all original elements present", () => {
	var arr = [1, 2, 3, 4, 5];
	var shuffled = shuffleArray([...arr]);
	shuffled.sort((a, b) => a - b);
	assert.deepStrictEqual(shuffled, arr);
});
test("empty array returns empty", () => {
	assert.deepStrictEqual(shuffleArray([]), []);
});

console.log("\nTesting formatGameSetting...");
test("drawuntilmatch returns DrawUntilMatch", async () => {
	assert.strictEqual(await formatGameSetting("drawuntilmatch"), "DrawUntilMatch");
});
test("dum alias returns DrawUntilMatch", async () => {
	assert.strictEqual(await formatGameSetting("dum"), "DrawUntilMatch");
});
test("disablejoin returns DisableJoin", async () => {
	assert.strictEqual(await formatGameSetting("disablejoin"), "DisableJoin");
});
test("startingcards returns StartingCards", async () => {
	assert.strictEqual(await formatGameSetting("startingcards"), "StartingCards");
});
test("stackcards returns StackCards", async () => {
	assert.strictEqual(await formatGameSetting("stackcards"), "StackCards");
});
test("invalid setting returns false", async () => {
	assert.strictEqual(await formatGameSetting("nonexistent"), false);
});

console.log("\nTesting formatOption...");
test("allowalerts returns AllowAlerts", async () => {
	assert.strictEqual(await formatOption("allowalerts"), "AllowAlerts");
});
test("autoplay returns AutoPlay", async () => {
	assert.strictEqual(await formatOption("autoplay"), "AutoPlay");
});
test("invalid option returns false", async () => {
	assert.strictEqual(await formatOption("invalid"), false);
});

console.log("\nTesting formatLanguage...");
test("valid language code returns code", async () => {
	assert.strictEqual(await formatLanguage("en-US"), "en-US");
});
test("null returns false", async () => {
	assert.strictEqual(await formatLanguage(null), false);
});
test("undefined returns false", async () => {
	assert.strictEqual(await formatLanguage(undefined), false);
});

console.log("\nTesting updatePosition...");
test("increment position", () => {
	assert.strictEqual(updatePosition(0, 1, ["a", "b", "c"]), 1);
});
test("wrap around from end", () => {
	assert.strictEqual(updatePosition(2, 1, ["a", "b", "c"]), 0);
});
test("wrap around from beginning backward", () => {
	assert.strictEqual(updatePosition(0, -1, ["a", "b", "c"]), 2);
});
test("go back 2 from beginning", () => {
	assert.strictEqual(updatePosition(0, -2, ["a", "b", "c"]), 1);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
