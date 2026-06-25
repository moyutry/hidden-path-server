const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { Client, GatewayIntentBits, AttachmentBuilder, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mongoose = require('mongoose'); // הספרייה שמדברת עם מסד הנתונים
const { createCanvas, loadImage } = require('canvas');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// אישור אבטחה לדיסקורד (CSP) - חובה!
// ==========================================
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: blob: https://cdn.discordapp.com; " +
        "connect-src 'self' https://discord.com;"
    );
    next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. חיבור למסד הנתונים בענן (MongoDB Atlas)
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('📦 Connected to MongoDB Database!'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// יצירת "תבנית השחקן" (מה נשמר לכל שחקן בדאטא-בייס)
const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    coins: { type: Number, default: 0 }, 
    triesLeft: { type: Number, default: 5 }, 
    lastPlayedDay: { type: Number, default: -1 }, 
    streak: { type: Number, default: 0 }, // סטרייק יומי!
    lastSolvedLevel: { type: Number, default: -1 },
    unlockedSkins: { type: [String], default: ['default'] },
    currentSkin: { type: String, default: 'default' },
    unlockedPacks: { type: [String], default: ['default'] },
    currentPack: { type: String, default: 'default' },
    unlockedBGs: { type: [String], default: ['default'] },
    currentBG: { type: String, default: 'default' },
    // כאן השרת שומר את תוצאות היום כדי שנוכל לשתף אותן שוב עם /share
    todayStats: { type: mongoose.Schema.Types.Mixed, default: null } 
});
const User = mongoose.model('User', userSchema);

// ==========================================
// 2. הבוט של דיסקורד (רץ ברקע תמיד)
// ==========================================
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

client.once('ready', async () => {
    console.log(`🤖 Discord Bot is ONLINE as ${client.user.tag}!`);
    try {
        await client.application.commands.create({ name: 'pathway', description: 'Start playing The Hidden Path!' });
        await client.application.commands.create({ name: 'share', description: 'Share your daily Hidden Path result!' });
    } catch (e) { console.error("Could not register command:", e); }
});

client.on('interactionCreate', async interaction => {
    // טיפול בלחיצה על כפתור ה-Play Now!
    if (interaction.isButton() && interaction.customId === 'launch_game') {
        try {
            await client.rest.post(Routes.interactionCallback(interaction.id, interaction.token), { body: { type: 12 } });
        } catch (e) { console.error("Button Launch Error", e); }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'pathway') {
        try {
            await client.rest.post(Routes.interactionCallback(interaction.id, interaction.token), { body: { type: 12 } });
        } catch (e) {
            await interaction.reply({ content: '🚀 **Ready to play?** Click the Rocket Icon below the chat!', ephemeral: true });
        }
    }

    if (interaction.commandName === 'share') {
        let player = await User.findOne({ discordId: interaction.user.id });
        const todayLevel = getTodayShopAndLevel().levelNumber;
        
        const playNowRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('launch_game').setLabel('▶️ Play Now').setStyle(ButtonStyle.Success)
        );

        if (!player || !player.todayStats || player.lastPlayedDay !== todayLevel) {
            return interaction.reply({
                content: 'You haven\'t finished today\'s level yet! Play the game first to share your stats.',
                ephemeral: true,
                components: [playNowRow]
            });
        }

        await interaction.deferReply();
        const member = interaction.member;
        const buffer = await generateResultImage(player.todayStats, player.streak, member);
        const attachment = new AttachmentBuilder(buffer, { name: 'result.png' });

        const winPhrases = ["cooked this! 🔥", "destroyed the level! 🚀", "is a pure genius! 🧠", "crushed it! 🏆"];
        const losePhrases = ["got lost in the path... 💀", "needs to try again tomorrow. 🔄", "was defeated by the map. 📉"];
        const phrase = player.todayStats.isWin ? winPhrases[Math.floor(Math.random() * winPhrases.length)] : losePhrases[Math.floor(Math.random() * losePhrases.length)];

        await interaction.editReply({
            content: `**${member ? member.displayName : "Player"}** ${phrase}`,
            files: [attachment],
            components: [playNowRow] // מוסיף את כפתור הפליי מתחת לתמונה!
        });
    }
});

