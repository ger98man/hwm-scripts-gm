// ==UserScript==
// @name   battle_damage_tooltip_gm
// @namespace    http://tampermonkey.net/
// @version      3.2.3
// @tag            hwm-gm
// @homepageURL    https://github.com/ger98man/hwm-scripts-gm
// @updateURL      https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/battle_damage_tooltip_gm.user.js
// @downloadURL    https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/battle_damage_tooltip_gm.user.js
// @description  Просмотр урона любого отряда, улучшенный лог боя, фиксы и фичи (перечислены в описаниее)
// @author       Something begins
// @license      MIT
// @match       https://www.heroeswm.ru/war*
// @match       https://my.lordswm.com/war*
// @match       https://www.lordswm.com/war*
// @match       https://mirror.heroeswm.ru/war*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_setValue
// @grant        GM_getValue
// @grant unsafeWindow
// ==/UserScript==

const keyboardKeycodes = {
    "backspace": 8,
    "tab": 9,
    "enter": 13,
    "shift": 16,
    "ctrl": 17,
    "alt": 18,
    "pause": 19,
    "capslock": 20,
    "escape": 27,
    "space": 32,
    "pageup": 33,
    "pagedown": 34,
    "end": 35,
    "home": 36,
    "leftarrow": 37,
    "uparrow": 38,
    "rightarrow": 39,
    "downarrow": 40,
    "insert": 45,
    "delete": 46,
    "0": 48,
    "1": 49,
    "2": 50,
    "3": 51,
    "4": 52,
    "5": 53,
    "6": 54,
    "7": 55,
    "8": 56,
    "9": 57,
    "a": 65,
    "b": 66,
    "c": 67,
    "d": 68,
    "e": 69,
    "f": 70,
    "g": 71,
    "h": 72,
    "i": 73,
    "j": 74,
    "k": 75,
    "l": 76,
    "m": 77,
    "n": 78,
    "o": 79,
    "p": 80,
    "q": 81,
    "r": 82,
    "s": 83,
    "t": 84,
    "u": 85,
    "v": 86,
    "w": 87,
    "x": 88,
    "y": 89,
    "z": 90,
    "leftwindowkey": 91,
    "rightwindowkey": 92,
    "selectkey": 93,
    "numpad0": 96,
    "numpad1": 97,
    "numpad2": 98,
    "numpad3": 99,
    "numpad4": 100,
    "numpad5": 101,
    "numpad6": 102,
    "numpad7": 103,
    "numpad8": 104,
    "numpad9": 105,
    "multiply": 106,
    "add": 107,
    "subtract": 109,
    "decimalpoint": 110,
    "divide": 111,
    "f1": 112,
    "f2": 113,
    "f3": 114,
    "f4": 115,
    "f5": 116,
    "f6": 117,
    "f7": 118,
    "f8": 119,
    "f9": 120,
    "f10": 121,
    "f11": 122,
    "f12": 123,
    "numlock": 144,
    "scrolllock": 145,
    "semicolon": 186,
    "equal": 187,
    "comma": 188,
    "dash": 189,
    "period": 190,
    "forwardslash": 191,
    "graveaccent": 192,
    "openbracket": 219,
    "backslash": 220,
    "closebracket": 221,
    "singlequote": 222
};
function getBindCode(key, fallback) {
    const v = GM_getValue(key);
    const num = parseInt(v);
    return !isNaN(num) ? num : fallback;
}

function setBindCode(key, code) {
    if (code == null) GM_setValue(key, undefined);
    else GM_setValue(key, code);
}

function getBool(key, fallback) {
    const v = GM_getValue(key);
    if (v === undefined) return fallback;
    return v === "true" ? true : false;
}
let kb = {
    triggerKey:    getBindCode("kb_triggerKey", 18), // Alt
    seeDamage:    getBindCode("kb_seeDamage", 69),   // E
    seeMagShot:   getBindCode("kb_seeMagShot", 85),  // U
    autoBattle:   getBindCode("kb_autoBattle", 65),  // A
    toggleSpeed:  getBindCode("kb_toggleSpeed", 83), // S
    autoPlacement:getBindCode("kb_autoPlacement",82),// R
    backToGame:   getBindCode("kb_backToGame", 90),  // Z
    startBattle:  getBindCode("kb_startBattle",66),  // B
    useTrigger:   getBool("kb_useTrigger", true),
    filterLog:    getBindCode("kb_filterLog", 84), // T
};
function isActive(code) {
    return pressedKeys.has(code);
}

const pressedKeys = new Set();
/* ===========================
   i18n (ru/en)
   =========================== */
const I18N = {
    ru: {
        openKeyBinds : "Открыть настройку горячих кнопок",
        advancedTitle: "Расширенные",
        keybindHint: "Нажмите на поле и нажмите клавишу…",
        keybindUnassigned: "Не назначено",
        keybindInvalid: "Эта клавиша не поддерживается",
        keybindUseTriggerLabel: "Использовать кнопку-активатор",
        keybindTriggerLabel: "Кнопка активатор для биндов ниже (удерживать)",
        keybindSeeDamageLabel: "Посмотреть урон",
        keybindSeeMagShotLabel: "Посмотреть траекторию «рельсы»",
        keybindAutoBattleLabel: "Автобой",
        keybindToggleSpeedLabel: "Вкл/выкл свою скорость анимации",
        keybindAutoPlacementLabel: "Авторасстановка",
        keybindBackToGameLabel: "Назад",
        keybindStartBattleLabel: "Начать бой",
        keybindFilterLog: "Отфильтровать лог по существу и открыть",
        // UI
        btnListCollapsed: "Список🔽",
        btnListOpen: "🔄",
        btnChangeSide: "Сменить сторону",
        chosenDistance: "Выбранное расстояние",
        distanceJumpCells: (n) => `Прыжок на <u>${n}</u> клеток`,
        damage: "Урон",
        damageTo: "Урон по",
        gateOwner: "Владелец",
        upravaPlaceholder: "Ник для управы",
        helpDamage: "урон",
        mobileFirstTimeAlert:
        "Кнопка с вопросительным знаком -- активация просмотра урона в скрипте battle_damage_tooltip. " +
        "Чтобы посмотреть урон, нужно, чтобы эта кнопка была активной. " +
        "Тап на атакующее существо (клетка с существом помечается красным цветом), затем тап на атакуемое существо (клетка синим цветом). " +
        "Урон будет в боевом чате",
        // Settings labels/tooltips
        sCoeffLabel: "⚖️коэф. урона",
        sCoeffTip:
        "отношение урон/хп (т.е. у кого больше всех коэф., с того выгоднее начинать. <br>" +
        "Работает в списке уронов если нажать на \"Список\" в чате)",
        sDistanceLabel: "Расстояние между стеками",
        sDistanceTip:
        "Расстояние между атакующим и защищающимся стеками. Выбирать расстояние стрелочками в текстовом поле снизу. <br>" +
        "Влияет на статус урона стрелка (ближний/дальний урон, кривая/прямая стрела), " +
        "разбег и прочие абилки, зависящие от расстояния. <br> " +
        "Если выставить \"Расстояние: 1\", то стрелок будет считаться заблокированным. " +
        "Если выставить расстояние больше 1, то стрелок будет считаться не заблокированным (даже если рядом с ним вражеское существо).",
        sAnimSpeedLabel: "Скорость анимации",
        sAnimSpeedTip:
        "Скорость боевых анимаций. <br> " +
        "Выбирать расстояние стрелочками в текстовом поле снизу или если зажать кнопку Alt и нажимать на стрелки клавиатуры.<br>" +
        "Включить/выключить анимацию [Alt + P (русская З)].<br>" +
        "Анимацию можно как ускорить, так и замедлить.<br>" +
        "Верхний потолок у скорости 20, нижнего нету.<br>" +
        "Негативный показатель означает скорость ниже возможной гвдшной.",
        sMagCalcLabel: "Расчет маг. урона",
        sMagCalcTip: "Расчет магического урона не работает во время расстановки",
        // Combat calc strings
        hellfire: "Адское пламя",
        damageWord: "урона",
        abilityDamage: "Урон абилкой",
        kboDisclaimer: "(в КБО) это заклинание показывает <br> неправильный урон",
        poisonInaccuracy: "Погрешность +-10%",
        targets: "Целей:<br>",
        targetNo: "Цель №<br>",
        defaultCreature: "Высшие вампиры",
        // Spells
        spellNames: {
            meteor: "Метеоритный дождь",
            lighting: "Молния",
            implosion: "Взрыв",
            fireball: "Огненный шар",
            chainlighting: "Цепная молния",
            firewall: "Огненная стена",
            magicarrow: "Магическая стрела",
            stonespikes: "Каменные шипы",
            magicfist: "Магический кулак",
            icebolt: "Ледяная глыба",
            circle_of_winter: "Кольцо холода",
            swarm: "Осиный рой",
            angerofhorde: "Ярость орды",
            poison: "Разложение",
            stormcaller: "Зов бури",
            calllightning: "Зов молний",
            firearrow: "Огненная стрела",
            divinev: "Божественная месть"
        }
    },
    en: {
        openKeyBinds : "Open keybinds settings",
        advancedTitle: "Advanced",
        keybindHint: "Click a field and press a key…",
        keybindUnassigned: "Unassigned",
        keybindInvalid: "This key is not supported",
        keybindUseTriggerLabel: "Use activation key",
        keybindTriggerLabel: "Activation key for the keybinds below (hold)",
        keybindSeeDamageLabel: "Show damage",
        keybindSeeMagShotLabel: "Show piercing shot trajectory",
        keybindAutoBattleLabel: "Auto battle",
        keybindToggleSpeedLabel: "Toggle custom animation speed",
        keybindAutoPlacementLabel: "Auto placement",
        keybindBackToGameLabel: "Back",
        keybindStartBattleLabel: "Start battle",
        keybindFilterLog: "Filter log by one creature and open",
        // UI
        btnListCollapsed: "List🔽",
        btnListOpen: "🔄",
        btnChangeSide: "Switch side",
        chosenDistance: "Selected distance",
        distanceJumpCells: (n) => `Jump by <u>${n}</u> hexes`,
        damage: "Damage of",
        damageTo: "Damage to",
        gateOwner: "Owner",
        upravaPlaceholder: "Filter by nickname",
        helpDamage: "damage",
        mobileFirstTimeAlert:
        "The question-mark button enables damage preview in battle_damage_tooltip. " +
        "To view damage, the button must be active. Tap the attacker (the tile becomes red), then tap the target (the tile becomes blue). " +
        "Damage will be printed in the battle chat.",
        // Settings labels/tooltips
        sCoeffLabel: "⚖️ dmg coeff.",
        sCoeffTip:
        "damage/HP ratio (i.e., whoever has the highest coeff. is the best to focus first). <br>" +
        "Works in the damage list if you press \"List\" in chat.",
        sDistanceLabel: "Distance between stacks",
        sDistanceTip:
        "Distance between attacker and defender stacks. Change it with arrows in the number field below. <br>" +
        "Affects shooter status (melee/ranged damage, curved/straight shot), charge/run-up, and other distance-based abilities. <br>" +
        "If you set \"Distance: 1\", the shooter is considered blocked. " +
        "If you set distance > 1, the shooter is considered unblocked (even if an enemy is adjacent).",
        sAnimSpeedLabel: "Animation speed",
        sAnimSpeedTip:
        "Battle animation speed. <br> " +
        "Adjust with arrows in the field below, or hold Alt and press ArrowUp/ArrowDown.<br>" +
        "Toggle custom speed: [Alt + P].<br>" +
        "You can speed up or slow down animations.<br>" +
        "Max speed is 20, there's no lower limit.<br>" +
        "Negative values mean slower than the default game minimum.",
        sMagCalcLabel: "Magic dmg calc",
        sMagCalcTip: "Magic damage calculation doesn't work during placement",
        // Combat calc strings
        hellfire: "Hellfire",
        damageWord: "damage",
        abilityDamage: "Ability damage",
        kboDisclaimer: "(in KBO) this spell shows <br> incorrect damage",
        poisonInaccuracy: "Inaccuracy ±10%",
        targets: "Targets:<br>",
        targetNo: "Target #<br>",
        defaultCreature: "Vampire Lords",
        // Spells
        spellNames: {
            meteor: "Meteor shower",
            lighting: "Lightning",
            implosion: "Implosion",
            fireball: "Fireball",
            chainlighting: "Chain lightning",
            firewall: "Firewall",
            magicarrow: "Magic arrow",
            stonespikes: "Stone spikes",
            magicfist: "Magic fist",
            icebolt: "Ice bolt",
            circle_of_winter: "Circle of winter",
            swarm: "Wasp swarm",
            angerofhorde: "Anger of the horde",
            poison: "Poison",
            stormcaller: "Storm call",
            calllightning: "Call lightning",
            firearrow: "Fire arrow",
            divinev: "Divine vengeance"
        }
    }
};

// Determine locale: stored override -> browser language -> hostname heuristic
const LOCALE = location.href.includes("www.lordswm.") ? "en" : "ru";

// Simple translator (supports string or function entries)
function t(key, ...args) {
    const pack = I18N[LOCALE] || I18N.en;
    const val = pack[key] ?? I18N.en[key];
    if (typeof val === "function") return val(...args);
    return val ?? key;
}
const savedHPs = JSON.parse(localStorage.getItem("savedHPs")) || {};
const parser = new DOMParser();
const creatureHPs = {
    ...savedHPs,
"brevno": 100, "hellgate": 100, "derevo": 100, "house2": 100, "house1": 100, "house3": 100, "witchhouse": 100, "sbor1": 100, "imp_tent1": 100, "imp_tent2": 100, "imp_tent3": 100, "lamp": 100, "logovo3": 100, "logovo1": 100, "logovo2": 100, "grob1": 100, "grob2": 100, "vdutl": 100, "sknor": 100, "logovo4": 100, "sarkofag": 100, "sklep": 100, "yurt": 100, "elspawn": 100, "fabrik": 100, "gnh2": 100, "gnh1": 100, "gnh3": 100, "magictower": 0, "ballista": 200, "barrier": 50, "archtower": 10, "castertower": 10, "shroom2": 100, "bochka": 50, "bombochka": 50, "bochkae": 50, "bochkaw": 50, "shroom1": 50, "drova1": 50, "drova2": 100, "stswordman": 50, "katapult": 500, "kletka": 10, "kletkabig": 10, "kotel": 20, "guardtower": 10, "firstaid": 100, "telega": 20, "pugalo": 70, "cannon": 100, "setkomet": 80, "stgnoll": 50, "chest": 40, "chestn": 40, "taran": 200, "tykva": 1, "dom1": 20, "dom2": 29, "dom3": 20, "tip1": 20, "tip2": 29, "tip3": 20, "sdom1": 20, "sdom2": 20, "sdom3": 20, "yaschik": 5, "cow2009": 39, "byll2009": 69, "drak2012": 36, "evilsnake": 73, "evilhorse": 84, "gorilla": 66, "mad_rat": 32, "rat2020": 20, "gorynych": 112, "gorynych2024": 124, "kozel": 55, "rooster": 77, "bull2021": 71, "evilcat": 31, "evilbunny": 111, "evildog": 88, "eviltiger2010": 100, "snake2013": 13, "snake2025": 25, "cow2021": 21, "kot2023": 23, "rabbit": 51, "krol2023": 53, "rat2008": 16, "horsy": 14, "mouse2020": 20, "monkey": 6, "sheep": 15, "petuh": 7, "piggy": 19, "pig2019": 19, "pig2007": 24, "dog": 18, "tigor2010": 21, "tiger2022": 22, "bpirate": 16, "zealot": 80, "hellhound6": 22, "hellcharger": 50, "zhryak": 99, "hellhound": 15, "reanimatorup": 27, "succubus6": 20, "troglodyteup": 6, "cerber": 28, "iceelb": 90, "wanizame": 31, "sharkguard": 25, "diamondgolem": 60, "yetiup": 290, "alchemist": 60, "angel": 180, "marksman": 10, "cman": 22, "marks": 28, "archangel": 220, "archdemon": 211, "archdevil": 199, "archlich": 55, "archmage": 30, "assassin": 14, "assida": 30, "ghostdragon": 150, "yaga": 43, "banshee": 110, "behemoth": 210, "poukai": 120, "demented": 28, "wbear": 55, "whitetiger": 35, "berserker": 25, "maiden": 16, "imp": 4, "beholder": 22, "blud": 7, "wisp": 10, "elfik": 37, "bober": 5000, "battlegriffin": 35, "silverunicorn": 77, "mcentaur": 10, "battlemage": 29, "mamont": 140, "slon": 100, "ill": 2, "grib": 20, "mechspiderup": 14, "mechspider": 12, "poacher": 16, "buffalo": 120, "shootpirate": 15, "valkyrie": 61, "vampire": 30, "vampirelord6": 95, "yascher": 44, "warmong": 20, "basilisk": 35, "deadmage": 27, "priestessup": 35, "cursed": 20, "giant": 100, "giantarch": 100, "upleviathan": 250, "wendigo": 25, "druideld": 38, "vestal": 25, "wraith": 100, "wyvern": 90, "necra": 40, "djinn_vizier": 50, "pitlord6": 280, "matriarch": 90, "water": 43, "chieftain": 48, "air": 30, "anubisup": 200, "battlerager": 30, "mercfootman": 24, "panther6": 90, "jaguar6": 85, "shieldguard": 12, "armorgnom": 55, "faeriedragon": 500, "vorovka": 30, "thiefmage": 30, "thiefwarrior": 45, "thiefarcher": 40, "sunrider": 90, "seraph2": 220, "vampirelord": 35, "masterlich": 55, "highwayman": 24, "harpy": 15, "harpyhag": 15, "harpooner": 10, "praetorian": 32, "krab": 50, "bigspider": 55, "snegovik": 100, "lizard": 25, "hydra": 80, "darkeye": 26, "upseamonster": 105, "rotzombie": 23, "gnoll": 6, "gnollboss": 36, "gnollsh": 6, "gnompirate": 100, "goblin": 3, "goblinarcher": 3, "goblinmag": 3, "goblinhunter6": 26, "trapper": 7, "goblinshaman": 5, "gogachi": 13, "dgolem": 350, "brute": 8, "mountaingr": 12, "gremlin": 5, "saboteurgremlin": 6, "gekkonup": 21, "fungus": 29, "griffon": 30, "griffin": 75, "igriffin": 85, "mauler6": 30, "thunderlord": 120, "axegnom": 10, "nomadup": 33, "deserter": 25, "succubusmis": 30, "pitfiend6": 270, "smalllizard": 13, "djinn": 40, "djinn_sultan": 45, "gnollumup": 8, "savageent": 175, "robber": 5, "eadaughter": 35, "sdaughter": 35, "gnollka": 6, "mikrodragon": 30, "drak2024": 24, "ancientbehemoth": 250, "basiliskup": 40, "wendigoup": 35, "ancientpig": 15, "amummy": 80, "ancienent": 181, "sprite": 6, "lumberman": 4, "mechdron": 7, "druid": 34, "minidragon": 60, "ghostshaman": 200, "poltergeist": 20, "forestspirit": 50, "mizukami": 76, "ocean": 30, "springspirit": 70, "brigandup": 6, "devil": 166, "vermin": 6, "deertaur": 50, "unicorn": 57, "monk": 20, "iron_golem": 18, "pearlp": 22, "horse": 70, "krokodilmag": 60, "runekeeper": 65, "runepriest": 60, "priestmoon": 50, "priestess": 35, "gnomka": 40, "priestsun": 55, "vsad_unit": 200, "varan": 60, "charmer": 9, "bokopor": 40, "zasad": 70, "vindicator": 23, "defender": 7, "greendragon": 200, "earth": 75, "evileye": 22, "evilcat2023": 23, "evilbunny2023": 123, "eviltiger2022": 122, "golddragon": 169, "zombie": 17, "lacerator": 85, "traitor": 9, "alchemistup": 68, "emeralddragon": 200, "impergriffin": 35, "inquisitor": 80, "deserterup": 30, "seducer": 26, "efreeti": 90, "efreetisultan": 100, "yeti": 280, "boar": 17, "icegiant": 100, "stoneman": 100, "stone_gargoyle": 15, "kammon": 28, "kamnegryz": 55, "kamneed": 45, "kappa": 21, "vedma": 40, "gop": 20, "fcentaur": 6, "mcentaur6": 80, "kirin": 255, "caty": 21, "klop": 12, "zerg": 40, "vampireprince": 40, "kobra": 40, "outlaw": 6, "colossus": 175, "hellkon": 66, "pikeman": 15, "coralp": 18, "rustdragon": 750, "piratkaup": 12, "apirate": 13, "brawler": 20, "skeleton6": 18, "skgiant": 72, "bonehydra": 60, "bonedragon": 150, "skeletons6": 23, "dleviathan": 145, "skgiantarch": 67, "bonelizard": 30, "nomad": 30, "ncentaur": 9, "nightmare": 66, "reddragon": 235, "crusader": 30, "suncrusader": 95, "peasant": 4, "peasantw": 3, "crystaldragon": 200, "redlizard": 35, "bloodeyecyc": 235, "vampire6": 80, "crusher6": 36, "serpentfly": 20, "darkelf": 41, "rakshasa_kshatra": 135, "kensei": 90, "kenshi": 80, "stonemanup": 110, "lavadragon": 275, "azuredragon": 1000, "scout": 10, "banditka": 8, "squire": 26, "leviathan": 200, "dleviathanup": 175, "iceelup": 45, "chuvakup": 33, "yukionna": 72, "icedemonup": 55, "iceddragon": 220, "icequeenup": 39, "iceel": 45, "leprekon": 7, "arcaneelf": 12, "bobbit": 6, "shaman": 110, "fairy": 70, "lilim": 24, "lich": 50, "lich6": 65, "dreamreaver6": 100, "stalker": 15, "blazingglory": 70, "archer": 7, "mage": 18, "exile": 28, "magicel": 80, "magmadragon": 280, "magneticgolem": 28, "megogachi": 13, "shamanka": 41, "raremamont": 110, "manticore": 80, "scream": 33, "maroder": 7, "smaster": 84, "skirmesher": 12, "masterhunter": 14, "mbreeder": 75, "pteroup": 27, "negro": 17, "bloodsister": 24, "bear": 22, "medusa": 25, "medusaup": 30, "gnollum": 6, "spearwielder": 10, "throwgnom": 24, "mechanic": 30, "minotaur": 31, "taskmaster": 40, "minotaurguard": 35, "cbal": 65, "dgolemup": 400, "necrodog": 8, "zpirateup": 170, "kappashoya": 25, "shellmonster": 90, "gnomon": 9, "priest": 54, "frankenstein": 530, "iceddragonup": 250, "ppirate": 25, "piratemonster": 190, "seamonster": 90, "mummy": 50, "pharaoh": 70, "ant": 27, "mushroom": 90, "enforcer": 7, "naga": 110, "warden": 39, "varg": 44, "dromad": 40, "wolfrider": 10, "hyenarider": 14, "boarrider": 14, "bearrider": 25, "darkrider": 40, "ambal": 100, "dromadup": 45, "wolfraider": 12, "celestial": 300, "ravenousghoul": 32, "harpy6": 29, "goblin6": 23, "centaur6": 70, "cyclop6": 330, "reptiloid": 80, "reptiloidup": 90, "dryad": 6, "pushkarup": 76, "obsgargoyle": 20, "yascherup": 49, "hotdog": 15, "hornedoverseer": 13, "firedragon": 230, "firebird": 65, "fire": 43, "ogre": 50, "ogrebrutal": 70, "ogremagi": 65, "ogreshaman": 55, "demoniac": 5, "fatpirateup": 120, "ppirateup": 30, "conscript": 6, "ravager": 100, "orc": 12, "orcchief": 18, "orcrubak": 20, "orcshaman": 13, "ork": 24, "officer": 70, "witchhunter": 38, "paladin": 100, "executioner": 40, "mechtankup": 140, "mechtank": 120, "spider": 9, "pegasus": 30, "footman": 16, "pitlord": 120, "deephydra": 125, "pitfiend": 110, "pity": 140, "mechguard": 50, "mechguardup": 55, "piratka": 10, "piratemonsterup": 200, "zpirate": 150, "piroman": 20, "krabup": 60, "charmerup": 10, "gribok": 16, "hungerplant": 70, "snowwolfup": 53, "snowarcher": 18, "snowarcherup": 22, "snowowlup": 81, "maniac": 23, "breeder": 70, "sister": 19, "deadptic": 82, "spearthrower": 19, "ghost": 8, "ghost6": 21, "spectre": 19, "gpiratkaup": 9, "gpiratka": 8, "spectre6": 27, "spectraldragon": 160, "rakshasa_rani": 120, "briskrider": 50, "cursedbehemoth": 250, "predator": 35, "blackptic": 70, "cursedent": 215, "fatespinner": 280, "ptero": 20, "thunderbird": 65, "darkbird": 60, "vulture": 40, "duneraider": 12, "duneraiderup": 12, "rakshasa_raja": 140, "juggernaut": 90, "ecyclop6": 360, "shell": 6, "tombraiderup": 12, "tombraider": 10, "reanimator": 27, "barb": 45, "gladiator": 25, "horneddemon": 13, "rapukk": 99, "rocbird": 55, "brigand": 5, "gladiatorup": 27, "piratess": 33, "cavalier": 90, "deadknight": 100, "blackknight": 90, "tormentor": 80, "satyr": 36, "pristineunicorn": 80, "dbehemoth": 280, "untamedcyc": 225, "sacredkirin": 265, "scarabup": 6, "whitebearrider": 30, "adeptus": 46, "seraph": 325, "spegasus": 30, "sekhmet": 50, "kachok": 50, "gnumka": 70, "siren": 20, "upsiren": 24, "fury6": 33, "radiantglory": 65, "scarab": 6, "skeleton": 4, "skmarksman": 6, "sceletonwar": 5, "skeletonpirateup": 4, "skeletonarcher": 4, "cpirate": 4, "skeletonpirate": 4, "nomadbow": 31, "manticoreup": 80, "scorp": 4, "elephant": 200, "anubis": 160, "krokodil": 70, "smert": 70, "flake": 10, "chuvak": 27, "snowwolf": 50, "snowmaiden": 65, "icedemon": 50, "icequeen": 29, "snowmonster": 350, "snowowl": 76, "dreamwalker6": 85, "robberup": 6, "boletus": 17, "steelgolem": 24, "mechgolem": 180, "runepatriarch": 70, "mastergremlin": 6, "jdemon": 13, "ddhigh": 34, "mauler": 12, "warrior": 12, "swolf": 25, "goblinus": 3, "cyclopus": 220, "elgargoly": 16, "sentinel": 23, "krokodilup": 80, "gatekeeper": 120, "dragonfly": 20, "crossman": 8, "mercarcher": 8, "succubus": 20, "shadow_witch": 80, "shadowdragon": 200, "necrodogup": 9, "blackarcher": 13, "sphinx": 300, "wdancer": 14, "dancer": 12, "wardancer": 12, "thane": 100, "darkon": 70, "shad": 9, "grinchshad": 1000, "titan": 190, "stormtitan": 190, "necromancer": 33, "fatpirate": 100, "troglodyte": 5, "troll": 150, "drakonid": 160, "tikovka": 310, "pumkinhead": 111, "tengu": 45, "deadfootman": 30, "foulwyvern": 105, "grimrider": 50, "foulhydra": 125, "burbuly": 30, "blackmage": 20, "slayer": 34, "verblud": 35, "udav": 816, "wight": 95, "ghoul": 25, "drowned": 16, "pushkar": 64, "fahila": 100, "pixel": 5, "phoenix": 777, "shootpirateup": 18, "freddy": 44, "fury": 16, "djinna": 48, "plant": 60, "hobbit": 4, "hobgoblin": 4, "strashidlo": 7, "blackbearrider": 30, "mistress": 100, "vedmaup": 46, "cerberus": 15, "cyclop": 85, "cyclopod": 100, "cyclopking": 95, "shamancyclop": 105, "mercwizard": 36, "outlawup": 8, "champion": 100, "blackwidow": 14, "scorpup": 5, "blacktroll": 180, "familiar": 6, "plaguezombie": 17, "blackdragon": 240, "deadarcher": 16, "blackfootman": 25, "shakal": 24, "shakalup": 30, "shamaness": 30, "sheriff": 38, "banditkaup": 9, "wfassault": 100, "metal": 55, "battlegriffon": 52, "slonup": 110, "krevetko": 66, "acrossbowman": 24, "elf": 10, "elfhealer": 7, "treant": 175, "spiderpois": 11, "gekkon": 11, "tenguup": 60, "flamelord": 120, "gnollup": 9
}
function handleKeyDown(event) {
    pressedKeys.add(event.keyCode);
}

