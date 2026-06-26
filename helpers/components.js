var Embed = require("../classes/embed");
var config = require("../utils/config");
var gameModel = require("../database/models/game");
var { updatePosition, translate } = require("../utils/functions");
var collections = require("../utils/collections");
var { renderBoardImage } = require("./boardRenderer");

var CARD_EMOJIS = { red: "🔴", yellow: "🟡", green: "🟢", blue: "🔵" };
var ACTION_IDS = {
	PLAY: "uno_play",
	DRAW: "uno_draw",
	UNO: "uno_uno",
	MY_CARDS: "uno_mycards",
	CARD_SELECT: "uno_cardselect",
	CANCEL: "uno_cancel",
	HAND_PREV: "uno_hand_prev",
	HAND_NEXT: "uno_hand_next",
	WILD_RED: "uno_wild_red",
	WILD_YELLOW: "uno_wild_yellow",
	WILD_GREEN: "uno_wild_green",
	WILD_BLUE: "uno_wild_blue"
};

function formatCardName(card) {
	if (!card) return "?";
	var color = card.match(/(red|yellow|green|blue)/);
	var emoji = color ? CARD_EMOJIS[color[0]] || "" : "";
	var type = card.replace(/(red|green|blue|yellow)/, "");
	var display = type === "wild" ? "Wild" : type === "wilddraw4" ? "+4" : type === "draw2" ? "+2" : type === "reverse" ? "Reverse" : type === "skip" ? "Skip" : type;
	return color ? `${emoji} ${display}` : `🌈 ${display}`;
}

function embedColorForCard(card) {
	if (!card) return "default";
	var m = card.match(/(red|yellow|green|blue)/);
	return m ? m[0] : "default";
}

async function buildInteractionEmbed(gameData, language) {
	var currentCard = gameData.currentCard;
	var currentPlayerID = gameData.playerOrder[gameData.currentPosition];
	var currentPlayer = gameData.players[currentPlayerID];
	var nextPosition = updatePosition(gameData.currentPosition, +1, gameData.playerOrder);
	var nextPlayerID = gameData.playerOrder[nextPosition];
	var nextPlayer = gameData.players[nextPlayerID];

	var cardCount = currentPlayer ? currentPlayer.cards.length : 0;
	var maxVisible = 15;
	var backsStr = "";
	for (var i = 0; i < Math.min(cardCount, maxVisible); i++) {
		backsStr += "🂠 ";
	}
	if (cardCount > maxVisible) {
		backsStr = backsStr.trim() + " … (×" + cardCount + ")";
	}

	var embed = new Embed()
		.setTitle(await translate("game.play.interaction.embed.title", language, { displayName: currentPlayer ? currentPlayer.displayName : "?" }))
		.setDescription(await translate("game.play.interaction.embed.desc", language, { currentCard: formatCardName(currentCard) }))
		.setColor(embedColorForCard(currentCard))
		.setImage("attachment://board.png")
		.addField(await translate("game.play.interaction.embed.field", language, { displayName: currentPlayer ? currentPlayer.displayName : "?" }), backsStr.trim())
		.setFooter(await translate("game.play.interaction.embed.footer", language, { displayName: nextPlayer ? nextPlayer.displayName : "?" }));

	return embed;
}

