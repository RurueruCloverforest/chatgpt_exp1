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

      const gameTimeEl = document.getElementById('game-time');
      const gameStartTime = new Date(1000, 3, 1, 9, 0, 0);
      let gameTime = new Date(gameStartTime.getTime());

      function formatGameTime(dt) {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const d = String(dt.getDate()).padStart(2, '0');
          const hh = String(dt.getHours()).padStart(2, '0');
          const mm = String(dt.getMinutes()).padStart(2, '0');
          return `${y}年${m}月${d}日${hh}:${mm}`;
      }

      function updateGameTime() {
          gameTimeEl.textContent = formatGameTime(gameTime);
      }

      const reputationRanks = [
          { threshold: 0, label: '無名の錬金術師' },
          { threshold: 5, label: '見習い錬金術師' },
          { threshold: 10, label: '町外れの調合士' },
          { threshold: 20, label: '怪しい小屋の錬金術師' },
          { threshold: 35, label: '地元で評判の錬金術師' },
          { threshold: 50, label: '一流錬金術師' },
          { threshold: 70, label: '名高い錬金マスター' },
          { threshold: 100, label: '王国御用達錬金術師' },
          { threshold: 150, label: '伝説の錬金術師' },
          { threshold: 200, label: '錬金術の神髄' }
      ];

      function getReputationLabel(value) {
          let label = reputationRanks[0].label;
          for (const rank of reputationRanks) {
              if (value >= rank.threshold) {
                  label = rank.label;
              } else {
                  break;
              }
          }
          return label;
      }

      function getReputationIndex(value) {
          let index = 0;
          for (let i = 0; i < reputationRanks.length; i++) {
              if (value >= reputationRanks[i].threshold) {
                  index = i;
              } else {
                  break;
              }
          }
          return index;
      }
      
        const itemListEl = document.getElementById('item-list');
        const recipeListEl = document.getElementById('recipe-list');
        const shopEl = document.getElementById('shop');
        const infoPane = document.getElementById('info-pane');
        const chronicleEl = document.getElementById('chronicle');
        let chronicleEntries = [];
        const itemEarnings = {};
        let currentRankIndex = 0;

        function refreshChronicle() {
            chronicleEl.innerHTML = '';
            chronicleEntries.forEach(entry => {
                const div = document.createElement('div');
                div.textContent = `${entry.time} - Lv${entry.level} ${entry.label}`;
                chronicleEl.appendChild(div);
            });
        }

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

            // Include items that have definitions but no recipes
            Object.keys(itemMap).forEach(code => {
                if (!byResult[code]) {
                    byResult[code] = [];
                }
            });
            Object.keys(byResult).sort().forEach(result => {
                const section = document.createElement('div');
                section.className = 'recipe-section';

                const header = document.createElement('h3');
                const def = itemMap[result] || { name: result, code: result };
                const earn = itemEarnings[result] || { money: 0, magic: 0, reputation: 0, count: 0 };
                const earnTxt = ` (${earn.count} made, ${earn.reputation} Rep, ${earn.magic} Mag, $${earn.money})`;
                header.textContent = `${def.name} [${def.code}]${earnTxt}`;
                section.appendChild(header);

                if (byResult[result].length === 0) {
                    const line = document.createElement('div');
                    line.textContent = 'No known recipe';
                    line.className = 'recipe-line';
                    section.appendChild(line);
                } else {
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
                }

                recipeListEl.appendChild(section);
            });
        }

        const recipeBooks = [
            {
                cost: 10,
                recipes: {
                    'AA+EE': 'GG',
                    'BB+FF': 'HH'
                }
            },
            {
                cost: 20,
                recipes: {
                    'GG+HH': 'II',
                    'DD+FF': 'JJ'
                }
            },
            {
                cost: 30,
                recipes: {
                    'MM+NN': 'OO',
                    'II+JJ': 'PP'
                }
            },
            {
                cost: 40,
                recipes: {
                    'OO+PP': 'QQ',
                    'JJ+OO': 'RR'
                }
            },
            {
                cost: 50,
                recipes: {
                    'QQ+PP': 'SS',
                    'QQ+RR': 'TT'
                }
            },
            {
                cost: 60,
                recipes: {
                    'SS+TT': 'UU',
                    'RR+UU': 'VV'
                }
            }
        ];

        function getRecipesTooltip(recipes) {
            return Object.entries(recipes).map(([k, v]) => {
                const [a, b] = k.split('+');
                const aName = itemMap[a]?.name || a;
                const bName = itemMap[b]?.name || b;
                const resultName = itemMap[v]?.name || v;
                return `${aName} [${a}] + ${bName} [${b}] -> ${resultName} [${v}]`;
            }).join('\n');
        }

        let purchasedRecipeBooks = 0;

        const gatherSites = [
            { repRequirement: 5, itemCodes: ['KK', 'LL'], interval: 3000, purchased: false, active: false, timerId: null },
            { repRequirement: 20, itemCodes: ['MM', 'NN'], interval: 4000, purchased: false, active: false, timerId: null },
            { repRequirement: 50, itemCodes: ['OO', 'PP'], interval: 5000, purchased: false, active: false, timerId: null },
            // New gathering sites with a small selection of items each
            { repRequirement: 100, itemCodes: ['QQ', 'RR', 'SS'], interval: 6000, purchased: false, active: false, timerId: null },
            { repRequirement: 150, itemCodes: ['TT', 'UU', 'VV'], interval: 7000, purchased: false, active: false, timerId: null }
        ];

        const SAVE_KEY = 'mergeGameState';
        let cookieUpdatesEnabled = true;

        function saveState() {
            if (!cookieUpdatesEnabled) return;
            const data = {
                scores,
                purchasedRecipeBooks,
                chronicle: chronicleEntries,
                itemEarnings,
                gatherSites: gatherSites.map(site => ({
                    purchased: site.purchased,
                    active: site.active
                }))
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
                if (typeof data.purchasedRecipeBooks === 'number') {
                    purchasedRecipeBooks = Math.min(data.purchasedRecipeBooks, recipeBooks.length);
                    for (let i = 0; i < purchasedRecipeBooks; i++) {
                        Object.entries(recipeBooks[i].recipes).forEach(([k, v]) => { mergeRules[k] = v; });
                    }
                }
                if (Array.isArray(data.chronicle)) {
                    chronicleEntries = data.chronicle;
                }
                if (data.itemEarnings) {
                    Object.entries(data.itemEarnings).forEach(([k, v]) => {
                        itemEarnings[k] = {
                            money: v.money || 0,
                            magic: v.magic || 0,
                            reputation: v.reputation || 0,
                            count: v.count || 0
                        };
                    });
                }
                if (Array.isArray(data.gatherSites)) {
                    data.gatherSites.forEach((siteData, idx) => {
                        const site = gatherSites[idx];
                        if (!site) return;
                        site.purchased = !!siteData.purchased;
                        if (site.purchased && siteData.active) {
                            startGatherSite(idx);
                        }
                    });
                }
            } catch (e) {
                console.error('Failed to load saved state', e);
            }
        }

        function startGatherSite(index) {
            const site = gatherSites[index];
            if (!site || site.timerId) return;
            site.timerId = setInterval(() => {
                spawnItem(randomGatherCode(site));
            }, site.interval);
            site.purchased = true;
            site.active = true;
        }

        function stopGatherSite(index) {
            const site = gatherSites[index];
            if (!site || !site.timerId) return;
            clearInterval(site.timerId);
            site.timerId = null;
            site.active = false;
        }

        function randomGatherCode(site) {
            return site.itemCodes[Math.floor(Math.random() * site.itemCodes.length)];
        }

        function refreshShop() {
            shopEl.innerHTML = '';

            recipeBooks.forEach((book, idx) => {
                const btn = document.createElement('button');
                btn.className = 'shop-button';
                if (idx < purchasedRecipeBooks) {
                    btn.textContent = `Recipe Book ${idx + 1} Purchased`;
                    btn.disabled = true;
                    btn.classList.add('purchased');
                } else {
                    btn.textContent = `Buy Recipe Book ${idx + 1} ($${book.cost})`;
                    btn.title = getRecipesTooltip(book.recipes);
                    btn.disabled = scores.money < book.cost;
                    btn.addEventListener('click', () => {
                        if (scores.money < book.cost) return;
                        scores.money -= book.cost;
                        Object.entries(book.recipes).forEach(([k, v]) => { mergeRules[k] = v; });
                        purchasedRecipeBooks = Math.max(purchasedRecipeBooks, idx + 1);
                        updateScores();
                        refreshRecipeList();
                        refreshShop();
                    });
                }
                shopEl.appendChild(btn);
            });

            gatherSites.forEach((site, idx) => {
                const btn = document.createElement('button');
                btn.className = 'shop-button';
                if (site.purchased) {
                    if (site.active) {
                        btn.textContent = `Gather Site ${idx + 1} Active (click to disable)`;
                        btn.addEventListener('click', () => {
                            stopGatherSite(idx);
                            refreshShop();
                            if (typeof saveState === 'function') saveState();
                        });
                    } else {
                        btn.textContent = `Gather Site ${idx + 1} Inactive (click to enable)`;
                        btn.addEventListener('click', () => {
                            startGatherSite(idx);
                            refreshShop();
                            if (typeof saveState === 'function') saveState();
                        });
                    }
                    btn.disabled = false;
                } else {
                    btn.textContent = `Buy Gather Site ${idx + 1} (requires ${site.repRequirement} Rep)`;
                    btn.disabled = scores.reputation < site.repRequirement;
                    btn.addEventListener('click', () => {
                        if (scores.reputation < site.repRequirement) return;
                        startGatherSite(idx);
                        refreshShop();
                        if (typeof saveState === 'function') saveState();
                    });
                }
                shopEl.appendChild(btn);
            });
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
        'LL': { magic: 2, reputation: 1 },
        'MM': { money: 3, reputation: 2 },
        'NN': { magic: 3, reputation: 2 },
        'OO': { magic: 5, reputation: 3 },
        'PP': { money: 5, reputation: 4 },
        'QQ': { money: 6, reputation: 4 },
        'RR': { magic: 6, reputation: 4 },
        'SS': { money: 7, magic: 3, reputation: 5 },
        'TT': { magic: 7, reputation: 5 },
        'UU': { money: 8, reputation: 6 },
        'VV': { money: 4, magic: 8, reputation: 7 }
    };

    function updateScores() {
        const rankIndex = getReputationIndex(scores.reputation);
        const label = getReputationLabel(scores.reputation);
        if (rankIndex > currentRankIndex) {
            chronicleEntries.push({
                level: rankIndex + 1,
                label,
                time: formatGameTime(gameTime)
            });
            refreshChronicle();
        }
        currentRankIndex = rankIndex;
        scoreEls.reputation.textContent =
            `Reputation: ${scores.reputation} (Lv${rankIndex + 1} ${label})`;
        scoreEls.magic.textContent = `Magic: ${scores.magic}`;
        scoreEls.money.textContent = `Money: ${scores.money}`;
        canvasContainer.style.backgroundImage = `url('background${rankIndex + 1}.png')`;
        if (typeof refreshShop === 'function') refreshShop();
        if (typeof saveState === 'function') saveState();
    }

    function awardForCode(code, countDelta = 0) {
        const reward = endpointRewards[code] || {};
        scores.money += reward.money || 0;
        scores.magic += reward.magic || 0;
        scores.reputation += reward.reputation || 0;
        if (!itemEarnings[code]) {
            itemEarnings[code] = { money: 0, magic: 0, reputation: 0, count: 0 };
        }
        itemEarnings[code].money += reward.money || 0;
        itemEarnings[code].magic += reward.magic || 0;
        itemEarnings[code].reputation += reward.reputation || 0;
        itemEarnings[code].count += countDelta;
        updateScores();
        refreshRecipeList();
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
        'HH+HH': 3,
        'MM+NN': 2,
        'II+JJ': 4,
        'OO+PP': 5,
        'JJ+OO': 4,
        'QQ+PP': 6,
        'QQ+RR': 6,
        'SS+TT': 8,
        'RR+UU': 9
    };

    loadState();
    currentRankIndex = getReputationIndex(scores.reputation);
    refreshChronicle();
    updateScores();
    updateGameTime();

    setInterval(() => {
        gameTime = new Date(gameTime.getTime() + 3600000);
        updateGameTime();
    }, 1000);

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
        if (!itemEarnings[code]) {
            itemEarnings[code] = { money: 0, magic: 0, reputation: 0, count: 0 };
        }
        itemEarnings[code].count += 1;
        refreshRecipeList();
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
                if (endpointRewards[item.code]) {
                    awardForCode(item.code);
                    app.stage.removeChild(item);
                    items.splice(i, 1);
                    refreshItemList();
                    continue;
                } else if (!isTerminalCode(item.code)) {
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
                } else {
                    app.stage.removeChild(item);
                    items.splice(i, 1);
                    refreshItemList();
                    continue;
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
                            awardForCode(resultCode, 1);
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
