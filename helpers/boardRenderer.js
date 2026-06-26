var sharp = require("sharp");
var { existsSync, readFileSync } = require("fs");

var CARDS_DIR = "./assets/images/defaultCards/";
var BACKS_DIR = CARDS_DIR + "backs/";

async function renderBoardImage(currentCard, cardsCount) {
	var cardPath = CARDS_DIR + currentCard + ".png";
	var backCount = Math.min(cardsCount, 15);
	var backPath = BACKS_DIR + "back" + backCount + ".png";

	if (!existsSync(cardPath)) return null;
	if (!existsSync(backPath)) {
		backPath = CARDS_DIR + "back.png";
		if (!existsSync(backPath)) return null;
	}

	var cardBuf = readFileSync(cardPath);
	var backBuf = readFileSync(backPath);
	var cardMeta = await sharp(cardBuf).metadata();
	var backMeta = await sharp(backBuf).metadata();

	var MARGIN = 15;
	var GAP = 25;
	var CARD_SCALE = 1.3;

	var cardW = Math.round(cardMeta.width * CARD_SCALE);
	var cardH = Math.round(cardMeta.height * CARD_SCALE);

	var MAX_BACKS_W = 500;
	var backsW = backMeta.width;
	var backsH = backMeta.height;
	if (backsW > MAX_BACKS_W) {
		backsH = Math.round(backsH * (MAX_BACKS_W / backsW));
		backsW = MAX_BACKS_W;
	}

	var canvasW = MARGIN + backsW + GAP + cardW + MARGIN;
	var canvasH = Math.max(backsH, cardH) + MARGIN * 2;

	var backsY = Math.round((canvasH - backsH) / 2);
	var backsX = MARGIN;
	var cardX = MARGIN + backsW + GAP;
	var cardY = Math.round((canvasH - cardH) / 2);

	var resizedBacks = await sharp(backBuf)
		.resize(backsW, backsH, { kernel: "lanczos3" })
		.png()
		.toBuffer();

	var resizedCard = await sharp(cardBuf)
		.resize(cardW, cardH, { kernel: "lanczos3" })
		.png()
		.toBuffer();

	var composite = await sharp({
		create: {
			width: canvasW,
			height: canvasH,
			channels: 4,
			background: { r: 30, g: 30, b: 46, alpha: 1 }
		}
	})
		.composite([
			{ input: resizedBacks, top: backsY, left: backsX },
			{ input: resizedCard, top: cardY, left: cardX }
		])
		.png()
		.toBuffer();

	return composite;
}

module.exports = { renderBoardImage };