client.login(process.env.DISCORD_TOKEN).catch(err => console.error("Bot Login Error:", err));

// ==========================================
// 3. ה"מוח" המאובטח שמקשר בין המשחק לנתונים (API)
// ==========================================

function getShopConfig() {
    try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'shop.json'), 'utf8')); }
    catch (e) { console.error("Error reading shop.json", e); return { skins: [], packs: [], bgs: [] }; }
}

// ==========================================
// 3. ה"מוח" המאובטח שמקשר בין המשחק לנתונים (API)
// ==========================================
const tokenCache = new Map();

async function authenticateUser(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send("No token provided");
    if (tokenCache.has(token)) { req.discordId = tokenCache.get(token); return next(); }
    try {
        const userResponse = await fetch('https://discord.com/api/users/@me', { headers: { 'Authorization': token } });
        if (!userResponse.ok) return res.status(401).send("Invalid token");
        const userData = await userResponse.json();
        tokenCache.set(token, userData.id); req.discordId = userData.id; next();
    } catch (err) { res.status(500).send("Auth error"); }
}

app.post('/api/token', async (req, res) => {
    try {
        const response = await fetch(`https://discord.com/api/oauth2/token`, {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET, grant_type: 'authorization_code', code: req.body.code }),
        });
        const data = await response.json(); res.send({ access_token: data.access_token });
    } catch (error) { res.status(500).send("Error fetching token"); }
});

// --- מנוע ייצור השלבים מאובטח בשרת! אף האקר לא יכול לראות את הקוד הזה ---
class ServerLevelGenerator {
    constructor() { this.gridSize = 7; this.generateProceduralLevel(); }
    rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    shuffle(arr) { for(let i = arr.length - 1; i > 0; i--) { const j = this.rand(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

    generateProceduralLevel() {
        let validMap = false; let attempts = 0;
        while (!validMap && attempts < 1500) {
            attempts++;
            this.mapData = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(1));
            this.spikeTraps = []; this.crystalsLogic = []; this.bridgeLogic = null;
            
            // מבוך
            let stack = [{x: 0, y: 6}]; this.mapData[6][0] = 0;
            let visited = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(false)); visited[6][0] = true;
            while (stack.length > 0) {
                let current = stack[stack.length - 1]; let neighbors = [];
                [[0, -2], [0, 2], [-2, 0], [2, 0]].forEach(d => {
                    let nx = current.x + d[0], ny = current.y + d[1];
                    if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize && !visited[ny][nx]) neighbors.push({ x: nx, y: ny, dx: d[0], dy: d[1] });
                });
                if (neighbors.length > 0) {
                    let next = neighbors[Math.floor(Math.random() * neighbors.length)];
                    this.mapData[current.y + next.dy / 2][current.x + next.dx / 2] = 0; this.mapData[next.y][next.x] = 0; visited[next.y][next.x] = true; stack.push(next);
                } else stack.pop();
            }

            // נהר וגשרים
            let riverRand = Math.random(); this.riverData = { type: 'none', pos: -1 };
            if (riverRand < 0.4) { this.riverData = { type: 'horizontal', pos: this.rand(2, 4) }; this.carveRiver(); }
            else if (riverRand < 0.8) { this.riverData = { type: 'vertical', pos: this.rand(2, 4) }; this.carveRiver(); }

            // מלכודות וקריסטלים
            let emptySpots = [];
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    let onRiver = (this.riverData.type === 'horizontal' && y === this.riverData.pos) || (this.riverData.type === 'vertical' && x === this.riverData.pos);
                    if (this.mapData[y][x] === 0 && !onRiver && !(x === 0 && y === 6) && !(x === 6 && y === 0)) emptySpots.push({x, y});
                }
            }
            this.shuffle(emptySpots);
            for (let i = 0; i < 3 && i < emptySpots.length; i++) {
                this.crystalsLogic.push({ x: emptySpots[i].x, y: emptySpots[i].y, collected: false });
                if (Math.random() > 0.3) {
                    let gx = emptySpots[i].x, gy = emptySpots[i].y;
                    let initActive = Math.random() > 0.5;
                    this.mapData[gy][gx] = 3;
                    this.spikeTraps.push({ x: gx, y: gy, active: initActive, initialActive: initActive });
                }
            }