function handleKeyUp(event) {
    pressedKeys.delete(event.keyCode);
}

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

// Странные способы в некоторых местах обусловлены конфликтом со скриптом battleHelper от omne
let outer_chat = document.getElementById("chat_format");
const physCalcColor = "#141736";
let lastTurnDefended;
const magCalcColor = "#150f1c";
unsafeWindow.lastTurnDefended = lastTurnDefended;
const calcHellFireColor = "rgba(255,0,0,0.1)";
const inputHTML = `<input type="text" id="uprava_filter_input" placeholder="${t('upravaPlaceholder')}">`;
const infoImgHTML = `<img style='height: 1.3em; width: auto; vertical-align: middle; margin-left: 1em' src="https://dcdn2.heroeswm.ru/i/combat/btn_info.png?v=6">`;
document.body.insertAdjacentHTML("afterbegin", `
    <style>
        .open-keybinds{
            margin: 0.5em;
            cursor: pointer;
            text-decoration: underline;
        }
        .custom-popup {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-family: Arial, sans-serif;
            font-size: 24px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            display: none;
            z-index: 1000;
        }
    .follow-cre-filtered-button{
        cursor: pointer;
        margin: 0 2em;
        opacity: 0.4;
    }
    #individual_cre_heading span, .physcalc {
        background-color: ${physCalcColor};
    }
#topInput {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  width: 11em;
  padding: 0.5em 1em;

  border: 1px solid rgba(0,0,0,0.6);
  border-radius: 12px;
  outline: none;

  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  box-shadow: 0 10px 18px -8px green;
}

#topInput::placeholder {
  color: rgba(0, 0, 0, 0.7);
}

    </style>
    <div class="custom-popup" id="customPopup">
        <span class="popup-icon">⚠️</span>
        <i id="popupMessage"></i>
    </div>`);
outer_chat.insertAdjacentHTML("beforeend", `
<div id="cre_distance_div" style="display: none"></div>
<div id="individual_calc"></div>
<div id="mag_calc"></div>
<div id="dmg_list_container"></div>
<button id="dmg_list_refresh" style="background-color: #3d3d29; opacity: 0.7; color: white; padding: 5px 10px; border: none; border-radius: 4px;  cursor: pointer">${t('btnListCollapsed')}</button>
<select style="display : none; background-color: #333; color: white; margin: 10px" id="choose_cre"></select>
<button id="change_side" style="background-color: #6b6b47; color: white; padding: 5px 10px; border: none; border-radius: 4px;  cursor: pointer; display: none">${t('btnChangeSide')}</button>
<button id="collapse" style="background-color: #000000; color: white; padding: 5px 10px; border: none; border-radius: 4px;  cursor: pointer; display: none; margin:10px">❌</button> `)

let last_individual_calc = {}
let isOpen = false
let ini_weight = 10;
let chosen = { side: 1, creature: t("defaultCreature"), afterSideSwitchCre: { "-1": "", "1": "" } }
let chat = document.getElementById("chat_inside");
let select = document.getElementById("choose_cre")
let refresh_button = document.getElementById("dmg_list_refresh")
let side_button = document.getElementById("change_side")
let collapse_button = document.getElementById("collapse")
let individual_calc = document.querySelector("#individual_calc")
let cre_distance_div = document.querySelector("#cre_distance_div")
const settings_panel = document.querySelector("#webgl_settings_whole")
let dmg_list_container = document.querySelector("#dmg_list_container")
cre_distance_div.innerHTML = `<span>${t('chosenDistance')}: ${GM_getValue('cre_distance')}</span><br>`;

// ========= utils ============
function showPopup(message) {
    const popup = document.getElementById('customPopup');
    popup.querySelector("i").textContent = message;
    popup.style.display = 'block';
    setTimeout(() => {
        popup.style.display = 'none';
    }, 2000);
}
unsafeWindow.showPopup = showPopup;
function patchFunction(parent, originalFuncName, searchText, replacementText) {
    const originalFunc = parent[originalFuncName];
    let funcString = originalFunc.toString();
    let patchedString = funcString.replace(searchText, replacementText);
    const args = patchedString.slice(patchedString.indexOf('(') + 1, patchedString.indexOf(')'));
    const body = patchedString.slice(patchedString.indexOf('{') + 1, patchedString.lastIndexOf('}'));
    parent[originalFuncName] = new Function(args, body);
}
function get_GM_value_if_exists(GM_key, default_value) {
    const GM_value = GM_getValue(GM_key)
    return GM_value != undefined ? GM_value : default_value;
}

function triggerMouseUpEvent(element) {
    let clickEvent = document.createEvent('MouseEvents');
    clickEvent.initEvent("mouseup", true, true);
    element.dispatchEvent(clickEvent);
}

function getCurrentBattleSpeed() {
    for (let i = 1; i <= 3; i++) {
        let div = document.querySelector(`#speed${i}_button`)
        if (div.style.display === 'none') continue
        if (i === 1) return 2
        else if (i === 3) return 1
        else return 4
    }
}

function setBattleSpeed(value) {
    if (value === 0) return value
    else if (value < 1) {
        timer_interval = Math.abs(value) * 20;
        return value
    }
    animspeed_def = animspeed = value
    animspeed_init = animspeed > 4 ? 0.5 : 2;
    timer_interval = Math.abs(value - 20);
    !timer_interval && timer_interval++;
    return value
}

function countOccurrences(arr, element) {
    return arr.reduce((acc, curr) => (curr === element ? acc + 1 : acc), 0);
}

function insertInput() {
    const parent = document.querySelector("#bcontrol_users");
    if (parent.querySelector("#uprava_filter_input")) return;
    parent.insertAdjacentHTML("afterbegin", inputHTML);
}


function upravaEvent(event) {
    const parent = document.querySelector("#bcontrol_users");
    for (const child of parent.children) {
        if (child.tagName === "INPUT") continue;
        if (event.target.value === "") {
            child.classList.remove("hidden");
            continue;
        }
        const relevant = child.querySelector("span").textContent.toLowerCase().includes(event.target.value.toLowerCase());
        if (relevant) {
            child.classList.remove("hidden");
        } else {
            child.classList.add("hidden");
        }
    }
}
const damageMultipliers = {
    "doublestrike": 1.8, // двойной удар
    "cleave": 1.75, // колун
    "triplestrike": 2.5, // тройной удар
    "doubleshoot": 2, // двойной выстрел
    "assault": 1.3 // штурм
}

function evalStrength(attacker, defender) {
    const cre_collection = stage.pole.obj;
    let dmg = get_dmg_info(attacker.obj_index, defender.obj_index)
    let practical_overall_hp;
    if (cre_collection[defender.obj_index].attack > attacker.defence) {
        practical_overall_hp = attacker.maxhealth * attacker.nownumber / (1 + 0.05 * Math.abs(cre_collection[defender.obj_index].attack - attacker.defence))
    } else {
        practical_overall_hp = attacker.maxhealth * attacker.nownumber * (1 + 0.05 * Math.abs(cre_collection[defender.obj_index].attack - attacker.defence))
    }
    let multiplier = 1;
    for (const abil in damageMultipliers) {
        if (attacker.data_string.includes(abil)) multiplier *= damageMultipliers[abil];
    }
    let avgDmg = ((dmg.max + dmg.min) / 2) * multiplier * (attacker.maxinit * attacker.initmodifier / 10);

    let koef = avgDmg / ((attacker.nownumber - 1) * attacker.maxhealth + attacker.nowhealth);
    if (attacker.hero || defender.hero) koef = 0;
    return { avgDmg: avgDmg, koef: koef, practical_overall_hp: practical_overall_hp };
}
// инфа о гейтах на карте
function initGates() {
    const match = document.body.innerHTML.match(/umka\|(.+?)\|/);
    if (!match) return;
    const umka = match[1];
    const factions = [];
    for (let i = 1; i < umka.length; i += 14) {
        factions.push(umka[i]);
    }
    const demonsNo = countOccurrences(factions, "7");
    if (demonsNo < 1) return;
    document.head.insertAdjacentHTML("beforeEnd", `
    <style>
        #floatingBox {
            position: absolute;
            background-color: rgba(255, 255, 255, 0.5);
            color: white;
            padding: 10px;
            border-radius: 8px;
            pointer-events: none;
            white-space: normal;
            word-wrap: break-word;
            display: none;
        }
        .line {
            font-family: Arial, sans-serif;
            font-size: 16px;
            margin: 5px 0;
        }
    </style>
    `);
    document.body.insertAdjacentHTML("beforeEnd", `
    <div id="floatingBox">
        <div class="line" id = "gate_name">Гейт [#] </div>
        ${demonsNo > 1 ? `<div class="line" id = "gate_owner"> ${t("gateOwner")}</div>` : ''}
    </div>
    `);
    const floatingBox = document.getElementById('floatingBox');

    function showGates(event = null) {
        const [gate_x, gate_y] = [xr_last, yr_last];
        if (gate_x > defxn || gate_y > defyn || gate_x < 0 || gate_y < 0 || (event && event.target.tagName !== "CANVAS")) {
            floatingBox.style.display = "none";
            return;
        }
        let foundGate = false;
        let curGate;
        for (const cre of Object.values(stage.pole.obj)) {
            if (cre.nownumber !== -1) continue;
            if (cre.x !== gate_x || cre.y !== gate_y) continue;
            foundGate = true;
            curGate = cre;
            break;
        }
        if (!foundGate) {
            floatingBox.style.display = "none";
            return;
        };
        floatingBox.style.display = "block";
        const mouseX = event.pageX || event.touches[0].pageX;
        const mouseY = event.pageY || event.touches[0].pageY;
        floatingBox.style.left = mouseX + 10 + 'px';
        floatingBox.style.top = mouseY + 10 + 'px';
        document.querySelector("#gate_name").innerHTML = `${curGate.nametxt} [${curGate.maxnumber}]`;
        document.querySelector("#floatingBox").style.color = curGate.get_color();

        if (demonsNo < 2) return;
        const owner = stage.pole.obj[heroes[curGate.owner]]
        document.querySelector("#gate_owner").innerHTML = `${owner.nametxt} [${owner.maxhealth}]`
    }
    document.addEventListener("mousemove", showGates);
    document.addEventListener("touchstart", event => {
        showGates(event);
    });
}

function calcKilled(dmg, defender) {
    let killed;
    if (dmg % defender.maxhealth > defender.nowhealth) killed = Math.floor(dmg / defender.maxhealth) + 1
    else killed = Math.floor(dmg / defender.maxhealth);
    return killed
}

function calcHellFireHTML(attacker, defender, cre_collection, physDamage) {
    if (!battle_is_it_perk(attacker.obj_index, 7) || attacker.hero === 1) {
        return "";
    }
    const dmg = calcHellFire(attacker, defender, cre_collection);
    const minDamage = dmg + physDamage.min;
    const maxDamage = dmg + physDamage.max;
    const minKilled = calcKilled(minDamage, defender);
    const maxKilled = calcKilled(dmg + physDamage.max, defender);
    return `<p id="${0}" style=" background-color: ${calcHellFireColor}">
    <span style="color:white; font-size: 90%">${t('hellfire')}: </span> <span style = "color:red">${dmg}</span> <span style = "font-size: 80%">${t('damageWord')}</span><br>
    <b style="color:#ffffff; font-size: 120%; text-decoration: underline;">${icons.dead.html} ${minKilled}-${maxKilled}</b><span style="color:#ffffff">${icons.damage.html}${minDamage}-${maxDamage}
  </p><br>`;
}

function calcStormHTML(attacker, defender) {
    let koef;
    if (attacker.stormstrike) koef = 0.5;
    else if (attacker.flamestrike) koef = 1.2;
    else return "";
    let xr = defender.x;
    let yr = defender.y;
    let i = attacker.obj_index;
    let dmgMap;
    Totalmagicdamage = 0;
    Totalmagickills = 0;
    var ok = false;
    var xx = 0,
        yy = 0,
        xp = 0,
        yp = 0;
    mul = 1;
    var len = stage.pole.obj_array.length;
    for (var k1 = 0; k1 < len; k1++) {
        var j = stage.pole.obj_array[k1];
        stage.pole.obj[j]['attacked'] = 1;
        stage.pole.obj[j]['attacked2'] = 1;
    }
    var herd = 0;
    var hera = 0;
    for (var k1 = 0; k1 < len; k1++) {
        k = stage.pole.obj_array[k1];
        if ((stage.pole.obj[k].hero) && (stage.pole.obj[k].owner == stage.pole.obj[mapobj[xr + yr * defxn]].owner)) herd = k;
        if ((stage.pole.obj[k].hero) && (stage.pole.obj[k].owner == stage.pole.obj[i].owner)) hera = k;
    }
    let b = 0;
    if ((magic[hera]) && (magic[hera]['mle'])) {
        b = magic[hera]['mle']['effect'];
        magic[hera]['mle']['effect'] = 0;
    }
    if (magic[herd]) {
        let rangedDef;
        if (magic[herd]['msk']) rangedDef = magic[herd]['msk']['effect'];
        else rangedDef = 0;
        if (magic[herd]['mld']) {
            let b = magic[herd]['mld']['effect'];
            magic[herd]['mld']['effect'] = rangedDef;
            dmgMap = get_dmg_info(attacker.obj_index, defender.obj_index, koef);
            magic[herd]['mld']['effect'] = b;
        } else {
            magic[herd]['mld'] = [];
            magic[herd]['mld']['effect'] = rangedDef;
            dmgMap = get_dmg_info(attacker.obj_index, defender.obj_index, koef);
            delete magic[herd]['mld'];
        }
    } else {
        dmgMap = get_dmg_info(attacker.obj_index, defender.obj_index, koef);
    }
    if (b != 0) {
        magic[hera]['mle']['effect'] = b;
    }
    return `<p id="${0}" style=" background-color: ${calcHellFireColor}">
    <span style="color:white; font-size: 90%">${t('abilityDamage')}: </span><br>
    ${icons.dead.html} <b style="color:#ffffff; font-size: 120%; text-decoration: underline;"> ${dmgMap.min_killed}-${dmgMap.max_killed}</b><span style="color:#ffffff">${icons.damage.html}${dmgMap.min}-${dmgMap.max}
  </p><br>`;
}

