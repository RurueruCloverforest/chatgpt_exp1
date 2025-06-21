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
Recipes indicate whether the result is a final item. There are now three
possible final results. Final items disappear immediately when created and are
turned into score instead of remaining on the board.
You can also open the **Shop** tab to spend money on a recipe book which adds
extra merge combinations. As your reputation increases, you'll be able to
unlock an additional **Gathering Site** from the shop. Purchasing the site does
not consume reputation, but it will periodically generate new items that cannot
be created through merging. Game progress such as your resources and shop
purchases is saved to a cookie so you can continue later.

The background image of the game area changes depending on your reputation
rank. Place images named `background1.png`, `background2.png`, ... alongside the
game files to customize the look for each rank.

## How to run

Simply open `index.html` in a modern web browser. PixiJS is loaded from a CDN so no build step is required.