            this.mapData[6][0] = 0; this.mapData[0][6] = 9;
            let evalRes = this.evaluateMapLogics();
            if (evalRes.isValid) { validMap = true; this.parScore = evalRes.optimalActions; }
        }
    }

    carveRiver() {
        let crossings = [];
        if (this.riverData.type === 'horizontal') {
            for (let x = 0; x < this.gridSize; x++) this.mapData[this.riverData.pos][x] = 2;
            for (let x = 1; x < this.gridSize - 1; x++) { if (this.mapData[this.riverData.pos - 1][x] === 0 && this.mapData[this.riverData.pos + 1][x] === 0) crossings.push(x); }
            if (crossings.length === 0) { crossings = [2, 4]; this.mapData[this.riverData.pos-1][2]=0; this.mapData[this.riverData.pos+1][2]=0; }
            this.shuffle(crossings); let bStart = crossings[0];
            for (let x = Math.max(0, bStart - 1); x <= Math.min(this.gridSize - 1, bStart + 1); x++) { this.mapData[this.riverData.pos - 1][x] = 0; this.mapData[this.riverData.pos + 1][x] = 0; }
            this.bridgeLogic = { axis: 'x', x: bStart, y: this.riverData.pos, dir: 1, min: 0, max: this.gridSize - 1, pauseTimer: 1, initialPos: bStart, initialDir: 1 };
        } else {
            for (let y = 0; y < this.gridSize; y++) this.mapData[y][this.riverData.pos] = 2;
            for (let y = 1; y < this.gridSize - 1; y++) { if (this.mapData[y][this.riverData.pos - 1] === 0 && this.mapData[y][this.riverData.pos + 1] === 0) crossings.push(y); }
            if (crossings.length === 0) { crossings = [2, 4]; this.mapData[2][this.riverData.pos-1]=0; this.mapData[2][this.riverData.pos+1]=0; }
            this.shuffle(crossings); let bStart = crossings[0];
            for (let y = Math.max(0, bStart - 1); y <= Math.min(this.gridSize - 1, bStart + 1); y++) { this.mapData[y][this.riverData.pos - 1] = 0; this.mapData[y][this.riverData.pos + 1] = 0; }
            this.bridgeLogic = { axis: 'y', x: this.riverData.pos, y: bStart, dir: 1, min: 0, max: this.gridSize - 1, pauseTimer: 1, initialPos: bStart, initialDir: 1 };
        }
    }

    evaluateMapLogics() {
        let queue = [{ x: 0, y: 6, t: 0, mask: 0, pathHistory: [] }]; let visited = new Set(); visited.add(`0,6,0,0`); let validSolutions = [];
        while (queue.length > 0) {
            let curr = queue.shift(); if (curr.t > 40) continue;
            if (curr.x === 6 && curr.y === 0 && curr.mask === 7) { validSolutions.push(curr); continue; }
            let nTime = curr.t + 1, curBx = -1, curBy = -1;
            let tTimer = 1, trapsFlipped = false;
            for(let i=0; i<nTime; i++){ if(tTimer > 0) tTimer--; else { trapsFlipped = !trapsFlipped; tTimer = 1; } }
            if (this.bridgeLogic) {
                curBx = this.bridgeLogic.x; curBy = this.bridgeLogic.y; let bDir = this.bridgeLogic.initialDir, bPos = this.bridgeLogic.initialPos, bTimer = 1;
                for (let i = 0; i < nTime; i++) { if (bTimer > 0) bTimer--; else { bPos += bDir; if (bPos >= this.bridgeLogic.max || bPos <= this.bridgeLogic.min) bDir *= -1; bTimer = 1; } }
                if (this.bridgeLogic.axis === 'x') curBx = bPos; else curBy = bPos;
            }
            [[0, -1], [0, 1], [-1, 0], [1, 0], [0, 0]].forEach(m => {
                let nx = curr.x + m[0], ny = curr.y + m[1];
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    let tile = this.mapData[ny][nx], isBridge = (this.bridgeLogic && ny === curBy && nx === curBx), canEnter = false;
                    if (tile === 9 && curr.mask !== 7) return;
                    if (isBridge || tile === 0 || tile === 9) canEnter = true;
                    else if (tile === 3) { let trap = this.spikeTraps.find(s => s.x === nx && s.y === ny); if (!(trapsFlipped ? !trap.initialActive : trap.initialActive)) canEnter = true; }
                    if (canEnter) {
                        let nMask = curr.mask, cIdx = this.crystalsLogic.findIndex(c => c.x === nx && c.y === ny);
                        if (cIdx !== -1) nMask |= (1 << cIdx);
                        let sKey = `${nx},${ny},${nTime%4},${nMask}`;
                        if (!visited.has(sKey)) { visited.add(sKey); queue.push({ x: nx, y: ny, t: nTime, mask: nMask, pathHistory: [...curr.pathHistory, { x: nx, y: ny }] }); }
                    }
                }
            });
        }
        if (validSolutions.length === 0) return { isValid: false };
        validSolutions.sort((a, b) => a.t - b.t); let best = validSolutions[0];
        if (best.t >= 10) return { isValid: true, optimalActions: best.t };
        return { isValid: false };
    }
}

