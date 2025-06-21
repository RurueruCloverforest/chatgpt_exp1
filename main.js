window.addEventListener('DOMContentLoaded', async () => {
    const [itemRes, textRes] = await Promise.all([
        fetch('items.json'),
        fetch('text.json')
    ]);
    const itemDefinitions = await itemRes.json();
    const texts = await textRes.json();
    let lang = localStorage.getItem('lang') || 'ja';

    function t(id, params = {}) {
        let str = texts[id]?.[lang] || texts[id]?.ja || texts[id]?.en || id;
        for (const [k, v] of Object.entries(params)) {
            str = str.replace(`{${k}}`, v);
        }
        return str;
    }
    const itemMap = {};
    for (const def of itemDefinitions) {
        itemMap[def.code] = def;
    }

    function getItemName(code) {
        const def = itemMap[code];
        if (!def) return code;
        if (typeof def.name === 'object') {
            return def.name[lang] || def.name.en || def.name.ja || code;
        }
        return def.name || code;
    }

    const canvasContainer = document.getElementById('canvas-container');
    const app = new PIXI.Application();
    await app.init({
        width: canvasContainer.clientWidth,
        height: canvasContainer.clientHeight,
        // Make the canvas fully transparent so only the background image shows
        backgroundColor: 0x000000,
        backgroundAlpha: 0,
    });

    canvasContainer.appendChild(app.canvas);

      const scoreEls = {
          reputation: document.getElementById('score-reputation'),
          magic: document.getElementById('score-magic'),
          money: document.getElementById('score-money'),
          robe: document.getElementById('score-extra1'),
      };
      const scores = { reputation: 0, magic: 0, money: 0 };

      function refreshStaticText() {
          document.getElementById('text-title').textContent = t('gameTitle');
          document.getElementById('text-header').textContent = t('gameTitle');
          document.getElementById('text-desc').textContent = t('gameDescription');
          document.getElementById('tab-items').textContent = t('tabItems');
          document.getElementById('tab-recipes').textContent = t('tabRecipes');
          document.getElementById('tab-shop').textContent = t('tabShop');
          document.getElementById('tab-rewards').textContent = t('tabRewards');
          document.getElementById('tab-character').textContent = t('tabCharacter');
          document.getElementById('tab-chronicle').textContent = t('tabChronicle');
          document.getElementById('tab-system').textContent = t('tabSystem');
          document.getElementById('system-warning').textContent = t('systemWarning');
          document.getElementById('clear-progress-btn').textContent = t('clearProgress');
          document.getElementById('lang-label').textContent = t('languageLabel') + ':';
      }

      const langSelect = document.getElementById('lang-select');
      if (langSelect) {
          langSelect.value = lang;
          langSelect.addEventListener('change', () => {
              lang = langSelect.value;
              localStorage.setItem('lang', lang);
            refreshStaticText();
            updateScores();
            updateGameTime();
            refreshRecipeList();
            refreshShop();
            refreshRewards();
        });
      }

    refreshStaticText();

      const gameTimeEl = document.getElementById('game-time');
      const gameStartTime = new Date(1000, 3, 1, 9, 0, 0);
      let gameTime = new Date(gameStartTime.getTime());

      function formatGameTime(dt) {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const d = String(dt.getDate()).padStart(2, '0');
          const hh = String(dt.getHours()).padStart(2, '0');
          const mm = String(dt.getMinutes()).padStart(2, '0');
          if (lang === 'ja') {
              return `${y}年${m}月${d}日${hh}:${mm}`;
          } else {
              return `${y}/${m}/${d} ${hh}:${mm}`;
          }
      }

      function updateGameTime() {
          gameTimeEl.textContent = formatGameTime(gameTime);
      }

      updateGameTime();

        const reputationRanks = [
            { threshold: 0, label: () => t('rank0') },
            { threshold: 15, label: () => t('rank1') },
            { threshold: 30, label: () => t('rank2') },
            { threshold: 60, label: () => t('rank3') },
            { threshold: 100, label: () => t('rank4') },
            { threshold: 150, label: () => t('rank5') },
            { threshold: 220, label: () => t('rank6') },
            { threshold: 320, label: () => t('rank7') },
            { threshold: 450, label: () => t('rank8') },
            { threshold: 600, label: () => t('rank9') }
        ];

      function getReputationLabel(value) {
          let label = reputationRanks[0].label();
          for (const rank of reputationRanks) {
              if (value >= rank.threshold) {
                  label = rank.label();
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
        const rewardsEl = document.getElementById('rewards');
        const infoPane = document.getElementById('info-pane');
        const chronicleEl = document.getElementById('chronicle');
        let chronicleEntries = [];
        const itemEarnings = {};
        const rewardProgress = {};
        let currentRankIndex = 0;

        const baseRewardThresholds = [1, 5, 10, 20];

        function getRewardThreshold(index) {
            if (index < baseRewardThresholds.length) return baseRewardThresholds[index];
            return baseRewardThresholds[baseRewardThresholds.length - 1] * Math.pow(2, index - baseRewardThresholds.length + 1);
        }

        function refreshChronicle() {
            chronicleEl.innerHTML = '';
            chronicleEntries.forEach(entry => {
                const div = document.createElement('div');
                div.textContent = `${entry.time} - Lv${entry.level} ${entry.label}`;
                chronicleEl.appendChild(div);
            });
        }

        function refreshRewards() {
            rewardsEl.innerHTML = '';
            Object.keys(itemMap).forEach(code => {
                const def = itemMap[code];
                const count = itemEarnings[code]?.count || 0;
                const progress = rewardProgress[code] || 0;
                const threshold = getRewardThreshold(progress);
                const reward = endpointRewards[code] || {};
                const rewardParts = [];
                if (reward.money) rewardParts.push(`$${reward.money}`);
                if (reward.magic) rewardParts.push(`☆${reward.magic}`);
                if (reward.reputation) rewardParts.push(`ℛ${reward.reputation}`);
                const div = document.createElement('div');
                div.className = 'reward-item';
                div.textContent = `${getItemName(code)} [${code}] ${count}/${threshold} (${t('reward')}: ${rewardParts.join(', ')})`;
                rewardsEl.appendChild(div);
            });
        }

        function checkRewards(code) {
            const progress = rewardProgress[code] || 0;
            const threshold = getRewardThreshold(progress);
            if ((itemEarnings[code]?.count || 0) >= threshold) {
                rewardProgress[code] = progress + 1;
                awardForCode(code);
                refreshRewards();
                if (typeof saveState === 'function') saveState();
            }
        }

        function refreshItemList() {
            itemListEl.innerHTML = '';
            for (const item of items) {
                const div = document.createElement('div');
                const name = getItemName(item.code);
                const namePart = name ? ` - ${name}` : '';
                div.textContent = `#${item.id} [${item.code}]${namePart}`;
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
                const def = itemMap[result] || { name: { en: result, ja: result }, code: result };
                const earn = itemEarnings[result] || { money: 0, magic: 0, reputation: 0, count: 0 };
                const earnTxt = ` (${earn.count} made, ℛ${earn.reputation}, ☆${earn.magic}, $${earn.money})`;
                header.textContent = `${getItemName(result)} [${def.code}]${earnTxt}`;
                section.appendChild(header);

                if (byResult[result].length === 0) {
                    const line = document.createElement('div');
                    line.textContent = t('noRecipe');
                    line.className = 'recipe-line';
                    section.appendChild(line);
                } else {
                    byResult[result].forEach(({ a, b, key }) => {
                        const line = document.createElement('div');
                        const cost = mergeCosts[key] || 0;
                        const reward = endpointRewards[result] || {};
                        const rewardParts = [];
                        if (reward.money) rewardParts.push(`$${reward.money}`);
                        if (reward.magic) rewardParts.push(`☆${reward.magic}`);
                        if (reward.reputation) rewardParts.push(`ℛ${reward.reputation}`);
                        const costTxt = cost ? ` ${t('cost')}: ☆${cost}` : '';
                        const finalFlag = isTerminalCode(result) ? ` (${t('finalFlag')})` : '';
                        const aName = getItemName(a);
                        const bName = getItemName(b);
                        let txt = `${aName} [${a}] + ${bName} [${b}] -> ${getItemName(result)}${finalFlag}`;
                        if (rewardParts.length || cost) {
                            txt += ` (${t('reward')}: ${rewardParts.join(', ')}${cost ? ';' + costTxt : ''})`;
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
                name: { en: 'Twinkle Primer', ja: 'きらきら入門書' },
                cost: 15,
                recipes: {
                    'AA+EE': 'GG',
                    'BB+FF': 'HH'
                }
            },
            {
                name: { en: 'Fluffy Formulas', ja: 'ふわふわ配合書' },
                cost: 35,
                recipes: {
                    'GG+HH': 'II',
                    'DD+FF': 'JJ'
                }
            },
            {
                name: { en: 'Whimsy Mixes', ja: 'わくわく調合書' },
                cost: 60,
                recipes: {
                    'MM+NN': 'OO',
                    'II+JJ': 'PP'
                }
            },
            {
                name: { en: 'Sparkle Secrets', ja: 'きらめき秘術書' },
                cost: 90,
                recipes: {
                    'OO+PP': 'QQ',
                    'JJ+OO': 'RR'
                }
            },
            {
                name: { en: 'Charming Concoctions', ja: 'かわいい錬成録' },
                cost: 125,
                recipes: {
                    'QQ+PP': 'SS',
                    'QQ+RR': 'TT'
                }
            },
            {
                name: { en: 'Dream Alchemy', ja: 'ゆめみる錬金書' },
                cost: 170,
                recipes: {
                    'SS+TT': 'UU',
                    'RR+UU': 'VV'
                }
            }
        ];

        function getRecipesTooltip(recipes) {
            return Object.entries(recipes).map(([k, v]) => {
                const [a, b] = k.split('+');
                const aName = getItemName(a);
                const bName = getItemName(b);
                const resultName = getItemName(v);
                return `${aName} [${a}] + ${bName} [${b}] -> ${resultName} [${v}]`;
            }).join('\n');
        }

        let purchasedRecipeBooks = 0;

        const magicRobes = [
            {
                name: { en: 'Apprentice Robe', ja: '見習いのローブ' },
                cost: 30,
                effect: 1,
                purchased: false
            },
            {
                name: { en: 'Adept Robe', ja: '熟練者のローブ' },
                cost: 60,
                effect: 2,
                purchased: false
            },
            {
                name: { en: 'Archmage Robe', ja: '大魔導士のローブ' },
                cost: 100,
                effect: 3,
                purchased: false
            }
        ];
        function getRobeName(robe) {
            if (typeof robe.name === 'object') {
                return robe.name[lang] || robe.name.en || robe.name.ja || '';
            }
            return robe.name;
        }

        function getBookName(book) {
            if (typeof book.name === 'object') {
                return book.name[lang] || book.name.en || book.name.ja || '';
            }
            return book.name;
        }

        function getSiteName(site) {
            if (typeof site.name === 'object') {
                return site.name[lang] || site.name.en || site.name.ja || '';
            }
            return site.name;
        }
        let equippedRobe = -1;
        let robeTimerId = null;

        const gatherSites = [
            { name: { en: 'Pixie Meadow', ja: '妖精の草原' }, repRequirement: 15, itemCodes: ['KK', 'LL'], interval: 3000, purchased: false, active: false, timerId: null },
            { name: { en: 'Crystal Hollow', ja: 'クリスタル洞くつ' }, repRequirement: 60, itemCodes: ['MM', 'NN'], interval: 4000, purchased: false, active: false, timerId: null },
            { name: { en: 'Fluffy Forge', ja: 'ふわふわ鍛冶場' }, repRequirement: 150, itemCodes: ['OO', 'PP'], interval: 5000, purchased: false, active: false, timerId: null },
            // New gathering sites with a small selection of items each
            { name: { en: 'Relic Outpost', ja: 'レリック前哨地' }, repRequirement: 320, itemCodes: ['QQ', 'RR', 'SS'], interval: 6000, purchased: false, active: false, timerId: null },
            { name: { en: 'Starlit Atelier', ja: '星あかりアトリエ' }, repRequirement: 450, itemCodes: ['TT', 'UU', 'VV'], interval: 7000, purchased: false, active: false, timerId: null }
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
                rewards: rewardProgress,
                gatherSites: gatherSites.map(site => ({
                    purchased: site.purchased,
                    active: site.active
                })),
                magicRobes: magicRobes.map(r => ({ purchased: r.purchased })),
                equippedRobe
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
                if (data.rewards) {
                    Object.entries(data.rewards).forEach(([k, v]) => {
                        rewardProgress[k] = v;
                    });
                }
                if (Array.isArray(data.magicRobes)) {
                    data.magicRobes.forEach((rData, idx) => {
                        if (magicRobes[idx]) {
                            magicRobes[idx].purchased = !!rData.purchased;
                        }
                    });
                }
                if (typeof data.equippedRobe === 'number' && data.equippedRobe >= 0) {
                    equipRobe(data.equippedRobe);
                } else {
                    equipRobe(-1);
                }
                refreshRewards();
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

        function equipRobe(index) {
            if (robeTimerId) {
                clearInterval(robeTimerId);
                robeTimerId = null;
            }
            equippedRobe = index;
            if (index >= 0) {
                robeTimerId = setInterval(() => {
                    scores.magic += magicRobes[index].effect;
                    updateScores();
                }, 10000);
            }
            updateScores();
        }

        function randomGatherCode(site) {
            return site.itemCodes[Math.floor(Math.random() * site.itemCodes.length)];
        }

       function refreshShop() {
           shopEl.innerHTML = '';

            const addTitle = key => {
                const title = document.createElement('div');
                title.className = 'shop-section-title';
                title.textContent = t(key);
                shopEl.appendChild(title);
            };

            addTitle('shopCategoryTomes');

            recipeBooks.forEach((book, idx) => {
                const btn = document.createElement('button');
                btn.className = 'shop-button';
                if (idx < purchasedRecipeBooks) {
                    btn.textContent = t('recipeBookPurchased', { name: getBookName(book) });
                    btn.disabled = true;
                    btn.classList.add('purchased');
                } else {
                    btn.textContent = t('recipeBookBuy', { name: getBookName(book), cost: book.cost });
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

            addTitle('shopCategoryCamps');

            gatherSites.forEach((site, idx) => {
                const btn = document.createElement('button');
                btn.className = 'shop-button';
                if (site.purchased) {
                    if (site.active) {
                        btn.textContent = t('gatherActive', { name: getSiteName(site) });
                        btn.addEventListener('click', () => {
                            stopGatherSite(idx);
                            refreshShop();
                            if (typeof saveState === 'function') saveState();
                        });
                    } else {
                        btn.textContent = t('gatherInactive', { name: getSiteName(site) });
                        btn.addEventListener('click', () => {
                            startGatherSite(idx);
                            refreshShop();
                            if (typeof saveState === 'function') saveState();
                        });
                    }
                    btn.disabled = false;
                } else {
                    btn.textContent = t('gatherBuy', { name: getSiteName(site), rep: site.repRequirement });
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

            addTitle('shopCategoryRobes');

            magicRobes.forEach((robe, idx) => {
                const btn = document.createElement('button');
                btn.className = 'shop-button';
                const robeName = getRobeName(robe);
                if (!robe.purchased) {
                    btn.textContent = t('buyRobe', { name: robeName, cost: robe.cost });
                    btn.disabled = scores.money < robe.cost;
                    btn.addEventListener('click', () => {
                        if (scores.money < robe.cost) return;
                        scores.money -= robe.cost;
                        robe.purchased = true;
                        equipRobe(idx);
                        refreshShop();
                    });
                } else {
                    if (equippedRobe === idx) {
                        btn.textContent = t('robeEquipped', { name: robeName });
                        btn.addEventListener('click', () => {
                            equipRobe(-1);
                            refreshShop();
                        });
                    } else {
                        btn.textContent = t('robeEquip', { name: robeName, effect: robe.effect });
                        btn.addEventListener('click', () => {
                            equipRobe(idx);
                            refreshShop();
                        });
                    }
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
        'FF': { money: 6, magic: 4, reputation: 3 },
        'GG': { reputation: 3, money: 1 },
        'HH': { magic: 3, reputation: 1 },
        'II': { magic: 4, reputation: 2 },
        'JJ': { money: 4, reputation: 2 },
        'KK': { money: 4, reputation: 2 },
        'LL': { magic: 4, reputation: 2 },
        'MM': { money: 3, reputation: 2 },
        'NN': { magic: 3, reputation: 2 },
        'OO': { magic: 5, reputation: 3 },
        'PP': { money: 5, reputation: 4 },
        'QQ': { money: 6, reputation: 4 },
        'RR': { magic: 6, reputation: 4 },
        'SS': { money: 7, magic: 3, reputation: 5 },
        'TT': { magic: 7, reputation: 5 },
        'UU': { money: 8, reputation: 6 },
        'VV': { money: 8, magic: 12, reputation: 12 }
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
        let nextText = '';
        const nextRank = reputationRanks[rankIndex + 1];
        if (nextRank) {
            const toNext = nextRank.threshold - scores.reputation;
            nextText = t('nextPrefix', { value: toNext });
        }
        scoreEls.reputation.textContent = t('scoreReputation', {
            value: scores.reputation,
            level: rankIndex + 1,
            label,
            next: nextText
        });
        scoreEls.magic.textContent = t('scoreMagic', { value: scores.magic });
        scoreEls.money.textContent = t('scoreMoney', { value: scores.money });
        if (equippedRobe >= 0) {
            const r = magicRobes[equippedRobe];
            scoreEls.robe.textContent = t('scoreRobe', { name: getRobeName(r), effect: r.effect });
        } else {
            scoreEls.robe.textContent = t('scoreRobeNone');
        }
        canvasContainer.style.backgroundImage = `url('background${rankIndex + 1}.png')`;
        if (typeof refreshShop === 'function') refreshShop();
        if (typeof saveState === 'function') saveState();
    }

    function awardForCode(code, countDelta = 0, x = endpointX, y = endpointY) {
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
        showRewardPopup(code, x, y);
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
        'GG+GG': 3,
        'HH+HH': 4,
        'MM+NN': 3,
        'II+JJ': 6,
        'OO+PP': 8,
        'JJ+OO': 6,
        'QQ+PP': 10,
        'QQ+RR': 10,
        'SS+TT': 12,
        'RR+UU': 15
    };

    loadState();
    currentRankIndex = getReputationIndex(scores.reputation);
    refreshChronicle();
    updateScores();
    refreshRewards();
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

    function brightenColor(color) {
        // Increase brightness much more so the popup text is closer to white
        const r = Math.min(255, (color >> 16) + 120);
        const g = Math.min(255, ((color >> 8) & 0xff) + 120);
        const b = Math.min(255, (color & 0xff) + 120);
        return (r << 16) | (g << 8) | b;
    }

    const floatingTexts = [];
    // Longer distance so the text remains visible for more time
    const floatDistance = Math.min(app.renderer.width, app.renderer.height) / 2;

    function createFloatingText(text, x, y, color) {
        const style = new PIXI.TextStyle({ fontSize: 14, fill: color });
        const t = new PIXI.Text(text, style);
        t.anchor.set(0.5);
        t.x = x;
        t.y = y;
        const angle = Math.random() * Math.PI * 2;
        // Slow down the floating speed for easier readability
        const speed = 1;
        floatingTexts.push({ t, startX: x, startY: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
        app.stage.addChild(t);
    }

    function showNumbersPopup(reward, x, y, color) {
        const parts = [];
        if (reward.money) parts.push(`$${reward.money}`);
        if (reward.magic) parts.push(`☆${reward.magic}`);
        if (reward.reputation) parts.push(`ℛ${reward.reputation}`);
        if (parts.length === 0) return;
        createFloatingText(parts.join(' '), x, y, color);
    }

    function showRewardPopup(code, x, y) {
        const reward = endpointRewards[code] || {};
        const color = brightenColor(colorForCode(code));
        showNumbersPopup(reward, x, y, color);
    }

    function showMergeReward(code, x, y) {
        const reward = { money: 1, magic: 1, reputation: 1 };
        const color = brightenColor(colorForCode(code));
        showNumbersPopup(reward, x, y, color);
    }

    function spawnItem(code = 'AA', x = app.renderer.width / 2, y = app.renderer.height / 2) {
        const def = itemMap[code];
        if (!itemEarnings[code]) {
            itemEarnings[code] = { money: 0, magic: 0, reputation: 0, count: 0 };
        }
        itemEarnings[code].count += 1;
        refreshRecipeList();
        checkRewards(code);
        refreshRewards();
        const container = new PIXI.Container();

        const g = new PIXI.Graphics();
        g.beginFill(colorForCode(code));
        g.drawCircle(0, 0, itemRadius);
        g.endFill();
        g.x = 0;
        g.y = 0;

        const spritePath = `images/item${def.id}.png`;
        const sprite = PIXI.Sprite.from(spritePath);
        sprite.anchor.set(0.5);
        sprite.width = sprite.height = itemRadius * 2;
        sprite.mask = g;
        // Log a helpful error if the image fails to load
        sprite.texture.baseTexture.on('error', (err) => {
            console.error(`Failed to load ${spritePath}:`, err);
        });

        const label = new PIXI.Text(def.code, { fontSize: 12, fill: 0xffffff });
        label.anchor.set(0.5);
        // Hide the fallback code label once the sprite loads successfully
        if (sprite.texture.baseTexture.valid) {
            label.visible = false;
        } else {
            sprite.texture.baseTexture.on('loaded', () => {
                label.visible = false;
            });
        }

        container.addChild(g);
        container.addChild(sprite);
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
                    awardForCode(item.code, 0, item.x, item.y);
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
                            awardForCode(resultCode, 1, newX, newY);
                            checkRewards(resultCode);
                            refreshItemList();
                            refreshRewards();
                        } else {
                            spawnItem(resultCode, newX, newY);
                        }

                        showMergeReward(resultCode, newX, newY);
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

        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.t.x += ft.vx;
            ft.t.y += ft.vy;
            const dx = ft.t.x - ft.startX;
            const dy = ft.t.y - ft.startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            ft.t.alpha = 1 - dist / floatDistance;
            if (dist >= floatDistance) {
                app.stage.removeChild(ft.t);
                floatingTexts.splice(i, 1);
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
      refreshRewards();
      infoPane.classList.toggle('show-video', document.querySelector('.tab-button.active').dataset.tab === 'character');
  });
