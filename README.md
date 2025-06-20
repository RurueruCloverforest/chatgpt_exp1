# PixiJS Merge Game

This project showcases a small merge game built with PixiJS. Circles are created
in the center of the screen and move in random directions. When two circles of
the same level collide, they combine into a higher level circle. Hold the mouse
button and move around to use the mixing tool, which repels nearby circles.
Several additional item types and merge results have been introduced so there is
more variety while playing. Some advanced recipes now require spending Magic to
complete the merge. If you don't have enough Magic, those merges will fail.
Drag a finished item to the dark circle in the bottom-right corner to convert it
into score. Items that can still be merged will simply bounce off of this zone.
Recipes indicate whether the result is a final item. There are now several
possible final results. Final items disappear immediately when created and are
turned into score instead of remaining on the board.
You can also open the **Shop** tab to buy recipe books which unlock extra merge
combinations. All recipe books are listed vertically in the shop. Once
purchased, a book's button is greyed out and disabled. Multiple books can be
purchased over time, each introducing new recipes that lead to higher tier
items. As your reputation increases you can purchase up to five **Gathering
Sites**. These sites periodically generate unique items and can be toggled on or
off. Game progress such as your resources and shop purchases is saved to a
cookie so you can continue later. A new **Chronicle** tab records the time
whenever your reputation rank increases.

The background image of the game area changes depending on your reputation
rank. Place images named `background1.png`, `background2.png`, ... alongside the
game files to customize the look for each rank.

You can also customize the icons shown on moving items in the main area.
This repository does not include any item images. If you want icons instead of
colored circles, place your own square images named `item1.png`, `item2.png`,
and so on inside an `images` folder next to the game files. Each number matches
the `id` field of the corresponding item in `items.json`. When an image is
available, the item code label will automatically be hidden so only your icon is
visible.

If an icon doesn't load despite being reachable in your browser, open the
included `image-test.html` file. Add a query parameter like
`?path=images/item3.png` to have PixiJS attempt to load that image and report the
result in the console. This helps verify whether PixiJS can access the image at
all.

If needed, you can change how long the game waits before warning about a
missing icon. Adjust the `imageLoadWarningDelay` constant near the item setup in
`main.js` to set a new timeout in milliseconds.

## How to run

Because the game loads `items.json` via `fetch`, you need to run it from an
HTTP server. Opening the file directly with the `file://` scheme will cause the
request for `items.json` to fail on most browsers.

You can quickly start a local server from this directory with for example:

```bash
npx serve
```

or, if Python is installed:

```bash
python3 -m http.server
```

Then navigate to the shown address (e.g. `http://localhost:3000`) and open
`index.html` there. PixiJS is loaded from a CDN so no build step is required.
