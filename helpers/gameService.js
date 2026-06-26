const config = require("../utils/config");
const collections = require("../utils/collections");
const gameModel = require("../database/models/game");
var {
	addCards,
	matchCards,
	updatePosition,
	selfPlayCard,
	endGame,
	updateGuildStats,
	updateUserStats,
	shuffleArray,
	getCardColor,
	translate
} = require("../utils/functions");

function washCard(card) {
	if (card.includes("wild")) {
		card = card.includes("wilddraw4") ? "wilddraw4" : "wild";
	}
	return card;
}

async function advanceTurn(gameData) {
	var nextPos = updatePosition(gameData.currentPosition, +1, gameData.playerOrder);
	gameData.currentPosition = nextPos;
	await gameData.updateOne({ currentPosition: nextPos, saidUno: false });
	return nextPos;
}

async function handleUNOCallout(gameData, playerID, saidUno) {
	if (!gameData.gameSettings.UnoCallout) return null;
	if (saidUno) {
		await gameData.updateOne({ saidUno: false });
		return "SAID";
	}
	if (gameData.unoCallout !== "") {
		var oldCalloutID = gameData.unoCallout;
		await gameData.updateOne({ unoCallout: "" });
		return oldCalloutID;
	}
	if (gameData.players[playerID].cards.length === 1) {
		await gameData.updateOne({ unoCallout: playerID });
		return "SET";
	}
	return null;
}

async function processDraw(gameData, drawAmount) {
	var currentPosition = gameData.currentPosition;
	var playerID = gameData.playerOrder[currentPosition];
	console.log("[DRAW BEFORE] player=%s cards=%d drawAmount=%d stacked=%d", playerID, (gameData.players[playerID] || {}).cards.length, drawAmount, gameData.stackedCards);

	var drawnCards = await addCards(drawAmount, gameData, currentPosition);

	if (gameData.stackedCards > 0) gameData.stackedCards = 0;

	gameData.saidUno = false;
	await gameData.updateOne({
		[`players.${playerID}.cards`]: gameData.players[playerID].cards,
		deck: gameData.deck,
		stackedCards: gameData.stackedCards,
		saidUno: false
	});

	console.log("[DRAW AFTER] player=%s cards=%d drawn=%d", playerID, (gameData.players[playerID] || {}).cards.length, drawAmount);
	return drawnCards;
}