async function updateInteractionBoard(_gameData, language, guild, client) {
	if (!config.useInteractionUI) return false;
	console.log("[BOARD BEFORE] guild=%s", guild ? guild.id : "?");
	try {
		var gameData = await gameModel.findOne({ guildID: guild.id });
		if (!gameData) {
			console.log("[BOARD EDIT FAILED] no game data");
			return false;
		}

		if (config.debugInteractionUI) console.log("[DB STATE] position=%d order=%j status=%s currentCard=%s players=%j", gameData.currentPosition, gameData.playerOrder, gameData.status, gameData.currentCard, Object.keys(gameData.players || {}).map(function(k) { return k + ":" + (gameData.players[k].cards ? gameData.players[k].cards.length : 0); }));

		var boardChannelID = gameData.boardChannelID;
		var boardMessageID = gameData.boardMessageID;
		var boardMsg = null;

		// Try to fetch the existing board message
		if (boardChannelID && boardMessageID) {
			var boardChannel = guild.channels.get(boardChannelID);
			if (boardChannel) {
				try {
					boardMsg = await boardChannel.getMessage(boardMessageID);
					console.log("[BOARD FOUND] id=%s", boardMessageID);
					console.log("[OLD ATTACHMENTS] count=%d", boardMsg.attachments ? boardMsg.attachments.length : 0);
				} catch (e) {
					console.log("[BOARD EDIT FAILED] message %s not found: %s", boardMessageID, e.message || e);
					boardMsg = null;
				}
			}
		}

		// If no existing board message, create a new one in the same channel
		if (!boardMsg) {
			if (!boardChannelID) {
				console.log("[BOARD EDIT FAILED] no boardChannelID saved");
				return false;
			}
			var newChannel = guild.channels.get(boardChannelID);
			if (!newChannel) {
				console.log("[BOARD EDIT FAILED] channel %s not found", boardChannelID);
				return false;
			}
			var oldMessageID = boardMessageID;
			console.log("[BOARD EDIT FAILED] no message to edit (old id=%s), creating new board in %s", oldMessageID, boardChannelID);

			var cardsCount = gameData.players[gameData.playerOrder[gameData.currentPosition]] ? gameData.players[gameData.playerOrder[gameData.currentPosition]].cards.length : 0;
			var newBuf = await renderBoardImage(gameData.currentCard, cardsCount);
			var newEmbed = await buildInteractionEmbed(gameData, language);
			if (!newBuf) delete newEmbed.image;
			var newRow = await buildActionRow(gameData.playerOrder[gameData.currentPosition], gameData, language);

			var createOpts = { embeds: [newEmbed], components: [newRow] };
			if (newBuf) {
				Object.defineProperty(createOpts, "file", {
					get: function() { return [{ file: newBuf, name: "files[0]" }]; },
					enumerable: false,
					configurable: true
				});
			}

			boardMsg = await newChannel.createMessage(createOpts);
			boardMessageID = boardMsg.id;
			gameData.boardMessageID = boardMsg.id;
			gameData.boardChannelID = boardChannelID;
			try { await gameData.updateOne({ boardMessageID: boardMsg.id, boardChannelID: boardChannelID }); } catch (_) {}
			console.log("[BOARD RECREATED] old id=%s", oldMessageID);
			console.log("[NEW BOARD MESSAGE ID] %s", boardMsg.id);
		}

		// Render composite board image (current card + card backs)
		var currentPlayerID = gameData.playerOrder[gameData.currentPosition];
		var nextPosition = updatePosition(gameData.currentPosition, +1, gameData.playerOrder);
		var nextPlayerID = gameData.playerOrder[nextPosition];
		var cardsCount = gameData.players[currentPlayerID] ? gameData.players[currentPlayerID].cards.length : 0;
		var currentPlayer = gameData.players[currentPlayerID];
		var nextPlayer = gameData.players[nextPlayerID];

		console.log("[BOARD PLAYER] current=%s next=%s cards=%d", currentPlayer ? currentPlayer.displayName : "?", nextPlayer ? nextPlayer.displayName : "?", cardsCount);
		console.log("[BOARD CARD] %s", gameData.currentCard);
		console.log("[BOARD NEXT PLAYER] %s", nextPlayer ? nextPlayer.displayName : "?");

		var boardImageBuf = await renderBoardImage(gameData.currentCard, cardsCount);
		console.log("[BOARD IMAGE GENERATED] size=%d", boardImageBuf ? boardImageBuf.length : 0);

		// Build embed
		var embed = await buildInteractionEmbed(gameData, language);
		if (!boardImageBuf) {
			delete embed.image;
		}

		var row = await buildActionRow(gameData.playerOrder[gameData.currentPosition], gameData, language);

		console.log("[BOARD MESSAGE ID] %s", boardMessageID);

		var editOpts = {
			embeds: [embed],
			components: [row],
			// Tell Discord to keep ONLY the new file attachment (id: 0 = first multipart file)
			attachments: [{ id: 0, filename: "board.png" }]
		};
		if (boardImageBuf) {
			console.log("[EDIT FILE EXISTS] true");
			console.log("[EDIT FILE SIZE] %d bytes", boardImageBuf.length);
			// Pass file as array with field name "files[0]" — Discord PATCH requires files[n] naming
			Object.defineProperty(editOpts, "file", {
				get: function() { return [{ file: boardImageBuf, name: "files[0]" }]; },
				enumerable: false,
				configurable: true
			});
		} else {
			console.log("[EDIT FILE EXISTS] false");
		}

		console.log("[EDIT PAYLOAD] embed=%s buttons=%d file=%s", embed.title, row.components.length, boardImageBuf ? "yes" : "no");
		console.log("[BOARD EDITING] id=%s", boardMessageID);
		await boardMsg.edit(editOpts);
		console.log("[EDIT RESULT] success");
		console.log("[BOARD EDIT SUCCESS] id=%s pos=%d card=%s", boardMessageID, gameData.currentPosition, gameData.currentCard);
		return true;
	} catch (e) {
		console.log("[BOARD EDIT FAILED] " + (e.message || e));
		if (e.message && (e.message.includes("10008") || e.message.includes("50001"))) {
			try {
				if (_gameData && _gameData.updateOne) {
					await _gameData.updateOne({ boardMessageID: "", boardChannelID: "" });
				}
			} catch (_) {}
		}
		return false;
	}
}

