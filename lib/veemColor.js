var veemColor = (function() {
    'use strict';

    // PUBLIC API /////////////////////////////////////////////////////////////
    var veemColorApi = {
        /* Cycles background color for a number of cycles (1 sec per cycle).
         * PARAMETERS **********
         * (OBJ)  sourceElement: [OPT.] DOM element to color cycle.
         * (INT)  sourceCycles:  [OPT.] Number of seconds (cycles) to run.
         * (BOOL) includeLabel:  [OPT.] Whether to include a hex color label.
         */
        cycle: function(sourceElement, sourceCycles, includeLabel) {
            // Set defaults
            var element = document.body;
            var maxCycles = sourceCycles !== undefined ? sourceCycles : 10;
            if (sourceElement !== undefined) {
                // Check for wrapped elements (e.g., jQuery elements)
                element = sourceElement[0] === undefined ? sourceElement : sourceElement[0];
            }

            // Save a color table for this element specifically
            element.veemColorTable = new ColorTable();

            // BEGIN SETTING COLOR //
            // JS's setInterval does not execute immediatelly, so we run the
            // first cycle manually.
            _setColor();

            // Users intervals to run cycles of 1 second in length
            var cycle = 1;
            var cycleInterval = setInterval(_setColor, 1000);

            function _setColor() {
                // Get a unique color in RGB and Hex format
                var color = _getColor(element.veemColorTable);

                // Set the background color of the target element
                element.style.backgroundColor = color.hex;

                // Create (or set) a label
                if (includeLabel === true) {
                    var label = _getLabel(element);
                    label.style.color = color.label;
                    label.innerHTML = color.hex;
                }

                // Kill the interval after the last cycle
                cycle++;
                if (cycle === maxCycles) {
                    clearInterval(cycleInterval);
                    element.veemColorTable.reset();
                }
            }
        },

        // Exposes the ColorTable class publicly
        ColorTable: ColorTable
    };


    // PRIVATE METHODS ////////////////////////////////////////////////////////
    // Returns the element's color label, or creates and returns a new one
    function _getLabel(element) {
        var label = element.querySelector('.veem-color-label');
        if (!label) {
            label = document.createElement('div');
            label.style.display = 'inline-block';
            label.style.position = 'absolute';
            label.style.left = '50%';
            label.style.top = '50%';
            label.style.transform = 'translate(-50%,-50%)';
            label.style.fontSize = '36px';
            label.style.fontFamily = 'helvetica, sans-serif';
            label.style.fontWeight = '600';
            label.style.textAlign = 'center';
            label.style.textTransform = 'uppercase';
            label.style.verticalAlign = 'middle';
            label.classList.add('veem-color-label');
            if (!element.style.position || element.style.position === 'static') {
                element.style.position = 'relative'
            }
            element.insertBefore(label, element.firstChild);
        }
        return label;
    }

    /* Returns a unique color (based on an external duplicates table), in RGB
     * and hex formats.
     * PARAMETERS **********
     * (OBJ) colorTable: [REQ.] Instance of ColorTable, to avoid duplicates.
     */
    function _getColor(colorTable) {
        var color = {
            rgb: [_randColorValue(), _randColorValue(), _randColorValue()],
            hex: '',
            label: ''
        };

        // Check for duplicates
        var isDuplicate = colorTable.has(color.rgb);
        if (isDuplicate) {
            // If we get a duplicate, iterate recursively until we get
            // a unique color.
            console.log('The following [RGB] color has already been used:', color.rgb);
            color = _getColor(colorTable);
        } else {
            // Save unique color to the list
            colorTable.add(color.rgb);

            // Once we have a unique color, save hex version of it
            color.hex = _rgbToHex(color.rgb);

            // Calculare a label color, to maximize contrast
            color.label = _getContrastingColor(color.rgb);
        }
        return color;
    }

    // Provides an RGBA color that contrasts with an RGB array color
    function _getContrastingColor(rgbArray) {
        var constrastColor;
        var colorSum = rgbArray.reduce(function(a, b) {return a + b;}, 0);
        if (colorSum > 300) {
            if (rgbArray[1] > 170 || (colorSum - rgbArray[1] > 409)) {
                constrastColor = 'rgba(0, 0, 0, 0.6)';
            } else {
                constrastColor = 'rgba(255, 255, 255, 0.95)';
            }
        } else {
            constrastColor = 'rgba(255, 255, 255, 0.95)';
        }
        return constrastColor;
    }

    // Converts an RGB array to a hex value
    function _rgbToHex(rgbArray) {
        var hexArray = rgbArray.map(function(rgbColor) {
            var hexColor = rgbColor.toString(16);
            hexColor = hexColor.length === 1 ? '0' + hexColor : hexColor;
            return hexColor;
        });
        return '#' + hexArray.join('');
    }

    // Generates a random 8-bit color value (0-255)
    function _randColorValue() {
        return Math.floor(Math.random() * 256);
    }


    // COLOR_TABLE CLASS DEFINITION ///////////////////////////////////////////
    // Custom hash table for managing colors in RGB array format
    function ColorTable() {
        var _table = [];

        // PRIVILEGED METHODS /////////////////////////////////////////////////
        // Fetch color
        this.has = function(rgbArray) {
            // Use the red value as the index
            var index = rgbArray[0];
            // Use the green and blue values as a key
            var key = _getKey(rgbArray[1], rgbArray[2]);

            if (_table[index] === undefined || _table[index][key] === undefined) {
                return false;
            }
            return true;
        };

        // Save color
        this.add = function(rgbArray) {
            // Use the red value as the index
            var index = rgbArray[0];
            // Use the green and blue values as a key
            var key = _getKey(rgbArray[1], rgbArray[2]);

            if (key.length === 0) {
                console.warn('Invalid color: cannot produce valid key');
                return;
            }

            if (_table[index] === undefined) {
                _table[index] = {};
            }

            // Save this color for checking later.
            _table[index][key] = true;
        };

        // Reset the table
        this.reset = function() {
            _table = [];
        };

        // PRIVATE METHODS ////////////////////////////////////////////////////
        // Generate hash collison key
        function _getKey(green, blue) {
            var greenString = _pad(green);
            var blueString = _pad(blue);
            return greenString + blueString;
        }

        // Pad color integers to 3 digits (e.g., 17 becomes 017)
        function _pad(sourceString) {
            if (sourceString === undefined) {
                return '';
            } else if (
                typeof sourceString !== 'number' &&
                (typeof sourceString !== 'string' || isNaN(parseInt(sourceString, 10)))
            ) {
                console.warn('Can only pad numeric values');
                return sourceString;
            }
            var string = typeof sourceString === 'number' ? String(sourceString) : sourceString;
            while (string.length < 3) {
                string = '0' + string;
            }
            return string;
        }

        return this;
    }
    // END OF COLOR_TABLE CLASS DEFINITION ////////////////////////////////////

    return veemColorApi;
})();
