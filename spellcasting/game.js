class SpellcastingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameRunning = false;
        this.score = 0;
        this.level = 1;
        this.health = 100;
        this.maxHealth = 100;
        this.showingUpgrades = false;
        
        // Player
        this.player = {
            x: this.width / 2,
            y: this.height / 2,
            radius: 20,
            color: '#4a90e2',
            glow: 0
        };
        
        // Spell system
        this.spellSequence = [];
        this.spells = {
            'FIRE': { name: 'Fireball', damage: 30, color: '#ff4444', radius: 8, speed: 5, level: 1, cooldown: 1000, lastCast: 0 },
            'ICE': { name: 'Ice Spike', damage: 25, color: '#44aaff', radius: 6, speed: 6, level: 1, cooldown: 800, lastCast: 0 },
            'LIGHT': { name: 'Lightning', damage: 40, color: '#ffff44', radius: 4, speed: 8, level: 1, cooldown: 1500, lastCast: 0 },
            'HEAL': { name: 'Heal', damage: -30, color: '#44ff44', radius: 15, speed: 0, level: 1, cooldown: 3000, lastCast: 0 },
            'CHAIN': { name: 'Chain Lightning', damage: 35, color: '#ffaa44', radius: 0, speed: 0, level: 1, chainCount: 3, cooldown: 2000, lastCast: 0 },
            'SHIELD': { name: 'Shield', damage: 0, color: '#8888ff', radius: 25, speed: 0, level: 1, cooldown: 4000, lastCast: 0 }
        };
        
        // Multi-casting system
        this.multiCastLevel = 1; // How many projectiles per cast
        this.autoCastLevel = 0; // Automatic casting every few seconds
        
        // Manual incantation system
        this.customIncantations = {
            'FIRE': 'F',
            'ICE': 'I',
            'LIGHT': 'L',
            'HEAL': 'H',
            'CHAIN': 'C',
            'SHIELD': 'S'
        };
        
        // Available upgrades
        this.availableUpgrades = [
            { name: 'Fire Mastery', description: 'Fireball damage +10', type: 'damage', spell: 'FIRE', value: 10 },
            { name: 'Ice Mastery', description: 'Ice Spike damage +10', type: 'damage', spell: 'ICE', value: 10 },
            { name: 'Lightning Mastery', description: 'Lightning damage +10', type: 'damage', spell: 'LIGHT', value: 10 },
            { name: 'Healing Mastery', description: 'Heal restores +10 HP', type: 'heal', spell: 'HEAL', value: 10 },
            { name: 'Fire Speed', description: 'Fireball speed +2', type: 'speed', spell: 'FIRE', value: 2 },
            { name: 'Ice Speed', description: 'Ice Spike speed +2', type: 'speed', spell: 'ICE', value: 2 },
            { name: 'Lightning Speed', description: 'Lightning speed +2', type: 'speed', spell: 'LIGHT', value: 2 },
            { name: 'Health Boost', description: 'Max health +20', type: 'maxHealth', value: 20 },
            { name: 'Spell Efficiency', description: 'All spell damage +5', type: 'allDamage', value: 5 },
            { name: 'Rapid Casting', description: 'All spell speed +1', type: 'allSpeed', value: 1 },
            { name: 'Multi-Cast', description: 'Cast +1 projectile per spell', type: 'multiCast', value: 1 },
            { name: 'Auto-Cast', description: 'Auto-cast random spell every 3s', type: 'autoCast', value: 1 },
            { name: 'Chain Mastery', description: 'Chain Lightning chains +1 enemy', type: 'chainCount', spell: 'CHAIN', value: 1 }
        ];
        
        // Game objects
        this.projectiles = [];
        this.enemies = [];
        this.particles = [];
        this.effects = [];
        
        // Timing
        this.lastEnemySpawn = 0;
        this.enemySpawnRate = 1500; // ms - faster spawn rate for level 1
        this.lastUpdate = 0;
        this.lastAutoCast = 0;
        
        // Input handling
        this.keys = {};
        this.setupEventListeners();
        
        // Start screen
        this.showInstructions();
        
        // Add test sound button
        const testButton = document.getElementById('testSound');
        if (testButton) {
            testButton.addEventListener('click', () => {
                console.log('Test sound button clicked');
                this.soundEnabled = true;
                this.playEnemyDieSound();
            });
        }
        
        // Bloom effect
        this.bloomCanvas = document.createElement('canvas');
        this.bloomCanvas.width = this.width;
        this.bloomCanvas.height = this.height;
        this.bloomCtx = this.bloomCanvas.getContext('2d');

        // Screenshake
        this.screenshake = 0;
        this.screenshakeDecay = 0.9;

        // Responsive canvas
        this.resizeCanvas = () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.bloomCanvas.width = this.width;
            this.bloomCanvas.height = this.height;
            // Keep player centered
            this.player.x = this.width / 2;
            this.player.y = this.height / 2;
        };
        window.addEventListener('resize', this.resizeCanvas);
        this.resizeCanvas();

        // Sound effect for enemy death (random from all files in sounds/enemydeath/)
        this.enemyDieSounds = [];
        this.soundEnabled = false;
        // List of supported extensions
        this.enemyDieSoundExtensions = ['.wav', '.mp3', '.ogg'];
        // List of files to try in the enemydeath folder
        this.enemyDieSoundFiles = [
            'small-explosion-103779.mp3',
            'crate-break-1-93926.mp3'
        ];
        for (const file of this.enemyDieSoundFiles) {
            const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
            if (this.enemyDieSoundExtensions.includes(ext)) {
                try {
                    const audio = new Audio(`sounds/enemydeath/${file}`);
                    audio.load();
                    this.enemyDieSounds.push(audio);
                    console.log('Loaded enemy death sound: sounds/enemydeath/', file);
                } catch (e) {
                    console.log('Failed to load sound: sounds/enemydeath/', file, e);
                }
            }
        }
        if (this.enemyDieSounds.length === 0) {
            console.warn('No enemy death sounds found in sounds/');
        }
        this.playEnemyDieSound = () => {
            if (this.enemyDieSounds.length > 0 && this.soundEnabled) {
                try {
                    const idx = Math.floor(Math.random() * this.enemyDieSounds.length);
                    const snd = this.enemyDieSounds[idx].cloneNode();
                    snd.volume = 0.5;
                    snd.play().then(() => {
                        console.log('Random enemy death sound played');
                    }).catch(e => {
                        console.log('Sound play failed:', e);
                    });
                } catch (e) {
                    console.log('Sound play error:', e);
                }
            } else {
                console.log('No sound enabled or loaded. Enabled:', this.soundEnabled, 'Loaded:', this.enemyDieSounds.length);
            }
        };
        // Enable sound after first user interaction (multiple events)
        const enableSound = () => {
            this.soundEnabled = true;
            console.log('Sound enabled after user interaction');
        };
        window.addEventListener('pointerdown', enableSound, { once: true });
        window.addEventListener('keydown', enableSound, { once: true });
        window.addEventListener('click', enableSound, { once: true });
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            console.log('Key pressed:', e.key, 'Code:', e.code); // Debug log
            this.keys[e.key.toUpperCase()] = true;
            
            // Handle upgrade selection first (regardless of game state)
            if (this.showingUpgrades) {
                if (e.key === '1' || e.key === '2' || e.key === '3') {
                    const choice = parseInt(e.key) - 1;
                    console.log('Upgrade selected:', choice); // Debug log
                    this.selectUpgrade(choice);
                    return;
                }
            }
            
            if (!this.gameRunning) {
                if (e.code === 'Space') {
                    this.startGame();
                }
                return;
            }
            
            // Add to spell sequence - check for any letter key (case insensitive)
            if (e.key.match(/[a-zA-Z]/)) {
                console.log('Letter key detected:', e.key); // Debug log
                this.spellSequence.push(e.key.toUpperCase());
                this.updateSpellDisplay();
                
                // Check for spell completion
                this.checkSpellCompletion();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toUpperCase()] = false;
        });
    }
    
    showInstructions() {
        document.getElementById('instructions').style.display = 'block';
        this.updateSpellInstructions();
    }
    
    updateSpellInstructions() {
        const instructionsDiv = document.getElementById('spell-instructions');
        let instructionsHTML = '';
        
        Object.entries(this.customIncantations).forEach(([spellType, incantation]) => {
            const spellName = this.spells[spellType].name;
            const keyHTML = incantation.split('').map(letter => `<span class="key">${letter}</span>`).join(' + ');
            instructionsHTML += `<p>${keyHTML} = ${spellName}</p>`;
        });
        
        instructionsDiv.innerHTML = instructionsHTML;
    }
    
    startGame() {
        this.gameRunning = true;
        this.score = 0;
        this.level = 1;
        this.health = 100;
        this.maxHealth = 100;
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.effects = [];
        this.spellSequence = [];
        this.multiCastLevel = 1;
        this.autoCastLevel = 0;
        this.lastAutoCast = 0;
        
        // Reset spells to base level
        this.spells = {
            'FIRE': { name: 'Fireball', damage: 30, color: '#ff4444', radius: 8, speed: 5, level: 1, cooldown: 1000, lastCast: 0 },
            'ICE': { name: 'Ice Spike', damage: 25, color: '#44aaff', radius: 6, speed: 6, level: 1, cooldown: 800, lastCast: 0 },
            'LIGHT': { name: 'Lightning', damage: 40, color: '#ffff44', radius: 4, speed: 8, level: 1, cooldown: 1500, lastCast: 0 },
            'HEAL': { name: 'Heal', damage: -30, color: '#44ff44', radius: 15, speed: 0, level: 1, cooldown: 3000, lastCast: 0 },
            'CHAIN': { name: 'Chain Lightning', damage: 35, color: '#ffaa44', radius: 0, speed: 0, level: 1, chainCount: 3, cooldown: 2000, lastCast: 0 },
            'SHIELD': { name: 'Shield', damage: 0, color: '#8888ff', radius: 25, speed: 0, level: 1, cooldown: 4000, lastCast: 0 }
        };
        
        document.getElementById('instructions').style.display = 'none';
        this.updateUI();
        this.gameLoop();
    }
    
    checkSpellCompletion() {
        const sequence = this.spellSequence.join('');
        
        // Check for spells using custom incantations
        Object.entries(this.customIncantations).forEach(([spellType, incantation]) => {
            if (sequence.includes(incantation)) {
                this.castSpell(spellType);
                this.spellSequence = [];
                return;
            }
        });
        
        // Clear sequence if too long
        if (this.spellSequence.length > 10) {
            this.spellSequence = [];
            this.updateSpellDisplay();
        }
    }
    
    castSpell(spellType) {
        const spell = this.spells[spellType];
        const currentTime = Date.now();
        
        // Check cooldown
        if (currentTime - spell.lastCast < spell.cooldown) {
            // Spell is on cooldown
            this.updateSpellDisplay();
            return;
        }
        
        // Update last cast time
        spell.lastCast = currentTime;
        
        if (spellType === 'HEAL') {
            // Heal spell affects player directly
            this.health = Math.min(this.maxHealth, this.health - spell.damage);
            this.createHealEffect();
            this.updateUI();
        } else if (spellType === 'SHIELD') {
            // Shield spell creates a protective barrier
            this.createShieldEffect();
        } else {
            // Combat spells create projectiles
            this.createProjectile(spellType);
        }
        
        this.updateSpellDisplay();
    }
    
    createProjectile(spellType) {
        const spell = this.spells[spellType];
        
        // Special handling for chain lightning
        if (spellType === 'CHAIN') {
            this.castChainLightning();
            return;
        }
        
        // Find multiple enemies for multi-cast
        const targets = [];
        const playerPos = { x: this.player.x, y: this.player.y };
        
        // Sort enemies by distance to player
        const sortedEnemies = [...this.enemies].sort((a, b) => {
            const distA = Math.sqrt((a.x - playerPos.x) ** 2 + (a.y - playerPos.y) ** 2);
            const distB = Math.sqrt((b.x - playerPos.x) ** 2 + (b.y - playerPos.y) ** 2);
            return distA - distB;
        });
        
        // Take the first N enemies (where N is multi-cast level)
        for (let i = 0; i < Math.min(this.multiCastLevel, sortedEnemies.length); i++) {
            targets.push(sortedEnemies[i]);
        }
        
        // If no enemies, shoot in random directions
        if (targets.length === 0) {
            for (let i = 0; i < this.multiCastLevel; i++) {
                const angle = Math.random() * Math.PI * 2;
                const vx = Math.cos(angle) * spell.speed;
                const vy = Math.sin(angle) * spell.speed;
                
                this.projectiles.push({
                    x: this.player.x,
                    y: this.player.y,
                    vx: vx,
                    vy: vy,
                    radius: spell.radius,
                    color: spell.color,
                    damage: spell.damage,
                    type: spellType,
                    life: 60
                });
            }
            return;
        }
        
        // Create projectiles targeting different enemies
        targets.forEach(enemy => {
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const vx = (dx / distance) * spell.speed;
                const vy = (dy / distance) * spell.speed;
                
                this.projectiles.push({
                    x: this.player.x,
                    y: this.player.y,
                    vx: vx,
                    vy: vy,
                    radius: spell.radius,
                    color: spell.color,
                    damage: spell.damage,
                    type: spellType,
                    life: 60
                });
            }
        });
    }
    
    castChainLightning() {
        const spell = this.spells['CHAIN'];
        const chainCount = spell.chainCount;
        // Find enemies to chain between
        const targets = [];
        let currentTarget = null;
        let currentPos = { x: this.player.x, y: this.player.y };
        // Find the first target (nearest enemy)
        let nearestDistance = Infinity;
        this.enemies.forEach(enemy => {
            const distance = Math.sqrt(
                (enemy.x - currentPos.x) ** 2 + (enemy.y - currentPos.y) ** 2
            );
            if (distance < nearestDistance) {
                nearestDistance = distance;
                currentTarget = enemy;
            }
        });
        if (!currentTarget) return;
        // Chain through enemies
        for (let i = 0; i < chainCount && currentTarget; i++) {
            targets.push(currentTarget);
            // Find next target (nearest enemy to current target)
            let nextTarget = null;
            let nextDistance = Infinity;
            this.enemies.forEach(enemy => {
                if (targets.includes(enemy)) return; // Skip already hit enemies
                const distance = Math.sqrt(
                    (enemy.x - currentTarget.x) ** 2 + (enemy.y - currentTarget.y) ** 2
                );
                if (distance < nextDistance && distance < 300) { // Increased max chain distance
                    nextDistance = distance;
                    nextTarget = enemy;
                }
            });
            currentTarget = nextTarget;
        }
        // Apply damage and create chain effect
        let killed = false;
        // Collect points for the chain
        const chainPoints = [{ x: this.player.x, y: this.player.y }];
        targets.forEach((enemy, index) => {
            enemy.health -= spell.damage;
            chainPoints.push({ x: enemy.x, y: enemy.y });
            if (enemy.health <= 0) {
                const enemyIndex = this.enemies.indexOf(enemy);
                if (enemyIndex > -1) {
                    this.enemies.splice(enemyIndex, 1);
                    this.score += 10;
                    this.createExplosionEffect(enemy.x, enemy.y);
                    killed = true;
                    this.playEnemyDieSound();
                }
            }
        });
        if (killed) this.screenshake = 16;
        // Add a visual effect for the chain line that lingers
        this.effects.push({
            type: 'chain',
            points: chainPoints,
            time: 0,
            maxTime: 18 // ~0.3 seconds at 60fps
        });
        this.updateUI();
    }
    
    createHealEffect() {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.player.x + (Math.random() - 0.5) * 40,
                y: this.player.y + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                radius: Math.random() * 3 + 1,
                color: '#44ff44',
                life: 30
            });
        }
    }
    
    createShieldEffect() {
        // Create shield barrier around player
        this.shieldActive = true;
        this.shieldDuration = 120; // 2 seconds at 60fps
        
        // Create shield particles
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: this.player.x + (Math.random() - 0.5) * 50,
                y: this.player.y + (Math.random() - 0.5) * 50,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                radius: Math.random() * 2 + 1,
                color: '#8888ff',
                life: 60
            });
        }
    }
    
    createShieldHitEffect(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                radius: Math.random() * 3 + 2,
                color: '#8888ff',
                life: 30
            });
        }
    }
    
    updateShield() {
        if (this.shieldActive) {
            this.shieldDuration--;
            if (this.shieldDuration <= 0) {
                this.shieldActive = false;
            }
        }
    }
    
    spawnEnemy() {
        // Calculate speed multiplier based on screen size
        const baseDiagonal = 1000; // reference size
        const diag = Math.sqrt(this.width * this.width + this.height * this.height);
        const speedMultiplier = Math.max(1, diag / baseDiagonal);
        // Spawn multiple enemies based on level (slower scaling)
        const enemiesToSpawn = Math.min(1 + Math.floor(this.level / 3), 4); // 1-4 enemies, slower scaling
        for (let i = 0; i < enemiesToSpawn; i++) {
            const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
            let x, y;
            switch (side) {
                case 0: x = Math.random() * this.width; y = -30; break;
                case 1: x = this.width + 30; y = Math.random() * this.height; break;
                case 2: x = Math.random() * this.width; y = this.height + 30; break;
                case 3: x = -30; y = Math.random() * this.height; break;
            }
            // Determine enemy type based on level and chance
            const enemyType = this.getEnemyType();
            // Slower enemies with slight speed increase per level
            const speed = (0.5 + Math.random() * 0.5 + this.level * 0.05) * enemyType.speedMultiplier * speedMultiplier;
            const health = 20 + this.level * 5; // Reduced health scaling
            this.enemies.push({
                x: x,
                y: y,
                radius: 15,
                color: enemyType.color,
                health: health * enemyType.healthMultiplier,
                maxHealth: health * enemyType.healthMultiplier,
                speed: speed,
                type: enemyType.name,
                vx: 0,
                vy: 0,
                special: enemyType.special
            });
        }
    }
    
    getEnemyType() {
        const types = [
            { name: 'Normal', color: '#ff4444', healthMultiplier: 1, speedMultiplier: 1, special: null },
            { name: 'Fast', color: '#ff8844', healthMultiplier: 0.7, speedMultiplier: 1.5, special: 'fast' },
            { name: 'Tank', color: '#884444', healthMultiplier: 2, speedMultiplier: 0.7, special: 'tank' },
            { name: 'Bomber', color: '#ff4488', healthMultiplier: 0.8, speedMultiplier: 1.2, special: 'bomber' }
        ];
        
        // Higher chance for special enemies at higher levels
        const specialChance = Math.min(0.3 + this.level * 0.05, 0.7);
        
        if (Math.random() < specialChance && this.level > 2) {
            // Return a special enemy type
            return types[Math.floor(Math.random() * (types.length - 1)) + 1];
        } else {
            // Return normal enemy
            return types[0];
        }
    }
    
    updateEnemies() {
        this.enemies.forEach(enemy => {
            // Move towards player
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                enemy.vx = (dx / distance) * enemy.speed;
                enemy.vy = (dy / distance) * enemy.speed;
            }
            
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            
            // Check collision with player
            const playerDistance = Math.sqrt(
                (enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2
            );
            
            if (playerDistance < enemy.radius + this.player.radius) {
                if (this.shieldActive) {
                    // Shield blocks damage and knocks enemy back
                    const knockbackDistance = 50;
                    const knockbackAngle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
                    enemy.x = this.player.x + Math.cos(knockbackAngle) * knockbackDistance;
                    enemy.y = this.player.y + Math.sin(knockbackAngle) * knockbackDistance;
                    
                    // Create shield hit effect
                    this.createShieldHitEffect(enemy.x, enemy.y);
                } else {
                    // Normal damage
                    this.health -= 10;
                    this.updateUI();
                    this.createHitEffect(enemy.x, enemy.y);
                    
                    // Handle special enemy effects
                    if (enemy.special === 'bomber') {
                        // Bomber explodes on contact
                        this.createExplosionEffect(enemy.x, enemy.y);
                        this.health -= 20; // Extra explosion damage
                        this.updateUI();
                    }
                    
                    // Remove enemy
                    const index = this.enemies.indexOf(enemy);
                    if (index > -1) {
                        this.enemies.splice(index, 1);
                    }
                }
            }
        });
    }
    
    updateProjectiles() {
        this.projectiles.forEach((projectile, index) => {
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            // Remove if out of bounds
            if (
                projectile.x < -100 || projectile.x > this.width + 100 ||
                projectile.y < -100 || projectile.y > this.height + 100
            ) {
                this.projectiles.splice(index, 1);
                return;
            }
            // Check collision with enemies
            this.enemies.forEach((enemy, enemyIndex) => {
                const distance = Math.sqrt(
                    (projectile.x - enemy.x) ** 2 + (projectile.y - enemy.y) ** 2
                );
                if (distance < projectile.radius + enemy.radius) {
                    enemy.health -= projectile.damage;
                    this.createHitEffect(projectile.x, projectile.y, projectile.color);
                    this.projectiles.splice(index, 1);
                    if (enemy.health <= 0) {
                        this.enemies.splice(enemyIndex, 1);
                        this.score += 10;
                        this.updateUI();
                        this.createExplosionEffect(enemy.x, enemy.y);
                        this.screenshake = 16;
                        this.playEnemyDieSound();
                    }
                }
            });
        });
    }
    
    updateParticles() {
        this.particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
        // Update lingering effects (like chain lightning)
        if (this.effects) {
            for (let i = this.effects.length - 1; i >= 0; i--) {
                this.effects[i].time++;
                if (this.effects[i].time > this.effects[i].maxTime) {
                    this.effects.splice(i, 1);
                }
            }
        }
    }
    
    createHitEffect(x, y, color = '#ffffff') {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                radius: Math.random() * 2 + 1,
                color: color,
                life: 20
            });
        }
    }
    
    createExplosionEffect(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                radius: Math.random() * 4 + 2,
                color: '#ffaa44',
                life: 40
            });
        }
    }
    
    updateCooldownBars() {
        const currentTime = Date.now();
        
        Object.entries(this.spells).forEach(([spellType, spell]) => {
            const cooldownElement = document.getElementById(spellType.toLowerCase() + 'Cooldown');
            if (cooldownElement) {
                const timeSinceCast = currentTime - spell.lastCast;
                const cooldownProgress = Math.min(timeSinceCast / spell.cooldown, 1);
                cooldownElement.style.width = (cooldownProgress * 100) + '%';
            }
        });
    }
    
    updateSpellDisplay() {
        const display = document.getElementById('spellDisplay');
        if (this.spellSequence.length > 0) {
            display.textContent = `Spell: ${this.spellSequence.join('')}`;
        } else {
            display.textContent = 'Press keys to cast spells!';
        }
    }
    
    updateUI() {
        document.getElementById('health').textContent = `${this.health}/${this.maxHealth}`;
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        
        // Check for level completion (every 10 enemies defeated)
        const enemiesDefeated = Math.floor(this.score / 10);
        const expectedLevel = Math.floor(enemiesDefeated / 10) + 1;
        
        if (expectedLevel > this.level && !this.showingUpgrades) {
            this.levelComplete();
            return;
        }
        
        // Check for game over
        if (this.health <= 0) {
            this.gameOver();
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        document.getElementById('instructions').style.display = 'block';
        document.getElementById('instructions').innerHTML = `
            <h2>Game Over!</h2>
            <p>Final Score: ${this.score}</p>
            <p>Level Reached: ${this.level}</p>
            <p>Press SPACE to play again!</p>
        `;
    }
    
    render() {
        // Screenshake offset
        let shakeX = 0, shakeY = 0;
        if (this.screenshake > 0.1) {
            shakeX = (Math.random() - 0.5) * this.screenshake;
            shakeY = (Math.random() - 0.5) * this.screenshake;
            this.screenshake *= this.screenshakeDecay;
        } else {
            this.screenshake = 0;
        }

        // Draw to bloom canvas first
        this.bloomCtx.clearRect(0, 0, this.width, this.height);
        this.bloomCtx.save();
        this.bloomCtx.translate(shakeX, shakeY);
        this.bloomCtx.globalAlpha = 1;
        this.bloomCtx.fillStyle = 'rgba(26, 26, 46, 0.30)';
        this.bloomCtx.fillRect(0, 0, this.width, this.height);

        // Draw particles
        this.particles.forEach(particle => {
            this.bloomCtx.globalAlpha = particle.life / 30;
            this.bloomCtx.fillStyle = particle.color;
            this.bloomCtx.beginPath();
            this.bloomCtx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.bloomCtx.fill();
        });
        this.bloomCtx.globalAlpha = 1;

        // Draw projectiles
        this.projectiles.forEach(projectile => {
            this.bloomCtx.fillStyle = projectile.color;
            this.bloomCtx.beginPath();
            this.bloomCtx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
            this.bloomCtx.shadowColor = projectile.color;
            this.bloomCtx.shadowBlur = 20;
            this.bloomCtx.fill();
            this.bloomCtx.shadowBlur = 0;
        });

        // Draw enemies
        this.enemies.forEach(enemy => {
            this.bloomCtx.fillStyle = enemy.color;
            this.bloomCtx.beginPath();
            this.bloomCtx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            this.bloomCtx.shadowColor = enemy.color;
            this.bloomCtx.shadowBlur = 20;
            this.bloomCtx.fill();
            this.bloomCtx.shadowBlur = 0;
        });

        // Draw player
        this.bloomCtx.fillStyle = this.player.color;
        this.bloomCtx.beginPath();
        this.bloomCtx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.bloomCtx.shadowColor = this.player.color;
        this.bloomCtx.shadowBlur = 30;
        this.bloomCtx.fill();
        this.bloomCtx.shadowBlur = 0;

        // Draw shield if active
        if (this.shieldActive) {
            this.bloomCtx.strokeStyle = '#8888ff';
            this.bloomCtx.lineWidth = 3;
            this.bloomCtx.globalAlpha = 0.6;
            this.bloomCtx.beginPath();
            this.bloomCtx.arc(this.player.x, this.player.y, this.player.radius + 10, 0, Math.PI * 2);
            this.bloomCtx.stroke();
            this.bloomCtx.globalAlpha = 1;
        }
        this.bloomCtx.restore();

        // Draw main scene (with screenshake)
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.translate(shakeX, shakeY);
        this.ctx.fillStyle = 'rgba(26, 26, 46, 0.30)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw everything as before (no shadow/glow here)
        this.particles.forEach(particle => {
            this.ctx.globalAlpha = particle.life / 30;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
        this.projectiles.forEach(projectile => {
            this.ctx.fillStyle = projectile.color;
            this.ctx.beginPath();
            this.ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.color;
            this.ctx.beginPath();
            this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.fillStyle = this.player.color;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.ctx.fill();
        if (this.shieldActive) {
            this.ctx.strokeStyle = '#8888ff';
            this.ctx.lineWidth = 3;
            this.ctx.globalAlpha = 0.6;
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.radius + 10, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        }
        this.ctx.restore();

        // Draw lingering chain lightning effects
        if (this.effects) {
            this.effects.forEach(effect => {
                if (effect.type === 'chain' && effect.points.length > 1) {
                    this.ctx.save();
                    this.ctx.globalAlpha = 0.8 * (1 - effect.time / effect.maxTime);
                    
                    // Draw multiple layers for sharper, more unstable lightning
                    for (let layer = 0; layer < 3; layer++) {
                        this.ctx.strokeStyle = layer === 0 ? '#ffff44' : layer === 1 ? '#ffaa44' : '#ff8844';
                        this.ctx.lineWidth = layer === 0 ? 2 : layer === 1 ? 3 : 1;
                        this.ctx.beginPath();
                        
                        // Draw zigzag between each pair of points
                        for (let i = 0; i < effect.points.length - 1; i++) {
                            const p1 = effect.points[i];
                            const p2 = effect.points[i + 1];
                            const segments = 20; // More segments for sharper zigzags
                            this.ctx.moveTo(p1.x, p1.y);
                            
                            for (let s = 1; s < segments; s++) {
                                const t = s / segments;
                                const baseX = p1.x + (p2.x - p1.x) * t;
                                const baseY = p1.y + (p2.y - p1.y) * t;
                                
                                // Use more chaotic patterns instead of predictable sine waves
                                const noise1 = (Math.random() - 0.5) * 20;
                                const noise2 = (Math.random() - 0.5) * 15;
                                const noise3 = (Math.random() - 0.5) * 10;
                                
                                // Add some irregular zigzags that aren't sine-based
                                const irregularZigzag = (s % 3 === 0) ? (Math.random() - 0.5) * 18 : 0;
                                const spike = (s % 5 === 0) ? (Math.random() - 0.5) * 25 : 0;
                                
                                // Occasional sharp turns and branches
                                const sharpTurn = (Math.random() < 0.1) ? (Math.random() - 0.5) * 30 : 0;
                                const branch = (Math.random() < 0.05) ? (Math.random() - 0.5) * 35 : 0;
                                
                                // Combine all chaotic elements
                                const offsetX = noise1 + noise2 + noise3 + irregularZigzag + spike + sharpTurn + branch;
                                const offsetY = noise1 + noise2 + noise3 + irregularZigzag + spike + sharpTurn + branch;
                                
                                // Add slight offset for each layer to create thickness
                                const layerOffset = (layer - 1) * 2;
                                
                                this.ctx.lineTo(baseX + offsetX + layerOffset, baseY + offsetY + layerOffset);
                            }
                            this.ctx.lineTo(p2.x, p2.y);
                        }
                        
                        // Different shadow effects for each layer
                        this.ctx.shadowColor = layer === 0 ? '#ffff88' : layer === 1 ? '#ffaa88' : '#ff8888';
                        this.ctx.shadowBlur = layer === 0 ? 20 : layer === 1 ? 12 : 8;
                        this.ctx.stroke();
                    }
                    
                    this.ctx.shadowBlur = 0;
                    this.ctx.restore();
                }
            });
        }

        // Draw bloom layer (blurred and brightened)
        this.ctx.save();
        this.ctx.globalAlpha = 0.45;
        this.ctx.filter = 'blur(8px) brightness(1.7)';
        this.ctx.drawImage(this.bloomCanvas, 0, 0);
        this.ctx.filter = 'none';
        this.ctx.globalAlpha = 1;
        this.ctx.restore();
    }
    
    gameLoop(currentTime = 0) {
        if (!this.gameRunning) return;
        
        const deltaTime = currentTime - this.lastUpdate;
        this.lastUpdate = currentTime;
        
        // Auto-cast system
        if (this.autoCastLevel > 0 && currentTime - this.lastAutoCast > 3000) {
            this.autoCast();
            this.lastAutoCast = currentTime;
        }
        
        // Spawn enemies
        if (currentTime - this.lastEnemySpawn > this.enemySpawnRate) {
            this.spawnEnemy();
            this.lastEnemySpawn = currentTime;
        }
        
        // Update game objects
        this.updateEnemies();
        this.updateProjectiles();
        this.updateParticles();
        this.updateShield();
        this.updateCooldownBars();
        
        // Render
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    autoCast() {
        // Choose a random combat spell (not heal)
        const combatSpells = ['FIRE', 'ICE', 'LIGHT', 'CHAIN'];
        const randomSpell = combatSpells[Math.floor(Math.random() * combatSpells.length)];
        // Only cast if there are enemies
        if (this.enemies.length > 0) {
            this.castSpellNoCooldown(randomSpell);
        }
    }

    castSpellNoCooldown(spellType) {
        // Like castSpell, but does not set cooldown
        const spell = this.spells[spellType];
        if (spellType === 'HEAL') {
            this.health = Math.min(this.maxHealth, this.health - spell.damage);
            this.createHealEffect();
            this.updateUI();
        } else if (spellType === 'SHIELD') {
            this.createShieldEffect();
        } else if (spellType === 'CHAIN') {
            this.castChainLightning();
        } else {
            this.createProjectile(spellType);
        }
        this.updateSpellDisplay();
    }
    
    levelComplete() {
        this.showingUpgrades = true;
        this.gameRunning = false;
        
        // Generate 3 random upgrade options
        this.currentUpgrades = [];
        const shuffled = [...this.availableUpgrades].sort(() => 0.5 - Math.random());
        this.currentUpgrades = shuffled.slice(0, 3);
        
        this.showUpgradeScreen();
    }
    
    showUpgradeScreen() {
        const instructions = document.getElementById('instructions');
        instructions.style.display = 'block';
        
        let upgradeHTML = `
            <h2>Level ${this.level} Complete!</h2>
            <p>Choose your upgrade:</p>
        `;
        
        this.currentUpgrades.forEach((upgrade, index) => {
            upgradeHTML += `
                <div class="upgrade-option">
                    <strong>${index + 1}. ${upgrade.name}</strong><br>
                    <span style="color: #4a90e2;">${upgrade.description}</span>
                </div>
            `;
        });
        
        upgradeHTML += `<p>Press 1, 2, or 3 to select your upgrade!</p>`;
        
        instructions.innerHTML = upgradeHTML;
    }
    
    selectUpgrade(choice) {
        if (choice >= 0 && choice < this.currentUpgrades.length) {
            const upgrade = this.currentUpgrades[choice];
            this.applyUpgrade(upgrade);
            
            // Hide upgrade screen and continue to next level
            this.showingUpgrades = false;
            document.getElementById('instructions').style.display = 'none';
            this.level++;
            this.gameRunning = true;
            
            // Heal player for next level
            this.health = this.maxHealth;
            this.updateUI();
            
            // Start next level
            this.gameLoop();
        }
    }
    
    applyUpgrade(upgrade) {
        switch (upgrade.type) {
            case 'damage':
                this.spells[upgrade.spell].damage += upgrade.value;
                break;
            case 'speed':
                this.spells[upgrade.spell].speed += upgrade.value;
                break;
            case 'heal':
                this.spells[upgrade.spell].damage -= upgrade.value; // Negative for healing
                break;
            case 'maxHealth':
                this.maxHealth += upgrade.value;
                this.health += upgrade.value;
                break;
            case 'allDamage':
                Object.values(this.spells).forEach(spell => {
                    if (spell.damage > 0) { // Don't affect heal spell
                        spell.damage += upgrade.value;
                    }
                });
                break;
            case 'allSpeed':
                Object.values(this.spells).forEach(spell => {
                    if (spell.speed > 0) { // Don't affect heal spell
                        spell.speed += upgrade.value;
                    }
                });
                break;
            case 'multiCast':
                this.multiCastLevel++;
                break;
            case 'autoCast':
                this.autoCastLevel++;
                break;
            case 'chainCount':
                this.spells[upgrade.spell].chainCount += upgrade.value;
                break;
        }
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new SpellcastingGame();
}); 