async function buildActionRow(currentPlayerID, gameData, language, disabled) {
	var buttons = [];

	var isActive = !disabled && gameData.status === "midGame";

	buttons.push({
		type: 2,
		style: 1,
		label: await translate("game.play.interaction.button.play", language),
		custom_id: ACTION_IDS.PLAY,
		disabled: !isActive
	});

	buttons.push({
		type: 2,
		style: 2,
		label: await translate("game.play.interaction.button.draw", language),
		custom_id: ACTION_IDS.DRAW,
		disabled: !isActive
	});

	var currentPlayerCards = currentPlayerID && gameData.players[currentPlayerID] ? gameData.players[currentPlayerID].cards.length : 0;
	var canDeclareUno = currentPlayerCards === 2;
	var unoDisabled = !isActive || !(canDeclareUno || gameData.unoCallout);
	buttons.push({
		type: 2,
		style: 4,
		label: await translate("game.play.interaction.button.uno", language),
		custom_id: ACTION_IDS.UNO,
		disabled: unoDisabled
	});

	buttons.push({
		type: 2,
		style: 3,
		label: await translate("game.play.interaction.button.mycards", language),
		custom_id: ACTION_IDS.MY_CARDS,
		disabled: !isActive
	});

	return { type: 1, components: buttons };
}

