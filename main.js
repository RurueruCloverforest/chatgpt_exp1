window.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('items.json');
    const itemDefinitions = await response.json();
    const itemMap = {};
    for (const def of itemDefinitions) {
        itemMap[def.code] = def;
    }

    const canvasContainer = document.getElementById('canvas-container');
    const app = new PIXI.Application();
    await app.init({
        width: canvasContainer.clientWidth,
        height: canvasContainer.clientHeight,
        backgroundColor: 0x1099bb,
        backgroundAlpha: 0,
    });

    canvasContainer.appendChild(app.canvas);

      const scoreEls = {
          reputation: document.getElementById('score-reputation'),
          magic: document.getElementById('score-magic'),
          money: document.getElementById('score-money'),
      };
      const scores = { reputation: 0, magic: 0, money: 0 };
      
        const itemListEl = document.getElementById('item-list');
        const recipeListEl = document.getElementById('recipe-list');
        const shopEl = document.getElementById('shop');
        const infoPane = document.getElementById('info-pane');

        function refreshItemList() {
            itemListEl.innerHTML = '';
            for (const item of items) {
                const div = document.createElement('div');
                const def = itemMap[item.code] || {};
                const name = def.name ? ` - ${def.name}` : '';
                div.textContent = `#${item.id} [${item.code}]${name}`;
                itemListEl.appendChild(div);
            }
        }

        function refreshRecipeList() {
            recipeListEl.innerHTML = '';

            const byResult = {};
            for (const [key, result] of Object.entries(mergeRules)) {
                if (!byResult[result]) byResult[result] = [];
                const [a, b] = key.split('+');
                byResult[result].push({ a, b, key });
            }

            Object.keys(byResult).forEach(result => {
                const section = document.createElement('div');
                section.className = 'recipe-section';

                const header = document.createElement('h3');
                const def = itemMap[result] || { name: result, code: result };
                header.textContent = `${def.name} [${def.code}]`;
                section.appendChild(header);

                byResult[result].forEach(({ a, b, key }) => {
                    const line = document.createElement('div');
                    const cost = mergeCosts[key] || 0;
                    const reward = endpointRewards[result] || {};
                    const rewardParts = [];
                    if (reward.money) rewardParts.push(`$${reward.money}`);
                    if (reward.magic) rewardParts.push(`${reward.magic} Mag`);
                    if (reward.reputation) rewardParts.push(`${reward.reputation} Rep`);
                    const costTxt = cost ? ` Cost: ${cost} Mag` : '';
                    const finalFlag = isTerminalCode(result) ? ' (Final)' : '';
                    const aName = itemMap[a]?.name || a;
                    const bName = itemMap[b]?.name || b;
                    let txt = `${aName} [${a}] + ${bName} [${b}] -> ${def.name}${finalFlag}`;
                    if (rewardParts.length || cost) {
                        txt += ` (Reward: ${rewardParts.join(', ')}${cost ? ';' + costTxt : ''})`;
                    }
                    line.textContent = txt;
                    line.className = 'recipe-line';
                    section.appendChild(line);
                });

                recipeListEl.appendChild(section);
            });
        }

        const recipeBookCost = 10;
        const extraRecipes = {
            'AA+EE': 'GG',
            'BB+FF': 'HH'
        };
        function getExtraRecipesTooltip() {
            return Object.entries(extraRecipes).map(([k, v]) => {
                const [a, b] = k.split('+');
                const aName = itemMap[a]?.name || a;
                const bName = itemMap[b]?.name || b;
                const resultName = itemMap[v]?.name || v;
                return `${aName} [${a}] + ${bName} [${b}] -> ${resultName} [${v}]`;
            }).join('\n');
        }
        let recipeBookPurchased = false;

        const gatherItemCodes = ['KK', 'LL'];
        const gatherRepRequirement = 5;
        let gatherSitePurchased = false;
        let gatherIntervalId = null;

        const SAVE_KEY = 'mergeGameState';
        let cookieUpdatesEnabled = true;

        function saveState() {
            if (!cookieUpdatesEnabled) return;
            const data = {
                scores,
                recipeBookPurchased,
                gatherSitePurchased
            };
            document.cookie = `${SAVE_KEY}=` +
                encodeURIComponent(JSON.stringify(data)) +
                '; max-age=31536000; path=/';
        }

        function loadState() {
            const match = document.cookie.match(new RegExp('(?:^|; )' + SAVE_KEY + '=([^;]*)'));
            if (!match) return;
            try {
                const data = JSON.parse(decodeURIComponent(match[1]));
                if (data.scores) {
                    scores.reputation = data.scores.reputation || 0;
                    scores.magic = data.scores.magic || 0;
                    scores.money = data.scores.money || 0;
                }
                if (data.recipeBookPurchased) {
                    recipeBookPurchased = true;
                    Object.entries(extraRecipes).forEach(([k, v]) => { mergeRules[k] = v; });
                }
                if (data.gatherSitePurchased) {
                    gatherSitePurchased = true;
                    startGatherSite();
                }
            } catch (e) {
                console.error('Failed to load saved state', e);
            }
        }

        function startGatherSite() {
            if (gatherIntervalId) return;
            gatherIntervalId = setInterval(() => {
                spawnItem(randomGatherCode());
            }, 3000);
        }

        function stopGatherSite() {
            if (!gatherIntervalId) return;
            clearInterval(gatherIntervalId);
            gatherIntervalId = null;
        }

        function randomGatherCode() {
            return gatherItemCodes[Math.floor(Math.random() * gatherItemCodes.length)];
        }

        function refreshShop() {
            shopEl.innerHTML = '';
            const btn = document.createElement('button');
            btn.textContent = recipeBookPurchased ? 'Recipe Book Purchased' : `Buy Recipe Book ($${recipeBookCost})`;
            if (!recipeBookPurchased) {
                btn.title = getExtraRecipesTooltip();
            }
            btn.disabled = recipeBookPurchased || scores.money < recipeBookCost;
            btn.addEventListener('click', () => {
                if (recipeBookPurchased || scores.money < recipeBookCost) return;
                scores.money -= recipeBookCost;
                Object.entries(extraRecipes).forEach(([k, v]) => { mergeRules[k] = v; });
                recipeBookPurchased = true;
                updateScores();
                refreshRecipeList();
                refreshShop();
            });
            shopEl.appendChild(btn);

            const gatherBtn = document.createElement('button');
            if (gatherSitePurchased) {
                gatherBtn.textContent = 'Gathering Site Active (click to disable)';
                gatherBtn.disabled = false;
                gatherBtn.addEventListener('click', () => {
                    gatherSitePurchased = false;
                    stopGatherSite();
                    refreshShop();
                    if (typeof saveState === 'function') saveState();
                });
            } else {
                gatherBtn.textContent = `Buy Gathering Site (requires ${gatherRepRequirement} Rep)`;
                gatherBtn.disabled = scores.reputation < gatherRepRequirement;
                gatherBtn.addEventListener('click', () => {
                    if (gatherSitePurchased || scores.reputation < gatherRepRequirement) return;
                    gatherSitePurchased = true;
                    startGatherSite();
                    refreshShop();
                    if (typeof saveState === 'function') saveState();
                });
            }
            shopEl.appendChild(gatherBtn);
        }

      document.querySelectorAll('.tab-button').forEach(btn => {
          btn.addEventListener('click', () => {
              document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
              document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
              btn.classList.add('active');
              document.getElementById(btn.dataset.tab).classList.add('active');
              infoPane.classList.toggle('show-video', btn.dataset.tab === 'character');
          });
      });

      const clearBtn = document.getElementById('clear-progress-btn');
      if (clearBtn) {
          clearBtn.addEventListener('click', () => {
              document.cookie = `${SAVE_KEY}=; max-age=0; path=/`;
              cookieUpdatesEnabled = false;
          });
      }

    const endpointRadius = 30;
    const endpointX = app.renderer.width - endpointRadius - 20;
    const endpointY = app.renderer.height - endpointRadius - 20;
    const endpointRewards = {
        'AA': { money: 1 },
        'BB': { magic: 1 },
        'CC': { reputation: 1 },
        'DD': { money: 2, magic: 1 },
        'EE': { reputation: 2, magic: 2 },
        'FF': { money: 3, magic: 2 },
        'GG': { reputation: 3, money: 1 },
        'HH': { magic: 3, reputation: 1 },
        'II': { magic: 4, reputation: 2 },
        'JJ': { money: 4, reputation: 2 },
        'KK': { money: 2, reputation: 1 },
        'LL': { magic: 2, reputation: 1 }
    };

    function updateScores() {
        scoreEls.reputation.textContent = `Reputation: ${scores.reputation}`;
        scoreEls.magic.textContent = `Magic: ${scores.magic}`;
        scoreEls.money.textContent = `Money: ${scores.money}`;
        if (typeof refreshShop === 'function') refreshShop();
        if (typeof saveState === 'function') saveState();
    }

    function awardForCode(code) {
        const reward = endpointRewards[code] || {};
        scores.money += reward.money || 0;
        scores.magic += reward.magic || 0;
        scores.reputation += reward.reputation || 0;
        updateScores();
    }


    const endpoint = new PIXI.Graphics();
    endpoint.beginFill(0x444444);
    endpoint.drawCircle(0, 0, endpointRadius);
    endpoint.endFill();
    endpoint.x = endpointX;
    endpoint.y = endpointY;
    app.stage.addChild(endpoint);

    const items = [];
    const itemRadius = 20;
    const itemSpeed = 2;

    const repulsionRadius = 100;
    const repulsionStrength = 0.2;
    const mouse = { x: 0, y: 0, active: false };

    const mergeRules = {
        'AA+AA': 'BB',
        'AA+BB': 'CC',
        'BB+BB': 'CC',
        'CC+CC': 'DD',
        'BB+CC': 'DD',
        'DD+DD': 'EE',
        'EE+EE': 'FF',
        'BB+DD': 'GG',
        'CC+EE': 'HH',
        'GG+GG': 'II',
        'HH+HH': 'JJ'
    };

    const mergeCosts = {
        'GG+GG': 2,
        'HH+HH': 3
    };

    loadState();
    updateScores();

    let nextItemId = 1;

    app.canvas.addEventListener('mousemove', (e) => {
        const rect = app.canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    app.canvas.addEventListener('mousedown', () => { mouse.active = true; });
    app.canvas.addEventListener('mouseup', () => { mouse.active = false; });
    app.canvas.addEventListener('mouseleave', () => { mouse.active = false; });

    function colorForCode(code) {
        const def = itemMap[code];
        // Recent versions of PixiJS removed the `utils` export where
        // `string2hex` used to live. Instead we can rely on the `Color`
        // helper class which is always available. Using the shared instance
        // avoids creating lots of temporary objects.
        return PIXI.Color.shared.setValue(def.color).toNumber();
    }

    function spawnItem(code = 'AA', x = app.renderer.width / 2, y = app.renderer.height / 2) {
        const def = itemMap[code];
        const container = new PIXI.Container();

        const g = new PIXI.Graphics();
        g.beginFill(colorForCode(code));
        g.drawCircle(0, 0, itemRadius);
        g.endFill();
        g.x = 0;
        g.y = 0;

        const label = new PIXI.Text(def.code, {fontSize: 12, fill: 0xffffff});
        label.anchor.set(0.5);

        container.addChild(g);
        container.addChild(label);
        container.x = x;
        container.y = y;
        container.vx = (Math.random() - 0.5) * itemSpeed * 2;
        container.vy = (Math.random() - 0.5) * itemSpeed * 2;
        container.code = code;
        container.id = nextItemId++;

        app.stage.addChild(container);
        items.push(container);
        refreshItemList();
    }

    function isColliding(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy) < itemRadius * 2;
    }

    function mergeKey(a, b) {
        return [a, b].sort().join('+');
    }

    function atEndpoint(item) {
        const dx = item.x - endpointX;
        const dy = item.y - endpointY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < endpointRadius + itemRadius;
    }

    function isTerminalCode(code) {
        for (const key of Object.keys(mergeRules)) {
            const parts = key.split('+');
            if (parts.includes(code)) {
                return false;
            }
        }
        return true;
    }

    app.ticker.add(() => {
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (mouse.active) {
                const dx = item.x - mouse.x;
                const dy = item.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < repulsionRadius && dist > 0) {
                    const force = (1 - dist / repulsionRadius) * repulsionStrength;
                    item.vx += (dx / dist) * force;
                    item.vy += (dy / dist) * force;
                }
            }

            item.x += item.vx;
            item.y += item.vy;

            if (item.x - itemRadius < 0 || item.x + itemRadius > app.renderer.width) {
                item.vx *= -1;
            }
            if (item.y - itemRadius < 0 || item.y + itemRadius > app.renderer.height) {
                item.vy *= -1;
            }

            if (atEndpoint(item)) {
                if (isTerminalCode(item.code)) {
                    awardForCode(item.code);
                    app.stage.removeChild(item);
                    items.splice(i, 1);
                    refreshItemList();
                    continue;
                } else {
                    // bounce back if not terminal
                    const dx = item.x - endpointX;
                    const dy = item.y - endpointY;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const overlap = endpointRadius + itemRadius - dist;
                    item.x += nx * overlap;
                    item.y += ny * overlap;
                    item.vx *= -1;
                    item.vy *= -1;
                }
            }
        }

        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const a = items[i];
                const b = items[j];
                if (isColliding(a, b)) {
                    const key = mergeKey(a.code, b.code);
                    const resultCode = mergeRules[key];
                    const cost = mergeCosts[key] || 0;
                    if (resultCode && scores.magic >= cost) {
                        scores.magic -= cost;
                        const newX = (a.x + b.x) / 2;
                        const newY = (a.y + b.y) / 2;
                        app.stage.removeChild(a);
                        app.stage.removeChild(b);
                        items.splice(j, 1);
                        items.splice(i, 1);

                        if (isTerminalCode(resultCode)) {
                            awardForCode(resultCode);
                            refreshItemList();
                        } else {
                            spawnItem(resultCode, newX, newY);
                        }

                        scores.reputation += 1;
                        scores.magic += 1;
                        scores.money += 1;
                        updateScores();
                        return; // restart detection next tick
                    } else {
                        // simple velocity swap if no merge rule or insufficient magic
                        const tvx = a.vx; const tvy = a.vy;
                        a.vx = b.vx; a.vy = b.vy;
                        b.vx = tvx; b.vy = tvy;
                    }
                }
            }
        }
    });

    function randomBaseCode() {
        const bases = ['AA', 'BB', 'CC'];
        return bases[Math.floor(Math.random() * bases.length)];
    }

      setInterval(() => {
          spawnItem(randomBaseCode());
      }, 1000);

      spawnItem(randomBaseCode());
      refreshRecipeList();
      refreshShop();
      infoPane.classList.toggle('show-video', document.querySelector('.tab-button.active').dataset.tab === 'character');
  });
