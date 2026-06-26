<div align="center">
  <img src="https://cdn.discordapp.com/attachments/1284117766416371826/1519365691864645632/images.png" alt="UnoBot Logo" width="150">

  # 🃏 UnoBot

**بوت ديسكورد متكامل للعبة أونو (UNO) — العب مع أصدقائك مباشرة في السيرفر!**

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](package.json)
[![Discord](https://img.shields.io/badge/discord-eris.js-5865F2)](https://github.com/abalabahaha/eris)

---

[🇺🇸 English](./README.md) | [🇩🇪 Deutsch](./README.de.md) | [🇪🇸 Español](./README.es.md) | [🇸🇦 العربية](./README.ar.md)

</div>

---

## ✨ المميزات

| الميزة | الوصف |
|--------|-------|
| 🎮 **لعبة أونو كاملة** | جميع بطاقات أونو الأصلية: أرقام، +2، عكس، تخطي، وايلد، +4 |
| 🖱️ **واجهة تفاعلية** | أزرار واختيارات — بدون أوامر نصية، اضغط وشغّل |
| 🌐 **دعم لغات متعدد** | العربية، الإنجليزية، الألمانية، الإسبانية |
| 🖼️ **صور البطاقات** | عرض بطاقاتك كصور مع تلوين البطاقات القابلة للعب |
| 📊 **إحصائيات** | إحصائيات السيرفر والعالمية، لوحات المتصدرين |
| ⚙️ **إعدادات مرنة** | 8 إعدادات للعبة و 12 خياراً شخصياً |
| 🔔 **إشعارات خاصة** | إرسال إشعارات DM عند دورك أو عند لعب بطاقات خاصة |
| 🛡️ **نظام UNO** | نداء UNO للاعبين الذين ينسون قولها |
| 🔄 **تراكم البطاقات** | تكديس +2 و +4 على اللاعب التالي |
| 👁️ **وضع المشاهدة** | إنشاء رتبة للمشاهدين لمتابعة اللعب |
| 🤖 **تشغيل تلقائي** | البوت يلعب نيابة عنك تلقائياً عند تفعيل الخيار |
| 📈 **تصويت Top.gg** | مميزات إضافية للمصوتين (اختياري) |

---

## 📋 الأوامر

### 🎮 أوامر اللعبة

| الأمر | الاختصار | الوصف |
|-------|----------|-------|
| `startgame` | `sg` | بدء لعبة أونو جديدة |
| `joingame` | — | الانضمام إلى لعبة موجودة |
| `leavegame` | — | مغادرة اللعبة |
| `endgame` | — | إنهاء اللعبة |
| `play` | `p` | لعب بطاقة (مثال: `u!play red 5`) |
| `draw` | — | سحب بطاقة |
| `cards` | — | عرض بطاقاتك |
| `uno` | — | قول UNO (للحماية أو النداء) |
| `say` | `s` | إرسال رسالة للاعبين الآخرين |
| `kick` | — | طرد لاعب من اللعبة |
| `alert` | — | تنبيه اللاعب الحالي بدوره |
| `spectate` | — | تفعيل/إلغاء وضع المشاهدة |
| `gamesettings` | `gs` | عرض/تغيير إعدادات اللعبة |
| `stats` | — | إحصائيات السيرفر |
| `globalstats` | `gstats` | إحصائيات عالمية |
| `leaderboard` | — | لوحة متصدرين السيرفر |
| `globalleaderboard` | `gleaderboard` | لوحة متصدرين عالمية |

### ℹ️ أوامر المعلومات

| الأمر | الوصف |
|-------|-------|
| `help` | قائمة المساعدة |
| `commands` | قائمة بجميع الأوامر |
| `guide` | دليل استخدام مفصل |
| `rules` | قوانين لعبة أونو |

### ⚙️ أوامر الإعدادات

| الأمر | الوصف |
|-------|-------|
| `settings` | إعدادات السيرفر (اللغة، البادئة، إعدادات اللعبة...) |
| `options` | الخيارات الشخصية (AutoPlay, DM Cards...) |

### 🔧 أوامر المشرف (لصاحب البوت فقط)

| الأمر | الوصف |
|-------|-------|
| `shards` | عرض إحصائيات الشاردات |

### 📌 أوامر أخرى

| الأمر | الوصف |
|-------|-------|
| `invite` | رابط دعوة البوت |
| `donate` | معلومات التبرع |
| `vote` | رابط التصويت على Top.gg |

---

## ⚙️ إعدادات اللعبة

| الإعداد | النوع | الافتراضي | الشرح |
|---------|-------|-----------|-------|
| `DrawUntilMatch` | ✅/❌ | ❌ | يستمر اللاعب بالسحب حتى يجد بطاقة قابلة للعب |
| `DisableJoin` | ✅/❌ | ❌ | يمنع انضمام لاعبين جدد بعد بدء اللعبة |
| `QuickStart` | ✅/❌ | ❌ | تبدأ اللعبة فوراً بدون انتظار تفاعل |
| `SpectateGame` | ✅/❌ | ❌ | إنشاء رتبة "Uno Spectator" للمشاهدين |
| `StackCards` | ✅/❌ | ❌ | تكديس بطاقات +2 و +4 على اللاعب التالي |
| `StartingCards` | رقم (3-15) | 7 | عدد البطاقات الأولية لكل لاعب |
| `UnoCallout` | ✅/❌ | ❌ | تفعيل نداء UNO على اللاعبين |
| `UseOneChannel` | ✅/❌ | ❌ | استخدام قناة واحدة بدلاً من قنوات خاصة |

---

## 🚀 طريقة التشغيل (للمبرمجين)

### 📋 المتطلبات الأساسية

| المتطلب | الإصدار | الشرح |
|---------|---------|-------|
| [Node.js](https://nodejs.org/) | ≥ 16.0.0 | بيئة تشغيل JavaScript |
| [MongoDB](https://www.mongodb.com/) | ≥ 4.4 | قاعدة البيانات |
| [Git](https://git-scm.com/) | — | تحميل الكود |

### 📥 الخطوة 1: تحميل المشروع

```bash
git clone https://github.com/your-username/unobot.git
cd unobot
```

### 📦 الخطوة 2: تثبيت الحزم

```bash
npm install
```

> ⚠️ إذا واجهت أخطاء في تثبيت `sharp`، ثبّت الأدوات المطلوبة:
> - **Windows**: ثبّت [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
> - **Linux**: `sudo apt install build-essential libvips-dev`

### 🤖 الخطوة 3: إنشاء تطبيق Discord Bot

1. اذهب إلى [Discord Developer Portal](https://discord.com/developers/applications)
2. اضغط **"New Application"** واختر اسماً
3. اذهب إلى **"Bot"** ← **"Add Bot"**
4. تحت **"Token"**، اضغط **"Reset Token"** ← **"Copy"** ← احفظ التوكن في مكان آمن
5. فعّل **"Message Content Intent"** تحت **"Privileged Gateway Intents"**

### 🔌 الخطوة 4: دعوة البوت لسيرفرك

1. في Developer Portal، اذهب إلى **"OAuth2"** ← **"URL Generator"**
2. اختر **"bot"** و **"applications.commands"**
3. **الصلاحيات**: `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `Add Reactions`, `Use External Emojis`
4. انسخ الرابط وافتحه في المتصفح ← اختر سيرفرك

### 🗄️ الخطوة 5: تشغيل MongoDB

**خيار 1 — MongoDB محلي:**
```bash
# Windows - شغّل خدمة MongoDB
net start MongoDB

# Linux (Ubuntu)
sudo systemctl start mongod
```

**خيار 2 — MongoDB Atlas (سحابي):**
- سجّل في [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- أنشئ كلستر مجاني
- اختر رابط الاتصال (Connection String)

### ⚙️ الخطوة 6: إعداد الملفات

```bash
# نسخ ملف الإعدادات
cp utils/configExample.js utils/config.js
```

افتح `utils/config.js` وعدّل القيم التالية:

```javascript
module.exports = {
    // توكن البوت (إلزامي)
    botToken: "هنا-توكن-البوت-الخاص-بك",

    // رابط قاعدة البيانات (إلزامي)
    mongoURI: "mongodb://localhost:27017/unobot",

    // الرابط المحلي
    // mongoURI: "mongodb+srv://username:password@cluster.xxxxx.mongodb.net/unobot", // لـ Atlas

    // إعدادات أساسية
    prefix: "u!",                    // بادئة الأوامر
    defaultLanguage: "ar-SA",        // اللغة الافتراضية
    ownerID: "",                     // آيدي حسابك في ديسكورد
    botAvatarURL: "",                // رابط صورة البوت
    botInviteURL: "",                // رابط دعوة البوت

    // واجهة التفاعل (أزرار)
    useInteractionUI: true,
};
```

### 🏃 الخطوة 7: تشغيل البوت

```bash
npm start
```

✨ **مبروك! البوت شغال الآن!** جرب في سيرفرك: `u!startgame`

---

## 🌐 دعم اللغات

| العلم | الرمز | اللغة | الحالة |
|-------|-------|-------|--------|
| 🇺🇸 | `en-US` | الإنجليزية | ✅ مكتملة |
| 🇩🇪 | `de-DE` | الألمانية | ✅ مكتملة |
| 🇪🇸 | `es-ES` | الإسبانية | ✅ مكتملة |
| 🇸🇦 | `ar-SA` | العربية | ✅ مكتملة |

**تغيير اللغة في السيرفر:**
```
u!settings language العربية
u!settings language English
u!settings language German
u!settings language Spanish
```

**تغيير اللغة الافتراضية في ملف الإعدادات:**
```javascript
// utils/config.js
defaultLanguage: "ar-SA",  // عربي
defaultLanguage: "en-US",  // إنجليزي
```

---

## 🛠️ هيكل المشروع

```
UnoBot/
├── bot.js                    # نقطة بدء البوت (worker)
├── index.js                  # مدير الشاردات (eris-fleet)
├── commands/
│   ├── Game/                 # أوامر اللعبة (17 أمراً)
│   ├── Info/                 # أوامر المعلومات
│   ├── Config/               # إعدادات السيرفر والخيارات
│   ├── Admin/                # أوامر المشرف
│   └── Other/                # أوامر أخرى
├── events/                   # أحداث ديسكورد
├── handlers/                 # تحميل الأوامر والأحداث واللغات
├── helpers/
│   ├── components.js         # مكونات واجهة التفاعل (أزرار، لوحة)
│   ├── gameService.js        # منطق اللعبة الأساسي
│   └── boardRenderer.js      # توليد صور البطاقات
├── database/
│   ├── models/               # نماذج MongoDB
│   └── connect.js            # الاتصال بقاعدة البيانات
├── lang/                     # ملفات الترجمة
│   ├── en-US.json
│   ├── ar-SA.json
│   ├── de-DE.json
│   └── es-ES.json
├── classes/                  # كلاسات مساعدة (Embed, Command)
├── utils/
│   ├── config.js             # إعدادات البوت
│   ├── functions.js          # دوال مساعدة
│   └── collections.js        # المخازن المؤقتة (Maps)
└── test/                     # اختبارات
```

---

## 📜 الترخيص

هذا المشروع مرخص تحت رخصة **MIT**. يمكنك استخدامه وتعديله ونشره بحرية.

المطور: **[Miloud](https://github.com/milouddev666)**  

---

<div align="center">
  <p>إذا أعجبك المشروع، لا تنسَ ⭐ النجم على GitHub!</p>
</div>
