window.addEventListener('DOMContentLoaded', async () => {
    // Create PixiJS application
    const app = new PIXI.Application();
    await app.init({
        width: window.innerWidth,
        height: window.innerHeight * 0.9,
        backgroundColor: 0x1099bb,
    });

    document.getElementById('canvas-container').appendChild(app.canvas);

    // Draw a rectangle
    const rectangle = new PIXI.Graphics();
    rectangle.beginFill(0xde3249);
    rectangle.drawRect(0, 0, 100, 100);
    rectangle.endFill();

    rectangle.x = app.renderer.width / 2 - 50;
    rectangle.y = app.renderer.height / 2 - 50;

    app.stage.addChild(rectangle);

    // Load sprite sheet and create an animated sprite
    const spritesheet = await PIXI.Assets.load('https://pixijs.io/examples/examples/assets/spritesheet/fighter.json');

    const frames = [];
    for (let i = 0; i < 30; i++) {
        const frameNumber = i.toString().padStart(4, '0');
        frames.push(PIXI.Texture.from(`rollSequence${frameNumber}.png`));
    }

    const anim = new PIXI.AnimatedSprite(frames);
    anim.anchor.set(0.5);
    anim.x = app.renderer.width / 2;
    anim.y = app.renderer.height / 2;
    anim.animationSpeed = 0.5;
    anim.play();

    app.stage.addChild(anim);
});
