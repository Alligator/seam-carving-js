(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

const RED = 0;
const GREEN = 1;
const BLUE = 2;
const BORDER_ENERGY = 1000;

/** Seam carver removes low energy seams in an image from HTML5 canvas. */
class SeamCarver {

    /**
     *
     * Init seam carver
     *
     * @param {HMLT5 canvas} canvas canvas with image on it.
     *
     */
    constructor(canvas) {
        this.width = canvas.width;
        this.height = canvas.height;
        this.context = canvas.getContext("2d");
        console.log('got context');
        this.imageData = this.context.getImageData(0, 0, this.width, this.height);
        this.picture = this.imageData.data;
        console.log('got rgb of picture');

        // Simple implementation of energy matrix as array of arrays.
        // Because we need to remove items, when removing the seam,
        // maybe some sort of linked structure is more efficient.
        this.energy_matrix = new Array(this.width);
        for (var i = 0; i < this.width; i++) {
            this.energy_matrix[i] = new Array(this.height);
        }

        console.log('init energy matrix');

        this.createEnergyMatrix();

        console.log('created energy matrix');
    }

    /**
     * Converts pixel to index.
     *
     * @param {number} x The x val
     * @param {number} y The y val
     * @return {number} Index of 1D array
     *
     */
    pixelToIndex(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw new java.lang.IndexOutOfBoundsException();
        }
        // * 4 for rgba
        return ((y * this.width) + x) * 4;
    }

    indexToX(index) {
        return index % this.width;
    }

    indexToY(index) {
        return index / this.width;
    }


    rgbToNum(red, green, blue) {
        var rgb = red;
        rgb = (rgb << 8) + green;
        rgb = (rgb << 8) + blue;
        return rgb;
    }

    numToRgb(num) {
        var red = (num >> 16) & 0xFF;
        var green = (num >> 8) & 0xFF;
        var blue = num & 0xFF;
        return [red, green, blue];
    }

    isBorderPixel(x, y) {
        return (x <= 0 || y <= 0 || x >= this.width-1 || y >= this.height-1);
    }

    pixelInRange(x, y) {
        return (x >= 0 && y >= 0 && x <= this.width-1 && y <= this.height-1);
    }

    /**
     * Energy for single pixel.
     *
     * @param {number} x The x val.
     * @param {number} y The y val.
     * @return {number} The energy val.
     */
    energy(x, y) {
        if (this.isBorderPixel(x, y)) {
            return BORDER_ENERGY;
        }

        var pos = this.pixelToIndex(x - 1, y);
        var xant  = Array.prototype.slice.call(this.picture, pos, pos + 3);
        var pos = this.pixelToIndex(x + 1, y);
        var xpost = Array.prototype.slice.call(this.picture, pos, pos + 3);
        var pos = this.pixelToIndex(x, y - 1);
        var yant  = Array.prototype.slice.call(this.picture, pos, pos + 3);
        var pos = this.pixelToIndex(x, y + 1);
        var ypost = Array.prototype.slice.call(this.picture, pos, pos + 3);

        var score = Math.sqrt(
            (xpost[RED] - xant[RED])*(xpost[RED] - xant[RED]) +
            (xpost[GREEN] - xant[GREEN])*(xpost[GREEN] - xant[GREEN]) +
            (xpost[BLUE] - xant[BLUE])*(xpost[BLUE] - xant[BLUE]) +
            (ypost[RED] - yant[RED])*(ypost[RED] - yant[RED]) +
            (ypost[GREEN] - yant[GREEN])*(ypost[GREEN] - yant[GREEN]) +
            (ypost[BLUE] - yant[BLUE])*(ypost[BLUE] - yant[BLUE])
        );
        return score;
    }

    /**
     * Calculate energy_matrix information for pixel x,y.
     * Assumes x and y in range.
     */
    recalculate(x, y) {
        var energy_cell = {};

        energy_cell.energy = this.energy(x, y);
        energy_cell.vminsum = Number.POSITIVE_INFINITY;

        // last row
        if (y >= this.height-1) {
            energy_cell.vminsum = energy_cell.energy;
            energy_cell.minx = 0;
        } else {
            var cursum = 0;
            var curminx = 0;

            // below left
            if (x - 1 >= 0) {
                energy_cell.vminsum = this.energy_matrix[x - 1][y + 1].vminsum + energy_cell.energy;
                energy_cell.minx = x - 1;
            }

            // below
            if (x < this.width) {
                cursum = this.energy_matrix[x][y + 1].vminsum + energy_cell.energy;
                if (cursum < energy_cell.vminsum) {
                    energy_cell.vminsum = cursum;
                    energy_cell.minx = x;
                }
            }

            // below right
            if (x + 1 < this.width) {
                cursum = this.energy_matrix[x + 1][y + 1].vminsum + energy_cell.energy;
                if (cursum < energy_cell.vminsum) {
                    energy_cell.vminsum = cursum;
                    energy_cell.minx = x + 1;
                }
            }
        }

        return energy_cell;
    }

    /**
     * Iterate from bottom to top. For each pixel calculate:
     *     * The energy for the pixel.
     *     * From the three pixels below the current pixel, calculate the
     *       `min_x` pixel. The `min_x` pixel is the pixel with the smallest
     *       cumulative energy (defined below).
     *     * Set the cumulative energy for this pixel as the energy of this
     *       pixel plus the cumulative energy of th `min_x` pixel.
     *
     * The cumulative energy of the pixels in the bottom row is simply its own
     * energy.
     *
     */
    createEnergyMatrix() {
        // This has to be reverse order (bottom to top)
        for (var y = this.height - 1; y >= 0; y--) {
            // This can be in any order ...
            for (var x = 0; x < this.width; x++) {
                this.energy_matrix[x][y] = this.recalculate(x,y);
            }
        }
    }

    /**
     * Backtrack from smallest on first row to choosing always smallest child.
     *
     */
    findVerticalSeam() {
        var vseam = [];

        var xminsum = 0;
        var vminsum = Number.POSITIVE_INFINITY;

        // Find smallest sum on first row
        for (var x = 0; x < this.width; x++) {
            if (this.energy_matrix[x][0].vminsum < vminsum) {
                vminsum = this.energy_matrix[x][0].vminsum;
                xminsum = x;
            }
        }

        vseam[0] = xminsum;

        // Follow down to get array
        var y = 0;
        while (y < this.height - 1) {
            xminsum = this.energy_matrix[xminsum][y].minx
            y++;
            vseam[y] = xminsum;
        }

        return vseam;
    }

    /**
     * Removes vertical seam.
     * Recalculates pixels depending on removed pixel.
     *
     */
    removeVerticalSeam(vseam) {
        this.imageData = this.context.createImageData(this.width - 1, this.height);
        for (var row = this.height - 1; row >= 0; row--) {
            var deletedCol = vseam[row];
            console.log('deleted is', deletedCol);

            // copy across pixels before seam col
            for (var col = 0; col < deletedCol; col ++) {
                var oldPos = this.pixelToIndex(col, row);
                var pos = oldPos - (row * 4)
                for (var i = 0; i < 4; i ++) {
                    this.imageData.data[pos + i] = this.picture[oldPos + i];
                }
            }

            // TODO: Need to update picture as well
            // Start at deleted col
            // Can ignore last column as we will delete it
            for (var col = deletedCol; col < this.width - 1; col ++) {

                // copy across pixels after seam col
                var pos = this.pixelToIndex(col, row) - (row * 4);
                var pos_right = this.pixelToIndex(col + 1, row);
                for (var i = 0; i < 4; i ++) {
                    this.imageData.data[pos + i] = this.picture[pos_right + i];
                }

                // copy across energy_matrix
                this.energy_matrix[col][row] = this.energy_matrix[col + 1][row];
            }
        }
        // TODO: Delete last column of picture
        this.energy_matrix.splice(this.width - 1, 1);
        this.picture = this.imageData.data;
        this.width--;

        // now update energy matrix
        // don't need to recalculate last row
        for (var row = this.height - 2; row >= 0; row--) {
            var deletedCol = vseam[row];

            for (var i = -1; i < 2; i ++) {
                var col = deletedCol + i;

                if (this.pixelInRange(col, row)) {
                    this.energy_matrix[col][row] = this.recalculate(col, row);
                }
            }

        }
    }

    reDrawImage() {
        this.context.putImageData(this.imageData, 0, 0);
    }

    /**
     * Prints one of the values of the energy_matrix. Useful for debugging.
     */
    printMatrix(field) {
        var line = "";
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                var val = this.energy_matrix[x][y];
                if (val && field in val) {
                    line += val[field].toFixed(2) + "\t";
                } else {
                    line += '-----\t';
                }
            }
            console.log(line);
            line = "";
        }
    }
}

module.exports = SeamCarver;

},{}],2:[function(require,module,exports){
"use strict";

var SeamCarver = require('../../../SeamCarver');
window.image = new Image();
window.canvas = document.querySelector('canvas.image');
window.findSeam = function (ctx) {
	var vseam = smc.findVerticalSeam();
	// draw vertical seam
	for (var y = 0; y < vseam.length; y ++) {
		var x = vseam[y];
		ctx.strokeStyle = "#32cd32";
		ctx.lineWidth = 1;
		ctx.strokeRect(x, y, 1, 1);
	}
	return vseam;
};

window.removeSeam = function (vseam) {
	smc.removeVerticalSeam(vseam);
	smc.reDrawImage();
};

image.onload = function () {
	canvas.width = image.width;
	canvas.height = image.height;
	var ctx = canvas.getContext("2d");
	ctx.drawImage(image, 0, 0);
	window.smc = new SeamCarver(canvas);

	var vseam = findSeam(ctx);

	// TODO: draw energy
	// TODO: redraw image without vseam
};

// image.src = 'images/3x4.png';
// image.src = 'images/6x5.png';
image.src = 'images/70x70.png';
// image.src = 'images/chameleon.png';



},{"../../../SeamCarver":1}]},{},[2]);