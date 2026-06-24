window.PlayerData = {
    discordId: null, // הוספנו את ה-ID של דיסקורד!
    coins: 5000, 
    triesLeft: 5, maxTries: 5,
    unlockedSkins: ['default'], currentSkin: 'default',
    unlockedPacks: ['default'], currentPack: 'default',
    unlockedBGs: ['default'], currentBG: 'default',
    lastSolvedLevel: -1
};


// ==========================================
// BOOT SCENE - DISCORD SDK & LAZY LOADING
// ==========================================
class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }
    
    preload() {
        this.load.image('tex_floor', 'assets/images/floor.png');         
        this.load.image('tex_wall', 'assets/images/wall.png');           
        this.load.image('tex_bridge', 'assets/images/bridge.png');       
        this.load.image('tex_trap_off', 'assets/images/trap_off.png');   
        this.load.image('tex_trap_on', 'assets/images/trap_on.png');     
        this.load.image('tex_crystal', 'assets/images/crystal.png');     
        this.load.image('tex_exit', 'assets/images/exit.png');           
        this.load.spritesheet('tex_water', 'assets/images/water_spritesheet.png', { frameWidth: 128, frameHeight: 128 });
        this.load.image('default', 'assets/images/bg_game.png'); // טוען את הרקע הדיפולטיבי קבוע מראש
    }

    async create() {
        let comicFont = '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif';
        let loadingText = this.add.text(this.scale.width/2, this.scale.height/2, 'CONNECTING...', { fontFamily: comicFont, fontSize: '45px', fill: '#FFF', fontStyle: 'bold' }).setOrigin(0.5);

        try {
            const { DiscordSDK } = await import('/discord-sdk.js');
            const discordSdk = new DiscordSDK('1518734375934754816');
            await discordSdk.ready();

            const { code } = await discordSdk.commands.authorize({ client_id: '1518734375934754816', response_type: 'code', state: '', prompt: 'none', scope: ['identify'] });
            
            const response = await fetch('/api/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
            const { access_token } = await response.json();
            
            // 1. קודם כל שומרים את האסימון המאובטח
            window.PlayerData.accessToken = `Bearer ${access_token}`;
            const auth = await discordSdk.commands.authenticate({ access_token });

            // 2. טעינת שם ותמונת פרופיל
            window.PlayerData.username = auth.user.username;
            window.PlayerData.avatarUrl = auth.user.avatar ? `https://cdn.discordapp.com/avatars/${auth.user.id}/${auth.user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`;
            window.PlayerData.channelId = discordSdk.channelId;

            // משיכת כל הנתונים, החנות והנכסים מהשרת במכה אחת!
            const initResponse = await fetch('/api/init', { 
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': window.PlayerData.accessToken }, body: JSON.stringify({}) 
            });
            const initData = await initResponse.json();

            // שומרים את הכל למשחק
            window.DailyData = initData.dailyData;
            window.OwnedAssets = initData.ownedAssets; // רק הפריטים ששייכים לי!
            
            let dbPlayer = initData.player;
            window.PlayerData.discordId = dbPlayer.discordId;
            window.PlayerData.coins = dbPlayer.coins;
            window.PlayerData.lastPlayedDay = dbPlayer.lastPlayedDay;
            window.PlayerData.triesLeft = dbPlayer.triesLeft;
            window.PlayerData.unlockedSkins = dbPlayer.unlockedSkins;
            window.PlayerData.currentSkin = dbPlayer.currentSkin;
            window.PlayerData.unlockedPacks = dbPlayer.unlockedPacks;
            window.PlayerData.currentPack = dbPlayer.currentPack;
            window.PlayerData.unlockedBGs = dbPlayer.unlockedBGs;
            window.PlayerData.currentBG = dbPlayer.currentBG;
            window.PlayerData.lastSolvedLevel = dbPlayer.lastSolvedLevel;

        } catch (e) { 
            console.log("Local Mode or Error:", e); 
            // נתוני חירום: אם הדיסקורד או השרת נכשלים, אנחנו שמים נתוני בסיס כדי שהמשחק לא יקרוס!
            window.OwnedAssets = { 
                skins: [{ id: 'default', isDefault: true }], 
                packs: [{ id: 'default', isDefault: true, biome: { floor: '#8BC34A', floorDark: '#5D4037', wall: '#795548', wallDark: '#5D4037', trap: '#29B6F6', trapDark: '#0288D1' } }], 
                bgs: [{ id: 'default', isDefault: true, uiMain: 16301008, uiDark: 12720219 }] 
            };
            window.DailyData = { levelNumber: 0, bgs: [], packs: [], skins: [], mapData: [], spikeTraps: [], crystalsLogic: [], bridgeLogic: null, parScore: 10 };
        }

        loadingText.setText('LOADING ASSETS...');

        if (window.PlayerData.avatarUrl) { this.load.image('discord_avatar', window.PlayerData.avatarUrl); }

        // עכשיו הוא טוען תמונות רק מתוך מה שהוא מחזיק (OwnedAssets)
        const currentBG = window.OwnedAssets.bgs.find(b => b.id === window.PlayerData.currentBG);
        if (currentBG && currentBG.id !== 'default' && currentBG.image) { this.load.image(currentBG.id, currentBG.image); }
        
        const currentSkin = window.OwnedAssets.skins.find(s => s.id === window.PlayerData.currentSkin);
        if (currentSkin && !currentSkin.isDefault && currentSkin.dirs) {
            currentSkin.dirs.forEach((dirImg, index) => { this.load.image(`${currentSkin.id}_${index}`, dirImg); });
        }

        const currentPack = window.OwnedAssets.packs.find(p => p.id === window.PlayerData.currentPack);
        if (currentPack && currentPack.textures) {
            if (currentPack.textures.floor) this.load.image('custom_floor', currentPack.textures.floor);
            if (currentPack.textures.wall) this.load.image('custom_wall', currentPack.textures.wall);
        }
        
        this.load.once('complete', () => { this.scene.start('LobbyScene', { direction: 'right' }); });
        this.load.start(); 
    }
}
// ==========================================
// LOBBY SCENE
// ==========================================
class LobbyScene extends Phaser.Scene {
    constructor() { super('LobbyScene'); }
    
    init(data) { this.slideDir = data.direction || 'right'; }
    