async function processPlay(gameData, playerID, playedCard) {
	var currentCard = gameData.currentCard;
	var washedCard = washCard(playedCard);

	console.log("[PLAY BEFORE] card=%s washed=%s player=%s position=%d order=%j", playedCard, washedCard, playerID, gameData.currentPosition, gameData.playerOrder);

	if (!gameData.players[playerID].cards.includes(washedCard)) {
		return { success: false, error: "NO_CARD", card: washedCard };
	}

	if (gameData.stackedCards > 0 && !playedCard.includes("draw")) {
		return { success: false, error: "STACK_REQUIRED" };
	}

	var isMatch = await matchCards(playedCard, currentCard);
	if (!isMatch) {
		return { success: false, error: "NO_MATCH", card: washedCard, currentCard: currentCard };
	}

	var beforePos = gameData.currentPosition;
	var beforeOrder = gameData.playerOrder.slice();

	var oldPlayer = gameData.players[playerID];
	var gameSettings = gameData.gameSettings;
	var colorMatch = playedCard.match(/^(red|yellow|green|blue)/);
	var chosenColor = colorMatch ? colorMatch[0] : null;
	var actionType = playedCard.includes("draw4") ? "wilddraw4" : playedCard.includes("draw2") ? "draw2" : playedCard.includes("skip") ? "skip" : playedCard.includes("reverse") ? "reverse" : playedCard.includes("wild") ? "wild" : "number";
	var result = {
		success: true,
		playedCard: playedCard,
		washedCard: washedCard,
		oldPlayerID: playerID,
		oldPlayer: oldPlayer,
		drawnCards: null,
		skipPlayer: false,
		reverseGame: false,
		stackUpdated: false,
		stackDrawn: false,
		stackDrawCount: 0,
		stackNextCanStack: false,
		handledStack: false,
		actionType: actionType,
		chosenColor: chosenColor,
		affectedPlayerID: undefined
	};

	if (gameSettings.StackCards && playedCard.includes("draw")) {
		var nextPosition = updatePosition(gameData.currentPosition, +1, gameData.playerOrder);
		var nextCanStack = gameData.players[gameData.playerOrder[nextPosition]].cards.some(function (c) {
			return (c.includes("draw2") && playedCard.includes("draw2")) || c.includes("draw4");
		});

		var cardNumber = Number(playedCard.match(/\d+/)[0]);
		var drawCount = cardNumber + gameData.stackedCards;
		result.stackDrawCount = drawCount;
		result.stackNextCanStack = nextCanStack;
		console.log("[ACTION CARD] Stack draw by %s drawCount=%d nextCanStack=%s nextPlayer=%s", playerID, drawCount, nextCanStack, gameData.playerOrder[nextPosition]);

		if (nextCanStack) {
			gameData.stackedCards = drawCount;
			result.stackUpdated = true;
			result.affectedPlayerID = gameData.playerOrder[nextPosition];
			console.log("[CARD EFFECT] Stack updated to %d — next player can stack", drawCount);
		} else {
			result.affectedPlayerID = gameData.playerOrder[nextPosition];
			await addCards(drawCount, gameData, nextPosition);
			gameData.stackedCards = 0;
			gameData.currentPosition = nextPosition;
			result.stackDrawn = true;
			result.drawnCards = gameData.players[gameData.playerOrder[nextPosition]].cards.slice(-drawCount);
			console.log("[CARD EFFECT] %s draws %d cards and gets skipped", gameData.playerOrder[nextPosition], drawCount);
		}
		result.handledStack = true;
	}

	if (!result.handledStack) {
		if (playedCard.includes("reverse")) {
			console.log("[ACTION CARD] Reverse by %s players=%d", playerID, gameData.playerOrder.length);
			result.affectedPlayerID = null;
			if (gameData.channelIDs.length > gameData.playerOrder.length) {
				var spectatorChannel = gameData.channelIDs[gameData.channelIDs.length - 1];
				gameData.channelIDs.splice(-1);
				gameData.channelIDs.reverse().push(spectatorChannel);
			} else {
				gameData.channelIDs.reverse();
			}
			gameData.playerOrder.reverse();
			gameData.currentPosition = gameData.playerOrder.indexOf(playerID);
			result.reverseGame = true;
			console.log("[CARD EFFECT] Order reversed, %s now at position %d", playerID, gameData.currentPosition);
			// 2-player reverse acts like skip
			if (gameData.playerOrder.length === 2) {
				await advanceTurn(gameData);
				console.log("[CARD EFFECT] 2-player reverse: extra advanceTurn (acts as skip)");
			}
		}

		if (playedCard.includes("skip")) {
			console.log("[ACTION CARD] Skip by %s", playerID);
			var skippedPos = updatePosition(gameData.currentPosition, +1, gameData.playerOrder);
			result.affectedPlayerID = gameData.playerOrder[skippedPos];
			await advanceTurn(gameData);
			result.skipPlayer = true;
			console.log("[CARD EFFECT] %s skipped, currentPosition now %d", gameData.playerOrder[gameData.currentPosition], gameData.currentPosition);
		}

		if (playedCard.includes("draw2") && !gameSettings.StackCards) {
			console.log("[ACTION CARD] Draw2 by %s", playerID);
			var drawTargetPos = updatePosition(gameData.currentPosition, +1, gameData.playerOrder);
			result.affectedPlayerID = gameData.playerOrder[drawTargetPos];
			await addCards(2, gameData, drawTargetPos);
			gameData.currentPosition = drawTargetPos;
			result.drawnCards = gameData.players[gameData.playerOrder[drawTargetPos]].cards.slice(-2);
			console.log("[CARD EFFECT] %s draws 2 cards and gets skipped", gameData.playerOrder[drawTargetPos]);
		}

		if (playedCard.includes("draw4") && !gameSettings.StackCards) {
			console.log("[ACTION CARD] Wild Draw4 by %s", playerID);
			drawTargetPos = updatePosition(gameData.currentPosition, +1, gameData.playerOrder);
			result.affectedPlayerID = gameData.playerOrder[drawTargetPos];
			await addCards(4, gameData, drawTargetPos);
			gameData.currentPosition = drawTargetPos;
			result.drawnCards = gameData.players[gameData.playerOrder[drawTargetPos]].cards.slice(-4);
			console.log("[CARD EFFECT] %s draws 4 cards and gets skipped", gameData.playerOrder[drawTargetPos]);
		}
	}

	gameData.deck.push(washedCard);
	gameData.currentCard = playedCard;
	var index = gameData.players[playerID].cards.indexOf(washedCard);
	gameData.players[playerID].cards.splice(index, 1);

	var unoResult = await handleUNOCallout(gameData, playerID, gameData.saidUno);
	result.unoResult = unoResult;

	var gameOver = gameData.players[playerID].cards.length === 0;
	result.gameOver = gameOver;

	var updateFields = {
		currentCard: gameData.currentCard,
		stackedCards: gameData.stackedCards,
		players: gameData.players,
		playerOrder: gameData.playerOrder,
		channelIDs: gameData.channelIDs,
		deck: gameData.deck
	};

	if (gameOver) {
		updateFields.status = "postGame";
		gameData.status = "postGame";
	}

	if (config.debugInteractionUI) console.log("[DB SAVE] saving game data for player %s, card %s", playerID, playedCard);
	await gameData.updateOne(updateFields);
	if (config.debugInteractionUI) console.log("[DB SAVE] completed");

	if (!gameOver) {
		var beforeAdvance = gameData.currentPosition;
		await advanceTurn(gameData);
		var afterAdvance = gameData.currentPosition;
		var beforePlayer = gameData.playerOrder[beforeAdvance];
		var afterPlayer = gameData.playerOrder[afterAdvance];
		console.log("[NEXT PLAYER] %s → %s (pos %d → %d) via advanceTurn", beforePlayer, afterPlayer, beforeAdvance, afterAdvance);
		if (result.affectedPlayerID === undefined) result.affectedPlayerID = afterPlayer;
	}

	var nextIdx = updatePosition(gameData.currentPosition, +1, gameData.playerOrder);
	result.nextPlayerID = gameData.playerOrder[gameData.currentPosition];
	console.log("[PLAY AFTER] player=%s card=%s actionType=%s gameOver=%s affectedPlayer=%s currentPos=%d", playerID, playedCard, actionType, gameOver, result.affectedPlayerID, gameData.currentPosition);

	return result;
}