async function buildHandCardButtons(cards, playableSet, page, totalPages, language) {
	var perPage = 20;
	var start = page * perPage;
	var end = Math.min(start + perPage, cards.length);
	var rows = [];
	var currentRow = [];

	for (var i = start; i < end; i++) {
		var idx = i - start;
		var cardIndex = i;
		var isPlayable = playableSet && playableSet.has(cards[i]);

		currentRow.push({
			type: 2,
			style: isPlayable ? 3 : 2,
			label: String(cardIndex + 1),
			custom_id: "uno_hand_" + cardIndex,
			disabled: !isPlayable
		});

		if (currentRow.length === 5) {
			rows.push({ type: 1, components: currentRow });
			currentRow = [];
		}
	}

	var navButtons = [];

	navButtons.push({
		type: 2,
		style: 2,
		label: await translate("game.components.hand.cancel", language),
		custom_id: ACTION_IDS.CANCEL
	});

	if (totalPages > 1) {
		if (page > 0) {
			navButtons.unshift({
				type: 2,
				style: 2,
				label: await translate("game.components.hand.prevPage", language, { page: page }),
				custom_id: ACTION_IDS.HAND_PREV + "_" + page
			});
		}
		if (page < totalPages - 1) {
			navButtons.push({
				type: 2,
				style: 2,
				label: await translate("game.components.hand.nextPage", language, { page: page + 2 }),
				custom_id: ACTION_IDS.HAND_NEXT + "_" + page
			});
		}
	}

	if (currentRow.length > 0) {
		while (currentRow.length < 5 && navButtons.length > 0) {
			currentRow.push(navButtons.shift());
		}
		if (currentRow.length > 0) {
			rows.push({ type: 1, components: currentRow });
		}
	}

	if (navButtons.length > 0) {
		rows.push({ type: 1, components: navButtons });
	}

	return rows;
}

async function buildColorPicker(language) {
	var colors = [
		{ label: await translate("game.components.colorPicker.red", language), custom_id: ACTION_IDS.WILD_RED, style: 4 },
		{ label: await translate("game.components.colorPicker.yellow", language), custom_id: ACTION_IDS.WILD_YELLOW, style: 3 },
		{ label: await translate("game.components.colorPicker.green", language), custom_id: ACTION_IDS.WILD_GREEN, style: 3 },
		{ label: await translate("game.components.colorPicker.blue", language), custom_id: ACTION_IDS.WILD_BLUE, style: 1 }
	];

	return {
		type: 1,
		components: colors.map(function (c) {
			return { type: 2, style: c.style, label: c.label, custom_id: c.custom_id };
		})
	};
}

function buildCardSelectMenu(cards, customId) {
	if (cards.length > 25) {
		cards = cards.slice(0, 25);
	}

	var options = cards.map(function (c) {
		var color = c.match(/(red|yellow|green|blue)/);
		var emoji = color ? { name: color[0] === "red" ? "🔴" : color[0] === "yellow" ? "🟡" : color[0] === "green" ? "🟢" : "🔵" } : { name: "🌈" };
		return {
			label: formatCardName(c),
			value: c,
			emoji: emoji
		};
	});

	return {
		type: 1,
		components: [{
			type: 3,
			custom_id: customId || ACTION_IDS.CARD_SELECT,
			placeholder: "Select a card to play...",
			min_values: 1,
			max_values: 1,
			options: options
		}]
	};
}

function buildWildColorRow(cardName) {
	var suffix = cardName ? "_" + cardName : "";
	var colors = [
		{ label: "Red", custom_id: "uno_wildcolor_red" + suffix, style: 4 },
		{ label: "Yellow", custom_id: "uno_wildcolor_yellow" + suffix, style: 3 },
		{ label: "Green", custom_id: "uno_wildcolor_green" + suffix, style: 3 },
		{ label: "Blue", custom_id: "uno_wildcolor_blue" + suffix, style: 1 }
	];

	return {
		type: 1,
		components: colors.map(function (c) {
			return { type: 2, style: c.style, label: c.label, custom_id: c.custom_id };
		})
	};
}

