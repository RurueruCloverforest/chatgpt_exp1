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
        // PIXI v8 no longer exposes `Color.string2hex`, but the util helper
        // `PIXI.utils.string2hex` is still available to convert a color string
        // like "#ff00ff" into a numeric hex value.
        return PIXI.utils.string2hex(def.color);
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
    }

    function isColliding(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy) < itemRadius * 2;
    }

    function mergeKey(a, b) {
        return [a, b].sort().join('+');
    }

    app.ticker.add(() => {
        for (const item of items) {
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
});
