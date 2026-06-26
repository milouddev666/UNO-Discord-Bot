const gameModel = require("../database/models/game");
const config = require("../utils/config");
const {
	ACTION_IDS,
	buildHandCardButtons,
	buildColorPicker,
	updateInteractionBoard
} = require("../helpers/components");
const {
	getPlayableCards,
	getAndValidateGame,
	processPlay,
	processDraw,
	advanceTurn,
	completeGameEnd
} = require("../helpers/gameService");
var { updatePosition, selfPlayCard, addCards, renderHandBuffer, translate } = require("../utils/functions");
const { currentGames } = require("../utils/collections");

var handPageState = new Map();

module.exports = async function (client, ipc, interaction) {
	if (interaction.type !== 3) return;
	if (!config.useInteractionUI) return;

	var guild = client.guilds.get(interaction.guildID);
	if (!guild) return;

	var customID = interaction.data && interaction.data.custom_id;
	if (!customID) return;

	var language = guild.language || collections.guildLanguages.get(interaction.guildID) || config.defaultLanguage;
	var guildID = guild.id;
	var member = interaction.member;
	var userID = member ? member.id : interaction.user.id;

	var gameData;

	console.log("[INTERACTION] customID=%s user=%s", customID, userID);

	async function getGame() {
		var result = await getAndValidateGame(guildID, userID);
		gameData = result.gameData;
		return result;
	}

	async function replyEphemeral(content) {
		try {
			if (interaction.acknowledged) {
				await interaction.createFollowup({ content: content, flags: 64 });
			} else {
				await interaction.createMessage({ content: content, flags: 64 });
			}
		} catch (e) {
			if (e.toString().includes("10062")) {
				try { await interaction.createFollowup({ content: content, flags: 64 }); } catch (_) {}
			}
		}
	}

	async function replyEphemeralWithImage(buffer, filename, extra) {
		var opts = { flags: 64, file: { file: buffer, name: filename } };
		if (extra && extra.components) opts.components = extra.components;
		if (extra && extra.content) opts.content = extra.content;
		if (extra && extra.embeds) opts.embeds = extra.embeds;
		try {
			if (interaction.acknowledged) {
				await interaction.createFollowup(opts);
			} else {
				await interaction.createMessage(opts);
			}
		} catch (e) {
			if (e.toString().includes("10062")) {
				try { await interaction.createFollowup(opts); } catch (_) {}
			}
		}
	}

	// --- UNO button ---
	if (customID === ACTION_IDS.UNO) {
		await interaction.acknowledge();
		if (config.debugInteractionUI) console.log("[UNO PRESSED] by %s", userID);
		var result = await getGame();
		if (!result.gameData) return replyEphemeral(await translate("game.interaction.error.noGame", language));
		if (!gameData.gameSettings.UnoCallout) return replyEphemeral(await translate("game.interaction.uno.disabled", language));

		// Case 1: Current player declaring UNO (defensive)
		if (gameData.playerOrder[gameData.currentPosition] === userID && gameData.players[userID] && gameData.players[userID].cards.length === 2) {
			if (gameData.unoCallout === userID) {
				await gameData.updateOne({ unoCallout: "" });
			}
			await gameData.updateOne({ saidUno: true });
			if (config.debugInteractionUI) console.log("[UNO DECLARED] player=%s", userID);
			await replyEphemeral(await translate("game.interaction.uno.declared", language));
			if (config.debugInteractionUI) console.log("[BOARD UPDATE REQUESTED] after UNO declare by %s", userID);
			await updateInteractionBoard(gameData, language, guild, client);
			if (config.debugInteractionUI) console.log("[UNO END] declared by %s", userID);
			return;
		}

		// Case 2: Calling out a player who missed UNO
		if (gameData.unoCallout === "" || gameData.unoCallout === userID) {
			return replyEphemeral(await translate("game.interaction.uno.noPlayer", language));
		}

		var targetID = gameData.unoCallout;
		await gameData.updateOne({ unoCallout: "" });
		if (config.debugInteractionUI) console.log("[UNO CALLOUT] target=%s by %s", targetID, userID);

		var targetPos = gameData.playerOrder.indexOf(targetID);
		if (targetPos === -1) return replyEphemeral(await translate("game.interaction.uno.targetNotFound", language));
		var drawnCards = await addCards(2, gameData, targetPos);
		await gameData.updateOne({
			[`players.${targetID}.cards`]: gameData.players[targetID].cards,
			unoCallout: ""
		});
		if (config.debugInteractionUI) console.log("[UNO PENALTY] %s draws 2 cards", targetID);

		await replyEphemeral(await translate("game.interaction.uno.calloutPlaced", language, { displayName: gameData.players[targetID] ? gameData.players[targetID].displayName : targetID }));

		if (config.debugInteractionUI) console.log("[BOARD UPDATE REQUESTED] after UNO callout by %s", userID);
		await updateInteractionBoard(gameData, language, guild, client);
		if (config.debugInteractionUI) console.log("[UNO END] callout by %s", userID);
		return;
	}

	// --- My Cards button ---
	if (customID === ACTION_IDS.MY_CARDS) {
		await interaction.acknowledge();
		var gameResult = await getGame();
		if (!gameResult.gameData) return replyEphemeral(await translate("game.interaction.error.noGame", language));
		var player = gameData.players[userID];
		if (!player || !player.cards || player.cards.length === 0) {
			return replyEphemeral(await translate("game.interaction.play.noCards", language));
		}
		if (config.debugInteractionUI) console.log("[HAND IMAGE] MyCards by %s count=%d", userID, player.cards.length);
		try {
			var handBuffer = await renderHandBuffer(player.cards, guildID);
			if (config.debugInteractionUI) console.log("[HAND IMAGE GENERATED] size=%d bytes for %d cards", handBuffer.length, player.cards.length);
			if (handBuffer.length === 0) {
				if (config.debugInteractionUI) console.log("[HAND IMAGE] ERROR: buffer is 0 bytes");
				return replyEphemeral(await translate("game.interaction.mycards.error", language));
			}
			await replyEphemeralWithImage(handBuffer, "hand.png");
			if (config.debugInteractionUI) console.log("[HAND IMAGE SENT] filename=hand.png size=%d", handBuffer.length);
		} catch (e) {
			console.log("[HAND IMAGE] ERROR:", e.stack || e);
			replyEphemeral(await translate("game.interaction.mycards.error", language));
		}
		return;
	}

	// --- Draw button ---
	if (customID === ACTION_IDS.DRAW) {
		await interaction.acknowledge();
		var gameResult = await getGame();
		if (!gameResult.gameData) return replyEphemeral(await translate("game.interaction.error.noGame", language));
		if (gameData.playerOrder[gameData.currentPosition] !== userID) {
			return replyEphemeral(await translate("game.interaction.play.notYourTurn", language));
		}

		var drawAmount = gameData.stackedCards > 0 ? gameData.stackedCards : 1;

		if (gameData.gameSettings.UnoCallout && gameData.unoCallout !== "") {
			await gameData.updateOne({ unoCallout: "" });
		}

		if (config.debugInteractionUI) console.log("[TURN START] player=%s drawAmount=%d", userID, drawAmount);
		var drawnCards = await processDraw(gameData, drawAmount);

		gameData.lastAction = gameData.players[userID].displayName + " drew " + drawAmount + " card(s)";
		gameData.lastActionPlayer = userID;
		gameData.lastActionType = "draw";
		if (config.debugInteractionUI) console.log("[BOARD UPDATE REQUESTED] after draw by %s", userID);
		await updateInteractionBoard(gameData, language, guild, client);
		try {
			if (config.debugInteractionUI) console.log("[HAND IMAGE] Draw by %s count=%d", userID, gameData.players[userID].cards.length);
			var handBuffer = await renderHandBuffer(gameData.players[userID].cards, guildID);
			if (config.debugInteractionUI) console.log("[HAND IMAGE GENERATED] size=%d bytes", handBuffer.length);
			if (handBuffer.length === 0) {
				if (config.debugInteractionUI) console.log("[HAND IMAGE] ERROR: buffer is 0 bytes");
				return replyEphemeral(await translate("game.interaction.draw.updated", language));
			}
			await replyEphemeralWithImage(handBuffer, "hand.png");
			if (config.debugInteractionUI) console.log("[HAND IMAGE SENT] filename=hand.png size=%d", handBuffer.length);
		} catch (e) {
			console.log("[HAND IMAGE] ERROR:", e.stack || e);
			replyEphemeral(await translate("game.interaction.draw.updated", language));
		}

		if (gameData.gameSettings.DrawUntilMatch) {
			if (config.debugInteractionUI) console.log("[TURN END] DrawUntilMatch player=%s", userID);
			await selfPlayCard(guild, gameData, config.prefix, client.user.id);
			await updateInteractionBoard(gameData, language, guild, client);
			return;
		}

		await advanceTurn(gameData);
		if (config.debugInteractionUI) console.log("[BOARD UPDATE REQUESTED] after advanceTurn by %s", userID);
		await updateInteractionBoard(gameData, language, guild, client);
		currentGames.set(guildID, { channelIDs: gameData.channelIDs });
		if (config.debugInteractionUI) console.log("[TURN END] player=%s action=draw", userID);
		return;
	}

	// --- Play Card button ---
	if (customID === ACTION_IDS.PLAY) {
		await interaction.acknowledge();
		var gameResult = await getGame();
		if (!gameResult.gameData) return replyEphemeral(await translate("game.interaction.error.noGame", language));
		if (gameData.playerOrder[gameData.currentPosition] !== userID) {
			return replyEphemeral(await translate("game.interaction.play.notYourTurn", language));
		}

		var playerCards = gameData.players[userID] ? gameData.players[userID].cards : [];
		if (!playerCards || playerCards.length === 0) {
			return replyEphemeral(await translate("game.interaction.play.noCards", language));
		}

		var playableInfo = await getPlayableCards(gameData, userID);
		var playableSet = new Set(playableInfo.filter(function (c) { return c.playable; }).map(function (c) { return c.card; }));

		var hasPlayable = playableSet.size > 0;
		if (!hasPlayable) {
			return replyEphemeral(await translate("game.interaction.play.noPlayableCards", language));
		}

		try {
			if (config.debugInteractionUI) console.log("[HAND IMAGE] Play by %s count=%d playable=%d", userID, playerCards.length, playableSet.size);
			var handBuffer = await renderHandBuffer(playerCards, guildID, playableSet);
			if (config.debugInteractionUI) console.log("[HAND IMAGE GENERATED] size=%d bytes for %d cards", handBuffer.length, playerCards.length);
			if (handBuffer.length === 0) {
				if (config.debugInteractionUI) console.log("[HAND IMAGE] ERROR: buffer is 0 bytes");
				return replyEphemeral(await translate("game.interaction.mycards.error", language));
			}
		} catch (e) {
			console.log("[HAND IMAGE] ERROR:", e.stack || e);
			return replyEphemeral(await translate("game.interaction.mycards.error", language));
		}

		var perPage = 20;
		var totalPages = Math.ceil(playerCards.length / perPage);
		var page = 0;
		handPageState.set(guildID, { userID: userID, page: 0 });

		var buttons = await buildHandCardButtons(playerCards, playableSet, page, totalPages, language);
		await replyEphemeralWithImage(handBuffer, "hand.png", {
			content: await translate("game.interaction.play.selectCard", language),
			components: buttons
		});
		return;
	}

	// --- Hand card selection (uno_hand_<index>) ---
	if (customID.startsWith("uno_hand_")) {
		await interaction.acknowledge();
		var gameResult = await getGame();
		if (!gameResult.gameData) return replyEphemeral(await translate("game.interaction.error.noGame", language));
		if (gameData.playerOrder[gameData.currentPosition] !== userID) {
			return replyEphemeral(await translate("game.interaction.play.notYourTurn", language));
		}

		var cardIndex = parseInt(customID.replace("uno_hand_", ""), 10);
		if (isNaN(cardIndex)) return replyEphemeral(await translate("game.interaction.card.invalid", language));
		var playerCards = gameData.players[userID] ? gameData.players[userID].cards : [];
		if (cardIndex < 0 || cardIndex >= playerCards.length) {
			return replyEphemeral(await translate("game.interaction.card.notFound", language));
		}

		var selectedCard = playerCards[cardIndex];

		// If wild card without color, show color picker
		if ((selectedCard === "wild" || selectedCard === "wilddraw4") && !selectedCard.match(/^(red|green|blue|yellow)/)) {
			await gameData.updateOne({
				pendingWildCard: selectedCard,
				pendingWildPlayer: userID
			});
			try {
				if (interaction.acknowledged) {
					await interaction.createFollowup({
						content: await translate("game.interaction.card.chooseColor", language),
						components: [await buildColorPicker(language)],
						flags: 64
					});
				}
			} catch (e) {}
			return;
		}

		// Process the play
		if (config.debugInteractionUI) console.log("[TURN START] player=%s card=%s", userID, selectedCard);
		var playResult = await processPlay(gameData, userID, selectedCard);
		if (config.debugInteractionUI) console.log("[TURN START] result: actionType=%s success=%s", playResult.actionType, playResult.success);
		if (!playResult.success) {
			if (playResult.error === "NO_CARD") return replyEphemeral(await translate("game.interaction.card.dontHave", language));
			if (playResult.error === "STACK_REQUIRED") return replyEphemeral(await translate("game.interaction.card.mustStack", language));
			if (playResult.error === "NO_MATCH") return replyEphemeral(await translate("game.interaction.card.noMatch", language));
			return replyEphemeral(await translate("game.interaction.card.cannotPlay", language));
		}
		if (config.debugInteractionUI) console.log("[ACTION TYPE] %s by %s", playResult.actionType, userID);

		handPageState.delete(guildID);

		gameData.lastAction = gameData.players[userID].displayName + " played a card";
		await gameData.updateOne({ lastAction: gameData.lastAction });

		if (playResult.gameOver) {
			await replyEphemeral(await translate("game.interaction.card.lastCard", language));
			await completeGameEnd(gameData, guild, client);
			if (config.debugInteractionUI) console.log("[GAME END] winner=%s", userID);
			return;
		}

		currentGames.set(guildID, { channelIDs: gameData.channelIDs });

		if (config.debugInteractionUI) console.log("[BOARD UPDATE REQUESTED] after play by %s", userID);
		await updateInteractionBoard(gameData, language, guild, client);
		var nextDisplayName = gameData.players[gameData.playerOrder[gameData.currentPosition]].displayName;
		await replyEphemeral(await translate("game.interaction.card.played", language, { displayName: nextDisplayName }));

		if (playResult.actionType && playResult.actionType !== "number") {
			var notifParts = [];
			if (playResult.actionType === "skip") notifParts.push(await translate("game.interaction.card.skipped", language));
			if (playResult.actionType === "reverse") notifParts.push(await translate("game.interaction.card.reversed", language));
			if (playResult.actionType === "draw2") notifParts.push(await translate("game.interaction.card.draw2", language));
			if (playResult.actionType === "wilddraw4") notifParts.push(await translate("game.interaction.card.draw4", language));
			if (playResult.actionType === "wild") notifParts.push(await translate("game.interaction.card.colorChanged", language));
			if (notifParts.length) {
				try { if (interaction.acknowledged) await interaction.createFollowup({ content: notifParts.join(" "), flags: 64 }); } catch (_) {}
			}
		}

		if (config.debugInteractionUI) console.log("[TURN END] player=%s action=%s", userID, playResult.actionType);

		await selfPlayCard(guild, gameData, config.prefix, client.user.id);
		return;
	}

	// --- Cancel ---
	if (customID === ACTION_IDS.CANCEL) {
		await interaction.acknowledge();
		handPageState.delete(guildID);
		return;
	}

	// --- Hand page navigation ---
	if (customID.startsWith(ACTION_IDS.HAND_PREV) || customID.startsWith(ACTION_IDS.HAND_NEXT)) {
		await interaction.acknowledge();
		var gameResult = await getGame();
		if (!gameResult.gameData) return replyEphemeral(await translate("game.interaction.error.noGame", language));
		if (gameData.playerOrder[gameData.currentPosition] !== userID) {
			return replyEphemeral(await translate("game.interaction.play.notYourTurn", language));
		}

		var playerCards = gameData.players[userID] ? gameData.players[userID].cards : [];
		if (!playerCards || playerCards.length === 0) return replyEphemeral(await translate("game.interaction.play.noCards", language));

		var playableInfo = await getPlayableCards(gameData, userID);
		var playableSet = new Set(playableInfo.filter(function (c) { return c.playable; }).map(function (c) { return c.card; }));

		var state = handPageState.get(guildID);
		var page = state && state.userID === userID ? state.page : 0;
		var perPage = 20;
		var totalPages = Math.ceil(playerCards.length / perPage);

		if (customID.startsWith(ACTION_IDS.HAND_PREV)) {
			page = Math.max(0, page - 1);
		} else {
			page = Math.min(totalPages - 1, page + 1);
		}
		handPageState.set(guildID, { userID: userID, page: page });

		try {
			if (config.debugInteractionUI) console.log("[HAND IMAGE] Nav by %s page=%d count=%d", userID, page, playerCards.length);
			var handBuffer = await renderHandBuffer(playerCards, guildID, playableSet);
			if (config.debugInteractionUI) console.log("[HAND IMAGE GENERATED] size=%d bytes", handBuffer.length);
			if (handBuffer.length === 0) return replyEphemeral(await translate("game.interaction.mycards.error", language));
		} catch (e) {
			console.log("[HAND IMAGE] ERROR:", e.stack || e);
			return replyEphemeral(await translate("game.interaction.mycards.error", language));
		}

		var buttons = await buildHandCardButtons(playerCards, playableSet, page, totalPages, language);
		try {
			if (interaction.acknowledged) {
				await interaction.createFollowup({
					content: await translate("game.interaction.play.selectCard", language),
					components: buttons,
					file: { file: handBuffer, name: "hand.png" },
					flags: 64
				});
			}
		} catch (e) {}
		return;
	}

	// --- Wild color selection ---
	if (customID === ACTION_IDS.WILD_RED || customID === ACTION_IDS.WILD_YELLOW || customID === ACTION_IDS.WILD_GREEN || customID === ACTION_IDS.WILD_BLUE) {
		await interaction.acknowledge();
		var gameResult = await getGame();
		if (!gameResult.gameData) return replyEphemeral(await translate("game.interaction.error.noGame", language));

		var color = customID === ACTION_IDS.WILD_RED ? "red" : customID === ACTION_IDS.WILD_YELLOW ? "yellow" : customID === ACTION_IDS.WILD_GREEN ? "green" : "blue";
		var pendingPlayer = gameData.pendingWildPlayer || userID;
		var pendingCard = gameData.pendingWildCard;

		if (!pendingCard) return replyEphemeral(await translate("game.interaction.wild.noPending", language));
		if (gameData.playerOrder[gameData.currentPosition] !== pendingPlayer) {
			return replyEphemeral(await translate("game.interaction.play.notYourTurn", language));
		}

		await gameData.updateOne({ pendingWildCard: "", pendingWildPlayer: "" });

		var fullCard = color + pendingCard;
		if (config.debugInteractionUI) console.log("[TURN START] player=%s wildColor=%s card=%s", pendingPlayer, color, fullCard);
		var playResult = await processPlay(gameData, pendingPlayer, fullCard);
		if (!playResult.success) {
			return replyEphemeral(await translate("game.interaction.card.cannotPlay", language));
		}
		if (config.debugInteractionUI) console.log("[TURN START] result: actionType=%s success=%s", playResult.actionType, playResult.success);
		if (config.debugInteractionUI) console.log("[ACTION TYPE] %s by %s", playResult.actionType, pendingPlayer);

		handPageState.delete(guildID);

		if (config.debugInteractionUI) console.log("[BOARD UPDATE REQUESTED] after wild play by %s", pendingPlayer);

		gameData.lastAction = (gameData.players[pendingPlayer] ? gameData.players[pendingPlayer].displayName : "Player") + " played";
		await gameData.updateOne({ lastAction: gameData.lastAction });

		if (playResult.gameOver) {
			await replyEphemeral(await translate("game.interaction.card.lastCard", language));
			await completeGameEnd(gameData, guild, client);
			if (config.debugInteractionUI) console.log("[GAME END] winner=%s", pendingPlayer);
			return;
		}

		currentGames.set(guildID, { channelIDs: gameData.channelIDs });
		await updateInteractionBoard(gameData, language, guild, client);

		if (playResult.actionType && playResult.actionType !== "number") {
			var notifParts = [];
			if (playResult.actionType === "skip") notifParts.push(await translate("game.interaction.card.skipped", language));
			if (playResult.actionType === "reverse") notifParts.push(await translate("game.interaction.card.reversed", language));
			if (playResult.actionType === "draw2") notifParts.push(await translate("game.interaction.card.draw2", language));
			if (playResult.actionType === "wilddraw4") notifParts.push(await translate("game.interaction.card.draw4", language));
			if (playResult.actionType === "wild") notifParts.push(await translate("game.interaction.card.colorChanged", language));
			if (notifParts.length) {
				try { if (interaction.acknowledged) await interaction.createFollowup({ content: notifParts.join(" "), flags: 64 }); } catch (_) {}
			}
		}

		await replyEphemeral(await translate("game.interaction.wild.played", language));
		if (config.debugInteractionUI) console.log("[TURN END] player=%s action=%s", pendingPlayer, playResult.actionType);

		await selfPlayCard(guild, gameData, config.prefix, client.user.id);
		return;
	}

};