function calcMagicHTML(attacker, defender, cre_collection, dmg, inList = false) {
    // if (!mag_damage_on) return "";
    let calcHTML = "";
    const disclaimerHTML = `<span class="tooltip"> ⚠️ <span class="tooltiptext chat_tooltip" style = " transform: translateX(-30%);"> ${t("kboDisclaimer")} </span>
    </span>`;

    const incorrectSpellIDs = ["circle_of_winter", "swarm", "stormcaller"];
    // если темная сила, то дописать урон с усилком
    const isPowered = attacker.hero && battle_is_it_perk(attacker.obj_index, 6) ? true : false;
    for (let spellID of Object.keys(damageSpells)) {
        let additionalInfoHTML = "";
        if (attacker[spellID]) {
            if (spellID === "calllightning") spellID = "lighting";
            const dmg = stage.pole.calcmagic_script(attacker.x, attacker.y, defender.x, defender.y, spellID);
            if (spellID === "meteor") {
                let meteorText = t("targets");
                for (let i = 1; i <= 4; i++) {
                    let dmg2 = Math.floor(dmg * Math.pow(0.85, i));
                    let killed2 = calcKilled(dmg2, defender);
                    const poweredDamage = Math.round(dmg2 * 1.5);
                    const poweredKilled = calcKilled(poweredDamage, defender);
                    const poweredDamageText = isPowered ? `<span style = "font-style:italic; font-size:80%"><br>\t[1.5x] ${icons.dead.html}${poweredKilled}  ${icons.damage.html}${poweredDamage}<br></span>` : "";
                    meteorText += `[${i+1}]: ${icons.dead.html}${killed2} ${icons.damage.html}${dmg2} ${poweredDamageText}<br>`;
                }
                additionalInfoHTML = `<span class="tooltip"> ${infoImgHTML} <span class="tooltiptext chat_tooltip" style = " transform: ${isPowered? "translateY(30%);" : "translateX(-60%);"}">${meteorText}</span>
                </span>`;
            }
            if (spellID === "chainlighting") {
                let chainText = t("targetNo");
                const penaltyArr = Array(0.5, 0.25, 0.125);
                for (let i = 0; i < 3; i++) {
                    let dmg2 = stage.pole.calcmagic_script(attacker.x, attacker.y, defender.x, defender.y, spellID, penaltyArr[i]);
                    let killed2 = calcKilled(dmg2, defender);
                    const poweredDamage = Math.round(dmg2 * 1.5);
                    const poweredKilled = calcKilled(poweredDamage, defender);
                    const poweredDamageText = isPowered ? `<span style = "font-style:italic; font-size:80%"><br>\t[1.5x] ${icons.dead.html} ${poweredKilled} ${icons.damage.html}${poweredDamage}<br></span>` : "";
                    chainText += `${i+2} : ${icons.dead.html}${killed2}  ${icons.damage.html}${dmg2} ${poweredDamageText}<br>`;
                }
                additionalInfoHTML = `<span class="tooltip"> ${infoImgHTML} <span class="tooltiptext chat_tooltip" style = " transform: ${isPowered? "translateY(30%);" : "translateX(-60%);"};">${chainText}</span>
                </span>`;
            }
            if (spellID === "poison") {
                additionalInfoHTML = `<span class="tooltip"> ⚠️ <span class="tooltiptext chat_tooltip" style = " transform: ${isPowered? "translateY(30%);" : "translateX(-60%);"};">${t("poisonInaccuracy")}</span>
                </span>`;
            }
            let killed = calcKilled(dmg, defender);
            const poweredDamage = Math.round(dmg * 1.5);
            const poweredKilled = calcKilled(poweredDamage, defender);
            const poweredDamageText = isPowered ? `<span style = "font-style:italic; font-size:80%"><br>\t[1.5x] ${icons.dead.html}${poweredKilled}  ${icons.damage.html}${poweredDamage}<br></span>` : "";
            calcHTML += `<p id="${0}" style=" background-color: ${magCalcColor}">
            <span style="color:white; font-size: 90%">${damageSpells[spellID]}: </span><br>${icons.dead.html}
            <b style="color:#ffffff; font-size: 120%; text-decoration: underline;">${killed}</b>  <span style="color:#ffffff">${icons.damage.html}${dmg} ${poweredDamageText}</span> ${incorrectSpellIDs.includes(spellID) ? disclaimerHTML : additionalInfoHTML}
          </p>`;
        }
    }
    calcHTML += "<br>";
    return calcHTML;
}
function creHTML(cre) {
    if (!cre) return;
    return `<font class="log_cre_name ${creClassName(cre.get_color())}" id="cre${cre.obj_index}" color="${cre.get_color()}"><span class="cre_info">🔍 </span>${cre.nametxt}</font><span class="cre_quantity">${cre.hero ? `[${cre.maxhealth}]` : `[${cre.nownumber}]`}</span>`;
}
function calcPhysHTML(attacker, defender, dmg, distance_str) {
    return ` <div  id="individual_cre_heading">
    ${distance_str}
  ${t("damage")} <br>
    <span>${creHTML(attacker)}</span> ${LOCALE === "en" ? "to" : "по"} <br> <span>${creHTML(defender)}</span>: <br>
    <br>
</div>
<p class = "physcalc">
  ${icons.dead.html}<b style="color:#ffffff; font-size: 120%; text-decoration: underline;">${dmg.min_killed}-${dmg.max_killed}</b> <span style="color:#ffffff">${icons.damage.html}${dmg.min}-${dmg.max}</span>
</p>
<br>`;
}

function individual_calc_innerHTML(atk_obj_index, def_obj_index) {
    if (atk_obj_index === undefined || def_obj_index === undefined) return "";
    let cre_collection = stage.pole.obj;
    let attacker = cre_collection[atk_obj_index];
    let defender = cre_collection[def_obj_index];
    let dmg = get_dmg_info(atk_obj_index, def_obj_index);
    let distance_str = dmg.distance === "" ? "" : `<p>${t("distanceJumpCells", dmg.distance)}</p>`;
    last_individual_calc.atk_obj_index = atk_obj_index;
    last_individual_calc.def_obj_index = def_obj_index;
    let calcHTML = calcPhysHTML(attacker, defender, dmg, distance_str) + calcHellFireHTML(attacker, defender, cre_collection, dmg) + calcStormHTML(attacker, defender) + calcMagicHTML(attacker, defender, cre_collection, dmg);

    return calcHTML;
}

function paint_coords(x, y, color, timeout = 2077) {
    let tile = shado[x + y * defxn]
    if (tile == undefined) return
    tile.fill(color)
    set_visible(tile, 1)

    setTimeout(() => {
        tile.fill(null)
        set_visible(tile, 0)
    }, timeout)
}


function GM_toggle_boolean(GM_key, boolean) {
    boolean = !boolean
    GM_setValue(GM_key, boolean);
    return boolean
}
let send_get = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.overrideMimeType('text/plain; charset=windows-1251');
    xhr.send(null);
    if (xhr.status == 200) return xhr.responseText;
    return null;
};
function set_Display(element_arr, displayProperty) {
    element_arr.forEach(element => {
        if (element == null) return
        element.style.display = displayProperty
    })
}

function readjust_elements() {
    chat = document.getElementById("chat_inside");
    select = document.getElementById("choose_cre")
    refresh_button = document.getElementById("dmg_list_refresh")
    side_button = document.getElementById("change_side")
    collapse_button = document.getElementById("collapse")
    dmg_list_container = document.querySelector("#dmg_list_container")
    individual_calc = document.querySelector("#individual_calc")
    cre_distance_div = document.querySelector("#cre_distance_div")
}
// -----------------------------------
// =========   Настройки ============

let cre_distance = get_GM_value_if_exists('cre_distance', "")
let cre_distance_on = get_GM_value_if_exists('cre_distance_on', false)
let coeff_on = get_GM_value_if_exists('coeff_on', true)
let animation_speed_on = get_GM_value_if_exists("animation_speed_on", false);
let mag_damage_on = get_GM_value_if_exists("mag_damage_on", true);

const new_settings = `
<style>
  .tooltip {
    position: relative;
    display: inline-block;
    text-size: 120%;
    color: brown;
  }

.tooltip .tooltiptext {
    visibility: hidden;
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 5px;
    background-color: #555;
    color: #fff;
    border-radius: 6px;
    word-wrap: break-word;      /* wrap long words */
    white-space: normal;        /* allow multiple lines */
    z-index: 1000;              /* above panel content */
}
    .chat_tooltip{
        min-width: 500%;
    max-width: 700%;
    }
.settings_tooltip{
        min-width: 1500%;
    max-width: 3000%;
}
.tooltip:hover .tooltiptext,
.tooltip:active .tooltiptext {
    visibility: visible;
}

</style>
<div class="info_row">
  <label class="checkbox_container">${t("sDistanceLabel")} <span class="tooltip">🔍<span class="tooltiptext settings_tooltip" "style = "transform: translateX(-30%);">${t("sDistanceTip")}</span>
    </span>
    <input type="checkbox" checked="true" id="cre_distance_on">
    <span class="checkbox_checkmark"></span>
  </label>
  <ass style="display: inline-flex; align-items: center; gap: 2px;">
  <button type="button" id="cre_distance_minus" style="padding: 0 4px;">−</button>
  <input type="number" id="cre_distance" style="width: 40px; text-align: center;" value="${cre_distance}">
  <button type="button" id="cre_distance_plus" style="padding: 0 4px;">+</button>
</ass>
</div>
<div class="info_row">
    <label class="checkbox_container">${t("sAnimSpeedLabel")} <span class="tooltip">🔍<span class="tooltiptext settings_tooltip" style = " transform: translateX(-30%);"> ${t("sAnimSpeedTip")}</span>
      </span>
      <input type="checkbox" checked="true" id="animation_speed_on">
      <span class="checkbox_checkmark"></span>
    </label>
  <input type="range" id="anim_speed" min="1" max="20" step="1" value="4" style="width:150px;">
  <span id="anim_speed_val">4</span>
</div>
<div class="info_row">
  <span class="open-keybinds">🎮 ${t("openKeyBinds")}</span>
</div>
`
settings_panel.insertAdjacentHTML("beforeend", new_settings);


// logging the log gin login
const fiveSecWarning = false;
const includeTribalSpirit = false;
const includeEnrage = false;
const includeBloodLust = false;
const includeStatusIcons = false;
const highlightTileColor = "red";
/* -------------------------
   Locale + I18N
--------------------------*/

// Auto-detect (your original comment restored + hardened)
const locale =
      location.href.includes("www.lordswm.com")
? "en"
: "ru";
const I18N2 = {
    ru: {
        ui: {
            searchPlaceholder: "Поиск...",
            damageLabel: "повреждений",
            killedLabel: "Погибло",
            filterLabel: "Отфильтровать лог по",
            filterLabelCre: "(I) Отфильтровать лог по этому существу",
            alt: {
                castSpell: "наложил заклятие",
                wait: "ожидание",
                defend: "оборона",
                luck: "посетила удача",
                unluck: "посетила неудача",
                morale: "рвутся в бой",
                crit: "критический удар",
            },
        },
        kw: {
            // hit parsing
            hitVerb: "нанес",
            damageWordInLog: "повреждений",
            killedWordInLog: "Погибло",
            massCast : "массово ",
            // spell parsing
            castVerb: "наложил",
            spellWord: "заклятие",
            destroyedDefense: "разрушил защиту",
        },
        rx: {
            // status lines
            wait: "ожида",
            defend: "оборона",
            morale: "рвутся в бой",
            luck: "посетила удача",
            unluck: "посетила неудача",
            dismorale: "ожидают в страхе",
            crit: "критический удар по заклятому",

            // hit
            damageNum: /нанес.*?(\d+)/i,

            // spell
            spellName: /наложил.*? заклятие (.*?) на/i,
            spellDuration: /на <b>(\d+)<\/b> ход/i,

            // misc (miss)
            activeMisc: [" не попали в "],

            // cleanup exclusions
            bloodRage: (ln) =>
            (!includeTribalSpirit && includesOutsideFont(ln, "Гнева крови"))  ||
            (!includeTribalSpirit && includesOutsideFont(ln, "Ярост") && includesOutsideFont(ln, "крови")) ||
            (!includeEnrage && includesOutsideFont(ln, "впали в ярость")) ||
            (!includeBloodLust && includesOutsideFont(ln, "жаждут ещё")),
        },
        isHitLine: (ln) => includesOutsideFont(ln, "нанес") && includesOutsideFont(ln, "повреждений"),
        isSpellLine: (ln) => includesOutsideFont(ln, "наложил") || includesOutsideFont(ln, "разрушил защиту") || includesOutsideFont(ln, "разрушили защиту"),
    },

    en: {
        ui: {
            searchPlaceholder : "Search...",
            damageLabel: "damage",
            killedLabel: "perish",
            filterLabel: "Filter log by",
            filterLabelCre: "(I) Filter log by this creature",
            alt: {
                castSpell: "cast",
                wait: "wait",
                defend: "defend",
                luck: "luck",
                unluck: "bad luck",
                morale: "bursting for more action",
                crit: "critical damage to favoured enemy",
            },
        },
        kw: {
            // hit parsing (best-effort for LordsWM EN log)
            hitVerb: "deal",
            damageWordInLog: "damage",
            killedWordInLog: "perish",
            massCast: "mass ",
            // spell parsing (best-effort)
            castVerb: "cast",
            spellWord: "spell",
            destroyedDefense: "destroyed defense",
        },
        rx: {
            // status lines (best-effort; adjust to your exact EN phrasing if needed)
            wait: "wait",
            defend: "defend",
            morale: "bursting for more action",
            luck: "Luck befalls",
            unluck: "Bad luck befalls",
            dismorale: "freeze in fear",
            crit: "critical damage to favoured enemy",

            // hit
            // examples: "dealt 123 damage", "dealt 123 damage to ..."
            damageNum: /deal.*?(\d+)/,

            // spell
            // example: "X cast spell <name> on Y"
            spellName: /\bcast(?:s)?\b\s+(.+?)\s+\bon\b/i,
            // example: "for <b>N</b> turns"
            spellDuration: /\bfor\s+<b>(\d+)<\/b>\s+turn/i,

            // misc (miss)
            activeMisc: [" missed ", " did not hit ", " didn't hit "],

            bloodRage: (ln) =>
            (!includeTribalSpirit && includesOutsideFont(ln, "Tribal spirit"))  ||
            (!includeEnrage && includesOutsideFont(ln, "get enraged")) ||
            (!includeEnrage && includesOutsideFont(ln, "feel bloodlusty")),
        },
        isHitLine: (ln) => includesOutsideFont(ln, "deal") && includesOutsideFont(ln, "damage"),
        isSpellLine: (ln) =>
        includesOutsideFont(ln, " cast") || includesOutsideFont(ln, "destroyed defense"),
    },
};

const L = I18N2[locale] || I18N2.ru;

/* -------------------------
   State + Icons
--------------------------*/

let lastObject, color;
unsafeWindow.lastObject = lastObject;

let damage_notIcon = localStorage.getItem("damage_notIcon") === "true";
let dead_notIcon = localStorage.getItem("dead_notIcon") === "true";

const icons = {
    damage: {
        html: `<span class="damage-icon ${damage_notIcon ? "not-icon" : ""}"><span> ${L.ui.damageLabel} </span><img></span>`,
        isIcon: damage_notIcon,
    },
    dead: {
        html: `<span class="dead-icon ${dead_notIcon ? "not-icon" : ""}"><span> ${L.ui.killedLabel} </span><img></span>`,
        isIcon: dead_notIcon,
    },
};


const hitIconHTML = `<img class="icon-m downshifted" src="https://daily.heroeswm.ru/mt/img/1.png">`;
const waitIconHTML = `<img alt="${L.ui.alt.wait}" style="opacity:0.4" class="downshifted icon-l" src="https://dcdn.heroeswm.ru/i/combat/icons/attr_initiative.png?v=6">`;
const defendButtonHtml = `<img alt="${L.ui.alt.defend}" style="opacity:0.4" class="icon-l downshifted" src="https://dcdn.heroeswm.ru/i/combat/icons/attr_defense.png?v=6">`;
const luckButtonHTML = `<img alt="${L.ui.alt.luck}" class="icon-xl downshifted2" style="opacity:0.6" src="https://dcdn.heroeswm.ru/i/help/lm0001.png">`;
const unLuckButtonHTML = `<img alt="${L.ui.alt.unluck}" style="opacity:0.6" class="icon-bordered icon-xl downshifted2" src="https://dcdn.heroeswm.ru/i/help/lm0002.png">`;
const moraleButtonHTML = `<img alt="${L.ui.alt.morale}" class="icon-xl downshifted" style="opacity:0.5" src="https://dcdn.heroeswm.ru/i/combat/icons/attr_morale.png?v=6">`;
const critButtonHTML = `<img alt="${L.ui.alt.crit}" style="opacity:0.5" class="icon-l downshifted" src="https://daily-help.ru/img/other/favenemy/lava.png">`;
const dismoraleButtonHTML = `<img class="icon-xl downshifted" style="opacity:0.6" src="https://dcdn.heroeswm.ru/i/help/lm0004.png">`;

/* -------------------------
   CSS + shadow style
--------------------------*/

document.body.insertAdjacentHTML(
    "afterBegin",
    `<style>
    .log_cre_name { cursor:pointer; transition:text-shadow 0.2s ease, transform 0.2s ease; }
    .line-hidden { display:none; }

    .damage-icon > span, .dead-icon > span { display:none; }
    .damage-icon.not-icon > span, .dead-icon.not-icon > span { display:inline; }
    .damage-icon.not-icon > img, .dead-icon.not-icon > img { display:none; }

    .cre_info { opacity:0.4; display:none; font-size:0.8em; padding: 0 0 0 0.4em }
    .log_cre_name:hover { text-shadow:0 0.3em 0.6em rgba(0,0,0,0.8); transform: translateY(-3px); }
    .cre_quantity { display:none; }
    .log_cre_name:hover> .cre_info:not(#win_ShortLog .cre_info, .area_chat .cre_info) { display:inline; }
    .log_cre_name:hover + .cre_quantity { display:inline; }
    .follow-cre-filtered-button{
        margin: 0 2em;
        cursor:pointer;
    }
    .cre_info:hover{
      filter:
        drop-shadow(1px 0 0 rgba(255,0,0,0.8))
        drop-shadow(-1px 0 0 rgba(255,0,0,0.8))
        drop-shadow(0 1px 0 rgba(255,0,0,0.8))
        drop-shadow(0 -1px 0 rgba(255,0,0,0.8));
    }

    .downshifted { position:relative; top:0.2em }
    .downshifted2 { position:relative; top:0.4em }

    .icon-bordered{
      filter:
        drop-shadow(1px 0 0 rgba(0,0,0,0.2))
        drop-shadow(-1px 0 0 rgba(0,0,0,0.2))
        drop-shadow(0 1px 0 rgba(0,0,0,0.2))
        drop-shadow(0 -1px 0 rgba(0,0,0,0.2));
    }
    .icon-sat{
      filter: saturate(5)
        drop-shadow(1px 0 0 rgba(0,0,0,0.2))
        drop-shadow(-1px 0 0 rgba(0,0,0,0.2))
        drop-shadow(0 1px 0 rgba(0,0,0,0.2))
        drop-shadow(0 -1px 0 rgba(0,0,0,0.2));
    }
    // .area_chat .cre-light{
    //     background: linear-gradient(
    //     to bottom,
    //     #434343ff 0%,
    //     #151515ff 35%,
    //     #000000ff 50%,
    //     #1c1c1cff 65%,
    //     #404040ff 100%
    //     );
    // }
    // .area_chat .cre-dark {
    //     background: linear-gradient(
    //     to bottom,
    //     #2b2b2bff 0%,
    //     #9a9999ff 45%,
    //     #bfbfbfff 55%,
    //     #a8a6a6ff 65%,
    //     #1a1a1aff 100%
    //     );
    // }
    .area_chat .log_cre_name {
        color:white;
        // font-size: 1.2em;
        // letter-spacing: 0.03em;
        // padding : 0.2em;
        // border-radius: 0.5em;
    }
    .area_chat .dead-icon > img{
    filter:
        drop-shadow(1px 0 0 rgba(255,255,255,1))
        drop-shadow(-1px 0 0 rgba(255,255,255,1))
        drop-shadow(0 1px 0 rgba(255,255,255,1))
        drop-shadow(0 -1px 0 rgba(255,255,255,1));
    }
    .area_chat .dead-icon, .damage-icon{
        margin : 0 0.2em;
    }
    .area_chat .cre_quantity{display:inline}
    .area_chat .not-icon > span {
        color:white;
    }
    .icon-s { height:0.8em; width:auto; font-size:0.8em; }
    .icon-m { height:1em; width:auto; }
    .icon-l { height:1.2em; width:auto; }
    .icon-xl{ height:1.4em; width:auto; }
    .log-line {
    background-color: rgba(255, 255, 255, 0.3);
    }

    .log-line.line-dark {
        background-color: rgba(128, 128, 128, 0.1);
    }

    .log-line.line-hidden {
        display: none;
    }
#win_FullLog.fullLog_container {
  background-size: 100% auto, 100% auto, 100% auto !important;
  background-position: top center, bottom center, top center !important;
}

#win_FullLog_area {
  width: 93% !important;
  margin: 0 auto !important;
  box-sizing: border-box !important;
}

#win_FullLog_txt {
  width: 100% !important;
  margin: 0 !important;
  max-width: none !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
}

/* helps prevent tiny overflow that can trigger parent scrollbars */
#win_FullLog_txt > ul {
  margin: 0 !important;
}
</style>`
);

const shadowStyle = document.createElement("style");
shadowStyle.id = "shadowStyle";
document.body.append(shadowStyle);

/* -------------------------
   Sprite icons (skull/explosion)
--------------------------*/

