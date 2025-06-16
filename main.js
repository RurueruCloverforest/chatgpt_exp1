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
});
