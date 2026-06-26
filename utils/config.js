module.exports = {
	// Rename this file to "config.js"

	// Discord bot token
	botToken: "",
	// Link to bot avatar URL
	botAvatarURL: "https://cdn.discordapp.com/attachments/1284117766416371826/1519365691864645632/images.png?ex=6a3d4b11&is=6a3bf991&hm=e093f70ba96a60a8e5d6360a62a99177354920f5cf2487df66a56aa3da88637b",
	// Link to bot invite URL
	botInviteURL:
		"",
	// Topgg token (optional)
	topggToken: "",
	// Topgg vote URL (optional)
	topggVoteURL: "",
	// Bot owner ID (optional)
	ownerID: "",
	// MongoDB database
	mongoURI: "",
	// The default prefix
	prefix: "u!",
	// Max amount of cards to display on images
	cardsImageMax: 20,
	// Amount of shards to run both with
	shardCount: 1,
	// Use Discord interaction components (buttons/select menus) instead of text commands
	useInteractionUI: true,
	// Debug mode for interaction UI — prints detailed logs for every action
	debugInteractionUI: true,
	// Default language
	defaultLanguage: "ar-SA",
	// Vote restrictions from topgg votes for extra features
	voteRestrictions: true,
	// AutoPost stats to topgg
	topggAutoPostStats: false,
	// Default data for embeds including colors
	embeds: {
		colors: {
			default: 0x5865f2,
			red: 0xff0000,
			blue: 0x05a6f0,
			green: 0x00a651,
			yellow: 0xffde00,
			checkmarkGreen: 0x77b255
		}
	},
	// Default game settings list and data
	gameSettings: {
		DrawUntilMatch: {
			default: false,
			type: Boolean,
			midGameLock: false
		},
		DisableJoin: {
			default: false,
			type: Boolean,
			midGameLock: false
		},
		QuickStart: {
			default: false,
			type: Boolean,
			midGameLock: true
		},
		SpectateGame: {
			default: false,
			type: Boolean,
			midGameLock: true
		},
		StackCards: {
			default: false,
			type: Boolean,
			midGameLock: false
		},
		StartingCards: {
			default: 7,
			type: Number,
			midGameLock: true,
			min: 3,
			max: 15
		},
		UnoCallout: {
			default: false,
			type: Boolean,
			midGameLock: false
		},
		UseOneChannel: {
			default: false,
			type: Boolean,
			midGameLock: true
		}
	},
	// Default options list and data
	options: {
		AllowAlerts: {
			default: true,
			type: Boolean
		},
		AutoAlert: {
			default: false,
			type: Boolean
		},
		AutoSay: {
			default: false,
			type: Boolean
		},
		AutoPlay: {
			default: true,
			type: Boolean
		},
		BlockCardErrors: {
			default: false,
			type: Boolean
		},
		DMCards: {
			default: false,
			type: Boolean
		},
		HideGlobalLeaderboardTag: {
			default: true,
			type: Boolean
		},
		HideGlobalStats: {
			default: false,
			type: Boolean
		},
		HideLeaderboardTag: {
			default: false,
			type: Boolean
		},
		HideStats: {
			default: false,
			type: Boolean
		}
	},
	// Default cards array to start a game with
	cardsArray: [
		"red0",
		"red1",
		"red1",
		"red2",
		"red2",
		"red3",
		"red3",
		"red4",
		"red4",
		"red5",
		"red5",
		"red6",
		"red6",
		"red7",
		"red7",
		"red8",
		"red8",
		"red9",
		"red9",
		"yellow0",
		"yellow1",
		"yellow1",
		"yellow2",
		"yellow2",
		"yellow3",
		"yellow3",
		"yellow4",
		"yellow4",
		"yellow5",
		"yellow5",
		"yellow6",
		"yellow6",
		"yellow7",
		"yellow7",
		"yellow8",
		"yellow8",
		"yellow9",
		"yellow9",
		"blue0",
		"blue1",
		"blue1",
		"blue2",
		"blue2",
		"blue3",
		"blue3",
		"blue4",
		"blue4",
		"blue5",
		"blue5",
		"blue6",
		"blue6",
		"blue7",
		"blue7",
		"blue8",
		"blue8",
		"blue9",
		"blue9",
		"green0",
		"green1",
		"green1",
		"green2",
		"green2",
		"green3",
		"green3",
		"green4",
		"green4",
		"green5",
		"green5",
		"green6",
		"green6",
		"green7",
		"green7",
		"green8",
		"green8",
		"green9",
		"green9",
		"reddraw2",
		"reddraw2",
		"redreverse",
		"redreverse",
		"redskip",
		"redskip",
		"yellowdraw2",
		"yellowdraw2",
		"yellowreverse",
		"yellowreverse",
		"yellowskip",
		"yellowskip",
		"bluedraw2",
		"bluedraw2",
		"bluereverse",
		"bluereverse",
		"blueskip",
		"blueskip",
		"greendraw2",
		"greendraw2",
		"greenreverse",
		"greenreverse",
		"greenskip",
		"greenskip",
		"wild",
		"wild",
		"wild",
		"wild",
		"wilddraw4",
		"wilddraw4",
		"wilddraw4",
		"wilddraw4"
	]
};