async function getPlayableCards(gameData, playerID) {
	var player = gameData.players[playerID];
	if (!player || !player.cards) return [];

	var currentCard = gameData.currentCard;
	if (!currentCard) return player.cards.map(function (c) { return { card: c, playable: false }; });

	var results = [];
	for (var i = 0; i < player.cards.length; i++) {
		var card = player.cards[i];
		var isPlayable = false;

		if (card.includes("wild")) {
			isPlayable = true;
		} else if (gameData.stackedCards > 0) {
			isPlayable = (card.includes("draw2") && currentCard.includes("draw2")) || card.includes("draw4");
		} else {
			isPlayable = await matchCards(card, currentCard);
		}

		results.push({ card: card, playable: isPlayable });
	}
	return results;
}

async function getAndValidateGame(guildID, playerID) {
	var gameData = await gameModel.findOne({ guildID: guildID });
	if (!gameData) return { gameData: null, error: "NO_GAME" };
	if (playerID && !gameData.playerOrder.includes(playerID)) return { gameData: null, error: "NOT_PLAYER" };
	return { gameData: gameData, error: null };
}

async function completeGameEnd(gameData, guild, client) {
	var winnerID = gameData.playerOrder[0];
	var winner = gameData.players[winnerID];
	var losers = [];

	for (var i = 1; i < gameData.playerOrder.length; i++) {
		var loser = gameData.players[gameData.playerOrder[i]];
		losers.push({
			id: gameData.playerOrder[i],
			username: loser.username,
			discriminator: loser.discriminator
		});
	}

	await gameData.updateOne({ status: "postGame" });

	// Send winner embed to board channel before deleting board
	try {
		var boardChannel = guild.channels.get(gameData.boardChannelID);
		if (boardChannel) {
			var language = guild.language || collections.guildLanguages.get(guild.id) || config.defaultLanguage;
			var Embed = require("../classes/embed");
			var winnerEmbed = new Embed()
				.setTitle(await translate("game.winner.embed.title", language, { displayName: winner.displayName }))
				.setDescription(await translate("game.winner.embed.desc", language))
				.setColor("yellow");
			if (winner.dynamicAvatarURL) {
				winnerEmbed.setThumbnail(winner.dynamicAvatarURL);
			}
			await boardChannel.createMessage({ embeds: [winnerEmbed] });
			if (config.debugInteractionUI) console.log("[WINNER MESSAGE SENT] winner=%s channel=%s", winnerID, gameData.boardChannelID);
		}
	} catch (e) {
		console.log("[WINNER MESSAGE ERROR]", e.message || e);
	}

	// Delete board message
	try {
		if (gameData.boardMessageID && gameData.boardChannelID) {
			var boardChannel = guild.channels.get(gameData.boardChannelID);
			if (boardChannel) {
				var boardMsg = await boardChannel.getMessage(gameData.boardMessageID);
				if (boardMsg) {
					await boardMsg.delete();
					console.log("[BOARD DELETED] id=%s", gameData.boardMessageID);
				}
			}
		}
	} catch (e) {
		console.log("[BOARD DELETE ERROR]", e.message || e);
	}

	// Clear board tracking
	gameData.boardMessageID = "";
	gameData.boardChannelID = "";
	try { await gameData.updateOne({ boardMessageID: "", boardChannelID: "" }); } catch (_) {}

	await updateGuildStats(winnerID, gameData.playerOrder.slice(1), guild);
	await updateUserStats(
		{ id: winnerID, username: winner.username, discriminator: winner.discriminator },
		losers
	);

	setTimeout(async function () {
		await endGame(guild, gameData);
	}, 30000);

	return { winner: winner, winnerID: winnerID };
}

module.exports = {
	washCard: washCard,
	getPlayableCards: getPlayableCards,
	getAndValidateGame: getAndValidateGame,
	processPlay: processPlay,
	processDraw: processDraw,
	advanceTurn: advanceTurn,
	handleUNOCallout: handleUNOCallout,
	completeGameEnd: completeGameEnd
};
