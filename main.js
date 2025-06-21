window.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('items.json');
    const itemDefinitions = await response.json();
    const itemMap = {};
    for (const def of itemDefinitions) {
        itemMap[def.code] = def;
    }

    const app = new PIXI.Application();
    await app.init({
        width: window.innerWidth,
        height: window.innerHeight * 0.9,
        backgroundColor: 0x1099bb,
    });

    document.getElementById('canvas-container').appendChild(app.canvas);

      const scoreEls = {
          reputation: document.getElementById('score-reputation'),
          magic: document.getElementById('score-magic'),
          money: document.getElementById('score-money'),
      };
      const scores = { reputation: 0, magic: 0, money: 0 };
      
        const itemListEl = document.getElementById('item-list');
        const recipeListEl = document.getElementById('recipe-list');

        function refreshItemList() {
            itemListEl.innerHTML = '';
            for (const item of items) {
                const div = document.createElement('div');
                div.textContent = `#${item.id} ${item.code}`;
                itemListEl.appendChild(div);
            }
        }

        function refreshRecipeList() {
            recipeListEl.innerHTML = '';
            for (const [key, result] of Object.entries(mergeRules)) {
                const [a, b] = key.split('+');
                const div = document.createElement('div');
                div.textContent = `${a} + ${b} -> ${result}`;
                recipeListEl.appendChild(div);
            }
        }

      document.querySelectorAll('.tab-button').forEach(btn => {
          btn.addEventListener('click', () => {
              document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
              document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
              btn.classList.add('active');
              document.getElementById(btn.dataset.tab).classList.add('active');
          });
      });

    const endpointRadius = 30;
    const endpointX = app.renderer.width - endpointRadius - 20;
    const endpointY = app.renderer.height - endpointRadius - 20;
    const endpointRewards = {
        'AA': { money: 1 },
        'BB': { magic: 1 },
        'CC': { reputation: 1 },
        'DD': { money: 2, magic: 1 },
        'EE': { reputation: 2, magic: 2 }
    };

    function updateScores() {
        scoreEls.reputation.textContent = `Reputation: ${scores.reputation}`;
        scoreEls.magic.textContent = `Magic: ${scores.magic}`;
        scoreEls.money.textContent = `Money: ${scores.money}`;
    }
    updateScores();

    const endpoint = new PIXI.Graphics();
    endpoint.beginFill(0x444444);
    endpoint.drawCircle(0, 0, endpointRadius);
    endpoint.endFill();
    const endpointLabel = new PIXI.Text('END', { fontSize: 12, fill: 0xffffff });
    endpointLabel.anchor.set(0.5);
    endpoint.addChild(endpointLabel);
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
        'DD+DD': 'EE'
    };

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
                const reward = endpointRewards[item.code] || {};
                scores.money += reward.money || 0;
                scores.magic += reward.magic || 0;
                scores.reputation += reward.reputation || 0;
                updateScores();
                app.stage.removeChild(item);
                items.splice(i, 1);
                refreshItemList();
                continue;
            }
        }

        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const a = items[i];
                const b = items[j];
                if (isColliding(a, b)) {
                    const key = mergeKey(a.code, b.code);
                    const resultCode = mergeRules[key];
                    if (resultCode) {
                        const newX = (a.x + b.x) / 2;
                        const newY = (a.y + b.y) / 2;
                        app.stage.removeChild(a);
                        app.stage.removeChild(b);
                        items.splice(j, 1);
                        items.splice(i, 1);
                        spawnItem(resultCode, newX, newY);
                        scores.reputation += 1;
                        scores.magic += 1;
                        scores.money += 1;
                        updateScores();
                        return; // restart detection next tick
                    } else {
                        // simple velocity swap if no merge rule
                        const tvx = a.vx; const tvy = a.vy;
                        a.vx = b.vx; a.vy = b.vy;
                        b.vx = tvx; b.vy = tvy;
                    }
                }
            }
        }
    });

    function randomBaseCode() {
        const bases = ['AA', 'BB'];
        return bases[Math.floor(Math.random() * bases.length)];
    }

      setInterval(() => {
          spawnItem(randomBaseCode());
      }, 1000);

      spawnItem(randomBaseCode());
      refreshRecipeList();
  });
