/// ==========================================
// CONFIGURATIONS & JSON DATA
// ==========================================
// ==========================================
// CONFIGURATIONS & JSON DATA
// ==========================================
window.ShopConfig = {
    skins: [
        { id: 'default', name: 'Red Cube', price: 0, isDefault: true, scale: 1 },
        { id: 'skin_ninja', name: 'Ninja Skin', price: 500, scale: 0.15, dirs: ['assets/skins/n_up.png', 'assets/skins/n_right.png', 'assets/skins/n_down.png', 'assets/skins/n_left.png'] },
        { id: 'skin_popstar', name: 'Popstar', price: 1500, scale: 0.15, dirs: [] }, // דוגמה לפריטים נוספים
        { id: 'skin_robot', name: 'Mecha Suit', price: 2000, scale: 0.15, dirs: [] }
    ],
    packs: [
        { id: 'default', name: 'Lush Forest', price: 0, isDefault: true,
          biome: { floor: '#8BC34A', floorDark: '#5D4037', wall: '#795548', wallDark: '#5D4037', trap: '#29B6F6', trapDark: '#0288D1' }
        },
        { id: 'pack_desert', name: 'Desert Theme', price: 2500, 
          biome: { floor: '#E0C097', floorDark: '#C89F70', wall: '#B87333', wallDark: '#8A5A2B', trap: '#FFCC80', trapDark: '#F57C00' },
          textures: { floor: 'assets/packs/desert_floor.png', wall: 'assets/packs/desert_wall.png' } 
        },
        { id: 'pack_neon', name: 'Cyberpunk', price: 3000, biome: { floor: '#000000', floorDark: '#111', wall: '#222', wallDark: '#000', trap: '#FF00FF', trapDark: '#880088' } }
    ],
    bgs: [
        { id: 'default', name: 'Pink Dream', price: 0, isDefault: true, image: 'assets/images/bg_game.png', uiMain: 0xF8BBD0, uiDark: 0xC2185B },
        { id: 'bg_space', name: 'Galaxy BG', price: 800, image: 'assets/images/bg_space.png', uiMain: 0x1a1a2e, uiDark: 0x0f3460 },
        { id: 'bg_sunset', name: 'Sunset Vibe', price: 1200, image: 'assets/images/bg_sunset.png', uiMain: 0xFFB74D, uiDark: 0xE65100 }
    ]
};

window.PlayerData = {
    coins: 5000, 
    triesLeft: 5, maxTries: 5,
    unlockedSkins: ['default'], currentSkin: 'default',
    unlockedPacks: ['default'], currentPack: 'default',
    unlockedBGs: ['default'], currentBG: 'default',
    lastSolvedLevel: -1 // שומר את השלב האחרון שניצחת כדי לנעול את כפתור הפליי!
};