async function getIcon(name) {
    const SPRITE_URL = "https://dcdn.heroeswm.ru/i/png40/war_images.png?v=7";

    let sprite = document.querySelector(`img[data-war-sprite="1"]`);
    if (!sprite) {
        sprite = new Image();
        sprite.crossOrigin = "anonymous";
        sprite.src = SPRITE_URL;
        sprite.dataset.warSprite = "1";
    }

    if (!sprite.complete || sprite.naturalWidth === 0) {
        if (sprite.decode) {
            await sprite.decode();
        } else {
            await new Promise((res, rej) => {
                sprite.onload = () => res();
                sprite.onerror = () => rej(new Error("Failed to load sprite image"));
            });
        }
    }
    const SKULL = { x: 388, y: 184, w: 26, h: 33 };
    const EXPLOSION = { x: 384, y: 230, w: 34, h: 33 };
    const coordData = name === "skull" ? SKULL : EXPLOSION;

    const canvas = document.createElement("canvas");
    canvas.width = coordData.w;
    canvas.height = coordData.h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(
        sprite,
        coordData.x, coordData.y, coordData.w, coordData.h,
        0, 0, coordData.w, coordData.h
    );

    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/png");

    if (name === "skull") {
        img.title = L.ui.killedLabel;
        img.className = "icon-m downshifted";
        img.style.opacity = "0.8";
    } else {
        img.title = L.ui.damageLabel;
        img.className = "icon-m";
        img.style.position = "relative";
        img.style.top = "0.1em";
    }

    return img;
}

unsafeWindow.replaceOutsideFont =  function replaceOutsideFont(html, needle, replacement) {
    if (needle === "") return html; // avoid infinite loops / weirdness

    // Matches <font ...> ... </font> blocks (non-greedy across newlines)
    const fontBlockRe = /<font\b[^>]*>[\s\S]*?<\/font>/gi;

    let out = "";
    let lastIndex = 0;

    // Helper: replace all occurrences of a literal substring (not regex)
    const replaceAllLiteral = (str, find, rep) => str.split(find).join(rep);

    for (const match of html.matchAll(fontBlockRe)) {
        const start = match.index;
        const end = start + match[0].length;

        // Part before this <font> block: replace in it
        out += replaceAllLiteral(html.slice(lastIndex, start), needle, replacement);

        // The <font> block itself: keep untouched
        out += match[0];

        lastIndex = end;
    }

    // Tail after last <font> block
    out += replaceAllLiteral(html.slice(lastIndex), needle, replacement);

    return out;
}

unsafeWindow.includesOutsideFont = function includesOutsideFont(html, needle) {
    if (needle === "") return true;

    // Remove all <font>...</font> blocks
    const withoutFont = html.replace(
        /<font\b[^>]*>[\s\S]*?<\/font>/gi,
        ""
    );

    return withoutFont.includes(needle);
}
/* -------------------------
   Utilities
--------------------------*/

function isAncestor(element, parentID) {
    while (element.parentElement) {
        if (element.parentElement.id === parentID) return true;
        element = element.parentElement;
    }
    return false;
}
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 8) hex = hex.slice(0, 6); // ignore alpha
    const num = parseInt(hex, 16);

    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}
function relativeLuminance({ r, g, b }) {
    const toLinear = (c) => {
        c /= 255;
        return c <= 0.03928
            ? c / 12.92
        : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    const R = toLinear(r);
    const G = toLinear(g);
    const B = toLinear(b);

    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function creClassName(hex) {
    const rgb = hexToRgb(hex);
    const lum = relativeLuminance(rgb);
    return lum > 0.13 ? 'cre-light' : 'cre-dark';
}

function safeMatch(str, regex, i) {
    const match = str.match(regex);
    if (match) return match[i];
}

/* -------------------------
   Filter UI + click handling
--------------------------*/

document.addEventListener("change", (event) => {
    if (event.target.id !== "filter-log-checkbox") return;
    const font = event.target.parentElement.querySelector("#filter-log-cre > font");
    event.target.checked ? filterLog({id: font.id}) : unFilterLog();
});

function toggleIcon(name) {
    for (const icon of document.querySelectorAll(`.log_full .${name}-icon`)) icon.classList.toggle("not-icon");
    icons[name].isIcon = !icons[name].isIcon;
    localStorage.setItem(`${name}_notIcon`, icons[name].isIcon);

    if (icons[name].isIcon) icons[name].html = icons[name].html.replace(`${name}-icon`, `${name}-icon not-icon`);
    else icons[name].html = icons[name].html.replace(`not-icon`, ``);

    for (const i in log_lines) {
        if (icons[name].isIcon) log_lines[i] = log_lines[i].replace(`${name}-icon`, `${name}-icon not-icon`);
        else log_lines[i] = log_lines[i].replace(`${name}-icon not-icon`, `${name}-icon`);
    }
    showtext();
}

document.body.addEventListener("click", (event) => {
    const el = event.target;
    if (el.id === "win_ShortLog" || isAncestor(el, "win_ShortLog") || el.className === "log_short_container_cap_bottom"){
        if (!android && !iOS) setTimeout(()=>{document.querySelector("#topInput").focus()}, 200);

    }
    if ( [el.id, el.parentElement?.id].includes("btn_close_fullLog")) {
        unFilterLog();
        shadowStyle.innerHTML = "";
        document.querySelector("#filter-log-div")?.remove();
    }
    if (isAncestor(el, "win_ShortLog")) return;
    if (el.className === "cre_info") {
        const wide = window.matchMedia("(min-width: 700px)").matches;
        const obj_index = parseInt(el.parentElement.id.split("cre")[1]);
        stage.pole.obj[obj_index].hero
            ? stage.pole.showheroinfo(obj_index, wide)
        : stage.pole.showinfo(obj_index, wide);
        return;
    }
    if (el.parentElement?.classList?.contains("damage-icon")) {
        toggleIcon("damage");
        return;
    }
    if (el.parentElement?.classList?.contains("dead-icon")) {
        toggleIcon("dead");
        return;
    }

    if (el.className !== "follow-cre-filtered-button" && !el.classList.contains("log_cre_name")) return;

    const hex = stage.pole.obj[parseInt(el.id.split("cre")[1])].get_color();
    const styleId = shadowStyle.innerHTML.match(/cre\d+/);
    const currentElGlowing = styleId && styleId[0] === el.id;
    shadowStyle.innerHTML = "";
    const isFiltering = document.querySelector("#filter-log-checkbox")?.checked;
    const creTriggered = el.className === "follow-cre-filtered-button";
    if (isFiltering) unFilterLog();
    document.querySelector("#filter-log-div")?.remove();
    if (!currentElGlowing || creTriggered) {
        document.querySelector("#btn_close_fullLog").insertAdjacentHTML(
            "beforebegin",
            `<div id="filter-log-div">
        <input type="checkbox" id="filter-log-checkbox" name="filter-log-checkbox"}>
        <label for="filter-log-checkbox">
          ${L.ui.filterLabel}
          <div id="filter-log-cre">${creHTML(stage.pole.obj[el.id.split("cre")[1]])}</div>
        </label>
      </div>`
        );
        if (isFiltering && !creTriggered) document.getElementById("filter-log-checkbox").click();
        shadowStyle.innerHTML = `
      #${el.id}{
        text-shadow:
          0 0 6px ${hex}99,
          0 0 14px ${hex}99,
          0 0 24px ${hex}99
      }
      #${el.id} + .cre_quantity { display:inline; }
    `;
        if (creTriggered) {
            document.getElementById("filter-log-checkbox").click();
            // hide_all_buttons();
            setTimeout(() => {
                document.querySelector("#win_ShortLog").click();
            }, 200);
        }
        if (isAncestor(el, "chat_format")) document.querySelector("#win_ShortLog").click();

    }
});

/* -------------------------
   Hover glow / strobe
--------------------------*/
function paintCoordsStatic(x, y, color, fallBack = false){
    let tile = shado[x + y * defxn];
    if (!tile) return;
    if (fallBack) {
        tile.fill(null);
        set_visible(tile, 0);
    }
    else{
        tile.fill(color);
        set_visible(tile, 1);
    }
}
let strobeId = null;
let strobeStep = 0;

function runStrobe(creature) {
    strobeStep += 0.1;
    const intensity = (Math.sin(strobeStep) + 1) * 0.75;

    if (Math.sin(strobeStep) > 0) {
        paintCoordsStatic(creature.x, creature.y, highlightTileColor);
        FiltersGlowTest.uniforms.m[0] = intensity;
        FiltersGlowTest.uniforms.m[6] = 0;
        FiltersGlowTest.uniforms.m[12] = 0;
        FiltersGlowTest.uniforms.m[4] = intensity * 0.5;
        FiltersGlowTest.uniforms.uAlpha = 1;
        showshadow(creature, true);
    } else {
        showshadow(creature, false);
    }

    strobeId = requestAnimationFrame(() => runStrobe(creature));
}

let hoverInTimer;
const delay = 1500;

function handlePointerOut(el) {
    clearTimeout(hoverInTimer);
    const creature = stage.pole.obj[parseInt(el.id.split("cre")[1])];
    paintCoordsStatic(creature.x, creature.y, null, true);
    cancelAnimationFrame(strobeId);
    strobeId = null;
    showshadow(creature, false);

    FiltersGlowTest.uniforms.m[0] = 1.15;
    FiltersGlowTest.uniforms.m[6] = 1.15;
    FiltersGlowTest.uniforms.m[12] = 1.0;
    FiltersGlowTest.uniforms.m[4] = 0;
    FiltersGlowTest.uniforms.uAlpha = 1;

    document.querySelector("#win_FullLog").style.opacity = 1;
}

function handlePointerOver(el) {
    if (!el.classList.contains("log_cre_name")) return;

    hoverInTimer = setTimeout(() => {
        const creature = stage.pole.obj[parseInt(el.id.split("cre")[1])];
        document.querySelector("#win_FullLog").style.opacity = 0.6;
        if (!strobeId) {
            strobeStep = 0;
            runStrobe(creature);
        }
    }, delay);
}

let pointerX = -1;
let pointerY = -1;
let lastElement = null;

function check({ emitOver } = { emitOver: true }) {
    if (pointerX < 0 || pointerY < 0) return;

    const el = document.elementFromPoint(pointerX, pointerY);
    if (el === lastElement) return;

    if (lastElement && lastElement.classList.contains("log_cre_name")) {
        handlePointerOut(lastElement);
    }
    if (emitOver && el && !isAncestor(el, "win_ShortLog")) handlePointerOver(el);

    lastElement = el;
}

window.addEventListener(
    "pointermove",
    (e) => {
        pointerX = e.clientX;
        pointerY = e.clientY;
        check({ emitOver: true });
    },
    true
);

/* -------------------------
   Turn background grouping + filtering
--------------------------*/

const primaryColor = "rgba(128, 128, 128, 0.1)";
const secondaryColor = "rgba(255, 255, 255, 0.3)";

function lastGroupColOpposite() {
    for (let i = log_lines.length - 1; i > 0; i--) {
        if (log_lines[i].includes("background-color")) {
            return log_lines[i].includes(primaryColor) ? secondaryColor : primaryColor;
        }
    }
}

const lineColors = {};

unsafeWindow.wrapLastTurn = function wrapLastTurn() {
    let color;
    const lastColorOP = lastGroupColOpposite();
    if (!lastColorOP) color = primaryColor;
    else color = lastColorOP;

    for (let i = log_lines.length - 1; i > 0; i--) {
        if (log_lines[i] === "") continue;
        if (log_lines[i].includes("background-color")) break;
        log_lines[i] = log_lines[i].replace("<p>", `<p style="background-color:${color}">`);
        lineColors[i] = { color: color, lineHTML: log_lines[i] };
    }
}

let colorToggle = false;

function processGroup(group, obj) {
    let isRelevant = false;
    for (const i of group) {
        let relevanceCheck;
        if (obj.id) relevanceCheck = log_lines[i].includes(`id="${obj.id}"`);
        else relevanceCheck = log_lines[i].toLowerCase().includes(obj.keyword.toLowerCase());
        if (relevanceCheck) {
            isRelevant = true;
            break;
        }
    }

    if (!isRelevant) {
        for (const i of group) {
            log_lines[i] = log_lines[i].replace("<p", `<p class="line-hidden"`);
        }
    } else {
        colorToggle = !colorToggle;
        for (const i of group) {
            let lineMatch = log_lines[i].match(/background-color:(.*?)\"/);
            if (lineMatch) log_lines[i] = log_lines[i].replace(lineMatch[1], colorToggle ? primaryColor : secondaryColor);
        }
    }
}

function filterLog(obj) {
    // const {keyword, id} = obj;
    let group = [];
    let lastColor;

    for (const [i, line] of log_lines.entries()) {
        if (!line || line === "") continue;

        let lineColor = line.match(/background-color:(.*?)\"/);
        if (lineColor) lineColor = lineColor[1];

        if (!lastColor) {
            group.push(i);
            lastColor = lineColor;
            continue;
        }

        if (lineColor && lineColor === lastColor) {
            group.push(i);
            lastColor = lineColor;
        } else {
            processGroup(group, obj);
            lastColor = lineColor;
            group = [i];
        }
    }

    processGroup(group, obj);
    showtext();
}

function unFilterLog() {
    for (const i in log_lines) {
        if (!log_lines[i] || log_lines[i] === "") continue;
        log_lines[i] = log_lines[i].replace(`<p class="line-hidden"`, "<p ");
        let lineMatch = log_lines[i].match(/background-color:(.*?)\"/);
        if (lineMatch && lineColors[i]) log_lines[i] = log_lines[i].replace(lineMatch[1], lineColors[i].color);
    }
    showtext();
}

/* -------------------------
   Log parsing + icons
--------------------------*/

const activeMisc = L.rx.activeMisc;

function isLineActiveMisc(line) {
    for (const keyword of activeMisc) {
        if (includesOutsideFont(line, keyword)) return keyword;
    }
    return false;
}

const iconRules = [
    [L.rx.wait, waitIconHTML],
    [L.rx.defend, defendButtonHtml],
    [L.rx.morale, moraleButtonHTML],
    [L.rx.luck, luckButtonHTML],
    [L.rx.unluck, unLuckButtonHTML],
    [L.rx.dismorale, dismoraleButtonHTML],
    [L.rx.crit, critButtonHTML],
];

function addStatus(i) {
    for (const [keyword, statusIcon] of iconRules) {
        if (includesOutsideFont(log_lines[i], keyword)) {
            if (keyword === L.rx.luck){
                if (includesOutsideFont(log_lines[i], L.rx.unluck)) continue;
            }
            log_lines[i] = log_lines[i].replace("<font", `${statusIcon}<font`);
        }
    }
}

let spellObj;
unsafeWindow.spellObj = spellObj;

unsafeWindow.processLine = function processLine(i) {
    const ln = log_lines[i];
    const idMatch = Array.from(ln.matchAll(/id="cre(\d+)"/g), (m) => m[1]);
    const miscAttack = isLineActiveMisc(ln);

    const obj = {
        lineHTML: ln,
        lnIndex: i,
        attackerID: idMatch[0],
        defenderID: idMatch[1],
        miscAttack,
    };

    obj.isSpell = L.isSpellLine(ln);
    obj.spellName = safeMatch(ln, L.rx.spellName, 1);
    obj.isHit = L.isHitLine(ln) || obj.isSpell || miscAttack;
    obj.damage = safeMatch(ln, L.rx.damageNum, 1);
    // special spell-like line
    //   if (ln.toLowerCase().includes(L.kw.destroyedDefense.toLowerCase())) {
    if (includesOutsideFont(ln, L.kw.destroyedDefense)) {
        obj.spellName = L.kw.destroyedDefense;
    }

    obj.spellDuration = safeMatch(ln, L.rx.spellDuration, 1);

    if (obj.isHit) {
        if (obj.damage || obj.miscAttack) {
            // Replace log words with icon blocks (locale-safe)
            log_lines[i] = replaceOutsideFont(log_lines[i], L.kw.damageWordInLog, icons.damage.html);
            log_lines[i] = replaceOutsideFont(log_lines[i], L.kw.killedWordInLog, icons.dead.html);
        }

        if (obj.isSpell) {
            // Remove generic "spell word" once + bold spell name
            if (obj.spellName) {
                log_lines[i] = replaceOutsideFont(log_lines[i], L.kw.spellWord, "");
                log_lines[i] = replaceOutsideFont(log_lines[i], obj.spellName, `<b>${obj.spellName}</b>`);
            }

            // Merge consecutive identical spell lines by appending defenders
            if (
                obj.attackerID === spellObj?.attackerID &&
                obj.spellName === spellObj?.spellName &&
                obj.spellDuration === spellObj?.spellDuration
            ) {
                const creSplitted = log_lines[spellObj.lnIndex].split("<endcre>");
                creSplitted[creSplitted.length-2] += `, ${creHTML(stage.pole.obj[obj.defenderID])}`;
                log_lines[spellObj.lnIndex] = creSplitted.join("<endcre>");
                if (!includesOutsideFont(log_lines[spellObj.lnIndex], L.kw.massCast) && !includesOutsideFont(log_lines[spellObj.lnIndex], "background-color")) log_lines[spellObj.lnIndex] = replaceOutsideFont(log_lines[spellObj.lnIndex], L.kw.castVerb, `<i>${L.kw.massCast}</i>` + L.kw.castVerb);
                log_lines[i] = "";
            } else {
                spellObj = obj;
            }
        } else {
            spellObj = null;
        }
    } else {
        // Remove “blood rage” spam lines (locale-aware)
        if (L.rx.bloodRage(log_lines[obj.lnIndex])) {
            log_lines[obj.lnIndex] = "";
        }
    }

    includeStatusIcons && addStatus(i);
}


/* -------------------------
   Log resizing + init patches
--------------------------*/

function resizeLog() {
    const isWide = window.matchMedia("(min-width: 700px)").matches;
    const win = document.getElementById("win_FullLog");
    if (!win) return;

    const f = 0.8

    const widthPx = document.documentElement.clientWidth * f;
    win.style.width = widthPx + "px";
}
window.addEventListener("resize", resizeLog);
function fixChat() {
    const input = document.querySelector('#chattext');
    const sendBtn = document.querySelector('#btn_SendChatMessage');
    const targetBtn = document.querySelector('#btn_ToggleChatTarget');
    if (!input || !sendBtn) return;

    // Inject base CSS so padding works as expected
    const style = document.createElement('style');
    style.textContent = `#chattext { box-sizing: border-box !important; }`;
    document.head.appendChild(style);

    // Capture original paddings once (so we "add" not "replace")
    const cs0 = getComputedStyle(input);
    const basePadL = parseFloat(cs0.paddingLeft) || 0;
    const basePadR = parseFloat(cs0.paddingRight) || 0;

    function overlapsHorizontally(a, b) {
        // overlap width on x-axis
        const left = Math.max(a.left, b.left);
        const right = Math.min(a.right, b.right);
        return right - left; // can be <= 0
    }

    function syncPadding() {
        const gap = 10;

        const inputRect = input.getBoundingClientRect();
        const sendRect = sendBtn.getBoundingClientRect();

        const sendOverlap = overlapsHorizontally(sendRect, inputRect);

        // If the send button truly overlaps the input, reserve its overlapped width.
        // If it's just a sibling (no overlap), do nothing on the right.
        const reserveRight = sendOverlap > 0 ? Math.ceil(sendOverlap) + gap : 0;

        input.style.paddingRight = (basePadR + reserveRight) + 'px';

        // LEFT SIDE: only reserve space if the left button overlaps the input.
        if (targetBtn) {
            const leftRect = targetBtn.getBoundingClientRect();
            const leftOverlap = overlapsHorizontally(leftRect, inputRect);
            const reserveLeft = leftOverlap > 0 ? Math.ceil(leftOverlap) + gap : 0;

            input.style.paddingLeft = (basePadL + reserveLeft) + 'px';
        } else {
            // Ensure we don't leave some old huge padding in place
            input.style.paddingLeft = basePadL + 'px';
        }
    }

    // Run now and on layout changes
    syncPadding();
    window.addEventListener('resize', syncPadding);
    window.addEventListener('orientationchange', syncPadding);

    const ro = new ResizeObserver(syncPadding);
    ro.observe(sendBtn);
    if (targetBtn) ro.observe(targetBtn);

    const chat = document.querySelector('#area_chat');
    if (chat) {
        const mo = new MutationObserver(syncPadding);
        mo.observe(chat, { attributes: true, childList: true, subtree: true });
    }
}
function init() {
    fixChat();
    resizeLog();

    const fullLogArea = document.getElementById("win_FullLog_area");
    const fullLogTxt = document.getElementById("win_FullLog_txt");
    const logContainer = document.querySelector("#win_FullLog");

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const containerWidth = parseFloat(window.getComputedStyle(logContainer).width);
            fullLogArea.style.width = containerWidth * 0.9 + "px";
            fullLogTxt.style.width = containerWidth * 0.9 + "px";
        }
    });

    resizeObserver.observe(logContainer);

    if (fullLogArea) {
        fullLogArea.addEventListener("scroll", () => check({ emitOver: false }), {
            passive: true,
            capture: true,
        });
    }

    if (fullLogTxt) {
        new MutationObserver(() => check({ emitOver: false })).observe(fullLogTxt, {
            childList: true,
            subtree: true,
        });
    }

    stage.pole.showheroinfo = function showheroinfo(i, notHideLog = false) {
        cur_unit_info = i;
        stage[war_scr].prepare_hero_info(i);
        hide_windows(notHideLog);
        show_button("win_InfoHero");
    };

    stage.pole.showinfo = function showinfo(i, notHideLog = false) {
        cur_unit_info = i;
        stage[war_scr].prepare_info(i);
        hide_windows(notHideLog);
        show_cre_info();
    };

    patchFunction(
        unsafeWindow,
        "play_button_onRelease",
        `hide_button('play_button');`,
        `if (document.activeElement.id ==="topInput") return;
        hide_button('play_button');`
    );
    patchFunction(
        stage.pole,
        "html",
        'return \'<font color=\\"\'+this.obj[i].get_color()+\'\\">\'+this.obj[i].nametxt+\'</font>\';',
        'return `<font class="log_cre_name" id="cre${i}" color="${this.obj[i].get_color()}"><span class="cre_info">🔍 </span>${this.obj[i].nametxt}</font><span class="cre_quantity">${this.obj[i].hero ? `[${this.obj[i].maxhealth}]` : `[${this.obj[i].nownumber}]`}</span><endcre>`;'
    );
    patchFunction(
        stage.pole,
        "prepare_hero_info",
        "document.getElementById('hero_info_head').innerHTML = this.get_name_html(i);",
        `document.getElementById('hero_info_head').innerHTML = \`<div style="position:relative; right: 2em"><span title="${L.ui.filterLabelCre}" id="cre\${this.obj[i].obj_index}" class="follow-cre-filtered-button">📜</span>\` + this.get_name_html(i)+"</div>";`
    )

    patchFunction(
        stage.pole,
        "prepare_info",
        `document.getElementById('cre_info_head').innerHTML = this.get_name_html(i);`,
        `document.getElementById('cre_info_head').innerHTML = this.get_name_html(i);
        document.querySelector(".info_head_name").insertAdjacentHTML("beforeend", \`&nbsp;\${this.obj[i].nownumber !== this.obj[i].maxnumber ? "<span><s>" + this.obj[i].maxnumber + "</s></span>" : ""} &nbsp;&nbsp;<span>\${this.obj[i].nownumber !== 0 ? (this.obj[i].nownumber - 1) * this.obj[i].maxhealth + this.obj[i].nowhealth : 0} ${LOCALE === "en" ? "hp" : "хп"} </span>\`);document.querySelector(".info_head_name").insertAdjacentHTML("beforebegin", \`<span title="${L.ui.filterLabelCre}" id="cre\${this.obj[i].obj_index}" class="follow-cre-filtered-button">📜</span>\`);`
    )
    patchFunction(
        stage.pole,
        "calcinitiative",
        "nowturnobj = k;",
        `nowturnobj = k;
     if (typeof lastObject !== "undefined" && lastObject !== nowturnobj) {
       wrapLastTurn();
       showtext();
     }
     lastObject = nowturnobj;`
    );

    patchFunction(
        unsafeWindow,
        "showtext",
        "log_lines[log_cnt] = htmllog.substr(0, i+4);",
        `log_lines[log_cnt] = "<p>" + htmllog.substr(0, i+4) + "</p>"; processLine(log_cnt);`
    );
}

/* -------------------------
   Boot
--------------------------*/

let settings_interval = setInterval(() => {
    const warImages = [...document.images].find((img) => img.src.includes("war_images.png"));
    if (!warImages || Object.keys(stage.pole.obj).length === 0) return;
    clearInterval(settings_interval);
    if (!classic_chat && document.querySelector("#area_chat_header_area").style.display === "none" && document.querySelector("#area_chat").style.display === "none") show_button("area_chat_header_area");
    initMagicCalc();
    if (!android && !iOS) document.querySelector("#win_FullLog").insertAdjacentHTML("afterbegin", `<input id="topInput" type="text" placeholder="${L.ui.searchPlaceholder}" />`);
    document.querySelector("#cre_distance_on").checked = cre_distance_on
    document.querySelector("#animation_speed_on").checked = animation_speed_on;
    let spd = get_GM_value_if_exists("anim_speed", getCurrentBattleSpeed());
    document.getElementById("anim_speed_val").textContent = spd;
    document.querySelector("#anim_speed").value = spd
    if (GM_getValue("animation_speed_on")) setBattleSpeed(spd);
    // авторасстановка в ГВ
    //if (btype === 66) setTimeout(make_ins_but, 1000);
    if (location.href.includes("&lt")) {
        const test = document.querySelector("#pause_button");
        if (test.style.display === "none") {
            show_button("pause_button");
            pause_button_onRelease()
        }
    }
    getIcon("skull")
        .then((skullImg) => {
        icons.dead.html = icons.dead.html.replace("<img>", skullImg.outerHTML);
    })
        .then(() => getIcon("damage"))
        .then((damageImg) => {
        icons.damage.html = icons.damage.html.replace("<img>", damageImg.outerHTML);
        init();
    });
}, 300);
let upravaRoot;
const upravaInterval = setInterval(() => {
    upravaRoot = document.querySelector("#win_BattleControl");
    if (!upravaRoot) return;
    else {
        clearInterval(upravaInterval);
        upravaRoot.insertAdjacentHTML("afterbegin",
                                      `
        <style>
            .hidden {
                display: none;
            }
        </style>
            `);
        insertInput();

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    insertInput();
                }
            });
        });
        const config = { childList: true, subtree: true };
        observer.observe(upravaRoot, config);
    }

}, 100);
const distance_counter = document.getElementById("cre_distance");
const anim_speed_counter = document.querySelector("#anim_speed")


