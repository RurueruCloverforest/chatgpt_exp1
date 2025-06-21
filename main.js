window.addEventListener('DOMContentLoaded', async () => {
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

    function colorForLevel(level) {
        const colors = [0xff5555, 0x55ff55, 0x5555ff, 0xffff55, 0xff55ff, 0x55ffff];
        return colors[(level - 1) % colors.length];
    }

    function spawnItem(level = 1, x = app.renderer.width / 2, y = app.renderer.height / 2) {
        const g = new PIXI.Graphics();
        g.beginFill(colorForLevel(level));
        g.drawCircle(0, 0, itemRadius);
        g.endFill();
        g.x = x;
        g.y = y;
        g.vx = (Math.random() - 0.5) * itemSpeed * 2;
        g.vy = (Math.random() - 0.5) * itemSpeed * 2;
        g.level = level;
        app.stage.addChild(g);
        items.push(g);
    }

    function isColliding(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy) < itemRadius * 2;
    }

    app.ticker.add(() => {
        for (const item of items) {
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
                    if (a.level === b.level) {
                        const newLevel = a.level + 1;
                        const newX = (a.x + b.x) / 2;
                        const newY = (a.y + b.y) / 2;
                        app.stage.removeChild(a);
                        app.stage.removeChild(b);
                        items.splice(j, 1);
                        items.splice(i, 1);
                        spawnItem(newLevel, newX, newY);
                        return; // restart detection next tick
                    } else {
                        // simple velocity swap for different levels
                        const tvx = a.vx; const tvy = a.vy;
                        a.vx = b.vx; a.vy = b.vy;
                        b.vx = tvx; b.vy = tvy;
                    }
                }
            }
        }
    });

    setInterval(() => {
        spawnItem();
    }, 1000);

    spawnItem();
});