// מחשב את החנות הרנדומלית ומספר השלב לפי שעון BST!
window.getDailyData = function() {
    const now = new Date();
    const bstOffsetMs = 1 * 60 * 60 * 1000; // BST = UTC + 1
    const dayIndex = Math.floor((now.getTime() + bstOffsetMs) / 86400000); 

    // מחולל מספרים אקראיים קבוע לאותו יום
    const seededRandom = (seed) => { let x = Math.sin(seed++) * 10000; return x - Math.floor(x); };
    
    // בוחר עד 6 פריטים אקראיים מהמערך לפי היום
    const getItems = (arr, maxCount, seedOffset) => {
        let copy = [...arr];
        for(let i = copy.length - 1; i > 0; i--) {
            let j = Math.floor(seededRandom(dayIndex + seedOffset + i) * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy.slice(0, maxCount);
    };

    return {
        levelNumber: dayIndex - 20600, // הופך את התאריך למספר שלב קריא (למשל שלב 45)
        shop: {
            bgs: getItems(window.ShopConfig.bgs, 6, 100),
            packs: getItems(window.ShopConfig.packs, 6, 200),
            skins: getItems(window.ShopConfig.skins, 6, 300)
        }
    };
};

// ==========================================
// BOOT SCENE - LAZY LOADING
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

        // התיקון: טוען את הרקע הדיפולטיבי וגם את מה שנבחר במקביל כדי למנוע מסך שחור!
        const defaultBG = window.ShopConfig.bgs.find(b => b.id === 'default');
        this.load.image(defaultBG.id, defaultBG.image);

        const currentBG = window.ShopConfig.bgs.find(b => b.id === window.PlayerData.currentBG);
        if (currentBG && currentBG.id !== 'default' && currentBG.image) {
            this.load.image(currentBG.id, currentBG.image);
        }

        const currentSkin = window.ShopConfig.skins.find(s => s.id === window.PlayerData.currentSkin);
        if (currentSkin && !currentSkin.isDefault && currentSkin.dirs) {
            currentSkin.dirs.forEach((dirImg, index) => { this.load.image(`${currentSkin.id}_${index}`, dirImg); });
        }

        const currentPack = window.ShopConfig.packs.find(p => p.id === window.PlayerData.currentPack);
        if (currentPack && currentPack.textures) {
            if (currentPack.textures.floor) this.load.image('custom_floor', currentPack.textures.floor);
            if (currentPack.textures.wall) this.load.image('custom_wall', currentPack.textures.wall);
        }
    }
    create() { this.scene.start('LobbyScene', { direction: 'right' }); }
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
        this.activeTheme = window.ShopConfig.bgs.find(b => b.id === window.PlayerData.currentBG) || window.ShopConfig.bgs[0];
        
        if (this.textures.exists(this.activeTheme.id)) {
            let bg = this.add.image(this.scale.width/2, this.scale.height/2, this.activeTheme.id);
            bg.setDisplaySize(this.scale.width, this.scale.height);
            bg.setDepth(-1000); bg.setScrollFactor(0); 
        } else { this.cameras.main.setBackgroundColor('#2E3136'); }

        let coinsTxt = this.add.text(this.scale.width - 40, 50, `🪙 ${window.PlayerData.coins}`, { fontFamily: this.comicFont, fontSize: '55px', fill: '#FFD54F', fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(1, 0);
        coinsTxt.setShadow(3, 3, 'rgba(0,0,0,0.5)', 5);
        
        let title = this.add.text(this.scale.width/2, 350, 'THE HIDDEN\nPATH', { fontFamily: this.comicFont, fontSize: '120px', fill: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 20, align: 'center' }).setOrigin(0.5);
        title.setShadow(5, 5, 'rgba(0,0,0,0.6)', 10);

        const dailyData = window.getDailyData();
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
        
        this.activeTheme = window.ShopConfig.bgs.find(b => b.id === window.PlayerData.currentBG) || window.ShopConfig.bgs[0];
        
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
        const dailyData = window.getDailyData();
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

        createSection('--- THEMES & BGS ---', dailyData.shop.bgs);
        createSection('--- TEXTURE PACKS ---', dailyData.shop.packs);
        createSection('--- PLAYER SKINS ---', dailyData.shop.skins);

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
        this.yesZone.on('pointerdown', () => {
            if (window.PlayerData.coins >= item.price) {
                window.PlayerData.coins -= item.price;
                if (item.type === 'skin') window.PlayerData.unlockedSkins.push(item.id);
                if (item.type === 'pack') window.PlayerData.unlockedPacks.push(item.id);
                if (item.type === 'bg') window.PlayerData.unlockedBGs.push(item.id);
                this.scene.restart(); 
            } else {
                this.cameras.main.shake(200, 0.02); 
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
        this.activeTheme = window.ShopConfig.bgs.find(b => b.id === window.PlayerData.currentBG) || window.ShopConfig.bgs[0];
        
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
        zone.on('pointerup', (pointer) => {
            if (Math.abs(pointer.downY - pointer.upY) > 15) return;
            if (this.currentTab === 'skin') window.PlayerData.currentSkin = id;
            if (this.currentTab === 'pack') window.PlayerData.currentPack = id;
            if (this.currentTab === 'bg') window.PlayerData.currentBG = id;
            this.buildLockerGrid();
        });
        card.add([bg, imgBox, nameTxt, zone]);
        if (isEquipped) card.add(this.add.text(0, -180, 'EQUIPPED', { fontFamily: this.comicFont, fontSize: '30px', fill: '#000', backgroundColor: '#FFD54F', padding: { x: 10, y: 5 } }).setOrigin(0.5));
        this.scrollContainer.add(card);
    }
}
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        // כאן נשארים רק דברים שלא משתנים אף פעם
        this.comicFont = '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif';
        this.blocksPerRow = 8; 
    }

    init(data) { 
        this.slideDir = data.direction || 'right'; 
        
        // --- התיקון הקריטי למסך השחור בכניסה שנייה ---
        // איפוס מוחלט של כל משתני המשחק כל פעם שנכנסים לסצנה מחדש!
        this.gridSize = 7; 
        this.playerLogic = { x: 0, y: 6, direction: 3 }; 
        this.startPos = { x: 0, y: 6 };
        this.actionQueue = []; 
        this.isPlaying = false;
        this.currentStep = 0; 
        this.tries = 0; 
        this.maxTries = 5;
        this.loopRuntimeCounts = {}; 
        this.crystalsLogic = []; 
        this.collectedCrystals = 0;
        this.bridgeLogic = null; 
        this.spikeTraps = [];
        this.hitboxesCreated = false;
        this.bridgeVisualX = undefined;
        this.bridgeVisualY = undefined;
    }

    create() {
        // המצלמה מתחילה מחוץ למסך ומחליקה פנימה
        this.cameras.main.scrollX = this.slideDir === 'right' ? -this.scale.width : this.scale.width;
        this.tweens.add({ targets: this.cameras.main, scrollX: 0, duration: 350, ease: 'Cubic.easeOut' });

        const activePack = window.ShopConfig.packs.find(p => p.id === window.PlayerData.currentPack) || window.ShopConfig.packs[0];
        this.currentBiome = activePack.biome;
        this.activeTheme = window.ShopConfig.bgs.find(b => b.id === window.PlayerData.currentBG) || window.ShopConfig.bgs[0];
        
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

        const dailyData = window.getDailyData();
        this.add.text(this.scale.width/2, 50, `LEVEL: ${dailyData.levelNumber}`, { fontFamily: this.comicFont, fontSize: '45px', fill: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8 }).setOrigin(0.5, 0).setDepth(5000);

        // התיקון להשהיה: בנייה מיידית של המשחק (ללא delay)! הכל ירוץ תוך כדי ההחלקה.
        this.tileImagesGroup = this.add.group();
        // מוודא שהאנימציה נוצרת רק אם היא עדיין לא קיימת (מונע שגיאות בכניסה חוזרת)
        if (!this.anims.exists('water_flow')) {
            this.anims.create({ key: 'water_flow', frames: this.anims.generateFrameNumbers('tex_water'), frameRate: 7, repeat: -1 });
        }
        
        this.generateProceduralLevel();
        this.tileHitboxes = this.add.group();
        this.gridGraphics = this.add.graphics(); 
        
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

    update(time, delta) {
        if (!this.gridGraphics) return; 
        this.drawRealisticGrid();
    }
// =========================================================================
    // THE AI ARCHITECT - CONSTRAINT-DRIVEN GENERATOR & MULTI-AGENT SOLVER (V15)
    // =========================================================================
generateProceduralLevel() {
        let validMap = false;
        let attempts = 0;
        let finalEvaluation = null;

        while (!validMap && attempts < 1500) {
            attempts++;

            this.mapData = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(1));
            this.spikeTraps = []; this.doors = []; this.crystalsLogic = []; this.bridgeLogic = null;

            // 1. יצירת מבוך מושלם (אין שטחים ריקים, אין קירות כפולים)
            this.carveDynamicMaze();

            // 2. יצירת דרכים חלופיות לפעולות חכמות
            this.createMultiplePaths();

            // 3. הגרלת נהר (40% אופקי, 40% אנכי, 20% בלי נהר)
            let riverRand = Math.random();
            this.riverData = { type: 'none', pos: -1 };
            
            if (riverRand < 0.4) {
                this.riverData = { type: 'horizontal', pos: Phaser.Math.Between(2, 4) };
                this.carveRiver(this.riverData);
            } else if (riverRand < 0.8) {
                this.riverData = { type: 'vertical', pos: Phaser.Math.Between(2, 4) };
                this.carveRiver(this.riverData);
            }

            // 4. הצבת מלכודות במקומות הגיוניים וקריסטלים
            this.placeDynamicTrapsAndCrystals();

            // 5. ניקוי שטחים מתים
            this.sealDeadSpaces();

            // 6. הבטחת נקודות עוגן
            this.mapData[6][0] = 0;
            this.mapData[0][6] = 9;

            // 7. הרצת בוט לבדיקת רמת קושי
            finalEvaluation = this.evaluateMapLogics();
            if (finalEvaluation.isValid) {
                validMap = true;
                this.parScore = finalEvaluation.optimalActions;
            }
        }
        this.hitboxesCreated = false;
    }

    carveDynamicMaze() {
        let stack = [{x: 0, y: 6}];
        this.mapData[6][0] = 0;
        let visited = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(false));
        visited[6][0] = true;

        while (stack.length > 0) {
            let current = stack[stack.length - 1];
            let neighbors = [];
            let dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];

            dirs.forEach(d => {
                let nx = current.x + d[0], ny = current.y + d[1];
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize && !visited[ny][nx]) {
                    neighbors.push({ x: nx, y: ny, dx: d[0], dy: d[1] });
                }
            });

            if (neighbors.length > 0) {
                let next = neighbors[Math.floor(Math.random() * neighbors.length)];
                this.mapData[current.y + next.dy / 2][current.x + next.dx / 2] = 0;
                this.mapData[next.y][next.x] = 0;
                visited[next.y][next.x] = true;
                stack.push(next);
            } else {
                stack.pop();
            }
        }
    }

    createMultiplePaths() {
        let wallsToBreak = Phaser.Math.Between(2, 4);
        let broken = 0;
        for (let i = 0; i < 50 && broken < wallsToBreak; i++) {
            let x = Phaser.Math.Between(1, 5), y = Phaser.Math.Between(1, 5);
            if (this.mapData[y][x] === 1) {
                let openNeighbors = 0;
                if (this.mapData[y-1][x] === 0) openNeighbors++;
                if (this.mapData[y+1][x] === 0) openNeighbors++;
                if (this.mapData[y][x-1] === 0) openNeighbors++;
                if (this.mapData[y][x+1] === 0) openNeighbors++;
                if (openNeighbors >= 2) {
                    this.mapData[y][x] = 0;
                    broken++;
                }
            }
        }
    }

    carveRiver(river) {
        let crossings = [];
        if (river.type === 'horizontal') {
            for (let x = 0; x < this.gridSize; x++) this.mapData[river.pos][x] = 2; 
            for (let x = 1; x < this.gridSize - 1; x++) {
                if (this.mapData[river.pos - 1][x] === 0 && this.mapData[river.pos + 1][x] === 0) crossings.push(x);
            }
            if (crossings.length === 0) { crossings = [2, 4]; this.mapData[river.pos-1][2]=0; this.mapData[river.pos+1][2]=0; }
            
            Phaser.Utils.Array.Shuffle(crossings);
            let bStart = crossings[0];
            
            // שומרים על פתח הגיוני בקירות
            let openMin = Math.max(0, bStart - 1);
            let openMax = Math.min(this.gridSize - 1, bStart + 1);
            for (let x = openMin; x <= openMax; x++) { this.mapData[river.pos - 1][x] = 0; this.mapData[river.pos + 1][x] = 0; }

            // התיקון: הגשר עצמו נוסע מ-0 ועד קצה המפה!
            this.bridgeLogic = { axis: 'x', x: bStart, y: river.pos, dir: 1, min: 0, max: this.gridSize - 1, pauseTimer: 1, initialPos: bStart, initialDir: 1 };
        
        } else if (river.type === 'vertical') {
            for (let y = 0; y < this.gridSize; y++) this.mapData[y][river.pos] = 2; 
            for (let y = 1; y < this.gridSize - 1; y++) {
                if (this.mapData[y][river.pos - 1] === 0 && this.mapData[y][river.pos + 1] === 0) crossings.push(y);
            }
            if (crossings.length === 0) { crossings = [2, 4]; this.mapData[2][river.pos-1]=0; this.mapData[2][river.pos+1]=0; }
            
            Phaser.Utils.Array.Shuffle(crossings);
            let bStart = crossings[0];
            
            let openMin = Math.max(0, bStart - 1);
            let openMax = Math.min(this.gridSize - 1, bStart + 1);
            for (let y = openMin; y <= openMax; y++) { this.mapData[y][river.pos - 1] = 0; this.mapData[y][river.pos + 1] = 0; }

            // התיקון: הגשר נוסע מקצה לקצה
            this.bridgeLogic = { axis: 'y', x: river.pos, y: bStart, dir: 1, min: 0, max: this.gridSize - 1, pauseTimer: 1, initialPos: bStart, initialDir: 1 };
        }
    }

    placeDynamicTrapsAndCrystals() {
        let deadEnds = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                let onRiver = (this.riverData.type === 'horizontal' && y === this.riverData.pos) || (this.riverData.type === 'vertical' && x === this.riverData.pos);
                if (this.mapData[y][x] === 0 && !onRiver && !(x === 0 && y === 6) && !(x === 6 && y === 0)) {
                    let openNeighbors = [];
                    let dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
                    dirs.forEach(d => {
                        let nx = x + d[0], ny = y + d[1];
                        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize && this.mapData[ny][nx] === 0) {
                            openNeighbors.push({ x: nx, y: ny });
                        }
                    });

                    if (openNeighbors.length === 1) deadEnds.push({ x: x, y: y, gateX: openNeighbors[0].x, gateY: openNeighbors[0].y });
                }
            }
        }

        Phaser.Utils.Array.Shuffle(deadEnds);
        let crystalsPlaced = 0;

        deadEnds.forEach(de => {
            if (crystalsPlaced >= 3) return;
            this.crystalsLogic.push({ x: de.x, y: de.y, collected: false, container: null });
            
            let gx = de.gateX, gy = de.gateY;
            if (this.mapData[gy][gx] === 0 && !(gx===0&&gy===6) && !(gx===6&&gy===0)) {
                
                // הכל הופך למלכודות דוקרנים! אין יותר דלתות!
                let trapType = 3; 
                let initialState = Math.random() > 0.5;
                this.mapData[gy][gx] = trapType;
                this.spikeTraps.push({ x: gx, y: gy, active: initialState, initialActive: initialState });
            }
            crystalsPlaced++;
        });

        if (crystalsPlaced < 3) {
            let emptySpots = [];
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    let onRiver = (this.riverData.type === 'horizontal' && y === this.riverData.pos) || (this.riverData.type === 'vertical' && x === this.riverData.pos);
                    if (this.mapData[y][x] === 0 && !onRiver && !(x === 0 && y === 6) && !(x === 6 && y === 0)) {
                        emptySpots.push({x, y});
                    }
                }
            }
            Phaser.Utils.Array.Shuffle(emptySpots);
            for (let spot of emptySpots) {
                if (this.crystalsLogic.length >= 3) break;
                let tooClose = false;
                for (let c of this.crystalsLogic) {
                    if (Math.abs(c.x - spot.x) + Math.abs(c.y - spot.y) < 3) { tooClose = true; break; }
                }
                if (!tooClose) this.crystalsLogic.push({ x: spot.x, y: spot.y, collected: false, container: null });
            }
        }
    }

    sealDeadSpaces() {
        let queue = [{ x: 0, y: 6 }];
        let reachable = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(false));
        reachable[6][0] = true;
        let moves = [[0, -1], [0, 1], [-1, 0], [1, 0]];

        while (queue.length > 0) {
            let curr = queue.shift();
            for (let m of moves) {
                let nx = curr.x + m[0], ny = curr.y + m[1];
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize && !reachable[ny][nx]) {
                    let tile = this.mapData[ny][nx];
                    let isBridge = false;
                    if (this.bridgeLogic) {
                        isBridge = (this.bridgeLogic.axis === 'x' && ny === this.bridgeLogic.y && nx >= this.bridgeLogic.min && nx <= this.bridgeLogic.max) ||
                                   (this.bridgeLogic.axis === 'y' && nx === this.bridgeLogic.x && ny >= this.bridgeLogic.min && ny <= this.bridgeLogic.max);
                    }
                    if (tile === 0 || tile === 2 || tile === 3 || tile === 5 || tile === 9 || isBridge) {
                        reachable[ny][nx] = true;
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (!reachable[y][x] && this.mapData[y][x] !== 1) this.mapData[y][x] = 1;
            }
        }
    }

    evaluateMapLogics() {
        let queue = [{ x: 0, y: 6, t: 0, mask: 0, pathHistory: [] }];
        let visited = new Set();
        visited.add(`0,6,0,0`);
        let moves = [[0, -1], [0, 1], [-1, 0], [1, 0], [0, 0]]; 
        let validSolutions = [];

        while (queue.length > 0) {
            let curr = queue.shift();
            if (curr.t > 40) continue; 

            if (curr.x === 6 && curr.y === 0 && curr.mask === 7) {
                validSolutions.push(curr);
                continue;
            }

            let nextTime = curr.t + 1;
            let timeCycle = nextTime % 4;
            let trapsFlipped = (nextTime % 2 !== 0);

            let curBx = -1, curBy = -1;
            if (this.bridgeLogic) {
                curBx = this.bridgeLogic.x;
                curBy = this.bridgeLogic.y;
                let bDir = this.bridgeLogic.initialDir;
                let bPos = this.bridgeLogic.initialPos;
                let bTimer = 1;
                for (let i = 0; i < nextTime; i++) {
                    if (bTimer > 0) bTimer--;
                    else {
                        bPos += bDir;
                        if (bPos >= this.bridgeLogic.max || bPos <= this.bridgeLogic.min) bDir *= -1;
                        bTimer = 1;
                    }
                }
                if (this.bridgeLogic.axis === 'x') curBx = bPos;
                else curBy = bPos;
            }

            for (let m of moves) {
                let nx = curr.x + m[0], ny = curr.y + m[1];
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    let tile = this.mapData[ny][nx];
                    let isMovingBridge = (this.bridgeLogic && ny === curBy && nx === curBx);
                    let canEnter = false;

                    if (tile === 9 && curr.mask !== 7) continue; 

                    if (isMovingBridge || tile === 0 || tile === 9) canEnter = true;
                    else if (tile === 3) {
                        let trap = this.spikeTraps.find(s => s.x === nx && s.y === ny);
                        if (!(trapsFlipped ? !trap.initialActive : trap.initialActive)) canEnter = true;
                    } else if (tile === 5) {
                        let door = this.doors.find(d => d.x === nx && d.y === ny);
                        if (trapsFlipped ? !door.initialOpen : door.initialOpen) canEnter = true;
                    }

                    if (canEnter) {
                        let nextMask = curr.mask;
                        let crystalIdx = this.crystalsLogic.findIndex(c => c.x === nx && c.y === ny);
                        if (crystalIdx !== -1) nextMask |= (1 << crystalIdx);

                        let stateKey = `${nx},${ny},${timeCycle},${nextMask}`;
                        if (!visited.has(stateKey)) {
                            visited.add(stateKey);
                            queue.push({ x: nx, y: ny, t: nextTime, mask: nextMask, pathHistory: [...curr.pathHistory, { x: nx, y: ny, action: m }] });
                        }
                    }
                }
            }
        }

        if (validSolutions.length === 0) return { isValid: false };
        validSolutions.sort((a, b) => a.t - b.t);
        let bestSolution = validSolutions[0];

        let totalDifferentRoutes = new Set(validSolutions.map(s => s.pathHistory.map(h => `${h.x},${h.y}`).join('-'))).size;
        
        if (bestSolution.t >= 14 && totalDifferentRoutes >= 2) return { isValid: true, optimalActions: bestSolution.t };
        return { isValid: false };
    }

    getPerspective(col, row, heightOffset = 0) {
        const cx = this.cameras.main.centerX;
        const cy = this.scale.height / 2 - 190; // מורם טיפה כדי להתאזן עם ההקטנה
        
        const tileW = 108; // הוקטן מ-125
        const tileH = 92;  // הוקטן מ-105

        const xOffset = (col - (this.gridSize - 1) / 2) * tileW;
        const yOffset = (row - (this.gridSize - 1) / 2) * tileH;

        const z = (this.gridSize - row) * 8; 
        const focalLength = 1500; 
        const scale = focalLength / (focalLength + z);

        const projX = cx + xOffset * scale;
        const projY = cy + yOffset * scale - heightOffset; 
        
        return { x: projX, y: projY, scale: scale };
    }

    drawRealisticGrid() { 
        this.gridGraphics.clear(); 
        this.tileImagesGroup.clear(true, true); 

        if (this.bridgeLogic) {
            if (this.bridgeVisualX === undefined) this.bridgeVisualX = this.bridgeLogic.x;
            if (this.bridgeVisualY === undefined) this.bridgeVisualY = this.bridgeLogic.y;
            this.bridgeVisualX += (this.bridgeLogic.x - this.bridgeVisualX) * 0.12;
            this.bridgeVisualY += (this.bridgeLogic.y - this.bridgeVisualY) * 0.12;
        }

        // --- ציור צללית מעודנת, רכה וחלקה (Smooth Drop Shadow) ---
        // מצייר כמה שכבות שקופות שזזות טיפה כדי לייצר אפקט של טשטוש (Blur)
        for (let i = 1; i <= 5; i++) {
            const s_tl = this.getPerspective(-1, -1, -15);
            const s_tr = this.getPerspective(this.gridSize, -1, -15);
            const s_br = this.getPerspective(this.gridSize, this.gridSize, -15);
            const s_bl = this.getPerspective(-1, this.gridSize, -15);

            this.gridGraphics.fillStyle(0x000000, 0.06); // שקיפות נמוכה מאוד
            this.gridGraphics.beginPath();
            this.gridGraphics.moveTo(s_tl.x, s_tl.y + 25 + (i * 3)); 
            this.gridGraphics.lineTo(s_tr.x, s_tr.y + 25 + (i * 3));
            this.gridGraphics.lineTo(s_br.x, s_br.y + 25 + (i * 3));
            this.gridGraphics.lineTo(s_bl.x, s_bl.y + 25 + (i * 3));
            this.gridGraphics.closePath();
            this.gridGraphics.fillPath();
        }
        // -----------------------------------------------------------

        for (let row = -1; row < this.gridSize; row++) {
            for (let col = -1; col <= this.gridSize; col++) {
                
                let isExternalWall = (row === -1 || col === -1 || col === this.gridSize);
                let tileType = 1; 

                if (!isExternalWall) {
                    tileType = this.mapData[row][col];
                    
                    // מנגנון בטיחות: אם איכשהו נוצרה דלת (5) במערכת, היא מתורגמת מיד למלכודת כדי למנוע קריסה
                    if (tileType === 5) tileType = 3; 

                    let isBridgeSlot = (this.bridgeLogic && row === this.bridgeLogic.y && col === this.bridgeLogic.x);
                    if (isBridgeSlot || tileType === 4) tileType = 2; 
                }
                
                let height = 0; 
                if (tileType === 1 || isExternalWall) height = 25; 
                if (tileType === 2) height = -15; 

                let baseHeight = -15; 

                const tl = this.getPerspective(col - 0.5, row - 0.5, height);
                const tr = this.getPerspective(col + 0.5, row - 0.5, height);
                const bl = this.getPerspective(col - 0.5, row + 0.5, height);
                const br = this.getPerspective(col + 0.5, row + 0.5, height);

                const base_bl = this.getPerspective(col - 0.5, row + 0.5, baseHeight); 
                const base_br = this.getPerspective(col + 0.5, row + 0.5, baseHeight);

                let tileDepthTier = (row + 2) * 30 + (col + 2) * 2;
                let topColor, sideColor, textureKey = null;

                if (isExternalWall) {
                    topColor = this.currentBiome.wall; sideColor = this.currentBiome.wallDark;
                    textureKey = 'tex_wall';
                } else if (tileType === 9) {
                    topColor = '#FFD54F'; sideColor = '#FFB300';
                    textureKey = 'tex_exit';
                } else if (tileType === 2) {
                    topColor = this.currentBiome.trap; sideColor = this.currentBiome.trapDark;
                    textureKey = 'tex_water';
                } else if (tileType === 0 || tileType === 3) { 
                    topColor = this.currentBiome.floor; sideColor = this.currentBiome.floorDark;
                    textureKey = this.textures.exists('custom_floor') ? 'custom_floor' : 'tex_floor';
                    
                    if (tileType === 3) { 
                        const trap = this.spikeTraps.find(s => s.x === col && s.y === row);
                        if (trap) {
                            textureKey = trap.active ? 'tex_trap_on' : 'tex_trap_off';
                        }
                    }
                } else if (tileType === 1) {
                    topColor = this.currentBiome.wall; sideColor = this.currentBiome.wallDark;
                    textureKey = this.textures.exists('custom_wall') ? 'custom_wall' : 'tex_wall';
                }

                let localGfx = this.add.graphics();
                localGfx.setDepth(tileDepthTier + 2); 
                this.tileImagesGroup.add(localGfx);

                if (tileType !== 2 && height > baseHeight) {
                    if ((tileType === 1 || isExternalWall) && this.textures.exists('tex_wall')) {
                        let sideW = Math.max(bl.x, br.x, base_br.x, base_bl.x) - Math.min(bl.x, br.x, base_br.x, base_bl.x);
                        let sideH = Math.max(bl.y, br.y, base_br.y, base_bl.y) - Math.min(bl.y, br.y, base_br.y, base_bl.y);
                        let sideCX = (bl.x + br.x + base_br.x + base_bl.x) / 4;
                        let sideCY = (bl.y + br.y + base_br.y + base_bl.y) / 4;

                        let sideImg = this.add.image(sideCX, sideCY, 'tex_wall');
                        sideImg.setDisplaySize(sideW, sideH);
                        sideImg.setDepth(tileDepthTier);

                        let sideMaskGfx = this.make.graphics();
                        sideMaskGfx.fillStyle(0xffffff);
                        sideMaskGfx.beginPath();
                        sideMaskGfx.moveTo(bl.x, bl.y); sideMaskGfx.lineTo(br.x, br.y);
                        sideMaskGfx.lineTo(base_br.x, base_br.y); sideMaskGfx.lineTo(base_bl.x, base_bl.y);
                        sideMaskGfx.closePath(); sideMaskGfx.fillPath();

                        sideImg.setMask(sideMaskGfx.createGeometryMask());
                        this.tileImagesGroup.add(sideImg);
                        this.tileImagesGroup.add(sideMaskGfx);
                    } else {
                        localGfx.fillStyle(Phaser.Display.Color.HexStringToColor(sideColor).color, 1);
                        localGfx.beginPath();
                        localGfx.moveTo(bl.x, bl.y); localGfx.lineTo(br.x, br.y);
                        localGfx.lineTo(base_br.x, base_br.y); localGfx.lineTo(base_bl.x, base_bl.y);
                        localGfx.closePath(); localGfx.fillPath();
                    }
                    
                    localGfx.lineStyle(4, 0x000000, 1);
                    localGfx.beginPath();
                    localGfx.moveTo(bl.x, bl.y); localGfx.lineTo(br.x, br.y);
                    localGfx.lineTo(base_br.x, base_br.y); localGfx.lineTo(base_bl.x, base_bl.y);
                    localGfx.closePath(); localGfx.strokePath();
                }

                if (textureKey && this.textures.exists(textureKey)) {
                    const centerX = (tl.x + tr.x + bl.x + br.x) / 4;
                    const centerY = (tl.y + tr.y + bl.y + br.y) / 4;
                    const tileW = Math.max(tl.x, tr.x, bl.x, br.x) - Math.min(tl.x, tr.x, bl.x, br.x);
                    const tileH = Math.max(tl.y, tr.y, bl.y, br.y) - Math.min(tl.y, tr.y, bl.y, br.y);

                    let img;
                    if (tileType === 2 && this.anims && this.anims.exists('water_flow')) {
                        img = this.add.sprite(centerX, centerY, textureKey);
                        img.play('water_flow', true);
                    } else {
                        img = this.add.image(centerX, centerY, textureKey);
                    }
                    
                    img.setDisplaySize(tileW, tileH);
                    img.setDepth(tileDepthTier + 1);

                    let maskGfx = this.make.graphics();
                    maskGfx.fillStyle(0xffffff);
                    maskGfx.beginPath();
                    maskGfx.moveTo(tl.x, tl.y); maskGfx.lineTo(tr.x, tr.y);
                    maskGfx.lineTo(br.x, br.y); maskGfx.lineTo(bl.x, bl.y);
                    maskGfx.closePath(); maskGfx.fillPath();

                    img.setMask(maskGfx.createGeometryMask());
                    this.tileImagesGroup.add(img);
                    this.tileImagesGroup.add(maskGfx);
                } else {
                    localGfx.fillStyle(Phaser.Display.Color.HexStringToColor(topColor).color, 1);
                    localGfx.beginPath();
                    localGfx.moveTo(tl.x, tl.y); localGfx.lineTo(tr.x, tr.y);
                    localGfx.lineTo(br.x, br.y); localGfx.lineTo(bl.x, bl.y);
                    localGfx.closePath(); localGfx.fillPath();
                }

                localGfx.lineStyle(4, 0x000000, 1);
                localGfx.beginPath();
                localGfx.moveTo(tl.x, tl.y); localGfx.lineTo(tr.x, tr.y);
                localGfx.lineTo(br.x, br.y); localGfx.lineTo(bl.x, bl.y);
                localGfx.closePath(); localGfx.strokePath();

                if (!isExternalWall) {
                    if (tileType === 3) {
                        const trap = this.spikeTraps.find(s => s.x === col && s.y === row);
                        if (trap && trap.active) {
                            const spikeTop = this.getPerspective(col, row, 30); 
                            localGfx.fillStyle(0xFF3333, 1); localGfx.lineStyle(2, 0x000000, 1);
                            localGfx.beginPath();
                            localGfx.moveTo(tl.x + 10*tl.scale, tl.y + 10*tl.scale); localGfx.lineTo(br.x - 10*br.scale, br.y - 10*br.scale); localGfx.lineTo(spikeTop.x, spikeTop.y);
                            localGfx.closePath(); localGfx.fillPath(); localGfx.strokePath();
                        }
                    }
                }
            }
        }

        // --- ציור הגשר הדינמי המחליק (חסין טביעות - תיקון עומק) ---
        if (this.bridgeLogic && this.bridgeVisualX !== undefined) {
            let brH = -5;
            const b_tl = this.getPerspective(this.bridgeVisualX - 0.5, this.bridgeVisualY - 0.5, brH);
            const b_tr = this.getPerspective(this.bridgeVisualX + 0.5, this.bridgeVisualY - 0.5, brH);
            const b_bl = this.getPerspective(this.bridgeVisualX - 0.5, this.bridgeVisualY + 0.5, brH);
            const b_br = this.getPerspective(this.bridgeVisualX + 0.5, this.bridgeVisualY + 0.5, brH);

            let bridgeGfx = this.add.graphics();
            
            // התיקון הקריטי למים: הגשר לוקח את העומק של הנקודה ה"קדמית" ביותר שלו
            let frontRow = Math.ceil(this.bridgeVisualY);
            let frontCol = Math.ceil(this.bridgeVisualX);
            let bridgeDepth = (frontRow + 2) * 30 + (frontCol + 2) * 2 + 3;
            
            bridgeGfx.setDepth(bridgeDepth);
            this.tileImagesGroup.add(bridgeGfx);

            if (this.textures.exists('tex_bridge')) {
                const bCX = (b_tl.x + b_tr.x + b_bl.x + b_br.x) / 4;
                const bCY = (b_tl.y + b_tr.y + b_bl.y + b_br.y) / 4;
                const bW = Math.max(b_tl.x, b_tr.x, b_bl.x, b_br.x) - Math.min(b_tl.x, b_tr.x, b_bl.x, b_br.x);
                const bH = Math.max(b_tl.y, b_tr.y, b_bl.y, b_br.y) - Math.min(b_tl.y, b_tr.y, b_bl.y, b_br.y);

                let bImg = this.add.image(bCX, bCY, 'tex_bridge');
                bImg.setDisplaySize(bW, bH);
                bImg.setDepth(bridgeDepth - 1);

                let bMask = this.make.graphics();
                bMask.fillStyle(0xffffff);
                bMask.beginPath();
                bMask.moveTo(b_tl.x, b_tl.y); bMask.lineTo(b_tr.x, b_tr.y); bMask.lineTo(b_br.x, b_br.y); bMask.lineTo(b_bl.x, b_bl.y);
                bMask.closePath(); bMask.fillPath();

                bImg.setMask(bMask.createGeometryMask());
                this.tileImagesGroup.add(bImg);
                this.tileImagesGroup.add(bMask);
            } else {
                bridgeGfx.fillStyle(0x8D6E63, 1);
                bridgeGfx.beginPath();
                bridgeGfx.moveTo(b_tl.x, b_tl.y); bridgeGfx.lineTo(b_tr.x, b_tr.y); bridgeGfx.lineTo(b_br.x, b_br.y); bridgeGfx.lineTo(b_bl.x, b_bl.y);
                bridgeGfx.closePath(); bridgeGfx.fillPath();
            }

            bridgeGfx.lineStyle(4, 0x000000, 1);
            bridgeGfx.beginPath();
            bridgeGfx.moveTo(b_tl.x, b_tl.y); bridgeGfx.lineTo(b_tr.x, b_tr.y); bridgeGfx.lineTo(b_br.x, b_br.y); bridgeGfx.lineTo(b_bl.x, b_bl.y);
            bridgeGfx.closePath(); bridgeGfx.strokePath();
        }

        if (this.playerContainer) {
            let pRow = this.playerLogic.y;
            let pCol = this.playerLogic.x;
            
            // חישוב עומק רגיל לשחקן
            let playerDepth = (pRow + 2) * 30 + (pCol + 2) * 2 + 5;
            
            // סנכרון מושלם: אם השחקן עומד על הגשר , הוא מקבל את העומק הדינמי שלו כדי לא לשקוע בטעות בתוכו
            if (this.bridgeLogic && pRow === this.bridgeLogic.y && pCol === this.bridgeLogic.x) {
                let frontRow = Math.ceil(this.bridgeVisualY);
                let frontCol = Math.ceil(this.bridgeVisualX);
                playerDepth = (frontRow + 2) * 30 + (frontCol + 2) * 2 + 5;
            }
            
            this.playerContainer.setDepth(playerDepth);
        }

        this.hitboxesCreated = true;
    }

    drawPathBox(rows) {
        this.pathBox.clear(); 
        const boxHeight = Math.max(160, rows * 100 + 60); 
        const boxY = this.cardsY - 70 - boxHeight; 
        const boxWidth = 900;
        const boxX = this.scale.width / 2 - 450;

        // רקע המסך עם טקסטורת גריד עדינה שביקשת (לא משעמם יותר)
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
        this.tooltipContainer.setDepth(5000); // <-- התיקון: מעל הכל!
        
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

    createCrystals() {
        this.crystalsLogic.forEach(c => {
            if(c.sprite) c.sprite.destroy();
            const pos = this.getPerspective(c.x, c.y, 10);
            
            // יצירת הקריסטל (כתמונה או כצורה)
            if (this.textures.exists('tex_crystal')) {
                c.sprite = this.add.image(pos.x, pos.y, 'tex_crystal');
                c.sprite.setScale(pos.scale * 0.13); // התיקון: מקטין את התמונה בצורה משמעותית!
            } else {
                c.sprite = this.add.graphics();
                c.sprite.fillStyle(0x00E5FF, 1); c.sprite.lineStyle(2, 0x000000, 1);
                c.sprite.fillCircle(0, 0, 12); c.sprite.strokeCircle(0, 0, 12);
                c.sprite.setPosition(pos.x, pos.y);
                c.sprite.setScale(pos.scale);
            }
            
            c.sprite.setDepth((c.y + 2) * 30 + (c.x + 2) * 2 + 4);

            // אנימציית ריחוף תמידית
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

    checkCollisions() {
        this.crystalsLogic.forEach(c => {
            if (!c.collected && this.playerLogic.x === c.x && this.playerLogic.y === c.y) {
                c.collected = true; this.collectedCrystals++; this.scoreText.setText(`💎 ${this.collectedCrystals}/3`);
                
                // אנימציית איסוף: הקריסטל קופץ, מסתובב, ומתפוגג
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
        
        // איפוס המד העליון ל-0
        this.collectedCrystals = 0;
        this.scoreText.setText(`💎 ${this.collectedCrystals}/3`);
        
        // איפוס קריסטלים ויזואלית - התיקון כא
        this.crystalsLogic.forEach(c => {
            c.collected = false;
            if (c.sprite) {
                // עוצר את אנימציית ה"איסוף" (שמעלימה אותם)
                this.tweens.killTweensOf(c.sprite); 
                
                c.sprite.setAlpha(1);
                c.sprite.angle = 0;
                
                const pos = this.getPerspective(c.x, c.y, 10);
                c.sprite.setPosition(pos.x, pos.y);
                
                // מחזיר לגודל הנכון (הקטן)
                let targetScale = this.textures.exists('tex_crystal') ? pos.scale * 0.13 : pos.scale;
                c.sprite.setScale(targetScale);
                
                // מפעיל מחדש את אנימציית הריחוף הרגילה
                this.tweens.add({ 
                    targets: c.sprite, 
                    y: pos.y - 15 * pos.scale, 
                    duration: 800 + Phaser.Math.Between(-100, 100), 
                    yoyo: true, 
                    repeat: -1, 
                    ease: 'Sine.easeInOut' 
                });
            }
        });

        // איפוס הגשר למקום המקורי שלו
        if (this.bridgeLogic) {
            if (this.bridgeLogic.axis === 'x') this.bridgeLogic.x = this.bridgeLogic.initialPos;
            else this.bridgeLogic.y = this.bridgeLogic.initialPos;
            this.bridgeLogic.dir = this.bridgeLogic.initialDir;
            this.bridgeLogic.pauseTimer = 1;
            this.bridgeVisualX = this.bridgeLogic.x;
            this.bridgeVisualY = this.bridgeLogic.y;
        }
        
        // איפוס המלכודות
        this.spikeTraps.forEach(s => s.active = s.initialActive);
        
        this.drawRealisticGrid();

        // החזרת השחקן בהקפצה מלמעלה
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
        
        let skinConfig = window.ShopConfig.skins.find(s => s.id === window.PlayerData.currentSkin) || window.ShopConfig.skins[0];
        
        if (skinConfig.isDefault) {
            // הדיפולט: הריבוע האדום הגיאומטרי
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
            // קאסטום סקין: טוען את התמונה מה-JSON לפי כיוון (0 = למעלה, 1 = ימינה, 2 = למטה, 3 = שמאלה)
            this.playerSprite = this.add.image(0, -40, `${skinConfig.id}_3`); 
            this.playerSprite.setScale(skinConfig.scale); // מחיל את ה-Scale מה-JSON!
            this.playerContainer.add(this.playerSprite);
        }

        this.playerContainer.setDepth(50); 
        this.updatePlayerVisualPosition(0);
    }

    createLivesUI() {
        // הלבבות עברו לצד ימין מתחת ליהלומים!
        this.scoreText = this.add.text(this.scale.width - 40, 50, `💎 0/3`, { fontFamily: this.comicFont, fontSize: '45px', fill: '#00E5FF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8 }).setOrigin(1, 0);
        this.scoreText.setShadow(3, 3, 'rgba(0,0,0,0.4)', 5); 
        
        this.livesText = this.add.text(this.scale.width - 40, 120, `❤️ ${this.tries}/${this.maxTries}`, { fontFamily: this.comicFont, fontSize: '45px', fill: '#FF0000', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8 }).setOrigin(1, 0);
        this.livesText.setShadow(3, 3, 'rgba(0,0,0,0.4)', 5); 
    }

    setupBoardInteraction() {
        this.input.on('pointerdown', (pointer) => {
            // מונע לחיצה כשנוגעים באזור הקלפים והכפתורים למטה
            if (this.pathBoxBounds && pointer.y > this.pathBoxBounds.y - 30) return;
            
            let clickedCol = -1, clickedRow = -1;
            let minDist = 1000;
            
            for (let r = 0; r < this.gridSize; r++) {
                for (let c = 0; c < this.gridSize; c++) {
                    let pos = this.getPerspective(c, r, 0);
                    // מתקן את מרחק הלחיצה לפי הפרספקטיבה כדי שיהיה קל לפגוע
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

    // --- התחלה של הבלוק הראשון להחלפה ---
    // --- ממשק משתמש ממורכז מתמטית ---
    createTrashButton() {
        // מיקמנו את הפח מיושר כחלק מקבוצה עם ה-EXECUTE
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
        
        // ממורכז יחד עם הפח כדי שיראו כמו קבוצה אחידה 
        this.createCartoonButton(this.scale.width / 2 + 55, this.scale.height - 110, 'EXECUTE', () => {
            if (!this.isPlaying && this.actionQueue.length > 0 && this.tries < this.maxTries) {
                this.isPlaying = true; this.currentStep = 0; this.loopRuntimeCounts = {}; this.executeNextAction();
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

    // --- התחלה של הבלוק השני להחלפה ---
    createCartoonButton(x, y, text, onClick) {
        // מידות מוגדלות משמעותית לכפתור הראשי
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
    // --- סוף הבלוק השני להחלפה ---

    triggerDeath(reason) {
        // עכשיו המסך תמיד ירעד כשנכשלים, לא משנה מה הסיבה!
        this.cameras.main.shake(150, 0.015); 

        this.time.delayedCall(200, () => {
            this.tweens.add({
                targets: this.playerContainer, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 250, ease: 'Quad.easeOut',
                onComplete: () => {
                    this.tries++; 
                    this.livesText.setText(`❤️ ${this.tries}/${this.maxTries}`);
                    if (this.tries >= this.maxTries) { 
                        this.livesText.setText("GAME OVER!"); 
                        return; 
                    }
                    this.resetLevel();
                }
            }); 
        });
    }

    // --- מסך הניצחון וחישוב היעילות הלוגית ---
    showWinScreen() {
        this.isPlaying = true; 
        
        // --- נועל את השלב ליום הזה! ---
        const dailyData = window.getDailyData();
        window.PlayerData.lastSolvedLevel = dailyData.levelNumber;
        
        let actionCost = 0; 
        this.actionQueue.forEach(a => { 
            if(a.type !== 'LOOP_END' && a.type !== 'LOOP_START') actionCost++; 
            if(a.type === 'LOOP_START') actionCost++; // לולאה נחשבת כבלוק אחד
        });
        
        let efficiencyBonus = Math.max(0, (this.parScore - actionCost) * 200);
        let totalScore = (this.collectedCrystals * 1000) - (actionCost * 100) + efficiencyBonus;
        
        // --- מערכת הכלכלה: המרת ניקוד למטבעות! ---
        let earnedCoins = Math.max(10, Math.floor(totalScore / 10)); // מינימום 10 מטבעות לניצחון
        window.PlayerData.coins += earnedCoins;

        const panel = this.add.graphics(); 
        panel.fillStyle(0x000000, 0.85); 
        panel.fillRect(0, 0, this.scale.width, this.scale.height); 
        panel.setDepth(200);
        
        this.add.text(this.scale.width/2, 300, 'MISSION\nACCOMPLISHED', { fontFamily: this.comicFont, fontSize: '75px', fill: '#FFD54F', fontStyle: 'bold', stroke: '#000000', strokeThickness: 12, align: 'center' }).setOrigin(0.5).setDepth(201);
        
        this.add.text(this.scale.width/2, 550, `Crystals Extracted: ${this.collectedCrystals}/3`, { fontFamily: this.comicFont, fontSize: '45px', fill: '#00E5FF', fontStyle: 'bold' }).setOrigin(0.5).setDepth(201);
        this.add.text(this.scale.width/2, 650, `Blocks Used: ${actionCost} (Par: ${this.parScore})`, { fontFamily: this.comicFont, fontSize: '40px', fill: '#FFFFFF' }).setOrigin(0.5).setDepth(201);
        
        this.add.text(this.scale.width/2, 800, `FINAL SCORE: ${totalScore}`, { fontFamily: this.comicFont, fontSize: '70px', fill: '#4CAF50', fontStyle: 'bold', stroke: '#000000', strokeThickness: 10 }).setOrigin(0.5).setDepth(201);
        
        // חשיפת המטבעות שהרווחנו
        this.add.text(this.scale.width/2, 950, `+ 🪙 ${earnedCoins} COINS!`, { fontFamily: this.comicFont, fontSize: '65px', fill: '#FFC107', fontStyle: 'bold', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5).setDepth(201);

        // כפתור חזרה ללובי (מחליק חזרה שמאלה)
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x4CAF50, 1); btnBg.lineStyle(6, 0x000000, 1);
        btnBg.fillRoundedRect(this.scale.width/2 - 250, 1150, 500, 100, 20); 
        btnBg.strokeRoundedRect(this.scale.width/2 - 250, 1150, 500, 100, 20);
        btnBg.setDepth(201);
        
        this.add.text(this.scale.width/2, 1200, 'COLLECT & RETURN', { fontFamily: this.comicFont, fontSize: '40px', fill: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(202);
        
        const btnZone = this.add.zone(this.scale.width/2, 1200, 500, 100).setInteractive().setDepth(203);
        btnZone.on('pointerdown', () => {
            // החלקה אלגנטית חזרה ללובי!
            this.tweens.add({ targets: this.cameras.main, scrollX: -this.scale.width, duration: 350, ease: 'Cubic.easeIn', onComplete: () => {
                this.scene.start('LobbyScene', { direction: 'left' });
            }});
        });
    }


    updatePlayerVisualPosition(duration = 0) {
        let height = 0;
        let isMovingBridge = (this.bridgeLogic && this.bridgeLogic.x === this.playerLogic.x && this.bridgeLogic.y === this.playerLogic.y);
        const tileType = this.mapData[this.playerLogic.y]?.[this.playerLogic.x] || 0;
        
        if (isMovingBridge || tileType === 4) height = 5;
        else {
            if (tileType === 1) height = 50;
            if (tileType === 2) height = -15;
        }

        const pos = this.getPerspective(this.playerLogic.x, this.playerLogic.y, height);
        
        // עדכון כיוון השחקן (עיניים או תמונה)
        if (this.playerSprite) {
            let skinConfig = window.ShopConfig.skins.find(s => s.id === window.PlayerData.currentSkin);
            this.playerSprite.setTexture(`${skinConfig.id}_${this.playerLogic.direction}`);
        } else {
            const eyeOffsets = [{x: 8, y:0}, {x:0, y:8}, {x:-8, y:0}, {x:0, y:-8}];
            this.eyeGraphics.setPosition(eyeOffsets[this.playerLogic.direction].x, eyeOffsets[this.playerLogic.direction].y);
        }

        if (this.playerContainer) {
            let playerDepth = (this.playerLogic.y + 2) * 30 + (this.playerLogic.x + 2) * 2 + 5;
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

    updateDynamicElements() {
        this.spikeTraps.forEach(s => s.active = !s.active);

        let playerOnBridge = false;
        if (this.bridgeLogic && this.playerLogic.x === this.bridgeLogic.x && this.playerLogic.y === this.bridgeLogic.y) {
            playerOnBridge = true;
        }
        
        if (this.bridgeLogic) {
            if (this.bridgeLogic.pauseTimer > 0) {
                this.bridgeLogic.pauseTimer--; 
            } else {
                if (this.bridgeLogic.axis === 'x') {
                    this.bridgeLogic.x += this.bridgeLogic.dir;
                    if (this.bridgeLogic.x >= this.bridgeLogic.max || this.bridgeLogic.x <= this.bridgeLogic.min) { 
                        this.bridgeLogic.dir *= -1; 
                    }
                } else {
                    this.bridgeLogic.y += this.bridgeLogic.dir;
                    if (this.bridgeLogic.y >= this.bridgeLogic.max || this.bridgeLogic.y <= this.bridgeLogic.min) { 
                        this.bridgeLogic.dir *= -1; 
                    }
                }
                this.bridgeLogic.pauseTimer = 1; 
            }
        }

        if (playerOnBridge) {
            this.playerLogic.x = this.bridgeLogic.x;
            this.playerLogic.y = this.bridgeLogic.y;
        }
    }

    executeNextAction() {
        this.renderVisualQueue();
        
        if (this.currentStep >= this.actionQueue.length) { 
            if (this.mapData[this.playerLogic.y][this.playerLogic.x] !== 9) {
                this.triggerDeath('out_of_moves');
            } else {
                this.isPlaying = false; 
                this.renderVisualQueue(); 
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