// =========  Event Listeners ============
let speedCount, distance;
document.body.addEventListener('input', function(event) {
    switch (event.target.id) {
        case "cre_distance":
            distance = parseInt(distance_counter.value);
            if (isNaN(distance)) {
                distance_counter.value = "";
                return;
            }
            if (distance < 1) {
                distance_counter.value = 1;
                return;
            }
            if (!cre_distance_on) return
            GM_setValue('cre_distance', distance)
            if (isOpen) refresh()
            individual_calc.innerHTML = individual_calc_innerHTML(last_individual_calc.atk_obj_index, last_individual_calc.def_obj_index)
            cre_distance_div.innerHTML = `${t('chosenDistance')}: <span style= "color:white">${GM_getValue('cre_distance')}</span><br>`
            break;
        case "anim_speed":
            speedCount = Number(event.target.value);
            GM_setValue('anim_speed', speedCount);
            document.getElementById("anim_speed_val").textContent = document.getElementById("anim_speed").value;
            if (!animation_speed_on) return;
            setBattleSpeed(speedCount);

            break;
    }
});
const anim_speed_input = document.querySelector('#anim_speed')
document.addEventListener("keydown", (event) => {
    const keyCode = Number(event.keyCode);
    if (event.keyCode === 113) {
        if (document.querySelector("#hwmkb_overlay_host")) document.querySelector("#hwmkb_overlay_host").remove();
        else openHwmkbOverlay();
    }
    // keep pressedKeys consistent
    pressedKeys.add(keyCode);

    if (isChatFocused()) return;

    // If trigger is required, block everything below unless trigger held
    if (!triggerOk()) return;

    // Toggle speed (keydown)
    if (isValidCode(kb.toggleSpeed) && keyCode === kb.toggleSpeed) {
        animation_speed_on = GM_toggle_boolean("animation_speed_on", GM_getValue("animation_speed_on"));
        const chk = document.querySelector("#animation_speed_on");
        if (chk) chk.checked = animation_speed_on;

        if (animation_speed_on) {
            GM_setValue("anim_speed", anim_speed_counter.value);
            setBattleSpeed(anim_speed_counter.value);
        } else {
            setBattleSpeed(getCurrentBattleSpeed());
        }
        return; // optional: prevent other actions on same keypress
    }

    // ArrowUp / ArrowDown for anim speed (only when triggerOk)
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const increment = event.key === "ArrowUp" ? 1 : -1;
        anim_speed_input.value = String(Number(anim_speed_input.value) + increment);
        anim_speed_input.dispatchEvent(new Event("input", { bubbles: true }));
        return;
    }

    // Auto battle
    if (isValidCode(kb.autoBattle) && keyCode === kb.autoBattle) {
        fastbut_onRelease2();
        return;
    }

    // Auto placement
    if (isValidCode(kb.autoPlacement) && keyCode === kb.autoPlacement) {
        make_ins_but();
        return;
    }

    // Start battle
    if (isValidCode(kb.startBattle) && keyCode === kb.startBattle) {
        const btn = document.querySelector("#confirm_ins_img");
        if (btn) triggerMouseUpEvent(btn);
        return;
    }

    // Back
    if (isValidCode(kb.backToGame) && keyCode === kb.backToGame) {
        if (history.length > 1) back_to_game_button_onRelease();
        else back_to_home_button_onRelease();
    }
});
document.body.addEventListener('change', function(event) {
    switch (event.target.id) {
        case "mag_damage_on":
            mag_damage_on = GM_toggle_boolean("mag_damage_on", mag_damage_on);
            if (isOpen) refresh();
            individual_calc.innerHTML = individual_calc_innerHTML(last_individual_calc.atk_obj_index, last_individual_calc.def_obj_index)
            break;
        case "coeff_on":
            coeff_on = GM_toggle_boolean("coeff_on", coeff_on);
            if (isOpen) refresh();
            break;
        case "choose_cre":
            chosen.creature = select.value
            refresh()
            break;
        case "cre_distance_on":
            cre_distance_on = GM_toggle_boolean("cre_distance_on", cre_distance_on)
            cre_distance_on ? GM_setValue('cre_distance', distance_counter.value) : GM_setValue('cre_distance', "")
            if (cre_distance_on) {
                cre_distance_div.innerHTML = `<span>${t('chosenDistance')}: ${GM_getValue('cre_distance')}</span><br>`
                cre_distance_div.style.display = "inline"
                if (isOpen) refresh()
                individual_calc.innerHTML = individual_calc_innerHTML(last_individual_calc.atk_obj_index, last_individual_calc.def_obj_index)
            } else {
                cre_distance_div.innerHTML = ""
            }
            if (isOpen) refresh()
            individual_calc.innerHTML = individual_calc_innerHTML(last_individual_calc.atk_obj_index, last_individual_calc.def_obj_index)
            break;
        case "animation_speed_on":
            animation_speed_on = GM_toggle_boolean("animation_speed_on", GM_getValue("animation_speed_on"))
            if (animation_speed_on) {
                GM_setValue('anim_speed', anim_speed_counter.value)
                setBattleSpeed(anim_speed_counter.value);
            } else {
                setBattleSpeed(getCurrentBattleSpeed());
            }
            break;
    }
});
document.body.addEventListener('click', function(event) {
    if (event.target.parentElement && /speed(.)_button/.test(event.target.parentElement.id)) {
        setBattleSpeed(getCurrentBattleSpeed());
        document.querySelector("#animation_speed_on").checked = false
        GM_setValue('animation_speed_on', false)
    }
    switch (event.target.id) {
        case "dmg_list_refresh":
            readjust_elements()
            refresh()
            break
        case "change_side":
            chosen.afterSideSwitchCre[chosen.side] = chosen.creature
            chosen.side = -chosen.side
            chosen.creature = chosen.afterSideSwitchCre[chosen.side]
            refresh()
            break
        case "collapse":
            readjust_elements()
            isOpen = false
            refresh_button.innerHTML = t('btnListCollapsed');
            set_Display([select, side_button, collapse_button, document.querySelector("#chosen_cre_heading"), dmg_list_container, individual_calc, cre_distance_div], "none")
            break;

        case "cre_distance_plus":
            document.getElementById('cre_distance').value = parseInt(document.getElementById('cre_distance').value || 0) + 1;
            document.getElementById('cre_distance').dispatchEvent(new Event('input', { bubbles: true }));
            break;
        case "cre_distance_minus":
            document.getElementById('cre_distance').value = parseInt(document.getElementById('cre_distance').value || 0) - 1;
            document.getElementById('cre_distance').dispatchEvent(new Event('input', { bubbles: true }));
            break;
    }
});

let calc_attacker, magshot_x, magshot_y;

function manageDamageCalc() {
    // если бой не начался, популизирует mapobj
    if (lastturn <= 0) {
        for (const cre of Object.values(stage.pole.obj)) {
            const coords = [{x: cre.x, y: cre.y}];
            if (cre.big) coords.push({x: cre.x+1, y: cre.y}, {x: cre.x+1, y: cre.y+1}, {x: cre.x, y: cre.y+1});
            for (const coord of coords){
                mapobj[coord.x + coord.y * defxn] = cre.obj_index;
            }

        }
    }
    let cre_collection = stage.pole.obj;
    if (mapobj[xr_last + yr_last * defxn] === undefined || cre_collection[mapobj[xr_last + yr_last * defxn]].rock === 1) {
        paint_coords(xr_last, yr_last, "#cccccc");
        return;
    }
    if (calc_attacker === undefined) {
        calc_attacker = cre_collection[mapobj[xr_last + yr_last * defxn]];
        paint_coords(xr_last, yr_last, "#800000");
        if (calc_attacker.hero === 1) {
            readjust_elements();
            individual_calc.innerHTML = ` <div id="individual_cre_heading" style="display:inline; background-color: ${physCalcColor}">
                  <span>${t("damage")} <br>
                  </span>
                    <b>${calc_attacker.nametxt}</b> ${LOCALE === "en" ? "to" : "по"}
                    <br>
                    </div>
                    `;
        }
    } else {
        readjust_elements();
        let def_obj_index = mapobj[xr_last + yr_last * defxn];
        set_Display([individual_calc, collapse_button], "inline");
        if (cre_distance_on) {
            cre_distance_div.style.display = "inline";
            cre_distance_div.innerHTML = `<span>${t('chosenDistance')}: ${GM_getValue('cre_distance')}</span><br>`
        }
        individual_calc.innerHTML = individual_calc_innerHTML(calc_attacker.obj_index, def_obj_index);
        calc_attacker = undefined;
        paint_coords(xr_last, yr_last, "blue");
    }
}

// если есть настройка подтверждения хода = моб. версия, + поддержка моб версии
const mobileInterval = setInterval(() => {
    if ([typeof android, typeof iOS].includes("undefined")) return;
    clearInterval(mobileInterval);
    if (!android && !iOS) return;
    const helpButtonHTML = `<div id="help_buttonScript" class="toolbars_mobile_img"><span style = "color:white;">${t('helpDamage')}</span><img id = "help_imgScript" src="https://dcdn.heroeswm.ru/i/combat/btn_help.png?v=6" style="opacity:0.5"><br></div>`
    document.querySelector("#left_button").insertAdjacentHTML("beforeEnd", helpButtonHTML);
    const helpButton = document.querySelector("#help_buttonScript");
    helpButton.addEventListener("touchend", event => {
        calc_x = calc_y = undefined;
        const firstTime = localStorage.getItem("battle_damage_tooltip_mobile_first_time");
        if (!firstTime) {
            localStorage.setItem("battle_damage_tooltip_mobile_first_time", 1);
            alert(t("mobileFirstTimeAlert"));
        }
        const img = helpButton.querySelector("img");
        img.style.opacity = img.style.opacity === "0.5" ? "1" : "0.5";
        helpButton.classList.toggle("active");
    })
    document.addEventListener("touchend", event => {
        info_btn_cnt = 0;
        if (!helpButton.classList.contains("active") || event.target.id === "help_imgScript" || event.target.tagName !== "CANVAS") return;
        manageDamageCalc();
    })

}, 100);
document.addEventListener("click", event => {
    if (event.target.className === "open-keybinds") openHwmkbOverlay();
    if (!info_btn_cnt) return;
    info_btn_cnt = 0;
})
// Урон одного стека по другому по выбору нажатием кнопки E
// Helper: don't steal typing
function isChatFocused() {
    return (
        document.querySelector("#chattext") === document.activeElement ||
        document.querySelector("#chattext_classic") === document.activeElement ||
        document.activeElement.id === "topInput"
    );
}

// Helper: if trigger is enabled, require it; otherwise allow direct binds
function triggerOk() {
    return !kb.useTrigger || pressedKeys.has(kb.triggerKey);
}

// Optional: if you want to ignore "unknown" keys now that you don't use keyboardKeycodes map
function isValidCode(code) {
    return Number.isFinite(code) && code > 0;
}

// ---- KEYUP (actions that should fire on release) ----
window.addEventListener("keyup", (event) => {
    const keyCode = Number(event.keyCode);

    // keep pressedKeys consistent
    pressedKeys.delete(keyCode);
    if (keyCode === 27 && document.querySelector("#win_FullLog")?.style.display !== "none") {
        unFilterLog();
        document.querySelector("#filter-log-div")?.remove();
        document.querySelector("#btn_close_fullLog")?.click();
    }
    if (document.activeElement.id === "topInput"){
        event.stopPropagation();
        event.stopImmediatePropagation();
        const logSearch = document.querySelector("#topInput");
        unFilterLog();
        if (logSearch.value !== ""){
            filterLog({keyword: logSearch.value});
            return;
        }
    }
    if (isChatFocused()) return;
    if (isValidCode(kb.filterLog) && keyCode === kb.filterLog){
        unFilterLog();
        document.querySelector("#filter-log-div")?.remove();
        const cre = stage.pole.obj[mapobj[xr_last + yr_last * defxn]];
        document.querySelector("#btn_close_fullLog").insertAdjacentHTML(
            "beforebegin",
            `<div id="filter-log-div">
        <input type="checkbox" id="filter-log-checkbox" name="filter-log-checkbox"}>
        <label for="filter-log-checkbox">
          ${L.ui.filterLabel}
          <div id="filter-log-cre">${creHTML(cre)}</div>
        </label>
      </div>`
        );
        document.getElementById("filter-log-checkbox").click();
        const hex = cre.get_color();
        shadowStyle.innerHTML = `
      #cre${cre.obj_index}{
        text-shadow:
          0 0 6px ${hex}99,
          0 0 14px ${hex}99,
          0 0 24px ${hex}99
      }
      #cre${cre.obj_index} + .cre_quantity { display:inline; }
    `;

        // hide_all_buttons();
        setTimeout(() => {
            document.querySelector("#win_ShortLog").click();
        }, 200);

    }
    // Your input-specific behavior stays
    if (event.target && event.target.id === "uprava_filter_input") {
        upravaEvent(event);
        return;
    }

    // See damage (keyup)
    if (isValidCode(kb.seeDamage) && keyCode === kb.seeDamage) {
        manageDamageCalc();
    }

    // Mag shot (keyup)
    if (isValidCode(kb.seeMagShot) && keyCode === kb.seeMagShot) {
        if (!magshot_x) {
            [magshot_x, magshot_y] = [xr_last, yr_last];
            paint_coords(xr_last, yr_last, "#FC7052", 4000);
        } else {
            paint_coords(xr_last, yr_last, "#7A71FE", 4000);
            magshot(magshot_x, magshot_y, xr_last, yr_last);
            magshot_x = magshot_y = null;
        }
    }
});
// -----------------------------------

// =========  маг. урон ============

const damageSpells = (I18N[LOCALE] || I18N.en).spellNames;

function calcFactionModifier(attacker, defender) {
    let modifier, k;
    if ((umelka[attacker['owner']][0] > 0) && (umelka[defender['owner']][0] > 0)) {
        k = umelka[attacker['owner']][0];
        if ((k > 0) && (k < 11)) {
            let j = umelka[defender['owner']][k];
            modifier = 1 - j * 0.03;
        };
    };
    return modifier;
}