// מחולל המידע היומי
let dailyCache = null; let lastDay = -1;
function getTodayShopAndLevel() {
    const config = getShopConfig();
    const dayIndex = Math.floor((new Date().getTime() + 3600000) / 86400000); 
    if (dayIndex === lastDay && dailyCache) return dailyCache;
    const seededRandom = (seed) => { let x = Math.sin(seed++) * 10000; return x - Math.floor(x); };
    const getItems = (arr, maxCount, offset) => {
        let copy = [...arr]; for(let i = copy.length - 1; i > 0; i--) { let j = Math.floor(seededRandom(dayIndex + offset + i) * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
        return copy.slice(0, maxCount);
    };
    const level = new ServerLevelGenerator();
    dailyCache = { 
        levelNumber: dayIndex - 20600, mapData: level.mapData, spikeTraps: level.spikeTraps, crystalsLogic: level.crystalsLogic, bridgeLogic: level.bridgeLogic, parScore: level.parScore,
        bgs: getItems(config.bgs, 6, 100), packs: getItems(config.packs, 6, 200), skins: getItems(config.skins, 6, 300)
    };
    lastDay = dayIndex; return dailyCache;
}

async function generateResultImage(stats, streak, member) {
    const { isWin, score, triesUsed, crystals, moves, biome, themeColor, skin, bgTheme, pack } = stats;
    
    const finalName = member ? member.displayName : "Player";
    const finalAvatarUrl = member ? member.displayAvatarURL({ extension: 'png', size: 128 }) : "https://cdn.discordapp.com/embed/avatars/0.png";

    const canvas = createCanvas(900, 500);
    const ctx = canvas.getContext('2d');
    
    // רקע
    if (bgTheme && bgTheme.image) {
        try {
            let bgPath = bgTheme.image.startsWith('http') ? bgTheme.image : path.join(__dirname, 'public', bgTheme.image);
            const bgImg = await loadImage(bgPath);
            ctx.drawImage(bgImg, 0, 0, 900, 500);
        } catch(e) { drawGradient(); }
    } else { drawGradient(); }

    function drawGradient() {
        const gradient = ctx.createLinearGradient(0, 0, 900, 500);
        if (bgTheme) {
            gradient.addColorStop(0, '#' + (bgTheme.uiDark||12720219).toString(16).padStart(6, '0'));
            gradient.addColorStop(1, '#' + (bgTheme.uiMain||16301008).toString(16).padStart(6, '0'));
        } else { gradient.addColorStop(0, '#2E3136'); gradient.addColorStop(1, '#1E1E24'); }
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, 900, 500);
    }

    // טעינת טקסטורות
    let wallPattern = null, floorPattern = null;
    let wPath = path.join(__dirname, 'public', 'assets', 'images', 'wall.png');
    let fPath = path.join(__dirname, 'public', 'assets', 'images', 'floor.png');
    if (pack && pack.textures) {
        if (pack.textures.wall) wPath = pack.textures.wall.startsWith('http') ? pack.textures.wall : path.join(__dirname, 'public', pack.textures.wall);
        if (pack.textures.floor) fPath = pack.textures.floor.startsWith('http') ? pack.textures.floor : path.join(__dirname, 'public', pack.textures.floor);
    }
    try {
        wallPattern = ctx.createPattern(await loadImage(wPath), 'repeat');
        floorPattern = ctx.createPattern(await loadImage(fPath), 'repeat');
    } catch(e) {}

    // --- ציור תלת מימדי (בלוק עם גובה ועומק אמיתי!) ---
    ctx.lineWidth = 4; ctx.strokeStyle = '#000000';

    // 1. חלק עליון של הקיר (הגג של הבלוק האחורי)
    ctx.fillStyle = biome.wallDark || '#5D4037';
    ctx.beginPath(); ctx.moveTo(90, 120); ctx.lineTo(350, 120); ctx.lineTo(380, 150); ctx.lineTo(60, 150); ctx.fill(); ctx.stroke();

    // 2. חלק קדמי של הקיר
    ctx.fillStyle = wallPattern || biome.wall || '#795548';
    ctx.beginPath(); ctx.moveTo(60, 150); ctx.lineTo(380, 150); ctx.lineTo(380, 310); ctx.lineTo(60, 310); ctx.fill(); ctx.stroke();

    // 3. חלק עליון של הרצפה 
    ctx.fillStyle = floorPattern || biome.floor || '#8BC34A';
    ctx.beginPath(); ctx.moveTo(60, 310); ctx.lineTo(380, 310); ctx.lineTo(440, 420); ctx.lineTo(0, 420); ctx.fill(); ctx.stroke();

    // 4. עובי הרצפה (הצד הקדמי שלה)
    ctx.fillStyle = biome.floorDark || '#558B2F';
    ctx.beginPath(); ctx.moveTo(0, 420); ctx.lineTo(440, 420); ctx.lineTo(440, 450); ctx.lineTo(0, 450); ctx.fill(); ctx.stroke();

    // ציור השחקן
    if (skin && !skin.isDefault && skin.dirs && skin.dirs[3]) {
        try {
            let imgPath = skin.dirs[3].startsWith('http') ? skin.dirs[3] : path.join(__dirname, 'public', skin.dirs[3]);
            const skinImg = await loadImage(imgPath);
            let drawScale = skin.scale || 1; let size = 90 * drawScale;
            ctx.drawImage(skinImg, 220 - size/2, 340 - size/2, size, size);
        } catch(e) { drawDefaultPlayer(); }
    } else { drawDefaultPlayer(); }

    function drawDefaultPlayer() {
        ctx.fillStyle = '#FF5252'; ctx.lineWidth = 4; ctx.strokeStyle = '#000000';
        ctx.beginPath(); ctx.arc(220, 340, 45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(205, 330, 12, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(235, 330, 12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(205, 330, 5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(235, 330, 5, 0, Math.PI*2); ctx.fill();
    }

    // --- צללים רכים וטקסט ---
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
    
    // אווטאר וכינוי
    try {
        const avatar = await loadImage(finalAvatarUrl);
        ctx.save(); ctx.beginPath(); ctx.arc(70, 70, 45, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(avatar, 25, 25, 90, 90); ctx.restore();
        ctx.lineWidth = 4; ctx.strokeStyle = themeColor || '#FFD54F'; ctx.beginPath(); ctx.arc(70, 70, 45, 0, Math.PI * 2); ctx.stroke();
    } catch(e) {}
    
    ctx.fillStyle = themeColor || '#FFD54F'; ctx.lineWidth = 3; ctx.strokeStyle = '#000000';
    ctx.font = 'bold 50px "Segoe UI", "Helvetica Neue", sans-serif'; 
    ctx.fillText(finalName, 140, 85); ctx.strokeText(finalName, 140, 85);

    // אייקון אש של הסטרייק (בצד ימין למעלה)
    ctx.font = 'bold 45px "Segoe UI", sans-serif';
    const streakTxt = `🔥 ${streak}`;
    ctx.fillText(streakTxt, 750, 85); ctx.strokeText(streakTxt, 750, 85);

    // נתונים (כולם בצבע ה-Theme, עם צל ומסגרת)
    ctx.font = 'bold 120px "Segoe UI", sans-serif'; ctx.lineWidth = 5;
    ctx.fillText(score.toString(), 480, 210); ctx.strokeText(score.toString(), 480, 210);

    ctx.font = 'bold 45px "Segoe UI", sans-serif'; ctx.lineWidth = 4;
    let labels = ['Tries Used:', 'Crystals:', 'Moves:'];
    let values = [triesUsed.toString(), `${crystals}/3`, (moves !== undefined && moves !== null) ? moves.toString() : '0'];

    for(let i=0; i<3; i++) {
        let yPos = 320 + i * 70;
        ctx.fillText(labels[i], 480, yPos); ctx.strokeText(labels[i], 480, yPos);
        ctx.fillText(values[i], 780, yPos); ctx.strokeText(values[i], 780, yPos);
    }
    return canvas.toBuffer('image/png');
}

app.post('/api/init', authenticateUser, async (req, res) => {
    let player = await User.findOne({ discordId: req.discordId });
    if (!player) { player = new User({ discordId: req.discordId }); }
    
    const config = getShopConfig();
    const todayData = getTodayShopAndLevel();
    
    if (player.lastPlayedDay !== todayData.levelNumber) {
        // מערכת סטרייקים: אם הוא שיחק בדיוק אתמול, הסטרייק עולה. אחרת - מתאפס ל-1.
        if (player.lastPlayedDay === todayData.levelNumber - 1) {
            player.streak += 1;
        } else {
            player.streak = 1; 
        }
        player.triesLeft = 5;
        player.lastPlayedDay = todayData.levelNumber;
        player.todayStats = null; // מאפס את התוצאה של אתמול כדי שאי אפשר יהיה לשתף אותה בטעות
        await player.save();
    }

    // השרת מסנן ושולח לשחקן רק את התמונות והמידע של הפריטים שהוא כבר קנה!
    const ownedAssets = {
        skins: config.skins.filter(s => player.unlockedSkins.includes(s.id) || s.isDefault),
        packs: config.packs.filter(p => player.unlockedPacks.includes(p.id) || p.isDefault),
        bgs: config.bgs.filter(b => player.unlockedBGs.includes(b.id) || b.isDefault)
    };

    res.json({ player, dailyData: todayData, ownedAssets });
});

// אבטחת הלוקר: השרת בודק אם באמת יש לך את הפריט!
app.post('/api/equip', authenticateUser, async (req, res) => {
    const { id, tab } = req.body;
    let player = await User.findOne({ discordId: req.discordId });
    if (!player) return res.status(404).send("Not found");

    if (tab === 'skin' && player.unlockedSkins.includes(id)) player.currentSkin = id;
    else if (tab === 'pack' && player.unlockedPacks.includes(id)) player.currentPack = id;
    else if (tab === 'bg' && player.unlockedBGs.includes(id)) player.currentBG = id;
    else return res.status(400).send("Hacker! Item not owned.");

    await player.save(); res.json(player);
});

// ירידת חיים מאובטחת
app.post('/api/lose_life', authenticateUser, async (req, res) => {
    let player = await User.findOne({ discordId: req.discordId });
    if (player.triesLeft <= 0) return res.status(400).send("No lives");
    player.triesLeft--; await player.save();
    res.json({ triesLeft: player.triesLeft });
});

// ניצחון מבוקר שרת (השרת מחשב את הכסף!)
app.post('/api/win', authenticateUser, async (req, res) => {
    const { actionCost, triesUsed } = req.body;
    let player = await User.findOne({ discordId: req.discordId });
    const todayData = getTodayShopAndLevel();

    if (player.lastSolvedLevel === todayData.levelNumber) return res.status(400).send("Already solved today");

    let efficiencyBonus = Math.max(0, (todayData.parScore - actionCost) * 200);
    let triesPenalty = Math.max(0, ((triesUsed || 1) - 1) * 300); // מוריד 300 נקודות על כל נסיון נוסף!
    let totalScore = (3 * 1000) - (actionCost * 100) - triesPenalty + efficiencyBonus;
    let earnedCoins = Math.max(10, Math.floor(totalScore / 10));

    player.coins += earnedCoins;
    player.lastSolvedLevel = todayData.levelNumber;
    await player.save();

    res.json({ coins: player.coins, earnedCoins, totalScore, parScore: todayData.parScore });
});

app.post('/api/buy', authenticateUser, async (req, res) => {
    const config = getShopConfig();
    const { itemId, itemType } = req.body;
    let player = await User.findOne({ discordId: req.discordId });
    const todayShop = getTodayShopAndLevel();
    let availableItems = itemType === 'skin' ? todayShop.skins : (itemType === 'pack' ? todayShop.packs : todayShop.bgs);
    const isItemInShop = availableItems.find(i => i.id === itemId);
    
    if (!isItemInShop) return res.status(400).send("Hacker! Item not in shop!");
    if (player.coins < isItemInShop.price) return res.status(400).send("Not enough coins");
    if ((itemType === 'skin' && player.unlockedSkins.includes(itemId)) || (itemType === 'pack' && player.unlockedPacks.includes(itemId)) || (itemType === 'bg' && player.unlockedBGs.includes(itemId))) return res.status(400).send("Already owned");

    player.coins -= isItemInShop.price;
    if (itemType === 'skin') player.unlockedSkins.push(itemId);
    if (itemType === 'pack') player.unlockedPacks.push(itemId);
    if (itemType === 'bg') player.unlockedBGs.push(itemId);

    await player.save(); 
        
        // אחרי קנייה, מחזירים לשחקן את הנתונים המעודכנים של מה שהוא מחזיק
        const updatedAssets = {
            skins: config.skins.filter(s => player.unlockedSkins.includes(s.id) || s.isDefault),
            packs: config.packs.filter(p => player.unlockedPacks.includes(p.id) || p.isDefault),
            bgs: config.bgs.filter(b => player.unlockedBGs.includes(b.id) || b.isDefault)
        };
        res.json({ player, ownedAssets: updatedAssets });
});

app.post('/api/announce', authenticateUser, async (req, res) => {
    // 1. קודם שומרים הכל למסד הנתונים כדי ש-/share יעבוד
    let player = await User.findOne({ discordId: req.discordId });
    player.todayStats = {
        isWin: req.body.isWin, score: req.body.score, triesUsed: req.body.tries, 
        crystals: req.body.crystals, moves: req.body.moves, biome: req.body.biome, 
        themeColor: req.body.themeColor, skin: req.body.skin, bgTheme: req.body.bgTheme, pack: req.body.pack
    };
    await player.save();

    const channelId = req.body.channelId;
    if (!channelId) return res.status(400).send("No channel ID");

    try {
        const channel = await client.channels.fetch(channelId);
        const guild = channel.guild;
        const member = await guild.members.fetch(req.discordId).catch(() => null);
        
        // מייצר את התמונה החדשה!
        const buffer = await generateResultImage(player.todayStats, player.streak, member);
        const attachment = new AttachmentBuilder(buffer, { name: 'result.png' });
        
        // מוסיף את כפתור ה-Play Now להודעה הציבורית גם
        const playNowRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('launch_game').setLabel('▶️ Play Now').setStyle(ButtonStyle.Success)
        );

        const winPhrases = ["cooked this! 🔥", "destroyed the level! 🚀", "is a pure genius! 🧠", "crushed it! 🏆"];
        const losePhrases = ["got lost in the path... 💀", "needs to try again tomorrow. 🔄", "was defeated by the map. 📉"];
        const phrase = req.body.isWin ? winPhrases[Math.floor(Math.random() * winPhrases.length)] : losePhrases[Math.floor(Math.random() * losePhrases.length)];
        
        const finalName = member ? member.displayName : "Player";
        await channel.send({ content: `**${finalName}** ${phrase}`, files: [attachment], components: [playNowRow] });
        
        res.json({ success: true });
    } catch(e) { console.error("Canvas/Discord error:", e); res.status(500).json({ error: e.message }); }
});

// ==========================================
// 4. הגשת המשחק
// ==========================================
app.get(/.*/, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.listen(PORT, () => { console.log(`🚀 Game Server is running on port ${PORT}`); });