    create() {
        this.cameras.main.scrollX = this.slideDir === 'right' ? -this.scale.width : this.scale.width;
        this.tweens.add({ targets: this.cameras.main, scrollX: 0, duration: 350, ease: 'Cubic.easeOut' });

        this.comicFont = '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif';
        this.activeTheme = window.OwnedAssets.bgs.find(b => b.id === window.PlayerData.currentBG) || window.OwnedAssets.bgs[0];
        
        if (this.textures.exists(this.activeTheme.id)) {
            let bg = this.add.image(this.scale.width/2, this.scale.height/2, this.activeTheme.id);
            bg.setDisplaySize(this.scale.width, this.scale.height);
            bg.setDepth(-1000); bg.setScrollFactor(0); 
        } else { this.cameras.main.setBackgroundColor('#2E3136'); }

        let coinsTxt = this.add.text(this.scale.width - 40, 50, `🪙 ${window.PlayerData.coins}`, { fontFamily: this.comicFont, fontSize: '55px', fill: '#FFD54F', fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(1, 0);
        coinsTxt.setShadow(3, 3, 'rgba(0,0,0,0.5)', 5);
        
        if (window.PlayerData.username && this.textures.exists('discord_avatar')) {
            const avatar = this.add.image(80, 80, 'discord_avatar').setDisplaySize(90, 90);
            const mask = this.make.graphics();
            mask.fillCircle(80, 80, 45);
            avatar.setMask(mask.createGeometryMask());
            this.add.text(140, 80, window.PlayerData.username, { fontFamily: this.comicFont, fontSize: '40px', fill: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(0, 0.5);
        }

        let title = this.add.text(this.scale.width/2, 350, 'THE HIDDEN\nPATH', { fontFamily: this.comicFont, fontSize: '120px', fill: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 20, align: 'center' }).setOrigin(0.5);
        title.setShadow(5, 5, 'rgba(0,0,0,0.6)', 10);

        const dailyData = window.DailyData;
        const isSolved = window.PlayerData.lastSolvedLevel === dailyData.levelNumber;

        // אם השלב נפתר - הכפתור אפור ונעול!
        if (isSolved) {
            this.createButton(this.scale.width/2, 850, '🔒 SOLVED', 0x9E9E9E, () => {});
        } else {
            this.createButton(this.scale.width/2, 850, '▶️ PLAY', 0x4CAF50, () => this.slideTransition('GameScene'));
        }

        this.createButton(this.scale.width/2, 1050, '🛒 SHOP', 0xFF9800, () => this.slideTransition('ShopScene'));
        this.createButton(this.scale.width/2, 1250, '🎒 LOCKER', 0x9C27B0, () => this.slideTransition('LockerScene'));
    }

    createButton(x, y, text, color, onClick) {
        const btn = this.add.container(x, y);
        const bg = this.add.graphics();
        bg.fillStyle(color, 1); bg.lineStyle(8, 0x000, 1);
        bg.fillRoundedRect(-250, -60, 500, 120, 30); bg.strokeRoundedRect(-250, -60, 500, 120, 30);
        const txt = this.add.text(0, 0, text, { fontFamily: this.comicFont, fontSize: '45px', fill: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
        btn.add([bg, txt]);
        btn.setSize(500, 120); btn.setInteractive();
        btn.on('pointerup', () => { 
            if(color !== 0x9E9E9E) { this.tweens.add({ targets: btn, scale: 0.9, duration: 50, yoyo: true }); onClick(); }
        });
    }

    slideTransition(targetScene) {
        this.tweens.add({ targets: this.cameras.main, scrollX: this.scale.width, duration: 350, ease: 'Cubic.easeIn', onComplete: () => this.scene.start(targetScene, { direction: 'right' }) });
    }
}

// ==========================================
// SHOP SCENE 
// ==========================================
class ShopScene extends Phaser.Scene {
    constructor() { super('ShopScene'); }

    init(data) { this.slideDir = data.direction || 'right'; }

    create() {
        this.cameras.main.scrollX = this.slideDir === 'right' ? -this.scale.width : this.scale.width;
        this.tweens.add({ targets: this.cameras.main, scrollX: 0, duration: 350, ease: 'Cubic.easeOut' });

        this.comicFont = '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif';
        
        this.activeTheme = window.OwnedAssets.bgs.find(b => b.id === window.PlayerData.currentBG) || window.OwnedAssets.bgs[0];
        
        if (this.textures.exists(this.activeTheme.id)) {
            let bg = this.add.image(this.scale.width/2, this.scale.height/2, this.activeTheme.id);
            bg.setDisplaySize(this.scale.width, this.scale.height);
            bg.setDepth(-1000);
            bg.setScrollFactor(0); 
        } else { this.cameras.main.setBackgroundColor('#2E3136'); }

        this.scrollContainer = this.add.container(0, 0);
        const maskGfx = this.make.graphics();
        maskGfx.fillRect(0, 220, this.scale.width, this.scale.height - 220);
        this.scrollContainer.setMask(maskGfx.createGeometryMask());

        this.shopItems = [
            { id: 'skin_ninja', name: 'Ninja Skin', type: 'skin', price: 500 },
            { id: 'skin_popstar', name: 'Popstar', type: 'skin', price: 1500 },
            { id: 'pack_desert', name: 'Desert Theme', type: 'pack', price: 2500 },
            { id: 'bg_space', name: 'Galaxy BG', type: 'bg', price: 800 },
            { id: 'pack_neon', name: 'Cyberpunk', type: 'pack', price: 3000 },
            { id: 'skin_robot', name: 'Mecha Suit', type: 'skin', price: 2000 }
        ];

        this.buildShopGrid();
        this.setupScrolling();
        this.createTopUI('ITEM SHOP');
        this.createConfirmationPopup();
    }

    buildShopGrid() {
        this.scrollContainer.removeAll(true);
        const dailyData = window.DailyData;
        let currentY = 250; // הכותרת הראשונה מתחילה פה

        const createSection = (title, items) => {
            let titleObj = this.add.text(this.scale.width/2, currentY, title, { fontFamily: this.comicFont, fontSize: '50px', fill: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
            this.scrollContainer.add(titleObj);
            
            currentY += 360; // מרווח מדויק כדי שהחצי העליון של הקלף לא יעלה על הכותרת
            
            let startX = 280, xOffset = 520, yOffset = 580; // הקטנתי את הרווח (yOffset) בין השורות!
            items.forEach((item, index) => {
                let col = index % 2; let row = Math.floor(index / 2);
                let itemWithType = {...item, type: (title.includes('THEME') ? 'bg' : title.includes('PACK') ? 'pack' : 'skin')};
                this.createShopCard(startX + (col * xOffset), currentY + (row * yOffset), itemWithType);
            });
            
            // מוסיף את הגובה של הסקשן הנוכחי כדי לדעת איפה להתחיל את הבא
            currentY += (Math.ceil(items.length / 2) * yOffset) - 60; 
        };

        createSection('--- THEMES & BGS ---', dailyData.bgs);
        createSection('--- TEXTURE PACKS ---', dailyData.packs);
        createSection('--- PLAYER SKINS ---', dailyData.skins);

        this.maxScroll = Math.max(0, currentY - this.scale.height + 200);
    }

    createShopCard(x, y, item) {
        const card = this.add.container(x, y);
        let isOwned = false;
        if (item.type === 'skin') isOwned = window.PlayerData.unlockedSkins.includes(item.id);
        if (item.type === 'pack') isOwned = window.PlayerData.unlockedPacks.includes(item.id);
        if (item.type === 'bg') isOwned = window.PlayerData.unlockedBGs.includes(item.id);

        const bg = this.add.graphics();
        bg.fillStyle(this.activeTheme.uiMain, 0.95); // צבע בהיר דינמי
        bg.lineStyle(6, isOwned ? 0x4CAF50 : 0x000000, 1);
        bg.fillRoundedRect(-230, -280, 460, 560, 20); 
        bg.strokeRoundedRect(-230, -280, 460, 560, 20);

        const imgBox = this.add.graphics();
        imgBox.fillStyle(this.activeTheme.uiDark, 1); // צבע כהה דינמי
        imgBox.fillRoundedRect(-210, -260, 420, 300, 15);

        const nameTxt = this.add.text(0, 80, item.name, { fontFamily: this.comicFont, fontSize: '38px', fill: '#FFF', fontStyle: 'bold' }).setOrigin(0.5);
        
        let btnColor = isOwned ? 0x9E9E9E : 0xFFD54F;
        let btnTxtStr = isOwned ? 'OWNED' : `🪙 ${item.price}`;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(btnColor, 1); btnBg.lineStyle(4, 0x000, 1);
        btnBg.fillRoundedRect(-180, 150, 360, 90, 15); btnBg.strokeRoundedRect(-180, 150, 360, 90, 15);
        const btnTxt = this.add.text(0, 195, btnTxtStr, { fontFamily: this.comicFont, fontSize: '40px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5);

        const btnZone = this.add.zone(0, 195, 360, 90).setInteractive();
        btnZone.on('pointerup', (pointer) => {
            if (Math.abs(pointer.downY - pointer.upY) > 15) return; 
            if (!isOwned) {
                this.tweens.add({ targets: card, scale: 0.95, duration: 50, yoyo: true });
                this.promptPurchase(item);
            }
        });

        card.add([bg, imgBox, nameTxt, btnBg, btnTxt, btnZone]);
        this.scrollContainer.add(card);
    }

    createConfirmationPopup() {
        this.popupGroup = this.add.container(0, 0).setDepth(1000).setAlpha(0);
        this.popupGroup.setActive(false).setVisible(false);
        this.popupGroup.setScrollFactor(0); // הפופאפ לא יושפע מגלילה

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85); overlay.fillRect(0, 0, this.scale.width, this.scale.height);
        
        const box = this.add.graphics();
        box.fillStyle(0x2E3136, 1); box.lineStyle(8, 0xFFD54F, 1);
        box.fillRoundedRect(this.scale.width/2 - 400, this.scale.height/2 - 250, 800, 500, 30);
        box.strokeRoundedRect(this.scale.width/2 - 400, this.scale.height/2 - 250, 800, 500, 30);

        this.popupTitle = this.add.text(this.scale.width/2, this.scale.height/2 - 120, 'Purchase Item?', { fontFamily: this.comicFont, fontSize: '50px', fill: '#FFF', align: 'center' }).setOrigin(0.5);
        
        const noBg = this.add.graphics(); noBg.fillStyle(0xFF5252, 1); noBg.fillRoundedRect(this.scale.width/2 - 350, this.scale.height/2 + 50, 300, 100, 20);
        const noTxt = this.add.text(this.scale.width/2 - 200, this.scale.height/2 + 100, 'CANCEL', { fontFamily: this.comicFont, fontSize: '40px', fill: '#FFF', fontStyle: 'bold' }).setOrigin(0.5);
        const noZone = this.add.zone(this.scale.width/2 - 200, this.scale.height/2 + 100, 300, 100).setInteractive();
        noZone.on('pointerdown', () => this.closePopup());

        const yesBg = this.add.graphics(); yesBg.fillStyle(0xFFD54F, 1); yesBg.fillRoundedRect(this.scale.width/2 + 50, this.scale.height/2 + 50, 300, 100, 20);
        const yesTxt = this.add.text(this.scale.width/2 + 200, this.scale.height/2 + 100, 'PURCHASE', { fontFamily: this.comicFont, fontSize: '40px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5);
        this.yesZone = this.add.zone(this.scale.width/2 + 200, this.scale.height/2 + 100, 300, 100).setInteractive();

        this.popupGroup.add([overlay, box, this.popupTitle, noBg, noTxt, noZone, yesBg, yesTxt, this.yesZone]);
    }

    promptPurchase(item) {
        this.popupTitle.setText(`Buy ${item.name}\nfor 🪙 ${item.price}?`);
        this.yesZone.removeAllListeners();
        this.yesZone.on('pointerdown', async () => {
            // לא נותנים למשתמש ללחוץ פעמיים
            this.yesZone.disableInteractive();
            this.popupTitle.setText('Verifying...'); 
            
            try {
                // מבקשים מהשרת אישור רכישה
                const response = await fetch('/api/buy', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': window.PlayerData.accessToken // גם כאן!
                    },
                    body: JSON.stringify({ 
                        itemId: item.id,
                        itemType: item.type
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    window.PlayerData.coins = data.player.coins;
                    window.PlayerData.unlockedSkins = data.player.unlockedSkins;
                    window.PlayerData.unlockedPacks = data.player.unlockedPacks;
                    window.PlayerData.unlockedBGs = data.player.unlockedBGs;
                    window.OwnedAssets = data.ownedAssets; // מרענן את רשימת הנכסים שלי מהשרת!
                    
                    let savedY = this.scrollContainer.y;
                    this.buildShopGrid();
                    this.scrollContainer.y = savedY;
                    this.coinsTxt.setText(`🪙 ${window.PlayerData.coins}`);
                    this.closePopup();
                } else {
                    // השרת סירב! (השחקן ניסה לרמות דרך DevTools או שאין לו באמת כסף)
                    this.popupTitle.setText('Transaction Failed!');
                    this.cameras.main.shake(200, 0.02); 
                    this.time.delayedCall(1000, () => this.closePopup());
                }
            } catch (e) {
                console.error("Purchase error", e);
                this.closePopup();
            }
        });
        this.popupGroup.setActive(true).setVisible(true);
        this.tweens.add({ targets: this.popupGroup, alpha: 1, duration: 200 });
    }

    closePopup() {
        this.tweens.add({ targets: this.popupGroup, alpha: 0, duration: 200, onComplete: () => this.popupGroup.setActive(false).setVisible(false) });
    }

    setupScrolling() {
        let isDragging = false; let startY = 0; let startScrollY = 0;
        this.input.on('pointerdown', (pointer) => {
            if (pointer.y > 220 && !this.popupGroup.active) { isDragging = true; startY = pointer.y; startScrollY = this.scrollContainer.y; }
        });
        this.input.on('pointermove', (pointer) => {
            if (isDragging) {
                let deltaY = pointer.y - startY;
                this.scrollContainer.y = Phaser.Math.Clamp(startScrollY + deltaY, -this.maxScroll, 0);
            }
        });
        this.input.on('pointerup', () => isDragging = false);
    }

    createTopUI(titleText) {
        this.add.text(this.scale.width/2, 120, titleText, { fontFamily: this.comicFont, fontSize: '70px', fill: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5);
        this.add.text(this.scale.width - 40, 120, `🪙 ${window.PlayerData.coins}`, { fontFamily: this.comicFont, fontSize: '50px', fill: '#FFD54F', fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(1, 0.5);
        
        const backBtn = this.add.text(40, 120, '⬅️ BACK', { fontFamily: this.comicFont, fontSize: '45px', fill: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(0, 0.5).setInteractive();
        backBtn.on('pointerdown', () => this.slideTransitionBack('LobbyScene'));
    }

    slideTransitionBack(targetScene) {
        this.tweens.add({ targets: this.cameras.main, scrollX: -this.scale.width, duration: 350, ease: 'Cubic.easeIn', onComplete: () => this.scene.start(targetScene, { direction: 'left' }) });
    }
}
class LockerScene extends Phaser.Scene {
    constructor() { super('LockerScene'); }

    init(data) { this.slideDir = data.direction || 'right'; }

    create() {
        this.cameras.main.scrollX = this.slideDir === 'right' ? -this.scale.width : this.scale.width;
        this.tweens.add({ targets: this.cameras.main, scrollX: 0, duration: 350, ease: 'Cubic.easeOut' });

        this.comicFont = '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif';
        this.activeTheme = window.OwnedAssets.bgs.find(b => b.id === window.PlayerData.currentBG) || window.OwnedAssets.bgs[0];
        
        if (this.textures.exists(this.activeTheme.id)) {
            let bg = this.add.image(this.scale.width/2, this.scale.height/2, this.activeTheme.id);
            bg.setDisplaySize(this.scale.width, this.scale.height);
            bg.setDepth(-1000);
            bg.setScrollFactor(0); 
        } else { this.cameras.main.setBackgroundColor('#2E3136'); }

        this.scrollContainer = this.add.container(0, 0);
        const maskGfx = this.make.graphics();
        maskGfx.fillRect(0, 300, this.scale.width, this.scale.height - 300);
        this.scrollContainer.setMask(maskGfx.createGeometryMask());

        this.currentTab = 'skin';
        this.setupScrolling();
        this.createTopUI('YOUR LOCKER');
        this.createTabs();
        this.buildLockerGrid();
    }

    createTopUI(titleText) {
        this.add.text(this.scale.width/2, 120, titleText, { fontFamily: this.comicFont, fontSize: '70px', fill: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5);
        this.add.text(this.scale.width - 40, 120, `🪙 ${window.PlayerData.coins}`, { fontFamily: this.comicFont, fontSize: '50px', fill: '#FFD54F', fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(1, 0.5);
        
        const backBtn = this.add.text(40, 120, '⬅️ BACK', { fontFamily: this.comicFont, fontSize: '45px', fill: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(0, 0.5).setInteractive();
        backBtn.on('pointerdown', () => this.slideTransitionBack('LobbyScene'));
    }

    slideTransitionBack(targetScene) {
        this.tweens.add({ targets: this.cameras.main, scrollX: -this.scale.width, duration: 350, ease: 'Cubic.easeIn', onComplete: () => this.scene.start(targetScene, { direction: 'left' }) });
    }

    setupScrolling() {
        let isDragging = false; let startY = 0; let startScrollY = 0;
        this.input.on('pointerdown', (pointer) => {
            if (pointer.y > 300) { isDragging = true; startY = pointer.y; startScrollY = this.scrollContainer.y; }
        });
        this.input.on('pointermove', (pointer) => {
            if (isDragging) {
                this.scrollContainer.y = Phaser.Math.Clamp(startScrollY + (pointer.y - startY), -this.maxScroll || 0, 0);
            }
        });
        this.input.on('pointerup', () => isDragging = false);
    }

    createTabs() {
        const tabs = [ { id: 'skin', name: 'SKINS', x: 200 }, { id: 'pack', name: 'PACKS', x: 540 }, { id: 'bg', name: 'BG', x: 880 } ];
        this.tabGraphics = this.add.graphics();
        tabs.forEach(tab => {
            let zone = this.add.zone(tab.x, 250, 300, 80).setInteractive();
            this.add.text(tab.x, 250, tab.name, { fontFamily: this.comicFont, fontSize: '40px', fill: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
            zone.on('pointerdown', () => { this.currentTab = tab.id; this.buildLockerGrid(); });
        });
    }

    buildLockerGrid() {
        this.scrollContainer.removeAll(true);
        this.tabGraphics.clear();
        const tabX = this.currentTab === 'skin' ? 50 : (this.currentTab === 'pack' ? 390 : 730);
        this.tabGraphics.fillStyle(0xFFD54F, 1);
        this.tabGraphics.fillRoundedRect(tabX, 280, 300, 10, 5);

        let itemsToShow = (this.currentTab === 'skin') ? window.PlayerData.unlockedSkins : (this.currentTab === 'pack' ? window.PlayerData.unlockedPacks : window.PlayerData.unlockedBGs);
        let currentlyEquipped = (this.currentTab === 'skin') ? window.PlayerData.currentSkin : (this.currentTab === 'pack' ? window.PlayerData.currentPack : window.PlayerData.currentBG);

        let startX = 280, startY = 560, xOffset = 520, yOffset = 550;
        itemsToShow.forEach((itemId, index) => {
            let col = index % 2; let row = Math.floor(index / 2);
            this.createLockerItem(startX + (col * xOffset), startY + (row * yOffset), itemId, currentlyEquipped);
        });
        this.maxScroll = Math.max(0, (Math.ceil(itemsToShow.length / 2) * yOffset) - (this.scale.height - 400));
    }

    createLockerItem(x, y, id, equippedId) {
        const card = this.add.container(x, y);
        const isEquipped = (id === equippedId);
        
        const bg = this.add.graphics();
        bg.fillStyle(this.activeTheme.uiMain, 0.95); 
        bg.lineStyle(isEquipped ? 12 : 6, isEquipped ? 0xFFD54F : 0x000000, 1);
        bg.fillRoundedRect(-230, -220, 460, 440, 20); 
        bg.strokeRoundedRect(-230, -220, 460, 440, 20);
        
        const imgBox = this.add.graphics();
        imgBox.fillStyle(this.activeTheme.uiDark, 1); 
        imgBox.fillRoundedRect(-210, -200, 420, 300, 15);
        
        const nameTxt = this.add.text(0, 150, id.toUpperCase(), { fontFamily: this.comicFont, fontSize: '35px', fill: '#FFF', fontStyle: 'bold' }).setOrigin(0.5);
        const zone = this.add.zone(0, 0, 460, 440).setInteractive();
        zone.on('pointerup', async (pointer) => {
            if (Math.abs(pointer.downY - pointer.upY) > 15) return;
            
            // השרת בודק אם באמת קנינו את הפריט הזה לפני שהוא מסכים שנלבש אותו
            try {
                const res = await fetch('/api/equip', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': window.PlayerData.accessToken },
                    body: JSON.stringify({ id: id, tab: this.currentTab })
                });
                if (res.ok) {
                    const data = await res.json();
                    window.PlayerData.currentSkin = data.currentSkin;
                    window.PlayerData.currentPack = data.currentPack;
                    window.PlayerData.currentBG = data.currentBG;
                    
                    let savedY = this.scrollContainer.y;
                    this.buildLockerGrid();
                    this.scrollContainer.y = savedY;
                }
            } catch (e) { console.error("Equip error", e); }
        });
        card.add([bg, imgBox, nameTxt, zone]);
        if (isEquipped) card.add(this.add.text(0, -180, 'EQUIPPED', { fontFamily: this.comicFont, fontSize: '30px', fill: '#000', backgroundColor: '#FFD54F', padding: { x: 10, y: 5 } }).setOrigin(0.5));
        this.scrollContainer.add(card);
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.comicFont = '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif';
        this.blocksPerRow = 8; 
    }

    init(data) { 
        this.slideDir = data.direction || 'right'; 
        this.gridSize = 7; 
        this.playerLogic = { x: 0, y: 6, direction: 3 }; 
        this.startPos = { x: 0, y: 6 };
        this.actionQueue = []; 
        this.isPlaying = false;
        this.currentStep = 0; 
        this.maxTries = 5;
        this.loopRuntimeCounts = {}; 
        this.crystalsLogic = []; 
        this.collectedCrystals = 0;
        this.bridgeLogic = null; 
        this.spikeTraps = [];
        this.hitboxesCreated = false;
        this.bridgeVisualX = undefined;
        this.bridgeVisualY = undefined;
        this.gridInitialized = false;
    }

    create() {
        this.cameras.main.scrollX = this.slideDir === 'right' ? -this.scale.width : this.scale.width;
        this.tweens.add({ targets: this.cameras.main, scrollX: 0, duration: 350, ease: 'Cubic.easeOut' });

        const activePack = window.OwnedAssets.packs.find(p => p.id === window.PlayerData.currentPack) || window.OwnedAssets.packs[0];
        this.currentBiome = activePack.biome;
        this.activeTheme = window.OwnedAssets.bgs.find(b => b.id === window.PlayerData.currentBG) || window.OwnedAssets.bgs[0];
        
        if (this.textures.exists(this.activeTheme.id)) {
            let bg = this.add.image(this.scale.width/2, this.scale.height/2, this.activeTheme.id);
            bg.setDisplaySize(this.scale.width, this.scale.height);
            bg.setDepth(-1000); bg.setScrollFactor(0); 
        } else { this.cameras.main.setBackgroundColor('#2E3136'); } 
        
        let backBtn = this.add.text(40, 50, '⬅️ BACK', { fontFamily: this.comicFont, fontSize: '45px', fill: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(0, 0).setInteractive().setDepth(5000);
        backBtn.on('pointerdown', () => {
            if (this.isPlaying) return; 
            this.tweens.add({ targets: this.cameras.main, scrollX: -this.scale.width, duration: 350, ease: 'Cubic.easeIn', onComplete: () => {
                this.scene.start('LobbyScene', { direction: 'left' });
            }});
        });

        const dailyData = window.DailyData;
        this.add.text(this.scale.width/2, 50, `LEVEL: ${dailyData.levelNumber}`, { fontFamily: this.comicFont, fontSize: '45px', fill: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8 }).setOrigin(0.5, 0).setDepth(5000);

        this.tileImagesGroup = this.add.group();
        
        if (this.textures.exists('tex_water') && !this.anims.exists('water_flow')) {
            const frames = this.anims.generateFrameNumbers('tex_water');
            if (frames && frames.length > 0) {
                this.anims.create({ key: 'water_flow', frames: frames, frameRate: 7, repeat: -1 });
            }
        }
        
        this.mapData = window.DailyData.mapData;
        this.spikeTraps = window.DailyData.spikeTraps;
        this.crystalsLogic = window.DailyData.crystalsLogic;
        this.bridgeLogic = window.DailyData.bridgeLogic;
        this.parScore = window.DailyData.parScore;
        this.tileHitboxes = this.add.group();
        this.gridGraphics = this.add.graphics(); 
        
        // התיקון שגורם לגשר להופיע בטעינה הראשונה!
        if (this.bridgeLogic) {
            this.bridgeVisualX = this.bridgeLogic.x;
            this.bridgeVisualY = this.bridgeLogic.y;
        }

        this.drawRealisticGrid();
        this.createCrystals();
        this.createPlayer();
        this.createSpacedUI();
        this.createLivesUI();
        this.createTrashButton();
        this.createTooltipSystem();
        this.setupBoardInteraction();
        
        this.input.on('dragstart', (pointer, gameObject) => {
            if (this.isPlaying) return;
            this.children.bringToTop(gameObject);
            gameObject.setAlpha(0.8); gameObject.setScale(1.1);
        });
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (this.isPlaying) return; gameObject.x = dragX; gameObject.y = dragY;
        });
        this.input.on('dragend', (pointer, gameObject) => {
            if (this.isPlaying) return; gameObject.setAlpha(1); gameObject.setScale(1); this.handleBlockDrop(gameObject);
        });
    }

    getPerspective(col, row, heightOffset = 0) {
        const cx = this.cameras.main.centerX;
        const cy = this.scale.height / 2 - 190; 
        const tileW = 108; 
        const tileH = 92;  
        const xOffset = (col - (this.gridSize - 1) / 2) * tileW;
        const yOffset = (row - (this.gridSize - 1) / 2) * tileH;
        const z = (this.gridSize - row) * 8; 
        const focalLength = 1500; 
        const scale = focalLength / (focalLength + z);
        const projX = cx + xOffset * scale;
        const projY = cy + yOffset * scale - heightOffset; 
        return { x: projX, y: projY, scale: scale };
    }

    createMaskedTexture(textureKey, pts, cutKey) {
        if (this.textures.exists(cutKey)) return cutKey;
        let srcTex = this.textures.get(textureKey);
        if (!srcTex || srcTex.key === '__MISSING') return null;
        let srcImg = srcTex.getSourceImage();
        if (!srcImg) return null;

        let minX = Math.min(...pts.map(p=>p.x));
        let maxX = Math.max(...pts.map(p=>p.x));
        let minY = Math.min(...pts.map(p=>p.y));
        let maxY = Math.max(...pts.map(p=>p.y));
        let w = maxX - minX;
        let h = maxY - minY;

        if (w <= 0 || h <= 0) return null;

        let canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        let ctx = canvas.getContext('2d');

        ctx.beginPath();
        ctx.moveTo(pts[0].x - minX, pts[0].y - minY);
        ctx.lineTo(pts[1].x - minX, pts[1].y - minY);
        ctx.lineTo(pts[2].x - minX, pts[2].y - minY);
        ctx.lineTo(pts[3].x - minX, pts[3].y - minY);
        ctx.closePath();
        ctx.clip(); 

        ctx.drawImage(srcImg, 0, 0, w, h);
        this.textures.addImage(cutKey, canvas); 
        return cutKey;
    }

    drawRealisticGrid() { 
        if (!this.gridInitialized) {
            this.gridInitialized = true;
            this.trapObjects = {}; 
            this.bridgeObj = { gfx: this.add.graphics(), img: null, maskGfx: null }; 

            let shadowGfx = this.add.graphics();
            for (let i = 1; i <= 5; i++) {
                const s_tl = this.getPerspective(-1, -1, -15); const s_tr = this.getPerspective(this.gridSize, -1, -15);
                const s_br = this.getPerspective(this.gridSize, this.gridSize, -15); const s_bl = this.getPerspective(-1, this.gridSize, -15);
                shadowGfx.fillStyle(0x000000, 0.06); shadowGfx.beginPath();
                shadowGfx.moveTo(s_tl.x, s_tl.y + 25 + (i * 3)); shadowGfx.lineTo(s_tr.x, s_tr.y + 25 + (i * 3));
                shadowGfx.lineTo(s_br.x, s_br.y + 25 + (i * 3)); shadowGfx.lineTo(s_bl.x, s_bl.y + 25 + (i * 3));
                shadowGfx.closePath(); shadowGfx.fillPath();
            }
            shadowGfx.setDepth(0);

            this.waterMask = this.make.graphics();
            this.waterMask.fillStyle(0xffffff); this.waterMask.beginPath();
            
            let waterSprite = this.add.sprite(this.scale.width/2, this.scale.height/2, 'tex_water');
            if (this.textures.exists('tex_water') && this.anims && this.anims.exists('water_flow')) {
                let animObj = this.anims.get('water_flow');
                if (animObj && animObj.frames.length > 0) {
                    try { waterSprite.play('water_flow', true); } catch(e) {}
                }
            }
            waterSprite.setDisplaySize(this.scale.width, this.scale.height);
            waterSprite.setDepth(10); 
            waterSprite.setMask(this.waterMask.createGeometryMask());

            for (let row = -1; row < this.gridSize; row++) {
                for (let col = -1; col <= this.gridSize; col++) {
                    let isExternalWall = (row === -1 || col === -1 || col === this.gridSize);
                    let tileType = 1; 

                    if (!isExternalWall) {
                        tileType = this.mapData[row][col];
                        if (tileType === 5) tileType = 3; 
                        let isBridgeSlot = (this.bridgeLogic && row === this.bridgeLogic.y && col === this.bridgeLogic.x);
                        if (isBridgeSlot || tileType === 4) tileType = 2; 
                    }
                    
                    let height = (tileType === 1 || isExternalWall) ? 25 : (tileType === 2 ? -15 : 0); 
                    let baseHeight = -15; 
                    let isDynamic = (tileType === 3); 
                    let isWater = (tileType === 2);

                    const tl = this.getPerspective(col - 0.5, row - 0.5, height); const tr = this.getPerspective(col + 0.5, row - 0.5, height);
                    const bl = this.getPerspective(col - 0.5, row + 0.5, height); const br = this.getPerspective(col + 0.5, row + 0.5, height);
                    const base_bl = this.getPerspective(col - 0.5, row + 0.5, baseHeight); const base_br = this.getPerspective(col + 0.5, row + 0.5, baseHeight);

                    let topColor, sideColor, textureKey = null;

                    if (isExternalWall) { topColor = this.currentBiome.wall; sideColor = this.currentBiome.wallDark; textureKey = 'tex_wall'; } 
                    else if (tileType === 9) { topColor = '#FFD54F'; sideColor = '#FFB300'; textureKey = 'tex_exit'; } 
                    else if (isWater) { 
                        // מצייר חור במים הגלובליים
                        this.waterMask.moveTo(tl.x, tl.y); this.waterMask.lineTo(tr.x, tr.y);
                        this.waterMask.lineTo(br.x, br.y); this.waterMask.lineTo(bl.x, bl.y);
                    } 
                    else if (tileType === 0) { topColor = this.currentBiome.floor; sideColor = this.currentBiome.floorDark; textureKey = this.textures.exists('custom_floor') ? 'custom_floor' : 'tex_floor'; } 
                    else if (tileType === 1) { topColor = this.currentBiome.wall; sideColor = this.currentBiome.wallDark; textureKey = this.textures.exists('custom_wall') ? 'custom_wall' : 'tex_wall'; }
                    else if (tileType === 3) { topColor = this.currentBiome.floor; sideColor = this.currentBiome.floorDark; textureKey = 'tex_trap_off'; }

                    let baseRowDepth = (row + 2) * 30 + (col + 2) * 2;
                    
                    let localGfx = this.add.graphics();
                    localGfx.setDepth(baseRowDepth);

                    let strokeGfx = this.add.graphics();
                    strokeGfx.setDepth(baseRowDepth + 1.5);
                    strokeGfx.lineStyle(5, 0x000000, 1);

                    if (height > baseHeight && !isWater) {
                        if ((tileType === 1 || isExternalWall) && this.textures.exists('tex_wall')) {
                            let sidePts = [bl, br, base_br, base_bl];
                            let sideCutKey = `tex_wall_side_c${col}_r${row}_h${height}_b${baseHeight}`;
                            let sideFinalKey = this.createMaskedTexture('tex_wall', sidePts, sideCutKey);
                            if (sideFinalKey) {
                                let minX = Math.min(...sidePts.map(p=>p.x)), maxX = Math.max(...sidePts.map(p=>p.x));
                                let minY = Math.min(...sidePts.map(p=>p.y)), maxY = Math.max(...sidePts.map(p=>p.y));
                                let sideImg = this.add.image((minX + maxX)/2, (minY + maxY)/2, sideFinalKey);
                                sideImg.setDepth(baseRowDepth);
                            }
                        } else {
                            localGfx.fillStyle(Phaser.Display.Color.HexStringToColor(sideColor).color, 1); localGfx.beginPath();
                            localGfx.moveTo(bl.x, bl.y); localGfx.lineTo(br.x, br.y); localGfx.lineTo(base_br.x, base_br.y); localGfx.lineTo(base_bl.x, base_bl.y);
                            localGfx.closePath(); localGfx.fillPath();
                        }
                        
                        strokeGfx.beginPath();
                        strokeGfx.moveTo(bl.x, bl.y); strokeGfx.lineTo(br.x, br.y); strokeGfx.lineTo(base_br.x, base_br.y); strokeGfx.lineTo(base_bl.x, base_bl.y);
                        strokeGfx.closePath(); strokeGfx.strokePath();
                    }

                    let topImg = null;
                    if (isWater) {
                        // התיקון לקווי המתאר של המים!
                        strokeGfx.beginPath();
                        strokeGfx.moveTo(tl.x, tl.y); strokeGfx.lineTo(tr.x, tr.y); strokeGfx.lineTo(br.x, br.y); strokeGfx.lineTo(bl.x, bl.y);
                        strokeGfx.closePath(); strokeGfx.strokePath();
                    } else {
                        if (textureKey && this.textures.exists(textureKey)) {
                            let pts = [tl, tr, br, bl];
                            let cutKey = `${textureKey}_top_c${col}_r${row}_h${height}`;
                            let finalKey = this.createMaskedTexture(textureKey, pts, cutKey);
                            if (finalKey) {
                                let minX = Math.min(...pts.map(p=>p.x)), maxX = Math.max(...pts.map(p=>p.x));
                                let minY = Math.min(...pts.map(p=>p.y)), maxY = Math.max(...pts.map(p=>p.y));
                                topImg = this.add.image((minX + maxX)/2, (minY + maxY)/2, finalKey);
                                topImg.setDepth(baseRowDepth + 1); 
                            }
                        } else {
                            localGfx.fillStyle(Phaser.Display.Color.HexStringToColor(topColor).color, 1); localGfx.beginPath();
                            localGfx.moveTo(tl.x, tl.y); localGfx.lineTo(tr.x, tr.y); localGfx.lineTo(br.x, br.y); localGfx.lineTo(bl.x, bl.y);
                            localGfx.closePath(); localGfx.fillPath();
                        }
                        
                        strokeGfx.beginPath();
                        strokeGfx.moveTo(tl.x, tl.y); strokeGfx.lineTo(tr.x, tr.y); strokeGfx.lineTo(br.x, br.y); strokeGfx.lineTo(bl.x, bl.y);
                        strokeGfx.closePath(); strokeGfx.strokePath();
                    }

                    if (isDynamic) {
                        let spikeGfx = this.add.graphics(); spikeGfx.setDepth(baseRowDepth + 2);
                        this.trapObjects[`${col}_${row}`] = { baseGfx: localGfx, img: topImg, spikeGfx: spikeGfx };
                    }
                }
            }
            this.waterMask.closePath(); this.waterMask.fillPath();

            if (this.bridgeLogic) {
                if (this.textures.exists('tex_bridge')) {
                    this.bridgeObj.img = this.add.image(0, 0, 'tex_bridge');
                    this.bridgeObj.maskGfx = this.make.graphics();
                    this.bridgeObj.img.setMask(this.bridgeObj.maskGfx.createGeometryMask());
                }
            }
        }

        this.updateBridgeVisuals();
        this.updateTrapsVisuals();

        if (this.playerContainer && this.playerContainer.active && this.bridgeVisualY !== undefined) {
            let pRow = this.playerLogic.y; 
            let playerDepth = (pRow + 2) * 30 + (this.playerLogic.x + 2) * 2 + 25; // עודכן לעומק בטוח!
            if (this.bridgeLogic && pRow === this.bridgeLogic.y && this.playerLogic.x === this.bridgeLogic.x) {
                let frontRow = Math.ceil(this.bridgeVisualY); let frontCol = Math.ceil(this.bridgeVisualX);
                playerDepth = (frontRow + 2) * 30 + (frontCol + 2) * 2 + 25; 
            }
            this.playerContainer.setDepth(playerDepth);
        }
        this.hitboxesCreated = true;
    }

    updateBridgeVisuals() {
        if (!this.bridgeLogic || this.bridgeVisualX === undefined) return;
        let brH = -5;
        const b_tl = this.getPerspective(this.bridgeVisualX - 0.5, this.bridgeVisualY - 0.5, brH);
        const b_tr = this.getPerspective(this.bridgeVisualX + 0.5, this.bridgeVisualY - 0.5, brH);
        const b_bl = this.getPerspective(this.bridgeVisualX - 0.5, this.bridgeVisualY + 0.5, brH);
        const b_br = this.getPerspective(this.bridgeVisualX + 0.5, this.bridgeVisualY + 0.5, brH);
        let frontRow = Math.ceil(this.bridgeVisualY); let frontCol = Math.ceil(this.bridgeVisualX);
        let bridgeDepth = (frontRow + 2) * 30 + (frontCol + 2) * 2 + 3;

        this.bridgeObj.gfx.clear(); this.bridgeObj.gfx.setDepth(bridgeDepth);
        if (this.bridgeObj.img) {
            const bCX = (b_tl.x + b_tr.x + b_bl.x + b_br.x) / 4; const bCY = (b_tl.y + b_tr.y + b_bl.y + b_br.y) / 4;
            const bW = Math.max(b_tl.x, b_tr.x, b_bl.x, b_br.x) - Math.min(b_tl.x, b_tr.x, b_bl.x, b_br.x);
            const bH = Math.max(b_tl.y, b_tr.y, b_bl.y, b_br.y) - Math.min(b_tl.y, b_tr.y, b_bl.y, b_br.y);
            this.bridgeObj.img.setPosition(bCX, bCY); this.bridgeObj.img.setDisplaySize(bW, bH);
            this.bridgeObj.img.setDepth(bridgeDepth - 1);
            
            this.bridgeObj.maskGfx.clear(); this.bridgeObj.maskGfx.fillStyle(0xffffff); this.bridgeObj.maskGfx.beginPath();
            this.bridgeObj.maskGfx.moveTo(b_tl.x, b_tl.y); this.bridgeObj.maskGfx.lineTo(b_tr.x, b_tr.y);
            this.bridgeObj.maskGfx.lineTo(b_br.x, b_br.y); this.bridgeObj.maskGfx.lineTo(b_bl.x, b_bl.y);
            this.bridgeObj.maskGfx.closePath(); this.bridgeObj.maskGfx.fillPath();
        } else {
            this.bridgeObj.gfx.fillStyle(0x8D6E63, 1); this.bridgeObj.gfx.beginPath();
            this.bridgeObj.gfx.moveTo(b_tl.x, b_tl.y); this.bridgeObj.gfx.lineTo(b_tr.x, b_tr.y);
            this.bridgeObj.gfx.lineTo(b_br.x, b_br.y); this.bridgeObj.gfx.lineTo(b_bl.x, b_bl.y);
            this.bridgeObj.gfx.closePath(); this.bridgeObj.gfx.fillPath();
        }
        
        this.bridgeObj.gfx.lineStyle(5, 0x000000, 1); this.bridgeObj.gfx.beginPath();
        this.bridgeObj.gfx.moveTo(b_tl.x, b_tl.y); this.bridgeObj.gfx.lineTo(b_tr.x, b_tr.y);
        this.bridgeObj.gfx.lineTo(b_br.x, b_br.y); this.bridgeObj.gfx.lineTo(b_bl.x, b_bl.y);
        this.bridgeObj.gfx.closePath(); this.bridgeObj.gfx.strokePath();
    }

    updateTrapsVisuals() {
        this.spikeTraps.forEach(trap => {
            let key = `${trap.x}_${trap.y}`;
            if (this.trapObjects && this.trapObjects[key]) {
                const textureKey = trap.active ? 'tex_trap_on' : 'tex_trap_off';
                
                const tl = this.getPerspective(trap.x - 0.5, trap.y - 0.5, 0); const tr = this.getPerspective(trap.x + 0.5, trap.y - 0.5, 0);
                const bl = this.getPerspective(trap.x - 0.5, trap.y + 0.5, 0); const br = this.getPerspective(trap.x + 0.5, trap.y + 0.5, 0);
                let pts = [tl, tr, br, bl];
                let cutKey = `${textureKey}_top_c${trap.x}_r${trap.y}_h0`;
                let finalKey = this.createMaskedTexture(textureKey, pts, cutKey);

                if (this.trapObjects[key].img && finalKey) {
                    this.trapObjects[key].img.setTexture(finalKey); 
                }
                
                this.trapObjects[key].spikeGfx.clear();
                if (trap.active) {
                    const spikeTop = this.getPerspective(trap.x, trap.y, 30);
                    this.trapObjects[key].spikeGfx.fillStyle(0xFF3333, 1); this.trapObjects[key].spikeGfx.lineStyle(3, 0x000000, 1);
                    this.trapObjects[key].spikeGfx.beginPath();
                    this.trapObjects[key].spikeGfx.moveTo(tl.x + 10*tl.scale, tl.y + 10*tl.scale);
                    this.trapObjects[key].spikeGfx.lineTo(br.x - 10*br.scale, br.y - 10*br.scale);
                    this.trapObjects[key].spikeGfx.lineTo(spikeTop.x, spikeTop.y);
                    this.trapObjects[key].spikeGfx.closePath(); this.trapObjects[key].spikeGfx.fillPath(); this.trapObjects[key].spikeGfx.strokePath();
                }
            }
        });
    }

    createCrystals() {
        this.crystalsLogic.forEach(c => {
            if(c.sprite) c.sprite.destroy();
            const pos = this.getPerspective(c.x, c.y, 10);
            
            if (this.textures.exists('tex_crystal')) {
                c.sprite = this.add.image(pos.x, pos.y, 'tex_crystal');
                c.sprite.setScale(pos.scale * 0.13); 
            } else {
                c.sprite = this.add.graphics();
                c.sprite.fillStyle(0x00E5FF, 1); c.sprite.lineStyle(2, 0x000000, 1);
                c.sprite.fillCircle(0, 0, 12); c.sprite.strokeCircle(0, 0, 12);
                c.sprite.setPosition(pos.x, pos.y);
                c.sprite.setScale(pos.scale);
            }
            
            c.sprite.setDepth((c.y + 2) * 30 + (c.x + 2) * 2 + 15);

            this.tweens.add({ 
                targets: c.sprite, 
                y: pos.y - 15 * pos.scale, 
                duration: 800 + Phaser.Math.Between(-100, 100), 
                yoyo: true, 
                repeat: -1, 
                ease: 'Sine.easeInOut' 
            });
        });
    }

    animateUIText(textObj) {
        this.tweens.add({
            targets: textObj,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 150,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }

    updatePlayerVisualPosition(duration = 0) {
        if (!this.playerContainer || !this.playerContainer.active) return; 

        let height = 0;
        let isMovingBridge = (this.bridgeLogic && this.bridgeLogic.x === this.playerLogic.x && this.bridgeLogic.y === this.playerLogic.y);
        const tileType = this.mapData[this.playerLogic.y]?.[this.playerLogic.x] || 0;
        
        if (isMovingBridge || tileType === 4) height = 5;
        else {
            if (tileType === 1) height = 50;
            if (tileType === 2) height = -15;
        }

        const pos = this.getPerspective(this.playerLogic.x, this.playerLogic.y, height);
        
        if (this.playerSprite) {
            let skinConfig = window.OwnedAssets.skins.find(s => s.id === window.PlayerData.currentSkin);
            this.playerSprite.setTexture(`${skinConfig.id}_${this.playerLogic.direction}`);
        } else {
            const eyeOffsets = [{x: 8, y:0}, {x:0, y:8}, {x:-8, y:0}, {x:0, y:-8}];
            this.eyeGraphics.setPosition(eyeOffsets[this.playerLogic.direction].x, eyeOffsets[this.playerLogic.direction].y);
        }

        if (this.playerContainer && this.playerContainer.active) {
            let pRow = this.playerLogic.y; 
            let playerDepth = (pRow + 2) * 30 + (this.playerLogic.x + 2) * 2 + 25; // עודכן לעומק בטוח!
            if (this.bridgeLogic && pRow === this.bridgeLogic.y && this.playerLogic.x === this.bridgeLogic.x) {
                let frontRow = Math.ceil(this.bridgeVisualY !== undefined ? this.bridgeVisualY : this.bridgeLogic.y);
                let frontCol = Math.ceil(this.bridgeVisualX !== undefined ? this.bridgeVisualX : this.bridgeLogic.x);
                playerDepth = (frontRow + 2) * 30 + (frontCol + 2) * 2 + 25; 
            }
            this.playerContainer.setDepth(playerDepth);
        }

        if (duration > 0) {
            this.tweens.add({
                targets: this.playerContainer, x: pos.x, y: pos.y, scaleX: pos.scale, scaleY: pos.scale,
                duration: duration, ease: 'Linear',
                onUpdate: (tween) => {
                    const jumpHeight = Math.sin(tween.progress * Math.PI) * 40 * pos.scale;
                    if (this.playerGraphic) { this.playerGraphic.y = -jumpHeight; this.eyeGraphics.y = -jumpHeight; }
                    if (this.playerSprite) { this.playerSprite.y = -40 - jumpHeight; }
                },
                onComplete: () => {
                    if (this.playerGraphic) { this.playerGraphic.y = 0; this.eyeGraphics.y = 0; }
                    if (this.playerSprite) { this.playerSprite.y = -40; }
                    this.checkCollisions(); this.executeNextAction();
                }
            });
        } else {
            this.playerContainer.setPosition(pos.x, pos.y);
            this.playerContainer.setScale(pos.scale);
        }
    }

    drawPathBox(rows) {
        this.pathBox.clear(); 
        const boxHeight = Math.max(160, rows * 100 + 60); 
        const boxY = this.cardsY - 70 - boxHeight; 
        const boxWidth = 900;
        const boxX = this.scale.width / 2 - 450;

        this.pathBox.fillStyle(0xE0E5EC, 1); 
        this.pathBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
        
        this.pathBox.lineStyle(2, 0xB0BEC5, 0.4);
        for(let i=10; i<boxHeight; i+=30) {
            this.pathBox.beginPath(); this.pathBox.moveTo(boxX+5, boxY+i); this.pathBox.lineTo(boxX+boxWidth-5, boxY+i); this.pathBox.strokePath();
        }
        for(let i=20; i<boxWidth; i+=30) {
            this.pathBox.beginPath(); this.pathBox.moveTo(boxX+i, boxY+5); this.pathBox.lineTo(boxX+i, boxY+boxHeight-5); this.pathBox.strokePath();
        }

        this.pathBox.lineStyle(6, 0x263238, 1);
        this.pathBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
        this.pathBoxBounds = { x: boxX, y: boxY, width: boxWidth, height: boxHeight };
    }

    createTooltipSystem() {
        if(this.tooltipContainer) this.tooltipContainer.destroy();
        this.tooltipContainer = this.add.container(0, 0);
        this.tooltipContainer.setAlpha(0); 
        this.tooltipContainer.setDepth(5000); 
        
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95); bg.lineStyle(4, 0x000000, 1);
        bg.fillRoundedRect(-100, -70, 200, 70, 15); bg.strokeRoundedRect(-100, -70, 200, 70, 15);
        bg.fillStyle(0xFFFFFF, 0.95); bg.beginPath();
        bg.moveTo(-10, 0); bg.lineTo(10, 0); bg.lineTo(0, 15);
        bg.closePath(); bg.fillPath(); bg.strokePath();
        
        this.ttTitle = this.add.text(0, -50, '', { fontFamily: this.comicFont, fontSize: '22px', fill: '#000000', fontStyle: 'bold' }).setOrigin(0.5);
        this.ttSub = this.add.text(0, -20, '', { fontFamily: this.comicFont, fontSize: '16px', fill: '#666666' }).setOrigin(0.5);
        this.tooltipContainer.add([bg, this.ttTitle, this.ttSub]);
    }

    showTooltip(x, y, title, subtitle) {
        this.tooltipContainer.setPosition(x, y - 20);
        this.ttTitle.setText(title); this.ttSub.setText(subtitle);
        this.tweens.killTweensOf(this.tooltipContainer); 
        this.tooltipContainer.setAlpha(1); this.tooltipContainer.setScale(0.5);
        this.tweens.add({ targets: this.tooltipContainer, scale: 1, duration: 200, ease: 'Back.easeOut' });
        this.time.delayedCall(2000, () => { this.tweens.add({ targets: this.tooltipContainer, alpha: 0, duration: 200 }); });
    }

    checkCollisions() {
        if (!this.mapData[this.playerLogic.y] || this.mapData[this.playerLogic.y][this.playerLogic.x] === undefined) return;

        this.crystalsLogic.forEach(c => {
            if (!c.collected && this.playerLogic.x === c.x && this.playerLogic.y === c.y) {
                c.collected = true; this.collectedCrystals++; 
                this.scoreText.setText(`💎 ${this.collectedCrystals}/3`);
                this.animateUIText(this.scoreText); // אנימציה לאיסוף קריסטל
                
                this.tweens.add({
                    targets: c.sprite,
                    y: c.sprite.y - 80,
                    scaleX: 0,
                    scaleY: 0,
                    alpha: 0,
                    angle: 360,
                    duration: 500,
                    ease: 'Back.easeIn'
                });
            }
        });
        if (this.mapData[this.playerLogic.y][this.playerLogic.x] === 9) this.showWinScreen();
    }

    resetLevel() {
        this.playerLogic = { x: this.startPos.x, y: this.startPos.y, direction: 3 };
        
        this.collectedCrystals = 0;
        this.scoreText.setText(`💎 ${this.collectedCrystals}/3`);
        
        this.crystalsLogic.forEach(c => {
            c.collected = false;
            if (c.sprite) {
                this.tweens.killTweensOf(c.sprite); 
                c.sprite.setAlpha(1);
                c.sprite.angle = 0;
                
                const pos = this.getPerspective(c.x, c.y, 10);
                c.sprite.setPosition(pos.x, pos.y);
                let targetScale = this.textures.exists('tex_crystal') ? pos.scale * 0.13 : pos.scale;
                c.sprite.setScale(targetScale);
                
                this.tweens.add({ 
                    targets: c.sprite, y: pos.y - 15 * pos.scale, duration: 800 + Phaser.Math.Between(-100, 100), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' 
                });
            }
        });

        if (this.bridgeLogic) {
            if (this.bridgeLogic.axis === 'x') this.bridgeLogic.x = this.bridgeLogic.initialPos;
            else this.bridgeLogic.y = this.bridgeLogic.initialPos;
            this.bridgeLogic.dir = this.bridgeLogic.initialDir;
            this.bridgeLogic.pauseTimer = 1;
            this.bridgeVisualX = this.bridgeLogic.x;
            this.bridgeVisualY = this.bridgeLogic.y;
        }
        
        this.spikeTraps.forEach(s => s.active = s.initialActive);
        this.drawRealisticGrid();

        const targetPos = this.getPerspective(this.startPos.x, this.startPos.y, 0); 
        this.playerContainer.setAlpha(1); 
        this.playerContainer.setPosition(targetPos.x, targetPos.y - 300); 
        this.updatePlayerVisualPosition(0); 
        
        this.tweens.add({ targets: this.playerContainer, y: targetPos.y, duration: 600, ease: 'Bounce.easeOut' });
        
        this.isPlaying = false; 
        this.renderVisualQueue(); 
    }

    createPlayer() {
        if(this.playerContainer) this.playerContainer.destroy();
        this.playerContainer = this.add.container(0, 0);
        
        let skinConfig = window.OwnedAssets.skins.find(s => s.id === window.PlayerData.currentSkin) || window.OwnedAssets.skins[0];
        
        if (skinConfig.isDefault) {
            this.playerGraphic = this.add.graphics();
            this.playerGraphic.fillStyle(0xFF5252, 1); this.playerGraphic.lineStyle(5, 0x000000, 1);
            this.playerGraphic.fillRoundedRect(-30, -60, 60, 60, 12); this.playerGraphic.strokeRoundedRect(-30, -60, 60, 60, 12);
            
            this.eyeGraphics = this.add.graphics();
            this.eyeGraphics.fillStyle(0xFFFFFF, 1); this.eyeGraphics.lineStyle(2, 0x000000, 1);
            this.eyeGraphics.fillCircle(-12, -40, 10); this.eyeGraphics.strokeCircle(-12, -40, 10);
            this.eyeGraphics.fillStyle(0x000000, 1);
            this.eyeGraphics.fillCircle(-12, -40, 4); this.eyeGraphics.fillCircle(12, -40, 4);
            
            this.playerContainer.add([this.playerGraphic, this.eyeGraphics]);
        } else {
            this.playerSprite = this.add.image(0, -40, `${skinConfig.id}_3`); 
            this.playerSprite.setScale(skinConfig.scale); 
            this.playerContainer.add(this.playerSprite);
        }

        this.playerContainer.setDepth(50); 
        this.updatePlayerVisualPosition(0);
    }

    createLivesUI() {
        this.scoreText = this.add.text(this.scale.width - 40, 50, `💎 0/3`, { fontFamily: this.comicFont, fontSize: '45px', fill: '#00E5FF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8 }).setOrigin(1, 0);
        this.scoreText.setShadow(3, 3, 'rgba(0,0,0,0.4)', 5); 
        this.livesText = this.add.text(this.scale.width - 40, 120, "❤️ " + window.PlayerData.triesLeft + "/" + this.maxTries, { fontFamily: this.comicFont, fontSize: '45px', fill: '#FF0000', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8 }).setOrigin(1, 0);
        this.livesText.setShadow(3, 3, 'rgba(0,0,0,0.4)', 5); 
    }

    setupBoardInteraction() {
        this.input.on('pointerdown', (pointer) => {
            if (this.pathBoxBounds && pointer.y > this.pathBoxBounds.y - 30) return;
            
            let clickedCol = -1, clickedRow = -1;
            let minDist = 1000;
            
            for (let r = 0; r < this.gridSize; r++) {
                for (let c = 0; c < this.gridSize; c++) {
                    let pos = this.getPerspective(c, r, 0);
                    let dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, pos.x, pos.y);
                    if (dist < 70 * pos.scale && dist < minDist) {
                        minDist = dist; clickedCol = c; clickedRow = r;
                    }
                }
            }
            
            if (clickedCol !== -1) {
                let tileType = this.mapData[clickedRow][clickedCol];
                let isMovingBridge = (this.bridgeLogic && this.bridgeLogic.x === clickedCol && this.bridgeLogic.y === clickedRow);
                
                let title = 'Safe Path', subtitle = 'Walkable Area';
                if (tileType === 9) { title = 'Exit Portal'; subtitle = 'Level Goal'; }
                else if (isMovingBridge || tileType === 4) { title = isMovingBridge ? 'Moving Bridge' : 'Static Bridge'; subtitle = isMovingBridge ? 'Moves every 2 turns' : 'Safe'; }
                else if (tileType === 2) { title = 'Deep Water'; subtitle = 'Danger: Sinks Player'; }
                else if (tileType === 3) { title = 'Spike Trap'; subtitle = 'Changes state every 1 turn'; }
                else if (tileType === 1) { title = 'Solid Wall'; subtitle = 'Obstacle'; }

                this.showTooltip(pointer.x, pointer.y, title, subtitle);
            }
        });
    }

    createTrashButton() {
        const btn = this.add.container(this.scale.width / 2 - 190, this.scale.height - 110);
        const bg = this.add.graphics();
        bg.fillStyle(0xFF3333, 1); bg.lineStyle(5, 0x000000, 1);
        bg.fillCircle(0, 0, 45); bg.strokeCircle(0, 0, 45); 
        const icon = this.add.text(0, 0, '🗑️', { fontSize: '45px' }).setOrigin(0.5);
        btn.add([bg, icon]); btn.setSize(90, 90); btn.setInteractive();
        
        btn.on('pointerdown', () => {
            if (this.isPlaying || this.actionQueue.length === 0) return;
            this.tweens.add({ targets: btn, scale: 0.8, duration: 100, yoyo: true });
            const allBlocks = this.queueBlocksContainer.list.filter(b => b.actionData);
            this.tweens.add({ targets: allBlocks, x: btn.x, y: btn.y, scaleX: 0, scaleY: 0, alpha: 0, duration: 300, onComplete: () => { this.actionQueue = []; this.renderVisualQueue(); } });
        });
    }

    createSpacedUI() {
        this.cardsY = this.scale.height - 290; 
        
        this.pathBox = this.add.graphics(); this.drawPathBox(1); 
        this.loopBracketsContainer = this.add.container(0, 0); this.queueBlocksContainer = this.add.container(0, 0);

        const spacing = 115;
        const totalCardsWidth = 6 * spacing; 
        const startX = this.scale.width / 2 - (totalCardsWidth / 2); 

        this.createCartoonCard(startX, this.cardsY, '⬆️', 'FWD', () => this.addAction('FORWARD'));
        this.createCartoonCard(startX + spacing, this.cardsY, '↩️', 'LEFT', () => this.addAction('LEFT'));
        this.createCartoonCard(startX + spacing * 2, this.cardsY, '↪️', 'RIGHT', () => this.addAction('RIGHT'));
        this.createCartoonCard(startX + spacing * 3, this.cardsY, '🔄', 'U-TURN', () => this.addAction('UTURN'));
        this.createCartoonCard(startX + spacing * 4, this.cardsY, '⏳', 'WAIT', () => this.addAction('WAIT')); 
        this.createCartoonCard(startX + spacing * 5, this.cardsY, '🔁', 'LOOP', () => this.addAction('LOOP_START'));
        this.createCartoonCard(startX + spacing * 6, this.cardsY, '🔚', 'END', () => this.addAction('LOOP_END'));
        
        this.createCartoonButton(this.scale.width / 2 + 55, this.scale.height - 110, 'EXECUTE', async () => {
            if (!this.isPlaying && this.actionQueue.length > 0) {
                if (window.PlayerData.triesLeft <= 0) return;
                
                try {
                    const res = await fetch('/api/lose_life', { method: 'POST', headers: { 'Authorization': window.PlayerData.accessToken } });
                    if (!res.ok) return; 
                    const data = await res.json();
                    
                    window.PlayerData.triesLeft = data.triesLeft;
                    this.livesText.setText(`❤️ ${window.PlayerData.triesLeft}/${this.maxTries}`);
                    this.animateUIText(this.livesText); // אנימציה להורדת חיים
                    
                    this.isPlaying = true; 
                    this.currentStep = 0; 
                    this.loopRuntimeCounts = {}; 
                    this.executeNextAction();
                } catch (e) { console.error("Error executing", e); }
            }
        });
    }

    addAction(actionType) {
        if (this.actionQueue.length < 24) {
            let newAction = { type: actionType, id: Phaser.Math.Between(1000, 9999) };
            if (actionType === 'LOOP_START') newAction.loopCount = 2; 
            this.actionQueue.push(newAction); this.renderVisualQueue();
        }
    }

    renderVisualQueue(animateMovement = false) {
        const rowsCount = Math.min(3, Math.ceil(this.actionQueue.length / this.blocksPerRow)) || 1;
        this.drawPathBox(rowsCount);
        const boxY = this.pathBoxBounds.y + 60; const startX = this.pathBoxBounds.x + 30;
        const symbols = { 'FORWARD': '⬆️', 'RIGHT': '↪️', 'LEFT': '↩️', 'UTURN': '🔄', 'WAIT': '⏳', 'LOOP_START': '🔁', 'LOOP_END': '🔚' };
        
        const existingBlocks = {}; this.queueBlocksContainer.each(b => { existingBlocks[b.actionData.id] = b; });
        this.loopBracketsContainer.removeAll(true); let startIndexes = [];

        this.actionQueue.forEach((actionObj, index) => {
            const row = Math.floor(index / this.blocksPerRow); const col = index % this.blocksPerRow;
            const targetX = startX + col * 105; const targetY = boxY + row * 100;
            
            if (actionObj.type === 'LOOP_START') startIndexes.push(index);
            if (actionObj.type === 'LOOP_END' && startIndexes.length > 0) {
                const sIndex = startIndexes.pop();
                this.drawLoopBracket(startX + (sIndex%this.blocksPerRow)*105, targetX, targetY);
            }

            let blockContainer = existingBlocks[actionObj.id];
            let bgColor = 0xFFFFFF;
            if (this.isPlaying) {
                if (index < this.currentStep) bgColor = 0xBBBBBB; else if (index === this.currentStep) bgColor = 0xFFFF00;
            }

            let textValue = symbols[actionObj.type];
            if (actionObj.type === 'LOOP_START') {
                let currentDisplayCount = actionObj.loopCount;
                if (this.isPlaying && this.loopRuntimeCounts[actionObj.id] !== undefined) currentDisplayCount = this.loopRuntimeCounts[actionObj.id] + 1;
                textValue = `🔁x${currentDisplayCount}`;
            }

            if (!blockContainer) {
                blockContainer = this.add.container(targetX + 40, targetY + 40);
                blockContainer.setSize(80, 85); blockContainer.setInteractive(); this.input.setDraggable(blockContainer);
                const blockBg = this.add.graphics({ x: -40, y: -42 });
                blockBg.fillStyle(bgColor, 1); blockBg.lineStyle(4, 0x000000, 1);
                blockBg.fillRoundedRect(0, 0, 80, 85, 12); blockBg.strokeRoundedRect(0, 0, 80, 85, 12);
                const txt = this.add.text(0, 0, textValue, { fontFamily: this.comicFont, fontSize: '28px', fill: '#000000' }).setOrigin(0.5);
                blockContainer.add([blockBg, txt]); this.queueBlocksContainer.add(blockContainer);

                if (actionObj.type === 'LOOP_START') {
                    blockContainer.on('pointerup', (pointer) => {
                        const isDrag = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.upX, pointer.upY) > 10;
                        if (!this.isPlaying && !isDrag && pointer.getDuration() < 300) {
                            actionObj.loopCount = actionObj.loopCount >= 4 ? 2 : actionObj.loopCount + 1;
                            txt.setText(`🔁x${actionObj.loopCount}`);
                            this.tweens.add({ targets: blockContainer, scale: 1.2, duration: 100, yoyo: true });
                        }
                    });
                }
            } else {
                const bg = blockContainer.list[0]; bg.clear(); bg.fillStyle(bgColor, 1); bg.lineStyle(4, 0x000000, 1);
                bg.fillRoundedRect(0, 0, 80, 85, 12); bg.strokeRoundedRect(0, 0, 80, 85, 12);
                blockContainer.list[1].setText(textValue);
                if (animateMovement && (blockContainer.x !== targetX + 40 || blockContainer.y !== targetY + 40)) {
                    this.tweens.add({ targets: blockContainer, x: targetX + 40, y: targetY + 40, duration: 250, ease: 'Quad.easeOut' });
                } else blockContainer.setPosition(targetX + 40, targetY + 40);
                delete existingBlocks[actionObj.id];
            }
            blockContainer.actionData = actionObj;
        });
        Object.values(existingBlocks).forEach(b => b.destroy());
    }

    drawLoopBracket(x1, x2, baseY) {
        const bracket = this.add.graphics(); bracket.lineStyle(6, 0x03A9F4, 1); 
        bracket.beginPath(); bracket.moveTo(x1 + 40, baseY); bracket.lineTo(x1 + 40, baseY - 45); 
        bracket.lineTo(x2 + 40, baseY - 45); bracket.lineTo(x2 + 40, baseY); bracket.strokePath();
        this.loopBracketsContainer.add(bracket);
    }

    handleBlockDrop(droppedBlock) {
        if (droppedBlock.y < this.pathBoxBounds.y - 20 || droppedBlock.y > this.pathBoxBounds.y + this.pathBoxBounds.height + 20) {
            this.tweens.add({ targets: droppedBlock, scaleX: 0, scaleY: 0, alpha: 0, duration: 200,
                onComplete: () => { this.actionQueue = this.actionQueue.filter(a => a.id !== droppedBlock.actionData.id); this.renderVisualQueue(true); }
            });
            return;
        }
        const allBlocks = this.queueBlocksContainer.list.filter(b => b.actionData);
        allBlocks.sort((a, b) => { if (Math.abs(a.y - b.y) > 50) return a.y - b.y; return a.x - b.x; });
        this.actionQueue = allBlocks.map(b => b.actionData); this.renderVisualQueue(true); 
    }

    createCartoonCard(x, y, icon, label, onClick) {
        const shadow = this.add.graphics(); shadow.fillStyle(0x000000, 1); shadow.fillRoundedRect(x - 50, y - 50, 100, 100, 15);
        const cardBg = this.add.graphics(); cardBg.fillStyle(0xFFFFFF, 1); cardBg.lineStyle(4, 0x000000, 1);
        cardBg.fillRoundedRect(x - 55, y - 55, 100, 100, 15); cardBg.strokeRoundedRect(x - 55, y - 55, 100, 100, 15);
        const cardZone = this.add.zone(x, y, 100, 100).setInteractive();
        this.add.text(x - 5, y - 10, icon, { fontSize: '35px' }).setOrigin(0.5);
        this.add.text(x - 5, y + 30, label, { fontFamily: this.comicFont, fontSize: '14px', fill: '#000000', fontStyle: 'bold' }).setOrigin(0.5);
        cardZone.on('pointerdown', () => { if (this.isPlaying) return; this.tweens.add({ targets: cardBg, y: 5, duration: 50, yoyo: true }); onClick(); });
    }

    createCartoonButton(x, y, text, onClick) {
        const width = 360; 
        const height = 90;
        
        const shadow = this.add.graphics(); 
        shadow.fillStyle(0x000000, 1); 
        shadow.fillRoundedRect(x - (width/2 - 5), y - (height/2 - 5), width, height, 25);
        
        const btnBg = this.add.graphics(); 
        btnBg.fillStyle(0x4CAF50, 1); 
        btnBg.lineStyle(6, 0x000000, 1);
        btnBg.fillRoundedRect(x - width/2, y - height/2, width, height, 25); 
        btnBg.strokeRoundedRect(x - width/2, y - height/2, width, height, 25);
        
        this.add.text(x, y, text, { fontFamily: this.comicFont, fontSize: '40px', fill: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8 }).setOrigin(0.5);
        
        const btnZone = this.add.zone(x, y, width, height).setInteractive();
        btnZone.on('pointerdown', () => { this.tweens.add({ targets: btnBg, y: 5, duration: 50, yoyo: true }); onClick(); });
    }

    triggerDeath(reason) {
        this.cameras.main.shake(150, 0.015); 
        this.time.delayedCall(200, () => {
            this.tweens.add({
                targets: this.playerContainer, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 250, ease: 'Quad.easeOut',
                onComplete: () => {
                    if (window.PlayerData.triesLeft <= 0) { 
                        this.showGameOverScreen(); 
                        return; 
                    }
                    this.resetLevel();
                }
            }); 
        });
    }

    // --- שדרוג מסך ה-Game Over שייראה מעולה ---
    showGameOverScreen() {
        this.isPlaying = true; 
        fetch('/api/announce', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': window.PlayerData.accessToken },
            body: JSON.stringify({
                channelId: window.PlayerData.channelId, username: window.PlayerData.username, avatarUrl: window.PlayerData.avatarUrl,
                isWin: false, score: 0, tries: this.maxTries, crystals: this.collectedCrystals, moves: 0, 
                biome: this.currentBiome, themeColor: '#FF5252'
            })
        }).catch(e => console.log(e));
        
        const panel = this.add.graphics(); 
        panel.fillStyle(0x000000, 0.85); panel.fillRect(0, 0, this.scale.width, this.scale.height); panel.setDepth(200);
        
        const box = this.add.graphics();
        box.fillStyle(0x2E3136, 1); box.lineStyle(10, 0xFF5252, 1);
        box.fillRoundedRect(this.scale.width/2 - 450, 300, 900, 700, 40); box.strokeRoundedRect(this.scale.width/2 - 450, 300, 900, 700, 40); box.setDepth(201);
        
        this.add.text(this.scale.width/2, 450, '💀\nGAME OVER', { fontFamily: this.comicFont, fontSize: '90px', fill: '#FF5252', fontStyle: 'bold', stroke: '#000', strokeThickness: 12, align: 'center' }).setOrigin(0.5).setDepth(201);
        this.add.text(this.scale.width/2, 650, 'NO LIVES REMAINING TODAY', { fontFamily: this.comicFont, fontSize: '40px', fill: '#FFF' }).setOrigin(0.5).setDepth(201);
        this.add.text(this.scale.width/2, 750, 'Wait for the daily reset!', { fontFamily: this.comicFont, fontSize: '30px', fill: '#AAAAAA' }).setOrigin(0.5).setDepth(201);
        
        const btnBg = this.add.graphics(); btnBg.fillStyle(0xFF5252, 1); btnBg.lineStyle(6, 0x000, 1);
        btnBg.fillRoundedRect(this.scale.width/2 - 300, 850, 600, 100, 25); btnBg.strokeRoundedRect(this.scale.width/2 - 300, 850, 600, 100, 25); btnBg.setDepth(201);
        this.add.text(this.scale.width/2, 900, 'RETURN TO LOBBY', { fontFamily: this.comicFont, fontSize: '40px', fill: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(202);
        
        const btnZone = this.add.zone(this.scale.width/2, 900, 600, 100).setInteractive().setDepth(203);
        btnZone.on('pointerdown', () => { this.tweens.add({ targets: this.cameras.main, scrollX: -this.scale.width, duration: 350, ease: 'Cubic.easeIn', onComplete: () => { this.scene.start('LobbyScene', { direction: 'left' }); }}); });
    }

    // --- שדרוג מסך הניצחון שייראה מעולה ---
    showWinScreen() {
        this.isPlaying = true; 
        
        let actionCost = 0; 
        this.actionQueue.forEach(a => { 
            if(a.type !== 'LOOP_END' && a.type !== 'LOOP_START') actionCost++; 
            if(a.type === 'LOOP_START') actionCost++; 
        });
        
        fetch('/api/win', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': window.PlayerData.accessToken },
            body: JSON.stringify({ actionCost: actionCost })
        }).then(res => res.json()).then(data => {
            window.PlayerData.coins = data.coins;
            window.PlayerData.lastSolvedLevel = window.DailyData.levelNumber;

            fetch('/api/announce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': window.PlayerData.accessToken },
                body: JSON.stringify({
                    channelId: window.PlayerData.channelId, username: window.PlayerData.username, avatarUrl: window.PlayerData.avatarUrl,
                    isWin: true, score: data.totalScore, tries: this.maxTries - window.PlayerData.triesLeft,
                    crystals: this.collectedCrystals, moves: actionCost, biome: this.currentBiome, themeColor: '#4CAF50'
                })
            }).catch(e => console.log(e));

            const panel = this.add.graphics(); 
            panel.fillStyle(0x000000, 0.85); panel.fillRect(0, 0, this.scale.width, this.scale.height); panel.setDepth(200);
            
            const box = this.add.graphics();
            box.fillStyle(0x2E3136, 1); box.lineStyle(10, 0x4CAF50, 1);
            box.fillRoundedRect(this.scale.width/2 - 450, 200, 900, 1000, 40); box.strokeRoundedRect(this.scale.width/2 - 450, 200, 900, 1000, 40); box.setDepth(201);
            
            this.add.text(this.scale.width/2, 350, '🏆\nMISSION\nACCOMPLISHED', { fontFamily: this.comicFont, fontSize: '80px', fill: '#FFD54F', fontStyle: 'bold', stroke: '#000000', strokeThickness: 12, align: 'center' }).setOrigin(0.5).setDepth(201);
            
            this.add.text(this.scale.width/2, 600, `💎 Crystals: ${this.collectedCrystals}/3`, { fontFamily: this.comicFont, fontSize: '45px', fill: '#00E5FF', fontStyle: 'bold' }).setOrigin(0.5).setDepth(201);
            this.add.text(this.scale.width/2, 680, `🧩 Blocks Used: ${actionCost} (Par: ${data.parScore})`, { fontFamily: this.comicFont, fontSize: '45px', fill: '#FFFFFF' }).setOrigin(0.5).setDepth(201);
            
            this.add.text(this.scale.width/2, 850, `SCORE: ${data.totalScore}`, { fontFamily: this.comicFont, fontSize: '85px', fill: '#4CAF50', fontStyle: 'bold', stroke: '#000000', strokeThickness: 10 }).setOrigin(0.5).setDepth(201);
            this.add.text(this.scale.width/2, 980, `+ 🪙 ${data.earnedCoins} COINS!`, { fontFamily: this.comicFont, fontSize: '60px', fill: '#FFC107', fontStyle: 'bold', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5).setDepth(201);

            const btnBg = this.add.graphics(); btnBg.fillStyle(0x4CAF50, 1); btnBg.lineStyle(6, 0x000000, 1);
            btnBg.fillRoundedRect(this.scale.width/2 - 300, 1080, 600, 100, 25); btnBg.strokeRoundedRect(this.scale.width/2 - 300, 1080, 600, 100, 25); btnBg.setDepth(201);
            this.add.text(this.scale.width/2, 1130, 'COLLECT & RETURN', { fontFamily: this.comicFont, fontSize: '40px', fill: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(202);
            
            const btnZone = this.add.zone(this.scale.width/2, 1130, 600, 100).setInteractive().setDepth(203);
            btnZone.on('pointerdown', () => {
                this.tweens.add({ targets: this.cameras.main, scrollX: -this.scale.width, duration: 350, ease: 'Cubic.easeIn', onComplete: () => { this.scene.start('LobbyScene', { direction: 'left' }); }});
            });
        });
    }

    executeNextAction() {
        this.renderVisualQueue();
        
        if (this.currentStep >= this.actionQueue.length) { 
            if (this.mapData[this.playerLogic.y][this.playerLogic.x] !== 9) {
                // התיקון למכניקת "נגמרו המהלכים": השחקן נשאר במקום, התור מתרוקן!
                this.cameras.main.shake(200, 0.01);
                this.time.delayedCall(400, () => {
                    this.isPlaying = false;
                    this.actionQueue = []; 
                    this.renderVisualQueue();
                    
                    if (window.PlayerData.triesLeft <= 0) {
                        this.showGameOverScreen();
                    } else {
                        this.showTooltip(this.scale.width/2, this.scale.height/2, 'OUT OF MOVES', 'Queue cleared. Continue from here!');
                    }
                });
            } else {
                this.showWinScreen(); 
            }
            return; 
        }

        const actionObj = this.actionQueue[this.currentStep]; const action = actionObj.type;

        if (action === 'LOOP_START') {
            if (this.loopRuntimeCounts[actionObj.id] === undefined) this.loopRuntimeCounts[actionObj.id] = actionObj.loopCount - 1; 
            this.currentStep++; this.executeNextAction(); return;
        }

        if (action === 'LOOP_END') {
            let matchingStartIdx = -1, bracketCounter = 0;
            for (let i = this.currentStep - 1; i >= 0; i--) {
                if (this.actionQueue[i].type === 'LOOP_END') bracketCounter++;
                if (this.actionQueue[i].type === 'LOOP_START') {
                    if (bracketCounter === 0) { matchingStartIdx = i; break; }
                    bracketCounter--;
                }
            }
            if (matchingStartIdx !== -1) {
                const startId = this.actionQueue[matchingStartIdx].id;
                if (this.loopRuntimeCounts[startId] > 0) {
                    this.loopRuntimeCounts[startId]--; this.currentStep = matchingStartIdx + 1; 
                    this.renderVisualQueue(); this.time.delayedCall(100, () => this.executeNextAction()); return;
                }
            }
            this.currentStep++; this.executeNextAction(); return;
        }

        this.updateDynamicElements();

        if (action === 'FORWARD') {
            let nextX = this.playerLogic.x; let nextY = this.playerLogic.y;
            if (this.playerLogic.direction === 0) nextX++; else if (this.playerLogic.direction === 1) nextY++;
            else if (this.playerLogic.direction === 2) nextX--; else if (this.playerLogic.direction === 3) nextY--;

            const isInsideMap = nextX >= 0 && nextX < this.gridSize && nextY >= 0 && nextY < this.gridSize;
            
            if (isInsideMap) {
                let isMovingBridge = (this.bridgeLogic && this.bridgeLogic.x === nextX && this.bridgeLogic.y === nextY);
                const tileType = isMovingBridge ? 4 : this.mapData[nextY][nextX];
                
                if (tileType === 1) { 
                    this.triggerDeath('wall'); 
                } else if (tileType === 2) { 
                    this.playerLogic.x = nextX; this.playerLogic.y = nextY;
                    this.updatePlayerVisualPosition(400); 
                    this.time.delayedCall(450, () => this.triggerDeath('water'));
                } else if (tileType === 3) {
                    const trap = this.spikeTraps.find(s => s.x === nextX && s.y === nextY);
                    this.playerLogic.x = nextX; this.playerLogic.y = nextY;
                    this.updatePlayerVisualPosition(400);
                    if (trap && trap.active) {
                        this.time.delayedCall(450, () => this.triggerDeath('spikes'));
                    } else { this.currentStep++; }
                } else { 
                    this.playerLogic.x = nextX; this.playerLogic.y = nextY; this.currentStep++;
                    this.updatePlayerVisualPosition(400); 
                }
            } else { this.triggerDeath('edge'); }

        } else if (action === 'RIGHT') {
            this.playerLogic.direction = (this.playerLogic.direction + 1) % 4; this.currentStep++;
            this.updatePlayerVisualPosition(0); this.time.delayedCall(400, () => this.executeNextAction());
        } else if (action === 'LEFT') {
            this.playerLogic.direction = (this.playerLogic.direction + 3) % 4; this.currentStep++;
            this.updatePlayerVisualPosition(0); this.time.delayedCall(400, () => this.executeNextAction());
        } else if (action === 'UTURN') {
            this.playerLogic.direction = (this.playerLogic.direction + 2) % 4; this.currentStep++;
            this.updatePlayerVisualPosition(0); this.time.delayedCall(400, () => this.executeNextAction()); 
        } else if (action === 'WAIT') {
            this.currentStep++;
            this.updatePlayerVisualPosition(0); 
            const trap = this.spikeTraps.find(s => s.x === this.playerLogic.x && s.y === this.playerLogic.y);
            if (trap && trap.active) {
                this.time.delayedCall(450, () => this.triggerDeath('spikes_waited'));
            } else {
                this.time.delayedCall(400, () => this.executeNextAction()); 
            }
        }
    }
}

const config = {
    type: Phaser.AUTO, parent: 'game-container', width: 1080, height: 1920,
    backgroundColor: '#FFF3E0', scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, 
    scene: [BootScene, LobbyScene, ShopScene, LockerScene, GameScene]
};
const game = new Phaser.Game(config);