function calcHellFire(attacker, defender, cre_collection) {
    const factionModifier = calcFactionModifier(attacker, defender);
    const spellPower = cre_collection[heroes[attacker.owner]].maxnumber;
    const perkModifier = battle_is_it_perk(attacker.obj_index, 104) ? 1.5 : 1;
    const res = Math.floor(Math.round((7 * spellPower + 7) * perkModifier) * factionModifier);
    return res;
}
// добавление spellname_magiceff для объекта для дальнийших расчетов
function initEff(s, activeobj_S) { // s = spell name
    if (stage[war_scr].obj[activeobj_S][s + 'effmain'] > 0) {
        let eff;
        if (stage[war_scr].obj[activeobj_S].hero) {
            var s1 = 0;
            if ((battle_is_it_perk(activeobj_S, 93)) && ((s == 'magicfist') || (s == 'raisedead'))) { s1 = 4; };
            if ((battle_is_it_perk(activeobj_S, 78)) && ((s == 'poison') || (s == 'mpoison'))) { s1 += 5; };
            if ((battle_is_it_perk(activeobj_S, 89)) && ((s == 'poison') || (s == 'mpoison'))) { s1 += 3; };
            eff = (stage[war_scr].obj[activeobj_S][s + 'effmain'] + stage[war_scr].obj[activeobj_S][s + 'effmult'] * (stage[war_scr].getspellpower(activeobj_S, s) + s1));
            if (stage[war_scr].obj[activeobj_S][s + 'effmult'] == 1.5) { eff = Math.round(eff); };
            var teff = eff;
        } else {
            eff = Math.round(stage[war_scr].obj[activeobj_S][s + 'effmain'] + stage[war_scr].obj[activeobj_S][s + 'effmult'] * Math.pow(stage[war_scr].obj[activeobj_S]['nownumber'], 0.7));
            if (s == 'blind') {
                eff = Math.round(stage[war_scr].obj[activeobj_S][s + 'effmain'] + stage[war_scr].obj[activeobj_S][s + 'effmult'] * stage[war_scr].obj[activeobj_S]['nownumber']);
            };
            var teff = eff;
        }
        stage[war_scr].obj[activeobj_S][s + '_magiceff'] = eff;
    }
}
function fetchHP(id){
    const htmlText = send_get(`/army_info.php?name=${id}`);
    const doc = parser.parseFromString(htmlText, "text/html");
    let hp = doc.querySelector("body > center > table > tbody > tr > td > table > tbody > tr > td > div > div.info_text_content > div:nth-child(7) > div").textContent;
    return hp;
}
function initMagicCalc() {
    patchFunction(
        stage.pole,
        "attackmagic",
        `if (this.obj[attacker].getside()==this.obj[defender]['side']) return 0;`,
        ""
    )

    // родной calcmagic с удалением кодом массовых заклов и др. побочных эффектов наведения курсора с активным заклом
    stage.pole.calcmagic_script = function calcmagic(atk_x, atk_y, xr, yr, magicuse, penalty = 1) {
        let i = mapobj[atk_x + defxn * atk_y];
        const bossNownumber = stage.pole.obj[i].nownumber;
        if (stage.pole.obj[i].boss && btype !== 135 && btype !== 139){
            const creName = stage.pole.obj[i].filename.replace("ani", "");
            let regularHP = parseInt(creatureHPs[creName]);
            if (!regularHP) {
                regularHP = parseInt(fetchHP(creName));
                if (isNaN(regularHP)) {
                    alert(`Creature ${stage.pole.obj[i].nametxt} not found! Write to Something begins`);
                    regularHP = stage.pole.obj[i].maxhealth;
                }
                savedHPs[creName] = regularHP;
                creatureHPs[creName] = regularHP;
                localStorage.setItem("savedHPs", JSON.stringify(savedHPs));
            }
            stage.pole.obj[i].nownumber = stage.pole.obj[i].maxhealth / regularHP;
        }
        const activeobj_S = i;
        initEff(magicuse, i);
        Totalmagicdamage = 0;
        Totalmagickills = 0;

        var ok = false;
        mul = 1;
        var len = stage.pole.obj_array.length;
        for (var k1 = 0; k1 < len; k1++) {
            var j = stage.pole.obj_array[k1];
            stage.pole.obj[j]['attacked'] = 1;
            stage.pole.obj[j]['attacked2'] = 1;
        };

        if ((magicuse == 'magicfist') || (magicuse == 'angerofhorde')) {
            var eff = stage.pole.obj[activeobj_S][magicuse + '_magiceff'];
            if ((magicuse == 'magicfist') && (stage.pole.obj[mapobj[xr + yr * defxn]]['organicarmor'])) eff = Math.round(eff * 0.2);
            stage.pole.attackmagic(i, mapobj[xr + yr * defxn], eff, 'neutral', magicuse, 0, 0, 0);
            ok = true;
        };
        if (magicuse == 'swarm') {
            stage.pole.attackmagic(i, mapobj[xr + yr * defxn], stage.pole.obj[activeobj_S][magicuse + '_magiceff'], 'other', magicuse, 0, 0, 0);
            ok = true;
        };
        if (magicuse === "divinev") {
            var separhsum = (stage.pole.obj[mapobj[xr + yr * defxn]].separhsum ? 1 : 0);
            var eff = (stage.pole.obj[i]['divineveffmain'] + Math.round(stage.pole.obj[i]['divineveffmult'] * Math.pow(stage.pole.obj[i]['nownumber'], 0.7))) * Math.sqrt(separhsum);
            stage.pole.attackmagic(i, mapobj[xr + yr * defxn], eff, 'other', 'divinev', 0, 0, 0);
            ok = true;
        }
        if ((magicuse == 'magicarrow') || (magicuse == 'lighting')) {
            if (stage.pole.obj[activeobj_S]['calllightning']) {
                stage.pole.obj[activeobj_S]['lighting_magiceff'] = 50 * stage.pole.obj[activeobj_S]['nownumber'];
            };
            stage.pole.attackmagic(i, mapobj[xr + yr * defxn], Math.round(stage.pole.obj[activeobj_S][magicuse + '_magiceff'] * mul), 'air', magicuse, 0, 0, 0);
            ok = true;
        };
        if (magicuse == 'firearrow') {
            stage.pole.attackmagic(i, mapobj[xr + yr * defxn], Math.round(stage.pole.obj[activeobj_S][magicuse + '_magiceff'] * mul), 'fire', magicuse, 0, 0, 0);
            ok = true;
        };
        if (magicuse == 'icebolt') {
            stage.pole.attackmagic(i, mapobj[xr + yr * defxn], Math.round(stage.pole.obj[activeobj_S][magicuse + '_magiceff'] * mul), 'cold', magicuse, 0, 0, 0);
            ok = true;
        };
        if (magicuse == 'implosion') {
            stage.pole.attackmagic(i, mapobj[xr + yr * defxn], Math.round(stage.pole.obj[activeobj_S][magicuse + '_magiceff'] * mul), 'earth', magicuse, 0, 0, 0);
            ok = true;
        };

        if (magicuse == 'poison') {
            stage.pole.calcpoison(i, mapobj[xr + yr * defxn], stage.pole.obj[activeobj_S][magicuse + '_magiceff']);
            ok = true;
        };
        if (magicuse == 'meteor') {
            var eff = stage.pole.obj[activeobj_S][magicuse + '_magiceff'];
            stage.pole.attackmagic(i, mapobj[xr + yr * defxn], Math.round(eff * mul), 'earth', magicuse, 0, 0, 0);
            ok = true;
        };
        if (magicuse == 'chainlighting') {
            var eff = stage.pole.obj[activeobj_S][magicuse + '_magiceff'];
            if (stage.pole.obj[activeobj_S]['spmult'] > 1) {
                eff = Math.round(stage.pole.obj[activeobj_S]['spmult'] * (stage.pole.obj[activeobj_S]['chainlightingeffmain'] + stage.pole.obj[activeobj_S]['chainlightingeffmult'] * Math.pow(stage.pole.obj[activeobj_S]['nownumber'], 0.7)));
            }
            if (penalty === 1) {
                stage.pole.attackmagic(i, mapobj[xr + yr * defxn], Math.round(eff * mul), 'air', 'lighting', 0, 0, 0);
            } else {
                stage.pole.attackmagic(i, mapobj[xr + yr * defxn], Math.floor(Math.round(eff * mul) * penalty), 'air', 'lighting', 0, 0, 0);
            }
            ok = true;
        };

        if (magicuse == 'fireball') {
            stage.pole.attackmagic(i, mapobj[xr + yr * defxn], Math.round(stage.pole.obj[activeobj_S][magicuse + '_magiceff'] * mul), 'fire', magicuse, 0, 0, 0);
            ok = true;
        };
        if (magicuse == 'stormcaller') {
            stage.pole.attackmagic(i, mapobj[xr + yr * defxn], Math.round(stage.pole.obj[activeobj_S].nownumber * 10), 'air', magicuse, 0, 0, 0);
            ok = true;
        };
        if (magicuse == 'firewall') {
            stage.pole.attackmagic(i, mapobj[xr + yr * defxn], stage.pole.obj[activeobj_S][magicuse + '_magiceff'], 'fire', magicuse, 0, 0, 0);
            ok = true;
        };
        if (magicuse == 'circle_of_winter') {
            stage.pole.attackmagic(i, mapobj[xr + yr * defxn], Math.round(stage.pole.obj[activeobj_S][magicuse + '_magiceff'] * mul), 'water', magicuse, 0, 0, 0);
            ok = true;
        };

        if (magicuse == 'stonespikes') {
            stage.pole.attackmagic(i, mapobj[xr + yr * defxn], Math.round(stage.pole.obj[activeobj_S][magicuse + '_magiceff'] * mul), 'earth', magicuse, 0, 0, 0);
            ok = true;
        };
        if (stage.pole.obj[i].boss && btype !== 135) stage.pole.obj[i].nownumber = bossNownumber;
        return Totalmagicdamage;
    };
    patchFunction(
        unsafeWindow,
        "calcpoison",
        "var magicdamage=eff;",
        `
            var magicdamage=eff;
            if ((umelka[stage.pole.obj[attacker]['owner']][0] > 0) && (umelka[stage.pole.obj[defender]['owner']][0] > 0)) {

                var k = umelka[stage.pole.obj[attacker]['owner']][0];

                if ((k > 0) && (k < 11)) {

                    j = umelka[stage.pole.obj[defender]['owner']][k];

                    magicdamage = magicdamage * (100 - j * 3) / 100;

                };

            };

            magicdamage = Math.round(magicdamage);
        `
    )
    patchFunction(
        unsafeWindow,
        "check_keys",
        "(key==68)||(key==32)",
        "key==68"
    )
    patchFunction(
        unsafeWindow,
        "defend_button_release",
        "loader.loading = true;",
        `
        if (Object.values(heroes).includes(activeobj) && activeobj !== 0) {
            if (lastTurnDefended !== lastturn) {
                showPopup("Оборона была одноразово заблокирована");
                lastTurnDefended = lastturn;
                return 0;
            }
        };
        loader.loading = true;
        `
    )
    const fiveSecStr = fiveSecWarning ? `if (timer === 5 && activeobj) playsound(0, "readysound", 100);` : "";
    patchFunction(
        stage[war_scr],
        "check_timer",
        "document.getElementById('timer').innerHTML = timer;",
        `
        ${fiveSecStr}
        if (timer <= 5 && (activeobj || lastturn < 0)) {
            document.getElementById('timer').innerHTML = \`<span style="color:red">\${timer}</span>\`;
        } else {
            document.getElementById('timer').innerHTML = timer
        }
        `
    );

}
// -----------------------------------

// Функция рельсы гвд с поправкой на выбор клеток юзером
function magshot(x1, y1, xr, yr) {
    var x2 = xr;
    var y2 = yr;
    var dx = Math.abs(x1 - x2);
    var dy = Math.abs(y1 - y2);
    var skip = false;
    if (x1 < x2) {
        var xp = 1;
    } else {
        var xp = -1;
    };
    if (y1 < y2) {
        var yp = 1;
    } else {
        var yp = -1;
    };
    if (dx > dy) {
        if (x1 > x2) {
            var x = -5;
        } else {
            var x = defxn + 3 - 1;
        };
        var y = (y2 - y1) / (x2 - x1) * (x - x1) + y1;
    } else {
        if (y1 > y2) {
            var y = -5;
        } else {
            var y = defyn + 5 + 1;
        };
        var x = (x2 - x1) / (y2 - y1) * (y - y1) + x1;
    };
    x = x1;
    y = y1;
    while ((x > 0) && (y > 0) && (x <= defxn - 2) && (y <= defyn)) {
        if (dx > dy) {
            x += xp;
            y = (y2 - y1) / (x2 - x1) * (x - x1) + y1;
        } else {
            y += yp;
            x = (x2 - x1) / (y2 - y1) * (y - y1) + x1;
        };
        let shot_coords = []
        if ((Math.round(x) > 0) && (Math.round(y) > 0) && (Math.round(x) <= defxn - 2) && (Math.round(y) <= defyn)) {
            if (shado[Math.round(x) + Math.round(y) * defxn]) {
                set_visible(shado[Math.round(x) + Math.round(y) * defxn], 1);
                shot_coords.push({ x: Math.round(x), y: Math.round(y) })
            }
        };
        setTimeout(() => {
            for (const coord of shot_coords) {
                set_visible(shado[coord.x + coord.y * defxn], 0);
            }
        }, 4000)
    };
};

