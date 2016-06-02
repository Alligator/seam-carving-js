##Install

OSX requires

    brew install pkg-config cairo libpng jpeg giflib
    xcode-select --install # el capitain only

Ubuntu

    sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++

Everyone

    npm install

##Test

    npm run test

##Run demo

    npm install -g local-web-server
    ws # navigate to http://localhost:8000

##Optimizations

- Iterate arrays in a CPU cache efficient way
- Keep track of smallest on top row
- Have three matrices, one for minx, one for vminsum and one for energies so that we can use typed arrays
- Could convert picture rgba array to [`Uint32Array` rgb number array](https://hacks.mozilla.org/2011/12/faster-canvas-pixel-manipulation-with-typed-arrays/) to save space
- Do logical deletes on the energy matrix. This way the cost of deletion goes way down, with the cost of finding the neighbor when recalculating going up some. Would have to keep picture array as an array of `Uint8ClampedArray`s.
- Potentially could add the pixels which we need to recalculate the energy for to a queue of nodes and relax there edges to adjacent pixels. If we do not find a smaller vminsum for any pixel on the queue we do not need to iterate its descendants.
- Only recalculate energy of pixels right beside the removed seam. That is, only for those that removing the seam could change the energy. The cumulative sum unfortunately does have to be recalculated for almost every pixel.
- There might be a (slightly) better way to remove the seam, with less conversion between coordinates.

##Todo
- Test remove vertical seam
- Draw energy