async function sendTurnNotification(gameData, result, guild, client) {
	try {
		var targetID = result.affectedPlayerID || gameData.playerOrder[gameData.currentPosition];
		var target = gameData.players[targetID];
		var emoji = { red: "🔴", yellow: "🟡", green: "🟢", blue: "🔵" };
		var language = guild.language || collections.guildLanguages.get(guild.id) || config.defaultLanguage;
		var content = "";
		var color = result.chosenColor || "";
		var colorEmoji = emoji[color] || "";
		var colorName = color ? color.charAt(0).toUpperCase() + color.slice(1) : "";
		var drawnCount = result.drawnCards ? result.drawnCards.length : 0;
		var currentCard = gameData.currentCard || "";
		var isStackUpdate = result.stackUpdated;

		if (result.actionType === "wilddraw4") {
			content = await translate("game.notification.wilddraw4.title", language) + "\n\n";
			if (isStackUpdate) {
				content += await translate("game.notification.wilddraw4.stacked", language, { count: result.stackDrawCount }) + "\n\n";
			} else {
				if (colorName) content += await translate("game.notification.wilddraw4.chosenColor", language, { emoji: colorEmoji, name: colorName }) + "\n\n";
				content += await translate("game.notification.wilddraw4.received", language, { count: drawnCount || 4 }) + "\n\n";
				if (colorName) content += await translate("game.notification.wilddraw4.currentColor", language, { emoji: colorEmoji, name: colorName }) + "\n\n";
				content += await translate("game.notification.wilddraw4.yourCards", language, { count: target ? target.cards.length : "?" });
			}
		} else if (result.actionType === "wild") {
			content = await translate("game.notification.wild.title", language) + "\n\n";
			if (colorName) content += await translate("game.notification.wild.chosenColor", language, { emoji: colorEmoji, name: colorName }) + "\n\n";
			if (colorName) content += await translate("game.notification.wild.currentColor", language, { emoji: colorEmoji, name: colorName }) + "\n\n";
			content += await translate("game.notification.wild.yourTurn", language);
		} else if (result.actionType === "draw2") {
			content = await translate("game.notification.draw2.title", language) + "\n\n";
			if (isStackUpdate) {
				content += await translate("game.notification.draw2.stacked", language, { count: result.stackDrawCount }) + "\n\n";
			} else {
				content += await translate("game.notification.draw2.received", language, { count: drawnCount || 2 }) + "\n\n";
				content += await translate("game.notification.draw2.currentCard", language) + "\n\n";
				content += await translate("game.notification.draw2.yourCards", language, { count: target ? target.cards.length : "?" });
			}
		} else if (result.actionType === "skip") {
			content = await translate("game.notification.skip.title", language) + "\n\n";
			content += await translate("game.notification.skip.currentCard", language) + "\n\n";
			if (target) content += await translate("game.notification.skip.next", language, { displayName: target.displayName });
		} else if (result.actionType === "reverse") {
			content = await translate("game.notification.reverse.title", language) + "\n\n";
			content += await translate("game.notification.reverse.direction", language);
		}

		if (!content) return;

		var dmChannel = await client.getDMChannel(targetID);
		await dmChannel.createMessage(content);
		console.log("[NOTIFICATION SENT] type=%s to=%s content=%s", result.actionType, targetID, content.replace(/\n/g, " | "));
		console.log("[NEXT PLAYER NOTIFIED] player=%s action=%s", targetID, result.actionType);
		console.log("[ACTION TYPE] %s", result.actionType);
	} catch (e) {
		if (config.debugInteractionUI) console.log("[NOTIFICATION] ERROR: could not send to %s: %s", targetID, e.message || e);
	}
}

// Legacy board updater — wraps new updater for text command callers
async function updateBoard(gameData, language, msgOrChannel) {
	if (!config.useInteractionUI || !gameData || !gameData.boardMessageID || !gameData.boardChannelID) return;
	var guild = msgOrChannel && msgOrChannel.guild ? msgOrChannel.guild : null;
	if (!guild) return;
	var client = guild.shard && guild.shard.client ? guild.shard.client : null;
	return updateInteractionBoard(gameData, language, guild, client);
}

module.exports = {
	ACTION_IDS: ACTION_IDS,
	CARD_EMOJIS: CARD_EMOJIS,
	formatCardName: formatCardName,
	buildInteractionEmbed: buildInteractionEmbed,
	buildActionRow: buildActionRow,
	buildHandCardButtons: buildHandCardButtons,
	buildColorPicker: buildColorPicker,
	buildCardSelectMenu: buildCardSelectMenu,
	buildWildColorRow: buildWildColorRow,
	updateInteractionBoard: updateInteractionBoard,
	updateBoard: updateBoard
};