// Родная функция гвд с поправками на переменную l и модификаторами magic[]
function attackmonster(attacker, ax, ay, x, y, defender, cre_distance, shootok, koef, inuse) {
    console.log("attacker, defender ", attacker, defender);
    let cre_collection = stage.pole.obj
    var mainattack = 1;
    var ax1 = ax;
    var ay1 = ay;
    if (defender == 1000) return 0;
    if (defender <= 0) return 0;
    if (!cre_collection[defender]) return 0;
    if (cre_collection[defender]['hero']) return 0;
    if (cre_collection[defender]['rock']) return 0;
    if (koef == undefined) koef = 1;
    if (inuse == undefined) inuse = '';
    var len = wmap2[y * defxn + x];
    if ((cre_collection[attacker].x == x) && (cre_collection[attacker].y == y)) len = spd;
    shootok = 1;

    function getAdjacentAndDiagonalCoords(x, y) {
        const adjacentAndDiagonalCoords = [];
        adjacentAndDiagonalCoords.push([x + 1, y]);
        adjacentAndDiagonalCoords.push([x - 1, y]);
        adjacentAndDiagonalCoords.push([x, y + 1]);
        adjacentAndDiagonalCoords.push([x, y - 1]);
        adjacentAndDiagonalCoords.push([x + 1, y + 1]);
        adjacentAndDiagonalCoords.push([x - 1, y + 1]);
        adjacentAndDiagonalCoords.push([x + 1, y - 1]);
        adjacentAndDiagonalCoords.push([x - 1, y - 1]);
        return adjacentAndDiagonalCoords;
    }

    if (cre_collection[attacker].shots === 0) {
        shootok = 0
    } else {
        let attacker_adjacent_coords = getAdjacentAndDiagonalCoords(stage.pole.obj[attacker].x, stage.pole.obj[attacker].y)
        let enemies_list = Object.values(stage.pole.obj).filter(creature => creature.side != stage.pole.obj[attacker].side)
        enemies_list.forEach(enemy => {
            attacker_adjacent_coords.forEach(coord => {
                if (coord[0] == enemy.x && coord[1] == enemy.y && ![0, -1].includes(enemy.nownumber)) shootok = 0
            })
        })
    }
    if (cre_collection[attacker]['big']) {
        if (ax > x) {
            x++;
        };
        if (ay > y) {
            y++;
        };
    };
    if (cre_collection[attacker]['bigx']) {
        if (ax > x) {
            x++;
        };
    };
    if (cre_collection[attacker]['bigy']) {
        if (ay > y) {
            y++;
        };
    };
    var spd = Math.max(0, Math.round((cre_collection[attacker].speed + cre_collection[attacker]['ragespeed'] + cre_collection[attacker]['speedaddon']) * cre_collection[attacker].speedmodifier));
    if (magic[attacker]['ent']) {
        spd = 0;
    };
    var movelen = spd - len;
    attacker_c = attacker;
    ax_c = ax;
    ay_c = ay;
    x_c = x;
    y_c = y;
    defender_c = defender;
    shootok_c = shootok;
    if ((x == 0) && (y == 0)) {
        x = cre_collection[attacker]['x'];
        y = cre_collection[attacker]['y'];
    };
    if ((defender > 0) && (cre_collection[defender]['big'])) {
        if ((x - ax > 1) && (ax < x) && (defender == mapobj[ay * defxn + ax + 1])) {
            ax++;
        };
        if ((y - ay > 1) && (ay < y) && (defender == mapobj[(ay + 1) * defxn + ax])) {
            ay++;
        };
        if ((ax - x > 1) && (ax > x) && (defender == mapobj[ay * defxn + ax - 1])) {
            ax--;
        };
        if ((ay - y > 1) && (ay > y) && (defender == mapobj[(ay - 1) * defxn + ax])) {
            ay--;
        };
    };
    if ((defender > 0) && (cre_collection[defender]['bigx'])) {
        if ((x - ax > 1) && (ax < x) && (defender == mapobj[ay * defxn + ax + 1])) {
            ax++;
        };
        if ((ax - x > 1) && (ax > x) && (defender == mapobj[ay * defxn + ax - 1])) {
            ax--;
        };
    };
    if ((defender > 0) && (cre_collection[defender]['bigy'])) {
        if ((y - ay > 1) && (ay < y) && (defender == mapobj[(ay + 1) * defxn + ax])) {
            ay++;
        };
        if ((ay - y > 1) && (ay > y) && (defender == mapobj[(ay - 1) * defxn + ax])) {
            ay--;
        };
    };
    let dx = x - ax;
    let dy = y - ay;
    l = dx * dx + dy * dy;
    if (movelen == undefined) movelen = 0;
    if (cre_distance !== "") {
        movelen = cre_distance
        l = Math.round(cre_distance * cre_distance)
        if (l > 2) shootok = 1
        else shootok = 0
        if (cre_collection[attacker].shots === 0) shootok = 0
    }
    PhysicalModifiers = 1;
    PhysicalModifiers *= koef;
    if (cre_collection[attacker]['shadowattack']) {
        l = 0;
        shootok = 0;
    }

    var hera = 0;
    var herd = 0;
    len = stage.pole.obj_array.length;
    for (var k1 = 0; k1 < len; k1++) {
        k = stage.pole.obj_array[k1];

        if ((cre_collection[k].hero) && (cre_collection[k].owner == cre_collection[attacker].owner)) hera = k;
        if ((cre_collection[k].hero) && (cre_collection[k].owner == cre_collection[defender].owner)) herd = k;
    };
    if ((cre_collection[defender]['pirate'])&&((magic[defender]['sea'])||(gtype==125)||(gtype==126)||(gtype==133)||(gtype==166))){
        PhysicalModifiers*=0.85;
    };

    if (cre_collection[defender]['deadflesh']) {
        PhysicalModifiers *= 0.8;
    };
    if (cre_collection[defender]['immaterial']) {
        PhysicalModifiers *= 0.65;
    };
    if ((cre_collection[attacker]['oppressionofweak']) && (cre_collection[defender]['level'] == 1)) {
        PhysicalModifiers *= 1.5;
    };
    if ((cre_collection[attacker]['fearofstrong']) && (cre_collection[defender]['level'] == 7)) {
        PhysicalModifiers *= 0.5;
    };

    if ((defender > 0) && (cre_collection[attacker]['sorcererslayer']) && (cre_collection[defender]['caster']) && (cre_collection[defender]['maxmanna'] > 3)) {
        PhysicalModifiers *= 1.4 + 0.02 * Math.max(0, cre_collection[defender]['maxmanna'] - cre_collection[defender]['nowmanna']);
    };
    if ((hera > 0) && (magic[hera]['bna'])) {
        PhysicalModifiers = PhysicalModifiers * (1 + magic[hera]['bna']['effect'] / 100);
        if ((cre_collection[defender]['mechanical']) && (magic[hera]['MEC'])) {
            PhysicalModifiers *= 1 + magic[hera]['MEC']['effect'] / 100;
        };
        if ((cre_collection[attacker]['mechanical']) && (magic[hera]['mch'])) {
            PhysicalModifiers *= 1 + magic[hera]['mch']['effect'] / 100;
        };
    };
    if ((cre_collection[defender]['building']) && (!cre_collection[attacker]['siegewalls'])) {
        PhysicalModifiers *= 0.05;
    };
    if ((defender > 0) && (cre_collection[attacker]['cruelty']) && ((cre_collection[defender]['nowhealth'] < cre_collection[defender]['maxhealth']) || (cre_collection[defender]['nownumber'] < cre_collection[defender]['maxnumber']))) {
        PhysicalModifiers *= 1.15;
    };
    if ((defender > 0) && (cre_collection[attacker]['morecruelty']) && ((cre_collection[defender]['nowhealth'] < cre_collection[defender]['maxhealth']) || (cre_collection[defender]['nownumber'] < cre_collection[defender]['maxnumber']))) {
        PhysicalModifiers *= 1.3;
    };
    if ((cre_collection[attacker]['giantkiller']) && (cre_collection[defender]['big'])) PhysicalModifiers *= 2;
    if ((cre_collection[attacker]['pygmykiller']) && (!cre_collection[defender]['big'])) PhysicalModifiers *= 1.33;
    if (cre_collection[attacker]['stormstrike']) PhysicalModifiers *= 2;
    if ((cre_collection[attacker]['undeadkiller']) && (cre_collection[defender]['undead'])) PhysicalModifiers *= 1.5;
    if ((cre_collection[attacker]['pirate']) && (magic[defender]['blb'])) PhysicalModifiers *= 1.5;
 if ((magic[attacker]['chd']) && (cre_collection[magic[attacker]['chd']['effect']]['nownumber'] > 0) && (magic[attacker]['chd']['effect'] != defender)) {
        PhysicalModifiers *= 0.55;
    };
    if ((magic[attacker]['jdd']) && (cre_collection[magic[attacker]['jdd']['effect']]['nownumber'] > 0) && (magic[attacker]['jdd']['effect'] == defender)) {
        PhysicalModifiers *= 0.75;
    };
    if (magic[defender]['jdd']) {
        PhysicalModifiers *= 1.2;
    };
    if ((!cre_collection[attacker]['hero']) && (magic[attacker]['zat'])) {
        PhysicalModifiers *= 1.15;
    };
    if ((herd > 0) && (magic[herd]['bnd'])) {
        PhysicalModifiers = PhysicalModifiers / (1 + magic[herd]['bnd']['effect'] / 100);
    };
    if ((herd > 0) && (magic[herd]['fld'])) {
        PhysicalModifiers = PhysicalModifiers * (1 - magic[herd]['fld']['effect'] / 100);
    };
    if ((herd > 0) && (magic[herd]['rcd']) && (monster_race[cre_collection[attacker]['id']] == magic[herd]['rcd']['effect'])) {
        PhysicalModifiers = PhysicalModifiers * 0.93;
    };
    if (magic[attacker]['prp']) {
        PhysicalModifiers = PhysicalModifiers * (1 + magic[attacker]['prp']['effect'] / 100);
    };
    if (magic[defender]['sta']) {
        PhysicalModifiers *= 0.5;
    };
    if ((magic[attacker]['chd']) && (cre_collection[magic[attacker]['chd']['effect']]['nownumber'] > 0) && (magic[attacker]['chd']['effect'] != defender)) {
        PhysicalModifiers *= 0.55;
    };
    PhysicalModifiers *= stage.pole.checkmembrane(defender);
    if (!cre_collection[attacker]['hero']) {
        if ((l <= 2 || shootok === 0) && (cre_collection[attacker]['shooter']) && (!cre_collection[attacker]['nopenalty']) && (!cre_collection[attacker]['warmachine']) && !cre_collection[attacker].shadowattack) {
            PhysicalModifiers = PhysicalModifiers * 0.5;
        };
        if ((l > 2) && (cre_collection[attacker]['rangepenalty'])) {
            PhysicalModifiers = PhysicalModifiers * 0.5;
        };
        rangemod = 1;
        if (l > 2 && (shootok !== 0 || cre_collection[attacker].shots !== 0) && (cre_collection[attacker]['shooter']) && (((cre_collection[attacker]['range'] < Math.sqrt(l)) && (!cre_collection[attacker].shadowattack)) || ((iswalls) && (!cre_collection[attacker]['hero']) && (checkwall(x, y, ax, ay))))) {
            PhysicalModifiers = PhysicalModifiers * 0.5;
            rangemod = 0.5;
        };
        if (l > 2 && (shootok !== 0 || cre_collection[attacker].shots !== 0) && (cre_collection[attacker]['shooter']) && (iswalls2) && (!cre_collection[attacker]['hero']) && (((!cre_collection[attacker].siegewalls) || (btype == 118)) || (!cre_collection[defender].stone)) && (checkwall2(x, y, ax, ay, attacker))) {
            PhysicalModifiers = PhysicalModifiers * 0.5;
            rangemod *= 0.5;
        };
    };
    var _PERK_ARCHERY = 11;
    var _PERK_EVASION = 22;
    if ((defender > 0) && ((((cre_collection[attacker].shooter && shootok == 0) || (cre_collection[attacker].shooter != 1) || cre_collection[attacker].shots == 0) && (!cre_collection[attacker]['ballista']) && (inuse != 'ssh') && (inuse != 'mga') && (inuse != 'dcd') && (inuse != 'chs') && (!cre_collection[attacker]['hero'])) || (inuse == 'brs') || (inuse == 'cpt'))) {
        if (cre_collection[defender]['dodge'])
            PhysicalModifiers *= 0.5;
        if (cre_collection[defender]['brittle'])
            PhysicalModifiers *= 1.25;
    };
    if ((shootok === 1) && (!cre_collection[attacker]['hero']) && (cre_collection[attacker]['shooter'])) {
        if (battle_is_it_perk(attacker, _PERK_ARCHERY)) PhysicalModifiers *= 1.2;
        if (battle_is_it_perk(defender, _PERK_EVASION)) PhysicalModifiers *= 0.8;
        if ((!cre_collection[defender]['lshield']) && (stage.pole.shieldother(defender))) {
            PhysicalModifiers = PhysicalModifiers * 0.75;
        };
        if ((cre_collection[defender]['lshield']) || (cre_collection[defender]['hollowbones'])) {
            PhysicalModifiers = PhysicalModifiers * 0.5;
        };
        if (cre_collection[defender]['diamondarmor']) {
            PhysicalModifiers = PhysicalModifiers * 0.1;
        };
        if (cre_collection[defender]['shielded']) {
            PhysicalModifiers = PhysicalModifiers * 0.75;
        };
        if (cre_collection[defender]['unprotectedtarget']) {
            PhysicalModifiers = PhysicalModifiers * 1.25;
        };
        if (magic[defender]['dfm']) {
            PhysicalModifiers = PhysicalModifiers * (1 - magic[defender]['dfm']['effect'] / 100);
        };
        if (magic[attacker]['cnf']) {
            PhysicalModifiers = PhysicalModifiers * (1 - magic[attacker]['cnf']['effect'] / 100);
        };

        if (hera > 0) {
            if (magic[hera]['sat']) {
                PhysicalModifiers = PhysicalModifiers * (100 + magic[hera]['sat']['effect']) / 100;
            };
        };
    };
    if ((!cre_collection[attacker]['hero']) && (battle_is_it_perk(attacker, _PERK_BLESS))) {
        PhysicalModifiers *= 1.04;
    };
    if (battle_is_it_perk(attacker, _PERK_MERCYOFCOLD) && (defender > 0) && (magic[defender]['pfr']) && (magic[defender]['pfr']['nowinit'] > 0)) {
        PhysicalModifiers *= (1 + 0.03 * magic[defender]['pfr']['effect']);
    };
    let o = cre_collection[attacker]['owner'];
    if (magic[defender]['mf' + o]) {
        PhysicalModifiers *= 1 + magic[defender]['mf' + o]['effect'] / 100;
    };
    if ((!cre_collection[attacker]['hero']) && (battle_is_it_perk(attacker, _PERK_FERVOR))) {
        PhysicalModifiers *= 1.03;
    };
    if (hera > 0) {
        var h = hera;
        if ((magic[h]['nut']) && ((plid2 == -2) || (ohotnik_set_neutral()))) {
            PhysicalModifiers = PhysicalModifiers * (100 + magic[h]['nut']['effect']) / 100;
        };
        if ((magic[h]['mle']) && ((cre_collection[attacker].shooter && shootok == 0) || (cre_collection[attacker].shooter != 1) || cre_collection[attacker].shots == 0)) {
            PhysicalModifiers = PhysicalModifiers * (100 + magic[h]['mle']['effect']) / 100;
        };
        if (magic[attacker]['fbd']) {
            PhysicalModifiers = PhysicalModifiers * (100 + Math.floor(magic[attacker]['fbd']['effect'] / 10)) / 100;
        };
    };
    let leap_atk_bonus, leap_distance = 0;

    if (cre_collection[attacker].leap && l >= 4) {
        leap_distance = cre_distance ? cre_distance : Math.min((movelen - 1) * 2, Math.round(Math.sqrt(l)));
        leap_atk_bonus = cre_collection[attacker].attack * (1 + leap_distance * 0.1) - cre_collection[attacker].attack
        cre_collection[attacker]['attackaddon'] += leap_atk_bonus
    }
    monatt = cre_collection[attacker]['attack'] + cre_collection[attacker]['attackaddon'] + cre_collection[attacker]['rageattack'];
    if ((defender > 0) && (cre_collection[attacker]['giantslayer']) && (cre_collection[defender]['big'])) monatt += 4;
    if ((!cre_collection[attacker]['undead']) && (!cre_collection[attacker]['hero']) && (!cre_collection[attacker]['perseverance'])) {
        frig2 = false;
        i = attacker;
        var bigx = cre_collection[i]['big'];
        var bigy = cre_collection[i]['big'];
        if (cre_collection[i]['bigx']) bigx = 1;
        if (cre_collection[i]['bigy']) bigy = 1;
        xd = cre_collection[i]['x'];
        yd = cre_collection[i]['y'];
        for (var xz = xd - 1; xz <= xd + 1 + bigx; xz++) {
            for (var yz = yd - 1; yz <= yd + 1 + bigy; yz++) {
                if ((!frig2) && (mapobj[yz * defxn + xz] > 0) && (cre_collection[mapobj[yz * defxn + xz]]['side'] != cre_collection[i]['side']) && (cre_collection[mapobj[yz * defxn + xz]]['festeringaura']) && (cre_collection[mapobj[yz * defxn + xz]]['nownumber'] > 0)) {
                    monatt -= 4;
                    frig2 = true;
                };
            };
        };
    };

    if ((magic[attacker]['bsr']) || (magic[attacker]['rof'])) {
        monatt += Math.floor((cre_collection[attacker]['defence'] + cre_collection[attacker]['defenceaddon'] + cre_collection[attacker]['ragedefence']) * cre_collection[attacker]['defencemodifier']);
    };
    if (herd > 0) {
        h = herd;
        if ((magic[h]['mld']) && ((cre_collection[attacker].shooter && shootok == 0) || (cre_collection[attacker].shooter != 1) || cre_collection[attacker].shots == 0)) {
            PhysicalModifiers = PhysicalModifiers * (100 - magic[h]['mld']['effect']) / 100;
        };
        if ((magic[h]['_ia']) && (!cre_collection[attacker]['perseverance'])) {
            monatt *= (1 - magic[h]['_ia']['effect'] / 100);
        };
        if ((!cre_collection[attacker]['hero']) && (cre_collection[attacker].shooter) && (cre_collection[attacker].shots != 0) && (magic[h]['msk']) && shootok == 1) {
            PhysicalModifiers = PhysicalModifiers * (100 - magic[h]['msk']['effect']) / 100;
        };
    };
      if ((l>2)&&(defender>0)&&(cre_collection[attacker]['skycontrol'])&&(cre_collection[defender]['flyer'])&&(!cre_collection[defender]['teleport'])){
         PhysicalModifiers=PhysicalModifiers*1.25;
      };

       if ((l>2)&&(defender>0)&&(cre_collection[attacker]['aimedshot'])&&(magic[attacker]['aim'])&&(magic[attacker]['ai2'])){
           var defpos = defender + (defxn*cre_collection[defender]['y'] + cre_collection[defender]['x'])*1000;
           if (defpos == cre_collection[attacker]['aim']['effect']){
               PhysicalModifiers=PhysicalModifiers*Math.pow(1.4, magic[attacker]['ai2']['effect']);
           };
       };

       if ((l>2)&&(cre_collection[attacker]['shooter'])){
			var len = stage.pole.obj_array.length;
         var z = 0;
			for (var k1=0;k1<len;k1++)
			{
				k = stage.pole.obj_array[k1];
				if ((cre_collection[k]['omnipresentgaze'])&&(cre_collection[k]['owner']==cre_collection[attacker]['owner'])&&(cre_collection[k]['nownumber']>0)){
                   PhysicalModifiers=PhysicalModifiers*1.15;
                   break;
				};
			};
       };
    defadd = 0;
    if (cre_collection[defender]['agility']) {
        if (!magic[defender]['agl']) defadd = cre_collection[defender]['speed'] * 2;
    };
    if ((cre_collection[defender]['spirit']) && (!magic[defender]['spi'])) {
        PhysicalModifiers *= 0.5;
    };
    if ((cre_collection[attacker]['rageagainsttheliving']) && (cre_collection[defender]['alive'])) {
        PhysicalModifiers *= 1.3;
    };
    if ((cre_collection[defender]['defensivestance']) && (!magic[defender]['mvd'])) {
        defadd += 5;
    };
    if ((!cre_collection[defender]['undead']) && (!cre_collection[defender]['armoured']) && (!cre_collection[defender]['organicarmor'])) {
        frig2 = false;
        i = defender;
        bigx = cre_collection[i]['big'];
        bigy = cre_collection[i]['big'];
        if (cre_collection[i]['bigx']) bigx = 1;
        if (cre_collection[i]['bigy']) bigy = 1;
        xd = cre_collection[i]['x'];
        yd = cre_collection[i]['y'];
        for (let xz = xd - 1; xz <= xd + 1 + bigx; xz++) {
            for (let yz = yd - 1; yz <= yd + 1 + bigy; yz++) {
                if ((!frig2) && (mapobj[yz * defxn + xz] > 0) && (cre_collection[mapobj[yz * defxn + xz]]['side'] != cre_collection[i]['side']) && (cre_collection[mapobj[yz * defxn + xz]]['festeringaura']) && (cre_collection[mapobj[yz * defxn + xz]]['nownumber'] > 0)) {
                    defadd -= 4;
                    frig2 = true;
                };
            };
        };
    };
    if ((attacker > 0) && (cre_collection[defender]['giantslayer']) && (cre_collection[attacker]['big'])) defadd += 4;
    mondef = Math.round((cre_collection[defender]['defence'] + cre_collection[defender]['defenceaddon'] + defadd + cre_collection[defender]['ragedefence']) * cre_collection[defender]['defencemodifier']);
    if (magic[defender]['bsr']) {
        mondef = 0;
    };

    if ((cre_collection[attacker]['preciseshot']) && (l > 2) && (l <= 9) && (rangemod >= 1)) {
        mondef = 0;
    };
    if ((cre_collection[attacker]['ignoredefence'])) {
        mondef *= (1 - cre_collection[attacker]['ignoredefence'] / 100);
    };
    if (cre_collection[attacker]['crushingleadership']) {
        var morale_delta = stage.pole.getmorale(attacker) - stage.pole.getmorale(defender);
        if (morale_delta > 0) {
            mondef *= Math.max(0, 1 - morale_delta / 10);
        };
    };
    if (cre_collection[attacker]['sacredweapon']) {
        var dark_count = get_dark_count(defender);
        if (dark_count > 0) {
            mondef *= Math.max(0, 1 - 0.15 * dark_count);
        };
    };
    if (battle_is_it_perk(attacker, _PERK_PIERCING_LUCK)) {
        mondef *= 1 - Math.max(0, 0.025 * (cre_collection[attacker]['luck'] + cre_collection[attacker]['luckaddon']));
    };
    if ((cre_collection[defender]['ignoreattack'])) {
        monatt *= (1 - cre_collection[defender]['ignoreattack'] / 100);
    };
    if ((cre_collection[attacker]['ridercharge']) && (movelen > 0)) {
        mondef = mondef * (5 - movelen) / 5;
    };
    if ((cre_collection[attacker]['forcearrow']) && (!cre_collection[defender]['armoured']) && (!cre_collection[defender]['organicarmor']) && (l > 2)) {
        mondef *= 0.8;
    };
    if ((cre_collection[attacker]['armorpiercing']) && (!cre_collection[defender]['armoured']) && (!cre_collection[defender]['organicarmor']) && (l > 2)) {
        mondef *= 0.5;
    };
    if (cre_collection[defender]['shroudofdarkness']) {
        PhysicalModifiers *= Math.max(0, 1 - 0.15 * get_dark_count(defender));
    };
    if (cre_collection[attacker]['tasteofdarkness']) {
        PhysicalModifiers *= 1 + get_dark_count(defender) * 0.12;
    };
    if ((attacker > 0) && (!cre_collection[attacker]['hero']) && (battle_is_it_perk(attacker, _PERK_FALLEN_KNIGHT)) && (defender > 0)) {
            PhysicalModifiers *= 1 + get_dark_count(defender) * 0.06;
        };
    if ((cre_collection[attacker]['jousting']) && (movelen > 0)) {
        PhysicalModifiers = PhysicalModifiers * (1 + 0.05 * movelen);
    };
    if (((cre_collection[attacker]['blindingcharge']) || (cre_collection[attacker]['charge'])) && (movelen > 0)) {
        PhysicalModifiers = PhysicalModifiers * (1 + 0.1 * movelen);
    };
    if ((cre_collection[defender]['shieldwall']) && (movelen > 0)) {
        PhysicalModifiers = PhysicalModifiers * Math.max(0.1, 1 - 0.1 * movelen);
    };
    if ((magic[defender]['enc']) && (magic[defender]['enc']['effect'] == 1)) {
        PhysicalModifiers *= 0.5;
    };
    if ((cre_collection[attacker]['safeposition']) && (movelen == 0)) {
        PhysicalModifiers *= 1.5;
    };
    if ((cre_collection[attacker]['agilesteed']) && (movelen > 0)) {
        PhysicalModifiers *= 1 - 0.05 * movelen;
    };
    if (mondef < 0) {
        mondef = 0;
    };

    air = 0;
    fire = 0;
    water = 0;
    earth = 0;
    if ((hera > 0) && (!cre_collection[attacker]['taran'])) {
        h = hera;
        if (magic[h]['_id']) {
            mondef *= (1 - magic[h]['_id']['effect'] / 100);
        };
        if (magic[h]['_aa']) {
            air = magic[h]['_aa']['effect'] / 100;
        };
        if (magic[h]['_af']) {
            fire = magic[h]['_af']['effect'] / 100;
        };
        if (magic[h]['_aw']) {
            water = magic[h]['_aw']['effect'] / 100;
        };
        if (magic[h]['_ae']) {
            earth = magic[h]['_ae']['effect'] / 100;
        };
    };
    if ((cre_collection[defender]['armoured']) || (cre_collection[defender]['organicarmor'])) {
        mondef = Math.round((cre_collection[defender]['defence'] + cre_collection[defender]['defenceaddon'] + cre_collection[defender]['ragedefence']) * cre_collection[defender]['defencemodifier']);
    };
    if (monatt < 0) {
        monatt = 0;
    };
    if (monatt > mondef) {
        AttackDefenseModifier = 1 + (monatt - mondef) * 0.05;
    } else {
        AttackDefenseModifier = 1 / (1 + (mondef - monatt) * 0.05);
    };
    if (cre_collection[attacker]['hero']) {
        AttackDefenseModifier = 1;
    };
    var _PERK_ATTACK1 = 8;
    var _PERK_ATTACK2 = 9;
    var _PERK_ATTACK3 = 10;
    var _PERK_DEFENSE1 = 19;
    var _PERK_DEFENSE2 = 20;
    var _PERK_DEFENSE3 = 21;

    if ((!cre_collection[attacker]['hero']) && ((cre_collection[attacker].shooter && shootok == 0) || (cre_collection[attacker].shooter != 1))) {
        if (battle_is_it_perk(attacker, _PERK_ATTACK3)) {
            PhysicalModifiers *= 1.3;
        } else {
            if (battle_is_it_perk(attacker, _PERK_ATTACK2)) {
                PhysicalModifiers *= 1.2;
            } else
                if (battle_is_it_perk(attacker, _PERK_ATTACK1)) PhysicalModifiers *= 1.1;
        };
        if (battle_is_it_perk(defender, _PERK_DEFENSE3)) {
            PhysicalModifiers *= 0.7;
        } else {
            if (battle_is_it_perk(defender, _PERK_DEFENSE2)) {
                PhysicalModifiers *= 0.8;
            } else {
                if (battle_is_it_perk(defender, _PERK_DEFENSE1)) PhysicalModifiers *= 0.9;
            };
        };
    };
    if ((cre_collection[attacker]['siegewalls']) && (cre_collection[defender]['stone'])) {
        PhysicalModifiers *= 10;
    };
    var _PERK_COLD_STEEL = 14;
    var _PERK_FIERY_WRATH = 101;
    var _PERK_HELLFIRE_AURA = 123;
    var _PERK_RETRIBUTION = 16;

    if (battle_is_it_perk(attacker, _PERK_COLD_STEEL)) water = 1 - (1 - water) * (0.9);
    if (battle_is_it_perk(attacker, _PERK_FIERY_WRATH)) fire = 1 - (1 - fire) * (0.85);
    if (battle_is_it_perk(attacker, _PERK_HELLFIRE_AURA)) fire = 1 - (1 - fire) * (0.95);

    if (magic[attacker]['cre']) {
        air = 1 - (1 - air) * (1 - magic[attacker]['cre']['effect'] / 100);
    };

    if (battle_is_it_perk(attacker, _PERK_RETRIBUTION)) PhysicalModifiers *= (1 + Math.min(Math.max(stage.pole.getmorale(attacker, x, y), 0), 5) / 20);
    if ((cre_collection[attacker]['viciousstrike']) && (Math.max(0, Math.round((cre_collection[defender]['speed'] + cre_collection[defender]['ragespeed'] + cre_collection[defender]['speedaddon']) * cre_collection[defender]['speedmodifier'])) == 0)) PhysicalModifiers *= 1.5;
    PhysicalModifiers *= stage.pole.magicmod(attacker, defender, fire, air, water, earth, 0.1);
    if ((cre_collection[attacker]['bloodfrenzy']) && (magic[defender]['fd1'])) {
        PhysicalModifiers *= 1.3;
    };
    UmelkaModifiers = 1;

    if ((umelka[cre_collection[attacker]['owner']][0] > 0) && (umelka[cre_collection[defender]['owner']][0] > 0)) {
        k = umelka[cre_collection[attacker]['owner']][0];
        if ((k > 0) && (k < 11)) {
            let j = umelka[cre_collection[defender]['owner']][k];
            UmelkaModifiers = 1 - j * 0.03;
        };
    };
    NumCreatures = cre_collection[attacker]['nownumber'];
    let tsc = 0;

    bigx = cre_collection[defender]['big'];
    bigy = cre_collection[defender]['big'];
    if (cre_collection[defender]['bigx']) bigx = 1;
    if (cre_collection[defender]['bigy']) bigy = 1;
    for (var xs = cre_collection[defender]['x'] - 1; xs <= cre_collection[defender]['x'] + 1 + bigx; xs++) {
        for (var ys = cre_collection[defender]['y'] - 1; ys <= cre_collection[defender]['y'] + 1 + bigy; ys++) {
            if ((mapobj[xs + ys * defxn] > 0) && (mapobj[xs + ys * defxn] != defender) && (cre_collection[mapobj[xs + ys * defxn]]['shieldguard']) && (cre_collection[defender]['side'] == cre_collection[mapobj[xs + ys * defxn]]['side'])) {
                tsc++;
            };
        };
    };


    PhysicalModifiers /= (tsc + 1);

    var minmag = 0;
    var maxmag = 0;
    if ((inuse == 'lep') && (cre_collection[attacker]['crashingleap'])) {
        Totalmagicdamage = 0;
        cre_collection[defender]['attacked'] = 1;
        stage.pole.attackmagic(attacker, defender, cre_collection[attacker]['nownumber'] * 4, 'cold', '', 0, 0, 0);
        minmag = Totalmagicdamage;
        Totalmagicdamage = 0;
        cre_collection[defender]['attacked'] = 1;
        stage.pole.attackmagic(attacker, defender, cre_collection[attacker]['nownumber'] * 6, 'cold', '', 0, 0, 0);
        maxmag = Totalmagicdamage;
    };

    mindam = cre_collection[attacker]['mindam'] + cre_collection[attacker]['damageaddon'] + (cre_collection[attacker]['maxdam'] - cre_collection[attacker]['mindam']) * (cre_collection[attacker]['mindamaddon']) + cre_collection[attacker]['ragedamage'];
    maxdam = cre_collection[attacker]['maxdam'] + cre_collection[attacker]['damageaddon'] - (cre_collection[attacker]['maxdam'] - cre_collection[attacker]['mindam']) * (cre_collection[attacker]['maxdamaddon']) + cre_collection[attacker]['ragedamage'];
    h = hera;
    if ((h > 0) && (magic[h]) && (magic[h]['BLS']) && (magic[h]['BLS']['effect'] > 0)) mindam = maxdam;
    if ((h > 0) && (magic[h]) && (magic[h]['CRS']) && (magic[h]['CRS']['effect'] > 0)) maxdam = mindam;
    if ((cre_collection[attacker]['taran']) && (cre_collection[defender]['stone'])) {
        h = hera;
        mindam = Math.floor(Math.pow(cre_collection[h]['maxhealth'], 0.5) * 200 * cre_collection[attacker]['mindam']);
        maxdam = Math.floor(Math.pow(cre_collection[h]['maxhealth'], 0.5) * 400 * cre_collection[attacker]['maxdam']);
    };
    if (cre_collection[attacker]['accuracy']) mindam = maxdam;
    BaseDamage = mindam;
    PhysicalDamage = NumCreatures * BaseDamage * AttackDefenseModifier * PhysicalModifiers * UmelkaModifiers + minmag;
    PhysicalDamage2 = NumCreatures * maxdam * AttackDefenseModifier * PhysicalModifiers * UmelkaModifiers + maxmag;
    if ((cre_collection[attacker]['deathstrike']) && (cre_collection[defender]['maxhealth'] < 400) && (!cre_collection[defender]['stone'])) {
        if ((cre_collection[defender]['nownumber'] - 1) * cre_collection[defender]['maxhealth'] + cre_collection[defender]['nowhealth'] > PhysicalDamage) {
            PhysicalDamage += cre_collection[defender]['maxhealth'] - PhysicalDamage % cre_collection[defender]['maxhealth'];
        };
        if ((cre_collection[defender]['nownumber'] - 1) * cre_collection[defender]['maxhealth'] + cre_collection[defender]['nowhealth'] > PhysicalDamage2) {
            PhysicalDamage2 += cre_collection[defender]['maxhealth'] - PhysicalDamage2 % cre_collection[defender]['maxhealth'];
        };
    };

    if (cre_collection[attacker]['bladeofslaughter']) {
        PhysicalDamage += Math.min(500, cre_collection[defender]['nownumber'] * 2);
        PhysicalDamage2 += Math.min(500, cre_collection[defender]['nownumber'] * 2);
    };
    if (magic[attacker]['brk']) {
        PhysicalDamage *= (1 + magic[attacker]['brk']['effect'] * 0.03);
        PhysicalDamage2 *= (1 + magic[attacker]['brk']['effect'] * 0.03);
    };
    if (PhysicalDamage < 1) {
        PhysicalDamage = 1;
    };
    if (PhysicalDamage2 < 1) {
        PhysicalDamage2 = 1;
    };
    if ((cre_collection[attacker]['magicattack']) && (l > 2) && (stage.pole.issomething(defender, 'dampenmagic'))) PhysicalDamage = 0;
    if (magic[defender]['rag']) {
        PhysicalDamage = stage.pole.ragedamage(defender, PhysicalDamage);
        PhysicalDamage2 = stage.pole.ragedamage(defender, PhysicalDamage2);
    };
    if ((cre_collection[attacker]['vorpalsword']) && (cre_collection[defender]['maxhealth'] < 400) && (!cre_collection[defender]['stone'])) {
        PhysicalDamage += cre_collection[defender]['maxhealth'];
        PhysicalDamage2 += cre_collection[defender]['maxhealth'];
    };

    PhysicalDamage = Math.round(PhysicalDamage);
    PhysicalDamage2 = Math.round(PhysicalDamage2);
    if (cre_collection[defender]['pleasureinpain']) {
        PhysicalDamage = Math.round(PhysicalDamage * 0.9);
        PhysicalDamage2 = Math.round(PhysicalDamage2 * 0.9);
    };
    if (cre_collection[defender]['raptureinagony']) {
        PhysicalDamage = Math.round(PhysicalDamage * 0.8);
        PhysicalDamage2 = Math.round(PhysicalDamage2 * 0.8);
    };
    var totalh = (cre_collection[defender]['nownumber'] - 1) * cre_collection[defender]['maxhealth'] + cre_collection[defender]['nowhealth'];
    Uronkills = Math.floor(Math.min(PhysicalDamage, totalh) / cre_collection[defender]['maxhealth']);
    Uronkills2 = Math.floor(Math.min(PhysicalDamage2, totalh) / cre_collection[defender]['maxhealth']);
    var nowhealth = cre_collection[defender]['nowhealth'] - (Math.min(PhysicalDamage, totalh) - Uronkills * cre_collection[defender]['maxhealth']);
    var nowhealth2 = cre_collection[defender]['nowhealth'] - (Math.min(PhysicalDamage2, totalh) - Uronkills2 * cre_collection[defender]['maxhealth']);
    if (nowhealth <= 0) Uronkills++;
    if (nowhealth2 <= 0) Uronkills2++;
    tUronkills += Uronkills;
    tUronkills2 += Uronkills2;
    tPhysicalDamage += PhysicalDamage;
    tPhysicalDamage2 += PhysicalDamage2;
    if (![0, 1].includes(leap_distance)) cre_collection[attacker].attackaddon -= leap_atk_bonus;
    let leap_display_distance = ""
    if (leap_atk_bonus) leap_display_distance = cre_distance ? "" : leap_distance;
    return { distance: leap_display_distance, leap_atk_bonus: leap_atk_bonus }
}

function get_dmg_info(attacker_obj_index, defender_obj_index, koef = 1) {
    let cre_collection = stage.pole.obj
    let attacker = cre_collection[attacker_obj_index]
    let defender = cre_collection[defender_obj_index]
    let dmg_dict = attackmonster(attacker_obj_index, attacker.x, attacker.y, defender.x, defender.y, defender_obj_index, GM_getValue("cre_distance"), 1, koef);
    let min_damage = PhysicalDamage
    let max_damage = PhysicalDamage2
    let min_killed, max_killed;
    if (min_damage % defender.maxhealth >= defender.nowhealth) min_killed = Math.floor(min_damage / defender.maxhealth) + 1
    else min_killed = Math.floor(min_damage / defender.maxhealth)
    if (max_damage % defender.maxhealth >= defender.nowhealth) max_killed = Math.floor(max_damage / defender.maxhealth) + 1
    else max_killed = Math.floor(max_damage / defender.maxhealth)
    return { min: min_damage, max: max_damage, min_killed: min_killed, max_killed: max_killed, distance: dmg_dict.distance }
}

let defender_obj_id = 0
let selected_id = 0

function refresh() {
    isOpen = true;
    let cre_collection = stage.pole.obj;

    if (cre_distance_on) {
        cre_distance_div.style.display = "inline";
        cre_distance_div.innerHTML = `<span>${t('chosenDistance')}: ${GM_getValue('cre_distance')}</span><br>`;
    }

    set_Display([select, side_button, collapse_button, document.querySelector("#chosen_cre_heading"), dmg_list_container, individual_calc], "inline");

    refresh_button.innerHTML = "🔄";

    let cre_list = Object.values(cre_collection);
    cre_list.sort((a, b) => a.obj_index - b.obj_index);

    dmg_list_container.innerHTML = "";
    [...select.children].forEach(child => child.remove());

    let found_defender = false;

    cre_list.forEach(defender => {
        if (defender.nownumber > 0 && defender.nametxt != "" && defender.side == chosen.side && defender.hero === undefined) {
            let option_id = `cre_no${cre_list.indexOf(defender)}`;
            select.insertAdjacentHTML("beforeend",
                                      `<option id="${option_id}" value="${defender.obj_index}">
                    ${defender.nametxt} [${defender.nownumber}]
                </option>`
                                     );

            if (!found_defender) {
                if (`${defender.obj_index}` == chosen.creature) found_defender = true;
                defender_obj_id = defender.obj_index;
                selected_id = [...select.children].indexOf(select.lastChild);
            }
        }
    });

    dmg_list_container.insertAdjacentHTML("beforeend", `
        <div id="chosen_cre_heading" style="display:inline; background-color: ${physCalcColor}">
            <span>${t("damageTo")} </span>
            <span style="color:#ffffff; font-size: 110%; font-weight: bold;">
                ${cre_collection[defender_obj_id].nametxt} [${cre_collection[defender_obj_id].nownumber}] :
            </span>
        </div>
    `);

    /* ===========================
       COLLECT + CALCULATE
    ============================ */

    let attackerRows = [];

    cre_list.forEach(attacker => {
        if (attacker.side == -chosen.side && attacker.nownumber > 0 && attacker.nametxt != "") {
            let dmg = get_dmg_info(attacker.obj_index, defender_obj_id);
            let practical_overall_hp;

            if (cre_collection[defender_obj_id].attack > attacker.defence) {
                practical_overall_hp = attacker.maxhealth * attacker.nownumber /
                    (1 + 0.05 * Math.abs(cre_collection[defender_obj_id].attack - attacker.defence));
            } else {
                practical_overall_hp = attacker.maxhealth * attacker.nownumber *
                    (1 + 0.05 * Math.abs(cre_collection[defender_obj_id].attack - attacker.defence));
            }

            let coef = evalStrength(attacker, cre_collection[defender_obj_id]).koef;

            attackerRows.push({ attacker, dmg, coef });
        }
    });


    attackerRows.sort((a, b) => b.coef - a.coef);
    const color1 = "#1a1a1a"; // dark row
    const color2 = "#262626"; // slightly lighter row

    attackerRows.forEach((row, index) => {
        let { attacker, dmg, coef } = row;

        let row_id = `row_no${index}`;
        let koef_string = `<span title="коэф. урона">⚖️</span><b style="color:white">${coef.toFixed(2)}</b>`;

        // pick alternating background color
        let bgColor = index % 2 === 0 ? color1 : color2;

        dmg_list_container.insertAdjacentHTML("beforeend", `
            <p id="${row_id}" style="color:white; background-color:${bgColor}; padding:2px 5px; margin:0;">
                <span style="text-decoration: underline;color:#bfbfbf">${attacker.nametxt}</span>
                [${attacker.nownumber}] |
                ${icons.dead.html}<b style="color:#bfbfbf">${dmg.min_killed}-${dmg.max_killed}</b>
                 ${icons.damage.html}${dmg.min}-${dmg.max}
                ${!attacker.hero ? koef_string : ""}
            </p>
        `);

        dmg_list_container.insertAdjacentHTML("beforeend",
                                              calcHellFireHTML(attacker, cre_collection[defender_obj_id], cre_collection, dmg)
                                             );

        dmg_list_container.insertAdjacentHTML("beforeend",
                                              calcStormHTML(attacker, cre_collection[defender_obj_id])
                                             );

            dmg_list_container.insertAdjacentHTML("beforeend",
                                                  calcMagicHTML(attacker, cre_collection[defender_obj_id], cre_collection, dmg)
                                                 );
    });

    select.options.item(selected_id).selected = true;
}
function openHwmkbOverlay() {
    // Don't inject twice
    if (document.getElementById("hwmkb_overlay_host")) return;

    // Host fixed overlay (in real DOM)
    const host = document.createElement("div");
    host.id = "hwmkb_overlay_host";
    host.style.cssText = "position:fixed;left:16px;top:16px;z-index:2147483647;";
    document.body.appendChild(host);

    // Shadow root = isolation from page CSS + no ID collisions
    const shadow = host.attachShadow({ mode: "open" });

    shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: Arial, sans-serif; }

      /* backdrop */
      #backdrop{
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.25);
      }

      /* panel */
      #panel{
        position: fixed;
        left: 16px; top: 16px;
        max-width: 720px;
        padding: 14px;
        color: #fff;
        background: #2b2b2b;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 10px;
      }

      #header{
        display:flex; align-items:center; justify-content:space-between;
        gap: 10px;
        margin-bottom: 8px;
        user-select: none;
        cursor: move;
      }
        #closeBtn{
        margin-left: auto;
        cursor:pointer;
        border:1px solid rgba(255,255,255,0.25);
        background:rgba(0,0,0,0.25);
        color:#fff;
        border-radius:6px;
        padding:2px 8px;
        }

      .sep{ height:1px; background:rgba(255,255,255,0.18); margin:10px 0; }
      .row{ margin: 6px 0; }

      /* checkbox */
      .checkbox_container{
        display: inline-flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        user-select:none;
        position: relative;
        padding-left: 30px;
        line-height: 20px;
      }
      .checkbox_container input{
        position:absolute;
        opacity:0;
        cursor:pointer;
        height:0;
        width:0;
      }
      .checkbox_checkmark{
        position:absolute;
        left:0;
        top:50%;
        transform: translateY(-50%);
        height:18px;
        width:18px;
        border-radius:4px;
        border:1px solid rgba(255,255,255,0.25);
        background: rgba(0,0,0,0.25);
      }
      .checkbox_container input:checked ~ .checkbox_checkmark:after{
        content:"";
        position:absolute;
        left:6px;
        top:2px;
        width:5px;
        height:10px;
        border: solid rgba(255,215,0,0.95);
        border-width:0 2px 2px 0;
        transform: rotate(45deg);
      }

      /* keybind layout */
      .kb_row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin: 6px 0; }
      .kb_left { flex:1 1 auto; }
      .kb_btn{
        flex:0 0 auto;
        min-width: 150px;
        text-align: center;
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.25);
        background: rgba(0,0,0,0.25);
        color: #fff;
        cursor: pointer;
        user-select: none;
      }
      .kb_btn.kb_listen { outline: 2px solid rgba(255,215,0,0.6); }
      .kb_btn.kb_warn { outline: 2px solid rgba(255,60,60,0.85); border-color: rgba(255,60,60,0.85); }

      /* toast */
      #toast{
        position: fixed;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        border: 1px solid rgba(255,255,255,0.2);
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 160ms ease;
        font-size: 14px;
      }
      #toast.show{ opacity: 1; }
      .hint{ opacity:0.75; font-size: 90%; margin: 4px 0 8px; }
    </style>

    <div id="backdrop"></div>

    <div id="panel">
      <div id="header">
        <button id="closeBtn" type="button">✕</button>
      </div>
      <div class="hint" id="kb_hint"></div>
      <div class="kb_row">
        <div class="kb_left" id="lbl_damage"></div>
        <div class="kb_btn" id="kb_seeDamage_btn" data-kb="kb_seeDamage"></div>
      </div>
      <div class="kb_row">
        <div class="kb_left" id="lbl_filterLog"></div>
        <div class="kb_btn" id="kb_filterLog_btn" data-kb="kb_filterLog"></div>
      </div>

      <div class="kb_row">
        <div class="kb_left" id="lbl_magshot"></div>
        <div class="kb_btn" id="kb_seeMagShot_btn" data-kb="kb_seeMagShot"></div>
      </div>
      <div class="row">
        <label class="checkbox_container">
          <span id="kb_useTrigger_text"></span>
          <input type="checkbox" id="kb_useTrigger_checkbox" checked="true">
          <span class="checkbox_checkmark"></span>
        </label>
      </div>
      <div class="kb_row">
        <div class="kb_left" id="lbl_trigger"></div>
        <div class="kb_btn" id="kb_triggerKey_btn" data-kb="kb_triggerKey"></div>
      </div>
      <div class="kb_row">
        <div class="kb_left" id="lbl_autobattle"></div>
        <div class="kb_btn" id="kb_autoBattle_btn" data-kb="kb_autoBattle"></div>
      </div>

      <div class="kb_row">
        <div class="kb_left" id="lbl_togglespeed"></div>
        <div class="kb_btn" id="kb_toggleSpeed_btn" data-kb="kb_toggleSpeed"></div>
      </div>

      <div class="kb_row">
        <div class="kb_left" id="lbl_autoplacement"></div>
        <div class="kb_btn" id="kb_autoPlacement_btn" data-kb="kb_autoPlacement"></div>
      </div>

      <div class="kb_row">
        <div class="kb_left" id="lbl_back"></div>
        <div class="kb_btn" id="kb_backToGame_btn" data-kb="kb_backToGame"></div>
      </div>

      <div class="kb_row">
        <div class="kb_left" id="lbl_startbattle"></div>
        <div class="kb_btn" id="kb_startBattle_btn" data-kb="kb_startBattle"></div>
      </div>
    </div>

    <div id="toast"></div>
  `;

    // ---- scoped helpers ----
    const $ = (sel) => shadow.querySelector(sel);

    const backdrop = $("#backdrop");
    const panel = $("#panel");
    const header = $("#header");
    const closeBtn = $("#closeBtn");
    const toast = $("#toast");

    function close() {
        host.remove();
    }
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);

    // Drag panel (fixed)
    (function draggable(){
        let dragging = false, sx = 0, sy = 0, sl = 16, st = 16;

        header.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            dragging = true;
            sx = e.clientX; sy = e.clientY;
            sl = parseInt(panel.style.left || "16", 10);
            st = parseInt(panel.style.top || "16", 10);
            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!dragging) return;
            panel.style.left = (sl + (e.clientX - sx)) + "px";
            panel.style.top  = (st + (e.clientY - sy)) + "px";
        }, true);

        document.addEventListener("mouseup", () => { dragging = false; }, true);
    })();

    function showToast(msg){
        toast.textContent = msg;
        toast.classList.add("show");
        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => toast.classList.remove("show"), 900);
    }

    // ---- I18N (for demo). In your real script: use your existing I18N+t() ----

    // Populate labels (THIS is where you were failing before due to ID collisions / CSS overrides)
    $("#kb_hint").textContent = t("keybindHint");
    $("#kb_useTrigger_text").textContent = t("keybindUseTriggerLabel");
    $("#lbl_trigger").textContent = t("keybindTriggerLabel");
    $("#lbl_damage").textContent = t("keybindSeeDamageLabel");
    $("#lbl_magshot").textContent = t("keybindSeeMagShotLabel");
    $("#lbl_autobattle").textContent = t("keybindAutoBattleLabel");
    $("#lbl_togglespeed").textContent = t("keybindToggleSpeedLabel");
    $("#lbl_autoplacement").textContent = t("keybindAutoPlacementLabel");
    $("#lbl_back").textContent = t("keybindBackToGameLabel");
    $("#lbl_startbattle").textContent = t("keybindStartBattleLabel");
    $("#lbl_filterLog").textContent = t("keybindFilterLog");
    $("#kb_useTrigger_checkbox").checked = kb.useTrigger;
    const setBool = (key, val) => GM_setValue(key, String(!!val));

    function prettyKeyNameFromCode(code){
        if (!Number.isFinite(code)) return t("keybindUnassigned");
        const specials = { 18:"Alt", 17:"Ctrl", 16:"Shift", 32:"Space", 13:"Enter", 27:"Escape",
                          37:"ArrowLeft", 38:"ArrowUp", 39:"ArrowRight", 40:"ArrowDown" };
        if (specials[code]) return specials[code];
        if (code >= 48 && code <= 57) return String.fromCharCode(code);
        if (code >= 65 && code <= 90) return String.fromCharCode(code);
        if (code >= 112 && code <= 123) return "F" + (code - 111);
        return "Code " + code;
    }

    function bindMap(){
        return {
            kb_triggerKey: kb.triggerKey,
            kb_seeDamage: kb.seeDamage,
            kb_seeMagShot: kb.seeMagShot,
            kb_autoBattle: kb.autoBattle,
            kb_toggleSpeed: kb.toggleSpeed,
            kb_autoPlacement: kb.autoPlacement,
            kb_backToGame: kb.backToGame,
            kb_startBattle: kb.startBattle,
            kb_filterLog: kb.filterLog,
        };
    }

    function setBindAndSync(key, code){
        setBindCode(key, Number.isFinite(code) ? code : null);
        kb.triggerKey     = getBindCode("kb_triggerKey", kb.triggerKey);
        kb.seeDamage      = getBindCode("kb_seeDamage", kb.seeDamage);
        kb.seeMagShot     = getBindCode("kb_seeMagShot", kb.seeMagShot);
        kb.autoBattle     = getBindCode("kb_autoBattle", kb.autoBattle);
        kb.toggleSpeed    = getBindCode("kb_toggleSpeed", kb.toggleSpeed);
        kb.autoPlacement  = getBindCode("kb_autoPlacement", kb.autoPlacement);
        kb.backToGame     = getBindCode("kb_backToGame", kb.backToGame);
        kb.startBattle    = getBindCode("kb_startBattle", kb.startBattle);
        kb.useTrigger     = getBool("kb_useTrigger", kb.useTrigger);
        kb.filterLog      = getBindCode("kb_filterLog", kb.filterLog);
    }

    function refreshUI(){
        const map = bindMap();
        for (const [k, v] of Object.entries(map)){
            const btn = shadow.getElementById(k + "_btn");
            if (btn) btn.textContent = prettyKeyNameFromCode(v);
        }
        shadow.getElementById("kb_useTrigger_checkbox").checked = !!kb.useTrigger;
    }

    function flashRed(key){
        const btn = shadow.getElementById(key + "_btn");
        if (!btn) return;
        btn.classList.add("kb_warn");
        setTimeout(() => btn.classList.remove("kb_warn"), 700);
    }

    function enforceUniqueness(newKey, code){
        const map = bindMap();
        for (const [k, v] of Object.entries(map)){
            if (k !== newKey && v === code) {
                setBindAndSync(k, NaN);
                flashRed(k);
                break;
            }
        }
    }

    // Record behavior (scoped to panel)
    let listeningBtn = null;

    function stopListening(restore){
        if (listeningBtn) {
            listeningBtn.classList.remove("kb_listen");
            if (restore) refreshUI();
        }
        listeningBtn = null;
    }

    panel.addEventListener("click", (e) => {
        const btn = e.target && e.target.classList && e.target.classList.contains("kb_btn") ? e.target : null;
        if (!btn) return;

        if (listeningBtn === btn) {
            stopListening(true);
            return;
        }
        stopListening(true);

        listeningBtn = btn;
        listeningBtn.classList.add("kb_listen");
        listeningBtn.textContent = "…";
    }, true);

    document.addEventListener("keydown", (e) => {
        if (!listeningBtn || isChatFocused()) return;

        // Don't steal typing (optional)
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
        if (tag === "input" || tag === "textarea") return;

        e.preventDefault();
        e.stopPropagation();

        const code = Number(e.keyCode);
        if (!Number.isFinite(code) || code === 0) {
            showToast(t("keybindInvalid"));
            stopListening(true);
            return;
        }

        const newKey = listeningBtn.dataset.kb;
        enforceUniqueness(newKey, code);
        setBindAndSync(newKey, code);
        stopListening(true);
    }, true);

    shadow.getElementById("kb_useTrigger_checkbox").addEventListener("change", (e) => {
        kb.useTrigger = !!e.target.checked;

        setBool("kb_useTrigger", kb.useTrigger);
    });

    refreshUI();
}
initGates();