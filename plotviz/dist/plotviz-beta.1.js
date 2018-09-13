/*
The MIT License (MIT)

Copyright (c) 2014 The Broad Institute

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';


    /**
     * Calculates the maximum and minimum value for all data points. Used to
     * automatically decide how wide the range should be for the plot to let
     * all data be seen.
     *
     * @param - Object - data - The data to be visualized.
     *
     * @returns - Object - two keys: maximum, minimum
     */
    plotviz.maxMin = function (data) {
        var values = data.data.map(function (majorBox) {
            return majorBox.value.map(function (minorBox) {
                // TODO: Better error checking
                minorBox.value = minorBox.value || {};
                minorBox.value.outliers = minorBox.value.outliers || [];
                return [minorBox.value.high_whisker || undefined,
                        minorBox.value.q3 || undefined,
                        minorBox.value.median || undefined,
                        minorBox.value.q1 || undefined,
                        minorBox.value.low_whisker || undefined]
                    .concat(minorBox.value.outliers.map(function (outlier) {
                            return outlier.value.outlier;
                        })
                    );
            })
            .filter(function (value) {
                return value !== undefined && value !== null;
            })
            .reduce(function (minorBoxValuesA, minorBoxValuesB) {
                return minorBoxValuesA.concat(minorBoxValuesB);
            });
        })
        .reduce(function (majorBoxValuesA, majorBoxValuesB) {
            return majorBoxValuesA.concat(majorBoxValuesB);
        })
        .filter(function (identity) {return identity;});

        return {maximum: values.reduce(function (a, b)
                                        {return a > b ? a : b;}, 0),
                minimum: values.reduce(function (a, b)
                                        {return a < b ? a : b;}, 0)};
    }; 

    plotviz.lineMaxMin = function (data) {
        var values = data.map(function (line) {
            return line.value.points.map(function (point) {
                return point.value.median;
            });
        })
        .reduce(function (lineA, lineB) {
            return lineA.concat(lineB);
        });

        return {maximum: values.reduce(function (a, b)
                                        {return a > b ? a : b;}),
                minimum: values.reduce(function (a, b)
                                        {return a < b ? a : b;})};
    };


    /**
     * Sorts the major and minor keys in the data to be visualized. Some
     * default sorting function options available are 'alphabetical',
     * 'increasing', and 'decreasing'. 'increasing' and 'decreasing' for the
     * minor keys base it on the median of the minor keys. 'increasing' and
     * 'decreasing' for the major keys base it on the average of the medians
     * for the minor keys in their grouping.
     *
     * @param - string/function - majorSortFunction - The function that will
     *          be used to sort the major keys. A string can be used to
     *          call and default supported sorting function.
     * @param - string/function - minorSortFunction - The function that will
     *          be used to sort the minor keys. A string can be used to
     *          call and default supported sorting function.
     */
    plotviz.globalSortSVG = function (data, majorSortFunction, minorSortFunction) {
        var newData = JSON.parse(JSON.stringify(data));
        if ('string' === typeof minorSortFunction){
            if ('alphabetical' === minorSortFunction) {
                newData.data.forEach(function (boxList, bLIndex, bLArray) {
                    boxList.value.sort(function (a, b) {
                        return b.key < a.key;
                    });
                });
            } else if ('increasing' === minorSortFunction) {
                newData.data.forEach(function (boxList, bLIndex, bLArray) {
                    boxList.value.sort(function (a, b) {
                        return a.value.median - b.value.median;
                    });
                });
            } else {
                newData.data.forEach(function (boxList, bLIndex, bLArray) {
                    boxList.value.sort(function (a, b) {
                        return b.value.median - a.value.median;
                    });
                });
            }
        }

        if ('string' === typeof majorSortFunction) {
            if ('alphabetical' === majorSortFunction) {
                newData.data.sort(function (a, b) {
                    return b.key < a.key ? 1 : -1;
                });
            } else if ('increasing' === majorSortFunction) {
                newData.data.sort(function (a, b) {
                    var aTotal = 0,
                        bTotal = 0;

                    aTotal = a.value.filter(function (d) { return d.value ? true : false; })
                        .map(function (d) { return d.value.median; })
                        .reduce(function (b1, b2) { return b1 + b2; }, 0);

                    b.Total = b.value.filter(function (d) { return d.value ? true : false; })
                        .map(function (d) { return d.value.median; })
                        .reduce(function (b1, b2) { return b1 + b2; }, 0);

                    aTotal /= a.value.filter(function (d) { return d ? true : false; }).length;
                    bTotal /= a.value.filter(function (d) { return d ? true : false; }).length;
                    return aTotal - bTotal;
                });
            } else if ('decreasing' === majorSortFunction) {
                newData.data.sort(function (a, b) {
                    var aTotal = 0,
                        bTotal = 0;

                    a.value.forEach(function (box, index, array) {
                        aTotal += box.value.median;
                    });
                    b.value.forEach(function (box, index, array) {
                        bTotal += box.value.median;
                    });

                    aTotal /= a.value.length;
                    bTotal /= b.value.length;
                    return bTotal - aTotal;
                });
            }
        }

        if ('function' === typeof majorSortFunction) {
            newData.data.sort(majorSortFunction);
        }

        if ('function' === typeof minorSortFunction) {
            newData.data.forEach(function (boxList, bLIndex, bLArray) {
                boxList.value.sort(minorSortFunction);
            });
        }

        return newData;
    };

    return plotviz;
})(plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';



    /* Exposing these functions of convenience to the public. */
/*    plotviz.renderLog10SVG = renderLog10SVG;
    plotviz.renderLinearSVG = renderLinearSVG;
    plotviz.renderAlphabeticalSVG = renderAlphabeticalSVG;
    plotviz.renderMedianIncreaseSVG = renderMedianIncreaseSVG;
    plotviz.renderMedianDecreaseSVG = renderMedianDecreaseSVG;
    plotviz.renderVerticalSVG = renderVerticalSVG;
    plotviz.renderHorizontalSVG = renderHorizontalSVG;
*/

    /**
     * Turns other buttons in the button box off.
     *
     * @param - HTMLElement - buttonBox
     */
    function turnOffSiblingButtons (buttonBox) {
        var i = 0,
            buttons = buttonBox.parentNode.childNodes;

        for (; i < buttons.length; i++) {
            buttons[i].className =
                buttons[i].className.replace
                    (/(?:^|\s)btn-active(?!\S)/g , ' btn-inactive');
        }
    }


    /**
     * Turns on button in the button box.
     *
     * @param - HTMLElement - button
     */
    function turnOnSelfButton (button) {
        button.className =
            button.className.replace
                ( /(?:^|\s)btn-inactive(?!\S)/g , ' btn-active' );
    }


    /**
     * Creates a button with a class, text in the button, and a function to be called when clicked.
     *
     * @param - string - className
     * @param - string - text
     * @param - function - action - Function to be called when clicked.
     * @returns - HTMLElement - button - The created button
     */
    function createButton(className, text, action) {
        var button = document.createElement('div');
        button.className = className;
        button.textContent = text;
        button.onclick = action;
        return button;
    }


    /** Configuration for which buttons should be turned on or off when creating the controlling div. */
    plotviz.interfaceComponentsSVG = {
        scaling: {enabled:true, func:plotviz.createScalingButtonsDivSVG, option:'scale'},
        sorting: {enabled:true, func:plotviz.createSortingButtonsDivSVG, option:'sorting'},
        orientation: {enabled:true, func:plotviz.createOrientationSelectionButtonsDivSVG, option:'orientation'}
    };

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    plotviz.testInput2 = {
        metadata: {
            title: "Title",
            xlabel: "XAxisTest",
            ylabel: "YAxisTest",
            controls: ['orientation',
                        'sorting',
                        'scaling'],
            width: 1000,
            height: 400
        },
        data: [
            {
                key: 'key1',
                value: [
                    {
                        key: "key1",
                        value: {
                            high_whisker: 5,
                            q3: 4,
                            median: 3,
                            q1: 2,
                            low_whisker: 0.1,
                            extra: {num_ticks: 7},
                            outliers: [6, 7, 7.5, 8],
                            color: 'red'
                        }
                    },
                    {
                        key: "key2",
                        value: {
                            high_whisker: 10,
                            q3: 9,
                            median: 8,
                            q1: 7,
                            low_whisker: 6,
                            color: 'green',
                            extra: {num_ticks: 6},
                            outliers: [2, 3, 2.5]
                        }
                    }
                ]
            },
            {
                key: 'key4',
                value: [
                    {
                        key: "key4",
                        value: {
                            high_whisker: 7,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 3,
                            color: 'blue',
                            extra: {num_ticks: 1},
                            outliers: []
                        }
                    }
                ]
            },
            {
                key: 'key6',
                value: [
                    {
                        key: "key6",
                        value: {
                            high_whisker: 10,
                            q3: 9,
                            median: 8,
                            q1: 2,
                            low_whisker: 1,
                            color: 'yellow',
                            extra: {num_ticks: 2},
                            outliers: []
                        }
                    },
                    {
                        key: "key7",
                        value: {
                            high_whisker: 8,
                            q3: 7,
                            median: 6,
                            q1: 5,
                            low_whisker: 4,
                            color: 'orange',
                            extra: {num_ticks: 3},
                            outliers: []
                        }
                    }
                ]
            },
            {
                key: 'key9',
                value: [
                    {
                        key: "key9",
                        value: {
                            high_whisker: 4.5,
                            q3: 4,
                            median: 3,
                            q1: 2,
                            low_whisker: 1.5,
                            color: 'purple',
                            extra: {num_ticks: 4},
                            outliers: []
                        }
                    }
                ]
            },
            {
                key: 'key10',
                value : [
                    {
                        key: "key10",
                        value: {
                            high_whisker: 9,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 1,
                            color: 'cyan',
                            extra: {num_ticks: 5},
                            outliers: []
                        }
                    }
                ]
            }
        ],
        legend: [
            {
                key: 'key1',
                value: {
                    label: 'label1',
                    color: 'red'
                }
            },
            {
                key: 'key2',
                value: {
                    label: 'label2',
                    color: 'blue'
                }
            },
            {
                key: 'key3',
                value: {
                    label: 'label3',
                    color: 'red'
                }
            }
        ]
    };

    plotviz.normalInput = {
        metadata: {
            title: "Title",
            xlabel: "XAxisTest",
            ylabel: "YAxisTest",
            controls: ['orientation',
                        'sorting',
                        'scaling'],
            width: 1400,
            height: 800
        },
        data: [
            {
                key: 'key1',
                value: [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 5,
                            q3: 4,
                            median: 3,
                            q1: 2,
                            low_whisker: 0.1,
                            extra: {num_ticks: 7},
                            outliers: [
                                {
                                    key: 'one',
                                    value: {
                                        outlier: 6
                                    }
                                },
                                {
                                    key: 'two',
                                    value: {
                                        outlier: 7,
                                        extra: 'surprise'
                                    }
                                },
                                {
                                    key: 'three',
                                    value: {
                                        outlier: 7.5
                                    }
                                },
                                {
                                    key: 'four',
                                    value: {
                                        outlier: 8
                                    }
                                }
                            ],
                            color: 'red'
                        }
                    },
                    {
                        key: "even",
                        value: {
                            high_whisker: 10,
                            q3: 9,
                            median: 8,
                            q1: 7,
                            low_whisker: 6,
                            color: 'blue',
                            extra: {
                                num_ticks: 6,
                                opacity: 0.5
                            },
                            outliers: [
                                {
                                    key: 'one',
                                    value: {
                                        outlier: 2
                                    }
                                },
                                {
                                    key: 'two',
                                    value: {
                                        outlier: 3
                                    }
                                },
                                {
                                    key: 'three',
                                    value: {
                                        outlier: 2.5
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            {
                key: 'key4',
                value: [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 7,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 3,
                            color: 'red',
                            extra: {num_ticks: 1},
                            outliers: []
                        }
                    },
                    {
                    }
                ]
            },
            {
                key: 'key6',
                value: [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 10,
                            q3: 9,
                            median: 8,
                            q1: 2,
                            low_whisker: 1,
                            color: 'red',
                            extra: {num_ticks: 2},
                            outliers: []
                        }
                    },
                    {
                        key: "even",
                        value: {
                            high_whisker: 8,
                            q3: 7,
                            median: 6,
                            q1: 5,
                            low_whisker: 4,
                            color: 'blue',
                            extra: {num_ticks: 3},
                            outliers: []
                        }
                    }
                ]
            },
            {
                key: 'key9',
                value: [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 4.5,
                            q3: 4,
                            median: 3,
                            q1: 2,
                            low_whisker: 1.5,
                            color: 'red',
                            extra: {num_ticks: 4},
                            outliers: []
                        }
                    },
                    {
                    }
                ]
            },
            {
                key: 'key10',
                value : [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 9,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 1,
                            color: 'red',
                            extra: {num_ticks: 5},
                            outliers: []
                        }
                    },
                    {
                        key: "even",
                        value: {
                            high_whisker: 9,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 1,
                            color: 'blue',
                            extra: {num_ticks: 5},
                            outliers: []
                        }
                    }
                ]
            }
        ],
        legend: [
            {
                key: 'key1',
                value: {
                    label: 'label1',
                    color: 'red'
                }
            },
            {
                key: 'key2',
                value: {
                    label: 'label2',
                    color: 'blue'
                }
            },
            {
                key: 'key3',
                value: {
                    label: 'label3',
                    color: 'red'
                }
            }
        ]
    };

    return plotviz;
})
    (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    plotviz.Plot = function (div) {
        var _data = null;
        var _dataCache = {};
        var _name = null;
        var _geneName = null;

        var _viewerPanel = null;
        var _xAxisPanel = null;
        var _yAxisPanel = null;
        var _legend = null;
        var _filter = null;

        var _container = d3.select(div);
        var _root = null;
        var _svgRoot = null;
        var _tooltip = null;
        var _tooltipFunc = null;
        var _mouseclickFunc = null;
        var _mousemoveFunc = null;
        var _titlePanel = null;
        var _crosshair = null;
        var _config = {
            filter: 'off',
            orientation: 'horizontal',
            scale: 'linear',
            sorting: 'alphabetical',
            crosshair: 'on',
            outliers: 'on',
            medians: 'all',
            format: 'RSEM'
        };

        var _dataTransform = null;

        this.initialize = function(data) {
            data.metadata.options.forEach(function(option) {
                _config[option.value.key] = option.value.initial;
            },
            this);
        };

        var _plot = this;

    /**
     * Main controlling rendering function that sets up the data
     * and calls the remaining rendering functions.
     *
     * @param - Object - data - The data used for the rendering.
     * @param - Object - config - Lets you give state configuration options
     *                          for the plot being rendered.
     */
    this.render = function (data, config) {

        var that = this;
        config = config || this.config();

        var metadata = validateMetadata(data.metadata);

        if(_geneName !== metadata.geneName) {
            if(_geneName !== null) {
                // geneName has changed. Clear any filter.
                config.filter = 'off'
                config.resetFilter = true;
            }
        }

        _geneName = metadata.geneName;

        var x, y, spread,
            width = metadata.width,
            height = metadata.height,
            legendProportionLeft = metadata.position.legend.x || (6/7),
            legendProportionTop = metadata.position.legend.y || (1/4),
            legendProportionRight = metadata.position.legend.right || (6/7),
            legendLeft = legendProportionLeft * width,
            legendTop = legendProportionTop * height,
            legendRight = legendProportionRight * width,
            viewerProportionLeft = metadata.position.viewer.left || (1/7),
            viewerProportionTop = metadata.position.viewer.top || (1/4),
            viewerProportionRight = metadata.position.viewer.right || (6/7),
            viewerProportionBottom = metadata.position.viewer.bottom || (3/4),
            viewerLeft = viewerProportionLeft * width,
            viewerTop = viewerProportionTop * height,
            viewerRight = viewerProportionRight * width,
            viewerBottom = viewerProportionBottom * height;
            var majorKeys;

            _svgRoot.attr({
                width: width,
                height: height
            });


            _svgRoot.on('mousemove', function (d) {
                var newMouseX = d3.mouse(this)[0] - 2 - viewerLeft;
                var newMouseY= d3.mouse(this)[1] - 2 - viewerTop;
                var betterX = Math.min(Math.max(newMouseX, 0), viewerRight - viewerLeft);
                var betterY = Math.min(Math.max(newMouseY, 0), viewerBottom - viewerTop);
                _crosshair.move(betterX, betterY);
                            if (betterX < 0 || betterX > viewerRight - viewerLeft || betterY > viewerBottom - viewerTop || betterY < 0) {
                                _crosshair.hide();
                            } else {
                                //return that.config().crosshair === 'on' ? '' : 'none';
                                _crosshair.show();
                            }
                if ('off' === that.config().crosshair) {
                    _crosshair.hide();
                }
            });

            if ('box' === data.metadata.type) {
                majorKeys = data.data.map(function (boxGroup) {
                    return boxGroup.key;
                });
            }

            // TODO: Kane! This is a complete hack! Fix it! - Kane
            if ('line' === data.metadata.type) {
                majorKeys = data.data[0].value.points.map(function (lineGroup) {
                    return lineGroup.key;
                });
            }
            var maxMin;
            if ('box' === data.metadata.type) {
                maxMin = plotviz.maxMin(data);
            }
            if ('line' === data.metadata.type) {
                maxMin = plotviz.lineMaxMin(data.data);
            }
            _titlePanel.attr('transform', 'translate(' + viewerLeft + ',0)');

        spread = maxMin.maximum - maxMin.minimum;

        var titleAnchor = 'middle';
        if ('left' === metadata.position.title.align) {
            titleAnchor = 'left';
        }
        if ('right' === metadata.position.title.align) {
            titleAnchor = 'right';
        }
        _titlePanel.select('#titleLabel')
            .attr({
                x: (viewerRight - viewerLeft) * metadata.position.title.x,
                y: viewerTop * metadata.position.title.y
            })
            .style({
                'text-anchor': titleAnchor,
                font: data.metadata.titlefont
            })
            .text(data.metadata.title);

        _svgRoot.attr('height', data.metadata.height + 'px');

        y = d3.scale.linear()
            .domain([maxMin.minimum - spread / 10,
                    maxMin.maximum + spread / 10])
            .range([viewerBottom - viewerTop, 0])
            .nice();


        x = d3.scale.ordinal()
            .domain(majorKeys)
            .rangeBands([0, viewerRight - viewerLeft], metadata.boxGroupSpacing);

        var leftPanelData = {
            axis: y,
            x: viewerLeft,
            y: viewerTop,
            orientation: 'left',
            label: data.metadata.ylabel,
            labelX: viewerLeft * metadata.position.yAxisLabel.x,
            labelY: (viewerBottom - viewerTop) *  metadata.position.yAxisLabel.y,
            rotation: metadata.position.yAxisLabel.rotation,
            align: metadata.position.yAxisLabel.align
        };

        _yAxisPanel.render(leftPanelData);

        var bottomPanelData = {
            axis: x,
            x: viewerLeft,
            y: viewerBottom,
            orientation: 'bottom',
            //label: data.metadata.xlabel
            label: data.metadata.xlabel,
            labelY: (data.metadata.height - viewerBottom) * metadata.position.xAxisLabel.y,
            labelX: (viewerRight - viewerLeft) * metadata.position.xAxisLabel.x,
            tickRotation: metadata.position.xAxisLabel.tickRotation,
            tickTranslate: metadata.position.xAxisLabel.tickTranslate,
            tickAlign: metadata.position.xAxisLabel.tickAlign
        };

        _xAxisPanel.render(bottomPanelData);


        var copyingData = JSON.parse(JSON.stringify(data));
        copyingData.metadata = metadata;

        if ('box' === data.metadata.type) {
            _viewerPanel.render(transformPseudo(copyingData, x, y), x, y, config);
        }
        if ('line' === data.metadata.type) {
            _viewerPanel.render(data.data, x, y, {x:viewerLeft, y:viewerTop, width:viewerRight - viewerLeft, height:viewerBottom - viewerTop});
        }

        _legend.render(data.legend, x, y, {x: legendLeft, y: legendTop});

        _filter.render(data, x, y, config);

        if(!('data' in _dataCache)) {
            _dataCache.data = data;
        }

    };

        this.option = function (key, value) {
            if (value) {
                if (typeof _config[key] !== 'undefined') {
                    _config[key] = value;
                    // TODO: This is a hack before figuring out a better way
                    // to sort correctly.
                    if ('sorting' === key && 'box' === _data.metadata.type) {
                        _config.minorSort = _config.sorting;
                        _config.majorSort = _config.sorting;
                    }
                } else {
                    console.log(key + ' is not an option or setting.');
                }
            }
            else {
                return _config[key];
            }
            return this;
        };



        /**
         * Updates or returns the data the plot is visualizing.
         *
         * @param - JSON - data - The plot data to for later rendering.
         *
         * @return - JSON - data - If no parameter is supplied then return data.
         */
        this.data = function (data) {
            if (data) {
                _data = JSON.parse(JSON.stringify(data));
            } else {
                return JSON.parse(JSON.stringify(_data));
            }
        };

        this.dataCache = function(data) {
            if (data) {
              _dataCache.data = JSON.parse(JSON.stringify(data));
            } else {
              if(_dataCache.data === undefined) {
                throw 'Empty dataCache error.';
              } else {
                data = JSON.parse(JSON.stringify(_dataCache.data));
                _plot.data(data);
                _dataCache = {};
                return data;
              }
            }
        }

        this.config = function (config) {
            if (config) {
                _config = JSON.parse(JSON.stringify(config));
            } else {
                return JSON.parse(JSON.stringify(_config));
            }
        };


        this.create = function (data, name) {
            var that = this;
            var metadata = validateMetadata(data.metadata);

            _name = name;

            _root = _container.append('div')
                .attr({
                    id: 'plotviz-rootDiv' + (_name ? '-' + name : ''),
                    className: 'plotviz-rootClass-horizontal'
                })
                .style({
                    'position': 'relative',
                    'height': metadata.height + 'px',
                    'width': metadata.width + 'px'
                });


            this.initialize(data);

            addControls(_root.node(), data, this);

            _svgRoot = _root.append('svg').attr({
                id: 'svg-plotviz-root',
                width: '100%',
                height: '100%',
                'xmlns:xlink': 'http://www.w3.org/1999/xlink'
            });

            _tooltip = _root.append('div')
                .attr('class', 'tooltip')
                .style('position', 'absolute');

            _titlePanel = _svgRoot.append('g').attr({
                    id: 'svg-plotviz-titlePanel'
                });
            _titlePanel.append('text').attr('id', 'titleLabel')
                .style('font', data.metadata.options.titlefont || '48px');


            var viewerLeft = metadata.position.viewer.left * metadata.width;
            var viewerTop = metadata.position.viewer.top * metadata.height;
            var viewerRight = metadata.position.viewer.right * metadata.width;
            var viewerBottom = metadata.position.viewer.bottom * metadata.height;

            var _viewerPanelData;

            if ('box' === metadata.type) {
                _viewerPanelData = {
                    metadata: {
                        width: viewerRight - viewerLeft,
                        height: viewerBottom - viewerTop,
                        x: viewerLeft,
                        y: viewerTop,
                        outlierRadius: metadata.outlierRadius,
                        outlierJitter: metadata.outlierJitter
                    },
                    data: data.data
                };

                _viewerPanel = new plotviz.BoxWhiskerViewer(_svgRoot, 'svg-plotviz-mainPanel', _viewerPanelData);
                _viewerPanel.tooltipPanel(_tooltip);
                if (_tooltipFunc) {_viewerPanel.tooltipFunction(_tooltipFunc);}
                _config.minorSort = _config.sorting;
                _config.majorSort = _config.sorting;
            }


            if ('line' === metadata.type) {
                _viewerPanelData = {
                    metadata: {
                        width: viewerRight - viewerLeft,
                        height: viewerBottom - viewerTop,
                        x: viewerLeft,
                        y: viewerTop
                    },
                    data: data.data
                };

                _viewerPanel = new plotviz.LineViewer(_svgRoot, 'svg-plotviz-mainPanel', _viewerPanelData);
                _viewerPanel.tooltipPanel(_tooltip);
                if (_tooltipFunc) {_viewerPanel.tooltipFunction(_tooltipFunc);}
            }

            if (_mouseclickFunc) {_viewerPanel.mouseclick(_mouseclickFunc);}

            _dataTransform = _viewerPanel.dataTransform;
            this.sort = _viewerPanel.sort;

            var crosshairMetadata = {
                width: viewerRight - viewerLeft,
                height: viewerBottom - viewerTop,
                x: 0,
                y: 0
                //x: viewerLeft,
                //y: viewerTop
            };

            var mainPanel = _svgRoot.select('#svg-plotviz-mainPanel');
            _crosshair = new plotviz.Crosshair(mainPanel, 'svg-plotviz-crosshair', crosshairMetadata);



            var leftPanelInput = {
                x: viewerLeft,
                y: viewerTop,
                labelX: metadata.position.yAxisLabel.x,
                labelY: metadata.position.yAxisLabel.y,
                rotation: metadata.position.yAxisLabel.rotation,
                align: metadata.position.yAxisLabel.align,
            };

            _yAxisPanel = new plotviz.AxisPanel(_svgRoot, 'svg-plotviz-leftPanel', leftPanelInput);

            var bottomPanelInput = {
                x: viewerLeft,
                y: viewerBottom,
            };

            _xAxisPanel = new plotviz.AxisPanel(_svgRoot, 'svg-plotviz-bottomPanel', bottomPanelInput);
            _xAxisPanel.tooltipPanel(_tooltip);
            if (_tooltipFunc) {_xAxisPanel.tooltipFunction(_tooltipFunc);}
            if (_mouseclickFunc) {_xAxisPanel.mouseclick(_mouseclickFunc);}

            var legendLeft = metadata.position.legend.x * metadata.width;
            var legendTop = metadata.position.legend.y * metadata.height;
            var legendRight = metadata.position.legend.right * metadata.width;

            var legendMetadata = {
                x: legendLeft,
                y: legendTop,
                align: metadata.position.legend.align
            };
            _legend = new plotviz.Legend(_svgRoot, 'legendPanel', legendMetadata);
            if (_mouseclickFunc) {_legend.mouseclick(_mouseclickFunc);}

            _filter = new plotviz.Filter(_svgRoot, 'filterPanel', legendMetadata, this);
            if (_mouseclickFunc) {_filter.mouseclick(_mouseclickFunc);}

            if (data.metadata.init) {
                data.metadata.init(this, data, this.config());
            }

            return _root;

        };


        this.tooltip = function (func) {
            if (func) {
                _tooltipFunc = func;
                if (_viewerPanel) {_viewerPanel.tooltipFunction(func);}
                if (_xAxisPanel) {_xAxisPanel.tooltipFunction(func);}
                if (_yAxisPanel) {_yAxisPanel.tooltipFunction(func);}

                if (_viewerPanel) {_viewerPanel.tooltipPanel(_tooltip);}
                if (_xAxisPanel) {_xAxisPanel.tooltipPanel(_tooltip);}
                if (_yAxisPanel) {_yAxisPanel.tooltipPanel(_tooltip);}
            } else {
                return _tooltipFunc;
            }
        };


        this.mouseclick = function (func) {
            if (func) {
                _mouseclickFunc = func;
                if (_legend) {_legend.mouseclick(func);}
                if (_xAxisPanel) {_xAxisPanel.mouseclick(func);}
            } else {
                return _mouseclickFunc;
            }
        };

        this.mousemove = function (func) {
            if (func) {
                _mousemoveFunc = func;
                if (_legend) {_legend.mousemove(func);}
            } else {
                return _mousemoveFunc;
            }
        };


        /**
         *  Validates the metadata field for the Plot object's input. If
         *  a field doesn't exist then it is given a default value. Once
         *  the input is validated the validated version is returned. The
         *  original input is untouched.
         *
         *  TODO: Echo out proper logging and warning messages based on the
         *          input fields that don't exist.
         *
         *  @param - JSON - input - The metadata from the plot input.
         *
         *  @return - JSON - The validated input with all fields filled in
         *                  either with the input values or a proper default.
         *
         *      The JSON takes this form
         *
         *      input:
         *
         */
        function validateMetadata (input) {
            var data = input || {};
            data = JSON.parse(JSON.stringify(data));
            var metadata = data || {};
            metadata.height = metadata.height || 400;
            metadata.width = metadata.width || 1000;
            metadata.type = metadata.type || 'box';
            metadata.title = metadata.title || '';
            metadata.titlefont = metadata.titlefont || '48px';
            metadata.boxGroupSpacing = metadata.boxGroupSpacing || 0.1;

            metadata.options = metadata.options || {};
            metadata.position = metadata.position || {};

            metadata.position.viewer = metadata.position.viewer || {};
            var viewer = metadata.position.viewer;
            viewer.left = viewer.left || 1/7;
            viewer.top = viewer.top || 1/4;
            viewer.right = viewer.right || 6/7;
            viewer.bottom = viewer.bottom || 3/4;
            metadata.position.viewer = viewer;

            metadata.position.legend = metadata.position.legend || {};
            var legend = metadata.position.legend;
            legend.x = legend.x || 6/7;
            legend.y = legend.y || 1/4;
            legend.align = legend.align || 'left';
            metadata.position.legend = legend;

            metadata.position.title = metadata.position.title || {};
            var title = metadata.position.title;
            title.x = title.x || 0.5;
            title.y = title.y || 0.5;
            title.align = title.align || 'center';
            metadata.position.title = title;

            metadata.position.yAxisLabel = metadata.position.yAxisLabel || {};
            var yAxisLabel = metadata.position.yAxisLabel;
            yAxisLabel.x = yAxisLabel.x || 0.5;
            yAxisLabel.y = yAxisLabel.y || 0.5;
            yAxisLabel.rotation = yAxisLabel.rotation === 0 ? 0 : yAxisLabel.rotation || 90;
            yAxisLabel.align = yAxisLabel.align || 'center';
            metadata.position.yAxisLabel = yAxisLabel;

            metadata.position.xAxisLabel = metadata.position.xAxisLabel || {};
            var xAxisLabel = metadata.position.xAxisLabel;
            xAxisLabel.x = xAxisLabel.x || 0.5;
            xAxisLabel.y = xAxisLabel.y || 0.5;
            xAxisLabel.rotation = xAxisLabel.rotation || 0;
            xAxisLabel.tickRotation = xAxisLabel.tickRotation === 0 ? 0 : xAxisLabel.tickRotation || 45;
            xAxisLabel.tickTranslate = xAxisLabel.tickTranslate === 0 ? 0 : xAxisLabel.tickTranslate || 10;
            xAxisLabel.align = xAxisLabel.align || 'center';
            xAxisLabel.tickAlign = xAxisLabel.tickAlign || 'center';
            metadata.position.xAxisLabel = xAxisLabel;

            return metadata;
        }

        function validateLegendData (input) {
            var data = input || {};
            data = JSON.parse(JSON.stringify(data));
            var legendData = data || {};

            return legendData;
        }



        /**
         * Creates the controls for the plot on screen.
         *
         * @param - HTMLElement - div - Div to append the controls to.
         * @param - JSON - data - Button box data to generate the controls.
         */
        function addControls (div, data, that) {

            var control = d3.select(div);

            data.metadata.position = data.metadata.position || {};
            data.metadata.position.control = data.metadata.position.control || {};

            var width = data.metadata.width;
            var height = data.metadata.height;

            var controlProportionLeft = data.metadata.position.control.left || 1/8;
            var controlProportionTop = data.metadata.position.control.top || 7/8;
            var controlLeft = controlProportionLeft * width;
            var controlTop = controlProportionTop * height;

            var controlData = data.metadata.controls.map(function (d) {
                var controlGenerator = {
                    'filtering': plotviz.toolbox.generateFilteringControl,
                    'sorting': plotviz.toolbox.generateSortingControl,
                    'scaling': plotviz.toolbox.generateScalingControl,
                    'crosshair': plotviz.toolbox.generateCrosshairControl,
                    'outliers': plotviz.toolbox.generateOutlierControl,
                    'medians': plotviz.toolbox.generateMedianOnlyControl
                };
                return typeof d === 'string' ? (d in controlGenerator ? controlGenerator[d]() : undefined) : d;
            })
            .filter(function (d) { return d; });

            var buttonBox = control.append('div')
                .attr('id', 'plotviz-controlDiv')
                .attr('class', 'plotviz-controlClass')
                .style('position', 'absolute')
                .style('left', controlLeft + 'px')
                .style('top', controlTop + 'px')
              .append('div')
                .attr('class', 'plotviz-floatWrap')
              .selectAll('div')
                .data(controlData)
              .enter().append('div')
                .attr('id', function (d) { return d.value.id; })
                .attr('class', 'button-box button-box-first button-box-last');

            buttonBox.append('div')
                .attr('class', 'button-box-title')
                .text(function (d) { return d.value.text; });

            buttonBox.append('div')
                .attr('class', 'button-options')
              .selectAll('div')
                .data(function (d) { return d.value.buttons; })
              .enter().append('div')
                .attr('class', function (d) { return d.value.className + ' ' + (d.value.active ? 'btn-active' : 'btn-inactive'); })
                .text(function (d) { return d.value.text; })
                .on('click', function (d) {
                    if (d.value.pre) {
                        d.value.pre(that, _data, _config);
                    }

                    if (d.value.post) {
                        d.value.post(that, _dataTransform(_data, _config), _config);
                    }
                    deactivateChildButtons(this.parentNode);
                    activateSelf(this);
                });

                function activateSelf (button) {
                    d3.select(button)
                        .each(function (d) {
                            this.className = this.className.replace
                                (/(?:^|\s)btn-inactive(?!\S)/g, ' btn-active');
                        });
                }

                function deactivateChildButtons (button) {
                    d3.select(button).selectAll('div')
                        .each(function (d) {
                            this.className = this.className.replace
                                (/(?:^|\s)btn-active(?!\S)/g, ' btn-inactive');
                        });
                }

        }


    };

    function transformPseudo (data, x, y) {
        var min = Math.min.apply(null, y.domain());
        var scalingFactor = 32;
        var quad = Math.abs(y.domain()[0] - y.domain()[1]) / scalingFactor;
        var viewerLeft = data.metadata.position.viewer.left * data.metadata.width;
        var viewerRight = data.metadata.position.viewer.right * data.metadata.width;
        var viewerTop = data.metadata.position.viewer.top * data.metadata.height;
        var viewerBottom = data.metadata.position.viewer.bottom * data.metadata.height;

        var emptyBox = {
            key: 'normal',
            value: {
                high_whisker: min + ((scalingFactor / 2) - 1) * quad,
                q3: min + ((scalingFactor / 2) + 1) * quad,
                median: min + ((scalingFactor / 2) - 1) * quad,
                q1: min + ((scalingFactor / 2) - 1) * quad,
                low_whisker: min + ((scalingFactor / 2) - 1) * quad,
                outliers: [],
                color: 'grey',
                extra: {
                    opacity: 0.1
                },
                noData: true
            }
        };

        function addTooltipToEmptyBox (input) {
            var copyBox = JSON.parse(JSON.stringify(emptyBox));
            if (input && input.value && input.value.extra) {
                copyBox.value.extra.toolTip = input.value.extra.toolTip;
            }
            return copyBox;
        }

        return {
            metadata: {
                x: viewerLeft,
                y: viewerTop,
                width: viewerRight - viewerLeft,
                height: viewerBottom - viewerTop,
                outlierStroke: data.metadata.outlierStroke,
                whiskerStroke: data.metadata.whiskerStroke,
                outlierJitter: data.metadata.outlierJitter,
                outlierRadius: data.metadata.outlierRadius
            },
            data: data.data.map(function (boxGroup) {
                return {
                    key: boxGroup.key,
                    axisLine: boxGroup.axisLine,
                    value: boxGroup.value.map(function (box, i) {
                        return box.key ? box : addTooltipToEmptyBox(box);
                    })
                };
            })
        };
    }



    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    "use strict";

    plotviz.options = {
        orientation: 'horizontal',
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "12px",
        scale: 'linear',
        sorting: 'alphabetical',
        selection: 'full',
        circles: 'on',
        lines: 'on',
        type: 'expression',
        subtype: 'all',
        isoformFocus: undefined,
        svg: false,
        filter_category: undefined,
        subisoexpression: undefined,
        debug: false
    };

    plotviz.rawPlotData = undefined;

    plotviz.root = undefined;
    plotviz.rootDivName = undefined;

    plotviz.tooltip = null;

    plotviz.controls = undefined;

    plotviz.userMainPanelMouseMoveSVG = null;
    plotviz.userMainPanelOutlierMouseMoveSVG = null;
    plotviz.userRightPanelMouseMoveSVG = null;
    plotviz.userRightPanelMouseClickSVG = null;
    plotviz.userBottomPanelMouseMoveSVG = null;
    plotviz.userBottomPanelMouseClickSVG = null;
    plotviz.userMainPanelMouseMove = null;
    plotviz.userMainPanelOutlierMouseMove = null;
    plotviz.userRightPanelMouseMove = null;
    plotviz.userRightPanelMouseClick = null;
    plotviz.userBottomPanelMouseMove = null;
    plotviz.userBottomPanelMouseClick = null;

    plotviz.majorSort = null;
    plotviz.minorSort = null;


    plotviz.setMajorSort = function (func) {
        plotviz.majorSort = func;
    };


    plotviz.setMinorSort = function (func) {
        plotviz.minorSort = func;
    };


    /** Activates the main panel's onmousemove event with result. */
    plotviz.setMainPanelMouseMoveSVG = function (func) {
        plotviz.userMainPanelMouseMoveSVG = func;
        plotviz.userMainPanelMouseMove = func;
    };

    plotviz.setMainPanelMouseMove = plotviz.setMainPanelMouseMoveSVG;

    /** Activates the right panel's onmousemove event with result. */
    plotviz.setRightPanelMouseMoveSVG = function (func) {
        plotviz.userRightPanelMouseMoveSVG = func;
    };

    plotviz.setRightPanelMouseMove = plotviz.setRightPanelMouseMoveSVG;

    /** Activates the right panel's onclick event with result. */
    plotviz.setRightPanelMouseClickSVG = function (func) {
        plotviz.userRightPanelMouseClickSVG = func;
    };

    plotviz.setRightPanelMouseClick = plotviz.setRightPanelMouseClickSVG;

    /** Activates the bottom panel's onmousemove event with result. */
    plotviz.setBottomPanelMouseMoveSVG = function (func) {
        plotviz.userBottomPanelMouseMoveSVG = func;
    };

    plotviz.setBottomPanelMouseMove = plotviz.setBottomPanelMouseMoveSVG;

    /** Activates the bottom panel's onclick event with result. */
    plotviz.setBottomPanelMouseClickSVG = function (func) {
        plotviz.userBottomPanelMouseClickSVG = func;
    };

    plotviz.setBottomPanelMouseClick = plotviz.setBottomPanelMouseClickSVG;

    /** Activates the outlier's onmousemove event with result. */
    plotviz.setMainPanelOutlierMouseMoveSVG = function (func) {
        plotviz.userMainPanelOutlierMouseMove = func;
    };

    plotviz.setMainPanelOutlierMouseMove = plotviz.setMainPanelOutlierMouseMoveSVG;

    /** Tests if visualization works correctly. */
    plotviz.test = function () {
        //var data = plotviz.testInput2;
        var data = plotviz.normalInput;
        plotviz.loadData(data);
        plotviz.setMainPanelMouseMove(function (x, y, d) {
            console.log('Mousing over main panel ' + x + ', ' + JSON.stringify(d) + ', ' + y);
            return d.color + '</br>' + d.extra.num_ticks;
        });
        plotviz.setMainPanelOutlierMouseMove(function (x, y, d) {
            console.log('Mousing over outlier ' + x + ', ' + JSON.stringify(d) + ', ' + y);
            return d.outlier + '</br>' + d.extra;
        });
        plotviz.setRightPanelMouseMove(function (x, y, d) {
            console.log('Mousing over right panel ' + x + ', ' + JSON.stringify(d) + ', ' + y);
        });
        plotviz.setRightPanelMouseClick(function (x, y, d) {
            console.log(d.key + " " + d.value + " Right Panel Click");
        });
        plotviz.setBottomPanelMouseMove(function (x, y, d) {
            console.log('Mousing over bottom panel ' + x + ', ' + JSON.stringify(d) + ', ' + y);
        });
        plotviz.setBottomPanelMouseClick(function (x, y, d) {
            console.log(JSON.stringify(d) + " Bottom Panel Click");
        });
        plotviz.setMajorSort(function (a, b) {
            var oddVal = a.value.filter(function (x) { return 'odd' === x.key; })[0].value.median;
            var oddVal2 = b.value.filter(function (x) { return 'odd' === x.key; })[0].value.median;
            return oddVal < oddVal2;
        });
        plotviz.startSVG(plotviz.rawPlotData);
    };


    /**
     * Creates the root node and panels. 
     *
     * @returns - HTMLElement - Returns the root node to be appended to a
     *                          container div.
     */
    plotviz.createSVGRoot = function () {
        var root, buttonsDiv, svgRoot, mainPanel, rightPanel,
            data = plotviz.rawPlotData;

        root = document.createElement('div');
        root.id = "plotviz-rootDiv";
        root.className = "plotviz-rootClass-horizontal";
        root.style.position = 'relative';
        plotviz.rootName = "plotviz-rootDiv";

        /* The left and right panels always maintain the same sizes no matter
            the window size. */

        plotviz.root = root;
        buttonsDiv = plotviz.createControlsSVG(data);

        root.appendChild(buttonsDiv);

        svgRoot = d3.select(root).append('svg').attr({
            id: 'svg-plotviz-root',
            width: '100%',
            height: '100%'
        });

        d3.select(root).append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute');

        svgRoot.append('g').attr({
            id: 'svg-plotviz-titlePanel'
        })
          .append('text').attr('id', 'titleLabel');

        mainPanel = svgRoot.append('g').attr({
            id: 'svg-plotviz-mainPanel'
        });

        mainPanel.append('rect').attr({
            x: 0,
            y: 0,
            width: data.metadata.width,
            height: data.metadata.height,
            'class': 'mainPanelBorder'
        })
        .style({
            stroke: 'black',
            fill: 'none',
            'stroke-width': 2
        });

        mainPanel.append('g').attr('class', 'rects');
        mainPanel.append('g').attr('class', 'under-lines');
        mainPanel.append('g').attr('class', 'over-lines');
        mainPanel.append('g').attr('class', 'significance-line');
        svgRoot.append('g').attr('class', 'crosshair')
            //.attr('transform', 'translate(200, 200)')
          .selectAll('line')
            .data([
                {
                    x1: 0,
                    y1: 0,
                    x2: plotviz.rawPlotData.metadata.width,
                    y2: 0
                },
                {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: plotviz.rawPlotData.metadata.height
                }
            ])
          .enter().append('line')
            .attr({
                x1: function (d) { return d.x1; },
                y1: function (d) { return d.y1; },
                x2: function (d) { return d.x2; },
                y2: function (d) { return d.y2; }
            })
            .style({
                stroke: 'red',
                'stroke-width': 1,
            });
       // mainPanel.selectAll('rect')
            svgRoot.on('mousemove', function (d) {
                //console.log('crosshairs ' + d3.event.pageX + ' ' + d3.event.pageY);
                var newMouseX = d3.mouse(this)[0] - 2;
                var newMouseY= d3.mouse(this)[1] - 2;
                data.metadata.position = data.metadata.position || {};
                data.metadata.position.viewer = data.metadata.position.position || {};
                var viewerProportionLeft = data.metadata.position.viewer.left || 1/7;
                var viewerProportionTop = data.metadata.position.viewer.top || 1/4;
                var viewerProportionRight = data.metadata.position.viewer.right || 6/7;
                var viewerProportionBottom = data.metadata.position.viewer.bottom || 3/4;
                var viewerLeft = viewerProportionLeft * data.metadata.width;
                var viewerTop = viewerProportionTop * data.metadata.height;
                var viewerRight = viewerProportionRight * data.metadata.width;
                var viewerBottom = viewerProportionBottom * data.metadata.height;

                d3.select('g.crosshair')
                  .selectAll('line')
                    .data([
                        {
                            // TODO Error checking on the input
                            x1: viewerLeft,
                            y1: Math.min(Math.max(newMouseY, viewerTop), viewerBottom),
                            x2: viewerRight,
                            y2: Math.min(Math.max(newMouseY, viewerTop), viewerBottom)
                        },
                        {
                            x1: Math.min(Math.max(newMouseX, viewerLeft), viewerRight),
                            y1: viewerTop,
                            x2: Math.min(Math.max(newMouseX, viewerLeft), viewerRight),
                            y2: viewerBottom
                        }
                    ])
                .attr({
                    x1: function (d) { return d.x1; },
                    y1: function (d) { return d.y1; },
                    x2: function (d) { return d.x2; },
                    y2: function (d) { return d.y2; }
                })
                .style({
                    stroke: 'red',
                    'stroke-width': 1
                });
            });

        svgRoot.append('g').attr({
            id: 'svg-plotviz-bottomPanel',
            'class': 'x axis'
        })
          .append('text').attr('id', 'xlabel');

        svgRoot.append('g').attr({
            id: 'svg-plotviz-leftPanel',
            'class': 'y axis'
        })
          .append('text').attr('id', 'ylabel');

        rightPanel = svgRoot.append('g').attr('id', 'svg-plotviz-rightPanel');
        rightPanel.append('g')
            .attr('id', 'legend-text');
        rightPanel.append('g')
            .attr('id', 'legend-rects');
        rightPanel.append('rect').attr({
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            'class': 'legendBorder'
        })
        .style({
            stroke: 'black',
            fill: 'none',
            'stroke-width': 1
        });

        var oldresize = function () {};

        if (window.onresize) {
            oldresize = window.onresize.bind(window);
        }

        function newresize (event) {
            // TODO: Figure out what the behavior should be
            plotviz.renderSVG(plotviz.rawPlotData);
        }

        window.onresize = function (event) {
            oldresize.apply(window, event);
            newresize.apply(window, event);
        };

        return root;
    };

    plotviz.createRoot = plotviz.createSVGRoot;


    /**
     * Loads the JSON into the visualization.
     *
     * @param - JSON - data - A specific format for how the visualization
     *                          metadata and active data should be supplied.
     */
    plotviz.loadData = function (data) {
        plotviz.rawPlotData = JSON.parse(JSON.stringify(data));
    };


    /**
     * Creates the optional controls at the top of the visualization.
     *
     * @param - JSON - data - The data being visualized. May be used to
     *                      determine how a control behaves. To be
     *                      soon possibly removed.
     *
     * @returns - HTMLElement - Returns the div containing all the controls.
     */
    plotviz.createControlsSVG = function (data) {
        var buttonsDiv,
            floatWrap,
            componentsToInclude,
            defaultButtons;

        buttonsDiv = document.createElement('div');
        floatWrap = document.createElement('div');

        buttonsDiv.id = "plotviz-controlDiv";
        buttonsDiv.className = "plotviz-controlClass";
        floatWrap.className = "plotviz-floatWrap";

        buttonsDiv.style.position = 'absolute';

        data.metadata.position = data.metadata.position || {};
        data.metadata.position.control = data.metadata.position.control || {};

        var width = data.metadata.width;
        var height = data.metadata.height;

        var controlProportionLeft = data.metadata.position.control.left || 1/8;
        var controlProportionTop = data.metadata.position.control.top || 7/8;
        var controlLeft = controlProportionLeft * width;
        var controlTop = controlProportionTop * height;

        buttonsDiv.style.left = controlLeft + 'px';
        buttonsDiv.style.top = controlTop + 'px';

        buttonsDiv.appendChild(floatWrap);
        plotviz.options.type = 'expression';

        defaultButtons = [
            'orientation',
            'scaling',
            'sorting'
        ];

        componentsToInclude = (plotviz.controls ? plotviz.controls : defaultButtons);

        // Includes only enabled elements from the desired list of components to include
        componentsToInclude.forEach(
            function (element, index, array) {
                var option;
                if(plotviz.interfaceComponentsSVG[element].enabled) {
                    option = plotviz.options[plotviz.interfaceComponentsSVG[element].option];
                    floatWrap.appendChild(plotviz.interfaceComponentsSVG[element].func(plotviz.options));
                }
            }
        );

        return buttonsDiv;
    };

    /** Starts the instantiated visualization.  */
    plotviz.startSVG = function () {
        plotviz.renderSVG(plotviz.globalSortSVG(plotviz.rawPlotData,
                                            plotviz.options.sorting,
                                            plotviz.options.sorting));
    };

    plotviz.start = plotviz.startSVG;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function AxisPanel (svg, id, data) {
        var _svg = svg;
        var _id = id;
        var _panel = null;
        var _label = null;
        var _tooltip = null;
        var _tooltipFunc = null;
        var _mouseclick = null;
        var _data = data;

        this.tooltipPanel = function (tooltip) {
            if (tooltip) {
                _tooltip = tooltip;
                return this;
            } else {
                return _tooltip;
            }
        };

        this.tooltipFunction = function (func) {
            if (func) {
                _tooltipFunc = func;
                return this;
            } else {
                return _tooltipFunc;
            }
        };

        this.mouseclick = function (func) {
            if (func) { _mouseclick = func; }
            return func ? this : _mouseclick;
        };

        _panel = _svg.append('g').attr({
                id: _id,
                'class': 'axis',
                transform: 'translate(' + data.x + ',' + data.y + ')'
            });

        _panel.append('text').attr('id', _id + '-label')
            .on('mousemove', function (d, i) {
                if (_tooltipFunc) {
                    var tooltipInput = {
                        key: 'tooltip',
                        value: {
                            type: _id + '-label',
                            data: d
                        }
                    };

                    var xy = d3.mouse(_svg.node());

                    _tooltip
                        .style({
                            left: (xy[0] + 20) + 'px',
                            top: (xy[1] + 20) + 'px',
                            color: 'white',
                            'font-weight': 'bold',
                            background: 'rgba(0,0,0,0.75)',
                            padding: '12px',
                            'border-radius': '2px',
                            'line-height': 1,
                            display: ''
                        })
                        .html(_tooltipFunc(xy[0], xy[1], tooltipInput));
                }
            })
            .on('mouseout', function () {
                _tooltip.style('display', 'none');
            })
            .on('click', function (d, i) {
                if (_mouseclick) {
                    var mouseclickInput = {
                        key: 'mouseclick',
                        value: {
                            type: 'axis',
                            subtype: 'text',
                            id: _id,
                            data: d.raw
                        }
                    };
                    var xy = d3.mouse(_svg.node());
                    _mouseclick(xy[0], xy[1], mouseclickInput);
                }
            });


        this.render = function (data) {
            var axis = _panel.call(d3.svg.axis()
                                    .scale(data.axis)
                                    .orient(data.orientation));

            if ('left' === data.orientation) {
                axis.attr('transform', 'translate(' + data.x + ',' + data.y + ')');
                // TODO: Generalize positioning the label.
                _panel.select('#' + _id + '-label')
                    .attr('transform', 'translate(' + (data.labelX - data.x) + ',' + (data.labelY) + ') rotate(' + (-data.rotation) + ')')
                    .style({
                        'text-anchor': 'middle',
                        stroke: data.label.search('xlink') >= 0 ? 'blue' : 'none',
                        'shape-rendering': 'crispEdges',
                        'text-decoration': data.label.search('xlink') >= 0 ? 'underline' : 'none',
                        'font-size': _data.fontSize ? _data.fontSize + 'px' : '16px',
                        'fill': _data.fill ? _data.fill : '#000'
                    })
                    .html(data.label);

                axis.selectAll('path')
                    .style({
                        fill: 'none',
                        stroke: 'none',
                        'shape-rendering': 'crispEdges'
                    });

                axis.selectAll('g.tick line')
                    .style({
                        fill: 'none',
                        stroke: '#000',
                        'shape-rendering': 'crispEdges'
                    });

                axis.selectAll('g.tick text')
                    .style({
                        'shape-rendering': 'crispEdges',
                        'font-size': _data.fontSize ? _data.fontSize + 'px' : '14px',
                        'fill': _data.fill ? _data.fill : '#000',
                        'font-family': 'sans-serif'
                    });


                axis.selectAll('.tick')
                    .on('mousemove', function (d) {
                        if (_tooltipFunc) {
                            var tooltipInput = {
                                key: 'tooltip',
                                value: {
                                    type: 'tick',
                                    id: _id,
                                    data: d.raw
                                }
                            };
                            var tooltipText = _tooltipFunc(d3.mouse(_svg.node())[0], d3.mouse(_svg.node())[1], tooltipInput);
                            _tooltip
                                .style({
                                    left: (d3.mouse(_svg.node())[0] + 20) + 'px',
                                    top: (d3.mouse(_svg.node())[1] + 20) + 'px',
                                    color: 'white',
                                    'font-weight': 'bold',
                                    background: 'rgba(0,0,0,0.75)',
                                    padding: '12px',
                                    'border-radius': '2px',
                                    'line-height': 1,
                                    display: tooltipText ? '' : 'none'
                                })
                                .html(tooltipText);
                        }
                    })
                    .on('mouseout', function () {
                        _tooltip.style('display', 'none');
                    });
            }

            if ('bottom' === data.orientation) {
                axis.attr('transform', 'translate(' + data.x + ',' + data.y + ')');
                _panel.select('#' + _id + '-label')
                    .attr('transform', 'translate(' + data.labelX + ',' + data.labelY + ')')
                    .style({
                        'text-anchor': 'middle',
                        stroke: data.label.search('xlink') >= 0 ? 'blue' : 'none',
                        'shape-rendering': 'crispEdges',
                        'text-decoration': data.label.search('xlink') >= 0 ? 'underline' : 'none',
                        'font-size': _data.fontSize ? _data.fontSize : '16px',
                        'fill': _data.fill ? _data.fill : '#000'
                    })
                    .html(data.label);

                // TODO: Make this configurable. Especially text rotation.
                var anchor = data.tickAlign;
                anchor = anchor || 'middle';
                anchor = 'center' === anchor ? 'middle' : anchor;

                axis.selectAll('g.tick text')
                    .attr('transform', 'translate(' + data.tickTranslate + ') rotate(' + data.tickRotation + ')')
                    .style({
                        'text-anchor': anchor,
                        'font-family': 'sans-serif'
                    });

                var tempData = axis.selectAll('g.tick text').data();
                tempData = tempData.map(function (d) {return d.split('<br/>');});

                axis.selectAll('g.tick text')
                    .data(tempData).text('');
                axis.selectAll('g.tick text')
                  .selectAll('tspan')
                    .data(function (d) {return d;})
                  .enter().append('tspan')
                    .text(function (d) {return d;})
                    .attr({
                        x: 0,
                        dy: function (d, i) {return 15;}
                    });

                axis.selectAll('path')
                    .style({
                        fill: 'none',
                        stroke: 'none',
                        'shape-rendering': 'crispEdges'
                    });

                axis.selectAll('g.tick line')
                    .style({
                        fill: 'none',
                        stroke: '#000',
                        'shape-rendering': 'crispEdges'
                    });

                axis.selectAll('g.tick text')
                    .style({
                        'shape-rendering': 'crispEdges',
                        'font-size': _data.fontSize ? _data.fontSize + 'px' : '14px',
                        'fill': _data.fill ? _data.fill : '#000'
                    });

                axis.selectAll('.tick')
                    .on('mousemove', function (d) {
                        if (_tooltipFunc) {
                            var tooltipInput = {
                                key: 'tooltip',
                                value: {
                                    type: 'tick',
                                    id: _id,
                                    data: d.raw
                                }
                            };

                            var tooltipText = _tooltipFunc(d3.mouse(_svg.node())[0], d3.mouse(_svg.node())[1], tooltipInput);
                            _tooltip
                                .style({
                                    left: (d3.mouse(_svg.node())[0] + 20) + 'px',
                                    top: (d3.mouse(_svg.node())[1] + 20) + 'px',
                                    color: 'white',
                                    'font-weight': 'bold',
                                    background: 'rgba(0,0,0,0.75)',
                                    padding: '12px',
                                    'border-radius': '2px',
                                    'line-height': 1,
                                    display: tooltipText ? '' : 'none'
                                })
                                .html(tooltipText);
                            if (null === tooltipText) {
                                _tooltip.style('display', 'none');
                            }
                        }
                    })
                    .on('mouseout', function () {
                        _tooltip.style('display', 'none');
                    })
                    .on('click', function (d, i) {
                        if (_mouseclick) {
                            var mouseclickInput = {
                                key: 'mouseclick',
                                value: {
                                    type: 'axis',
                                    subtype: 'tick',
                                    id: _id,
                                    data: d
                                }
                            };
                            var xy = d3.mouse(_svg.node());
                            _mouseclick(xy[0], xy[1], mouseclickInput);
                        }
                    });
            }
        };

    }

    plotviz.AxisPanel = AxisPanel;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function BoxWhiskerViewer (svg, id, data) {
        var _svg = svg;
        var _id = id;
        var _panel = null;
        var _tooltip = null;
        var _tooltipFunc = null;
        var _data = data;

        _panel = _svg.append('g')
            .attr({
                id: id,
                transform: 'translate(' + data.metadata.x + ',' + data.metadata.y + ')'
            });

        _panel.append('rect').attr({
            x: 0,
            y: 0,
            width: data.metadata.width,
            height: data.metadata.height,
            'class': 'border',
        })
        .style({
            stroke: 'black',
            fill: 'none',
            'stroke-width': 2
        });

        _panel.append('g').attr('class', 'under-lines');
        _panel.append('g').attr('class', 'rects');
        _panel.append('g').attr('class', 'whisker-lines');
        _panel.append('g').attr('class', 'outliers');
        _panel.append('g').attr('class', 'median-lines');
        _panel.append('g').attr('class', 'significance-line');

        this.tooltipPanel = function (tooltip) {
            if (tooltip) {
                _tooltip = tooltip;
                return this;
            } else {
                return _tooltip;
            }
        };

        this.tooltipFunction = function (func) {
            if (func) {
                _tooltipFunc = func;
                return this;
            } else {
                return _tooltipFunc;
            }
        };

        this.render = function (data, x, y, config) {
            _data = data;
            _svg.select('g#' + _id).attr('transform', 'translate(' + data.metadata.x + ',' + data.metadata.y + ')');
            _panel.select('.border').attr({ width:data.metadata.width, height: data.metadata.height });
            addRectangles(data.data, _panel.select('.rects'), x, y);
            addUnderLines(data.data, _panel.select('.under-lines'), x, y);
            addWhiskerLines(data.data, _panel.select('.whisker-lines'), x, y, config);
            addOutliers(data.data, _panel.select('.outliers'), x, y, config);
            addMedianLines(data.data, _panel.select('.median-lines'), x, y);
            //addSignificanceLine(data.data, _panel.select('.significance-line'), x, y, config);
        };

        function addSignificanceLine (data, panel, x, y, config) {
            var lineData = d3.range(0, _data.metadata.width, parseInt(_data.metadata.width / 100)).map(function (d) {
                    return d;
                });

            var lineSelection = panel.selectAll('line').data(lineData);
            lineSelection.exit().remove();
            lineSelection.enter().append('line');
            // Fix for IE11
            Math.log10 = Math.log10 || function (x) { return Math.log(x) / Math.log(10); };
            var significanceValue = 'log' === config.scale ? Math.log10(0.1 + 0.05) : 0.1;

            lineSelection.attr({
                x1: function (d) {return d;},
                y1: y(significanceValue),
                x2: function (d) {return d + (_data.metadata.width / 200);},
                y2: y(significanceValue)
            }).style({
                'stroke': '#aaa',
                'stroke-width': 1
            });
        }

        function addRectangles (data, panel, x, y) {
            var rectData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.value.map(function (box) {
                    return box.key;
                });
                var boxGroupValueMap = boxGroup.value.map(function (box, i) {
                    var testPadding = x.rangeBand() / minorKeys.length;
                    var realPadding = (_data.metadata.boxGroupSpacing || 0.1) * testPadding >= 2 ? (_data.metadata.boxGroupSpacing || 0.1) : 2 / testPadding;
                    var minorX = d3.scale.ordinal()
                                    .domain(minorKeys)
                                    .rangeBands([0, x.rangeBand()]);
                    return {
                        q3: y(box.value.q3),
                        q1: y(box.value.q1),
                        boxStart: x(boxGroup.key) + minorX(box.key),
                        boxWidth: minorX.rangeBand(),
                        color: box.value.color,
                        extra: box.value.extra,
                        raw: box
                    };
                });
                if (boxGroup.axisLine) {
                    boxGroupValueMap.push({
                        q3: 10 + y.range()[0] + (y.range()[1] - y.range()[0])/100,
                        q1: 10 + y.range()[0],
                        boxStart: x(boxGroup.key),
                        boxWidth: x.rangeBand(),
                        color: boxGroup.axisLine.color,
                        extra: {opacity: 1}
                    });
                }

                return boxGroupValueMap;
            })
            .reduce(function (boxGroupA, boxGroupB) {
                return boxGroupA.concat(boxGroupB);
            });

            var rectSelection = panel.selectAll('rect').data(rectData);
            rectSelection.exit().remove();
            rectSelection.enter().append('rect');

            rectSelection.attr({
                x: function (d) { return d.boxStart; },
                y: function (d) { return d.q3; },
                width: function (d) { return d.boxWidth; },
                height: function (d) { return d.q1 - d.q3; }
            })
            .style({
                fill: function (d) { return d.color; },
                stroke: '#aaa',
                'stroke-width': 1,
                opacity: function (d) { return d.extra.opacity; }
            })
            .on('mousemove', function (d, i) {
                if (_tooltipFunc) {
                    var tooltipInput = {
                        key: 'tooltip',
                        value: {
                            type: 'box',
                            data: d.raw
                        }
                    };

                    var tooltipText = _tooltipFunc(d3.mouse(_svg.node())[0], d3.mouse(_svg.node())[1], tooltipInput);

                    _tooltip
                        .style({
                            left: (d3.mouse(_svg.node())[0] + 20) + 'px',
                            top: (d3.mouse(_svg.node())[1] + 20) + 'px',
                            color: 'white',
                            'font-weight': 'bold',
                            background: 'rgba(0,0,0,0.75)',
                            padding: '12px',
                            'border-radius': '2px',
                            'line-height': 1,
                            display: '',
                            opacity: 1
                        })
                        .html(tooltipText);
                    if (null === tooltipText) {
                        _tooltip.style('display', 'none');
                    }
                }
            })
            .on('mouseout', function (d) {
                _tooltip.style('display', 'none');
            });
        }

        function addUnderLines (data, panel, x, y) {
            var lineData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.value.map(function (box) {
                    return box.key;
                });
                return boxGroup.value.map(function (box) {
                    var minorX = d3.scale.ordinal()
                                    .domain(minorKeys)
                                    .rangeBands([0, x.rangeBand()], 0.1);
                    // TODO: Remove these quality control checks that
                    // fall back in case certain values aren't provided
                    return box.noData ? null : {
                        xAxis: x(boxGroup.key) + minorX(box.key) + minorX.rangeBand() / 2,
                        valueLow: y(box.value.low_whisker || box.value.median || 0),
                        valueHigh: y(box.value.high_whisker || box.value.median || 0),
                        opacity: box.value.extra.whiskerOpacity === 0 ? 0 : (box.value.extra.whiskerOpacity || (box.value.extra.opacity === 0 ? 0 : (box.value.extra.opacity || 1)))
                    };
                })
                .filter(function (underlines) {
                    return underlines ? true : false;
                });
            })
            .reduce(function (lineGroupA, lineGroupB) {
                return lineGroupA.concat(lineGroupB);
            });

            var lineSelection = panel.selectAll('line').data(lineData);
            lineSelection.exit().remove();
            lineSelection.enter().append('line');

            lineSelection.attr({
                x1: function (d) { return d.xAxis; },
                y1: function (d) { return d.valueHigh; },
                x2: function (d) { return d.xAxis; },
                y2: function (d) { return d.valueLow; }
            })
            .style('opacity', function (d) { return d.opacity; });

            lineSelection.style({
                stroke: _data.metadata.whiskerStroke || '#aaa',
                'stroke-width': 1
            });
        }

        function addWhiskerLines (data, panel, x, y) {
            var lineData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.value.map(function (box) {
                    return box.key;
                });
                return boxGroup.value.map(function (box) {
                    var minorX = d3.scale.ordinal()
                                        .domain(minorKeys)
                                        .rangeBands([0, x.rangeBand()], boxGroup.value.length > 1 ? 0.1 : 0);
                    return box.noData ? null : [
                        {
                            labelLower: x(boxGroup.key) + minorX(box.key) + minorX.rangeBand() / 4,
                            yAxis: y(box.value.high_whisker || box.value.q3 || box.value.median),
                            labelHigher: x(boxGroup.key) + minorX(box.key) + 3 * minorX.rangeBand() / 4,
                            opacity: box.value.extra.whiskerOpacity === 0 ? 0 : (box.value.extra.whiskerOpacity || (box.value.extra.opacity === 0 ? 0 : (box.value.extra.opacity || 1)))
                        },
                        {
                            labelLower: x(boxGroup.key) + minorX(box.key) + minorX.rangeBand() / 4,
                            yAxis: y(box.value.low_whisker || box.value.q1 || box.value.median),
                            labelHigher: x(boxGroup.key) + minorX(box.key) + 3 * minorX.rangeBand() / 4,
                            opacity: box.value.extra.whiskerOpacity === 0 ? 0 : (box.value.extra.whiskerOpacity || (box.value.extra.opacity === 0 ? 0 : (box.value.extra.opacity || 1)))
                        }];
                })
                .filter(function (lines) {
                    return lines ? true : false;
                })
                .reduce(function (linesA, linesB) {
                    return linesA.concat(linesB);
                });
            })
            .reduce(function (lineGroupA, lineGroupB) {
                return lineGroupA.concat(lineGroupB);
            });

            var lineSelection = panel.selectAll('line').data(lineData);
            lineSelection.exit().remove();
            lineSelection.enter().append('line');

            lineSelection.attr({
                x1: function (d) { return d.labelLower; },
                y1: function (d) { return d.yAxis; },
                x2: function (d) { return d.labelHigher; },
                y2: function (d) { return d.yAxis; }
            })
            .style({
                opacity: function (d) { return d.opacity; },
                stroke: _data.metadata.whiskerStroke || '#aaa',
                'stroke-width': 1
            });
        }

        function addMedianLines (data, panel, x, y) {
            var lineData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.value.map(function (box) {
                    return box.key;
                });
                return boxGroup.value.map(function (box) {
                    var minorX = d3.scale.ordinal()
                                        .domain(minorKeys)
                                        .rangeBands([0, x.rangeBand()], boxGroup.value.length > 1 ? 0.1 : 0);
                    return box.noData ? null : [{
                            labelLower: x(boxGroup.key) + minorX(box.key),
                            yAxis: y(box.value.median),
                            labelHigher: x(boxGroup.key) + minorX(box.key) + minorX.rangeBand(),
                            opacity: box.value.extra.medianOpacity === 0 ? 0 : (box.value.extra.medianOpacity || (box.value.extra.opacity === 0 ? 0 : (box.value.extra.opacity || 1))),
                            medianColor: box.value.extra.medianColor,
                        }];
                })
                .filter(function (lines) {
                    return lines ? true : false;
                })
                .reduce(function (linesA, linesB) {
                    return linesA.concat(linesB);
                });
            })
            .reduce(function (lineGroupA, lineGroupB) {
                return lineGroupA.concat(lineGroupB);
            });

            var lineSelection = panel.selectAll('line').data(lineData);
            lineSelection.exit().remove();
            lineSelection.enter().append('line');

            lineSelection.attr({
                x1: function (d) { return d.labelLower; },
                y1: function (d) { return d.yAxis; },
                x2: function (d) { return d.labelHigher; },
                y2: function (d) { return d.yAxis; }
            })
            .style({
                opacity: function (d) { return d.opacity; },
                stroke: function (d) { return d.medianColor || 'black'; },
                'stroke-width': 2
            });
        }

        function addOutliers (data, panel, x, y, config) {
            var jitterBound = 0;
            var outlierData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.value.map(function (box) {
                    return box.key;
                });
                return boxGroup.value.map(function (box) {
                    var minorX = d3.scale.ordinal()
                        .domain(minorKeys)
                        .rangeBands([0, x.rangeBand()], boxGroup.value.length > 1 ? 0.1 : 0);
                    jitterBound = minorX.rangeBand();
                    return box.value.outliers.map(function (outlier) {
                        return {
                            boxStart: x(boxGroup.key) + minorX(box.key),
                            boxWidth: minorX.rangeBand(),
                            outlier: y(outlier.value.outlier),
                            raw: outlier,
                            opacity: box.value.extra.outlierOpacity === 0 ? 0 : (box.value.extra.outlierOpacity || (box.value.extra.opacity === 0 ? 0 : (box.value.extra.opacity || 1)))
                        };
                    });
                })
                .reduce(function (boxOutliersA, boxOutliersB) {
                    return boxOutliersA.concat(boxOutliersB);
                });
            })
            .reduce(function (boxGroupOutliersA, boxGroupOutliersB) {
                return boxGroupOutliersA.concat(boxGroupOutliersB);
            });

            var outlierSelection = panel.selectAll('circle').data(outlierData);
            outlierSelection.exit().remove();
            outlierSelection.enter().append('circle');
            var jitter = (_data.metadata.outlierJitter || 0) * jitterBound;
            outlierSelection.attr({
                cx: function (d) { return d.boxStart + (d.boxWidth / 2) + (Math.random() * jitter) - (jitter / 2); },
                cy: function (d) { return d.outlier; },
                r: function (d) { return _data.metadata.outlierRadius || 2; }
            })
            .style({
                fill: 'none',
                opacity: function (d) { return d.opacity; },
                stroke: _data.metadata.outlierStroke || '#aaa',
                display: config.outliers === 'on' ? '' : 'none'
            })
            .on('mousemove', function (d) {
                var tooltipInput = {
                    key: 'tooltip',
                    value: {
                        type: 'outlier',
                        data: d.raw
                    }
                };

                if (_tooltipFunc) {
                    _tooltip
                        .style({
                            left: (d3.mouse(_svg.node())[0] + 10) + 'px',
                            top: (d3.mouse(_svg.node())[1] + 20) + 'px',
                            color: 'white',
                            'font-weight': 'bold',
                            background: 'rgba(0,0,0,0.7)',
                            padding: '12px',
                            'border-radius': '2px',
                            'line-height': 1,
                            display: ''
                        })
                        .html(_tooltipFunc(d3.mouse(_svg.node())[0], d3.mouse(_svg.node())[1], tooltipInput));
                }
            })
            .on('mouseout', function (d) {
                _tooltip.style('display', 'none');
            });

        }

        this.dataTransform = function (data, config) {
            var newData = JSON.parse(JSON.stringify(data));

            if ('log' === config.scale) {
                newData = logTransform(data);
            }

            if ('only' === config.medians) {
                newData = mediansOnly(newData);
            }

            return newData;
        };

        function logTransform (data) {
            // Fix for IE11
            Math.log10 = Math.log10 || function (x) { return Math.log(x) / Math.log(10); };
            var transform = function (x) { return Math.log10(x + 0.05); };

            var newData = {};

            newData.legend = JSON.parse(JSON.stringify(data.legend));
            newData.metadata = JSON.parse(JSON.stringify(data.metadata));
            newData.data = data.data.map(function (boxGroup) {
                return {
                    key: boxGroup.key,
                    axisLine: boxGroup.axisLine,
                    value: boxGroup.value.map(function (box) {
                        return !(box.key) ? JSON.parse(JSON.stringify(box)) : {
                            key: box.key,
                            value: {
                                high_whisker: transform(box.value.high_whisker),
                                q3: transform(box.value.q3),
                                median: transform(box.value.median),
                                q1: transform(box.value.q1),
                                low_whisker: transform(box.value.low_whisker),
                                outliers: box.value.outliers.map(function (out) {
                                    return {
                                        key: out.key,
                                        value: {
                                            outlier: transform(out.value.outlier)
                                        }
                                    };
                                }),
                                color: box.value.color,
                                extra: JSON.parse(JSON.stringify(box.value.extra))
                            }
                        };
                    })
                };
            });
            return newData;
        }

        function mediansOnly (data) {
            var newData = {};

            newData.legend = JSON.parse(JSON.stringify(data.legend));
            newData.metadata = JSON.parse(JSON.stringify(data.metadata));
            newData.data = data.data.map(function (boxGroup) {
                return {
                    key: boxGroup.key,
                    axisLine: boxGroup.axisLine,
                    value: boxGroup.value.map(function (box) {
                        return !(box.key) ? JSON.parse(JSON.stringify(box)) : {
                            key: box.key,
                            value: {
                                high_whisker: box.value.median,
                                q3: box.value.median,
                                median: box.value.median,
                                q1: box.value.median,
                                low_whisker: box.value.median,
                                outliers: JSON.parse(JSON.stringify(box.value.outliers)),
                                color: box.value.color,
                                extra: JSON.parse(JSON.stringify(box.value.extra))
                            }
                        };
                    })
                };
            });

            return newData;
        }

        /**
         * Sorts the major and minor keys in the data to be visualized. Some
         * default sorting function options available are 'alphabetical',
         * 'increasing', and 'decreasing'. 'increasing' and 'decreasing' for the
         * minor keys base it on the median of the minor keys. 'increasing' and
         * 'decreasing' for the major keys base it on the average of the medians
         * for the minor keys in their grouping.
         *
         * @param - string/function - majorSortFunction - The function that will
         *          be used to sort the major keys. A string can be used to
         *          call and default supported sorting function.
         * @param - string/function - minorSortFunction - The function that will
         *          be used to sort the minor keys. A string can be used to
         *          call and default supported sorting function.
         */
        this.sort = function (data, config) {

            var newData = JSON.parse(JSON.stringify(data));
            if ('string' === typeof config.minorSort){
                if ('alphabetical' === config.minorSort) {
                    newData.data.forEach(function (boxList, bLIndex, bLArray) {
                        boxList.value.sort(function (a, b) {
                            return b.key < a.key;
                        });
                    });
                } else if ('increasing' === config.minorSort) {
                    newData.data.forEach(function (boxList, bLIndex, bLArray) {
                        boxList.value.sort(function (a, b) {
                            return a.value.median - b.value.median;
                        });
                    });
                } else {
                    newData.data.forEach(function (boxList, bLIndex, bLArray) {
                        boxList.value.sort(function (a, b) {
                            return b.value.median - a.value.median;
                        });
                    });
                }
            }

            if ('string' === typeof config.majorSort) {
                   if ('alphabetical' === config.majorSort) {
                    newData.data.sort(function (a, b) {
                        return b.key < a.key ? 1 : -1;
                    });
                } else if ('increasing' === config.majorSort) {
                    newData.data.sort(function (a, b) {
                        var aTotal = 0,
                            bTotal = 0;

                        aTotal = a.value.filter(function (d) { return d.value ? true : false; })
                            .map(function (d) { return d.value.median; })
                            .reduce(function (b1, b2) { return b1 + b2; }, 0);

                        bTotal = b.value.filter(function (d) { return d.value ? true : false; })
                            .map(function (d) { return d.value.median; })
                            .reduce(function (b1, b2) { return b1 + b2; }, 0);

                        aTotal /= a.value.filter(function (d) { return d ? true : false; }).length;
                        bTotal /= b.value.filter(function (d) { return d ? true : false; }).length;
                        return aTotal - bTotal;
                    });
                } else if ('decreasing' === config.majorSort) {
                    newData.data.sort(function (a, b) {
                        var aTotal = 0,
                            bTotal = 0;

                        a.value.forEach(function (box, index, array) {
                            aTotal += box.value.median;
                        });
                        b.value.forEach(function (box, index, array) {
                            bTotal += box.value.median;
                        });

                        aTotal /= a.value.length;
                        bTotal /= b.value.length;
                        return bTotal - aTotal;
                    });
                }
            }

            if ('function' === typeof config.majorSort) {
                newData.data.sort(config.majorSort);
            }

            if ('function' === typeof config.minorSort) {
                newData.data.forEach(function (boxList, bLIndex, bLArray) {
                    boxList.value.sort(config.minorSort);
                });
            }

            return newData;

        };

    }

    plotviz.BoxWhiskerViewer = BoxWhiskerViewer;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function Crosshair (svg, id, data) {
        var crosshairLineLength = 20;
        var _svg = svg;
        var _id = id;
        var _crosshair = null;

        _crosshair = _svg.append('g')
            .attr('class', 'crosshair')
            .attr('transform', 'translate(' + data.x + ',' + data.y + ')');

        _crosshair
          .selectAll('line')
            .data([
                {
                    x1: -crosshairLineLength,
                    y1: 0,
                    x2: crosshairLineLength,
                    y2: 0
                },
                {
                    x1: 0,
                    y1: data.height - crosshairLineLength,
                    x2: 0,
                    y2: data.height + crosshairLineLength
                }
            ])
          .enter().append('line')
            .attr({
                x1: function (d) { return d.x1; },
                y1: function (d) { return d.y1; },
                x2: function (d) { return d.x2; },
                y2: function (d) { return d.y2; }
            })
            .style({
                stroke: 'red',
                'stroke-width': 1,
                display: ''
            });

        this.show = function () { _crosshair.selectAll('line').style('display', ''); };
        this.hide = function () { _crosshair.selectAll('line').style('display', 'none'); };

        this.move = function (x, y) {
            _crosshair
              .selectAll('line')
                .data([
                    {
                        x1: -crosshairLineLength,
                        y1: y,
                        x2: crosshairLineLength,
                        y2: y
                    },
                    {
                        x1: x,
                        y1: data.height - crosshairLineLength,
                        x2: x,
                        y2: data.height + crosshairLineLength
                    }
                ])
                .attr({
                    x1: function (d) { return d.x1; },
                    y1: function (d) { return d.y1; },
                    x2: function (d) { return d.x2; },
                    y2: function (d) { return d.y2; }
                })
                .style({
                    stroke: 'red',
                    'stroke-width': 1,
                });
           };

    }

    plotviz.Crosshair = Crosshair;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function Legend (svg, id, metadata) {
        var _svg = svg;
        var _id = id;
        var _panel = null;
        var _mouseclick = null;
        var _mousemove = null;

        _panel = _svg.append('g')
            .attr({
                id: id,
                transform: 'translate(' + metadata.x + ',' + metadata.y + ')'
            });

        _panel.append('g').attr('class', 'legend-text');

        _panel.append('g').attr('class', 'legend-rects');

        _panel.append('rect').attr({
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            'class': 'legend-border'
        })
        .style({
            stroke: 'black',
            fill: 'none',
            'stroke-width': 1
        });

        this.mousemove = function (func) {
            if (func) {
                _mousemove = func;
                return this;
            } else {
                return _mousemove;
            }
        };

        this.mouseclick = function (func) {
            if (func) {
                _mouseclick = func;
                return this;
            } else {
                return _mouseclick;
            }
        };

        this.render = function (data, x, y, config) {
            _panel.attr({
                transform: 'translate(' + (config.x || metadata.x) + ',' + (config.y || metadata.y) + ')'
            });
            addText(data, _panel, x, y);
            addColorBars(data, _panel, x, y);
            addLegendPanel(data, _panel , x, y);
            //addBorder();
        };

        function addText(data, panel, x, y) {
            var textData = data.map(function (entry, index) {
                var entryHeight = 15;
                return {
                    key: entry.value.label,
                    x: 100,
                    y: 3 + (entryHeight * index),
                    textWidth: 10,
                    height: 12,
                    raw: entry
                };
            });

            var textSelection = panel.select('.legend-text').selectAll('text')
                .data(textData);
            textSelection.exit().remove();
            textSelection.enter().append('text');
            textSelection.attr({
                    x: function (d) { return d.textWidth; },
                    y: function (d) { return d.y; },
                    dy: function (d) { return d.height + 'px'; }
                })
                .text(function (d) { return d.key; })
                .on('click', function (d, i) {
                    if (_mouseclick) {
                        var xy = d3.mouse(_svg.node());
                        var mouseclickInput = {
                            key: 'mouseclick',
                            value: {
                                type: 'legend',
                                subtype: 'color',
                                id: _id,
                                data: d.raw
                            }
                        };

                        _mouseclick(xy[0], xy[1], mouseclickInput);
                    }
                });
        }

        function addColorBars(data, panel, x, y) {
            var maxTextWidth = panel.select('.legend-text').selectAll('text')[0]
                .map(function (d) { return d.getBBox(); })
                .reduce(function (a, b) { return a.width > b.width ? a.width : b.width; }, {width:0});
            var entryHeight = 15;
            var colorBarData = data.map(function (entry, index) {
                return {
                    y: 3 + (entryHeight * index),
                    colorWidth: 12,
                    height: 12,
                    color: entry.value.color,
                    opacity: entry.value.opacity,
                    raw: entry
                };
            });

            var colorBarSelection = panel.select('.legend-rects').selectAll('rect')
                .data(colorBarData);
            colorBarSelection.exit().remove();
            colorBarSelection.enter().append('rect');
            colorBarSelection.attr({
                    x: function (d) { return maxTextWidth + 15; },
                    y: function (d) { return d.y; },
                    width: function (d) { return d.colorWidth; },
                    height: function (d) { return d.height; }
                })
                .style({
                    fill: function (d) { return d.color; },
                    opacity: function (d) { return d.opacity; }
                })
                .on('click', function (d, i) {
                    if (_mouseclick) {
                        var xy = d3.mouse(_svg.node());
                        var mouseclickInput = {
                            key: 'mouseclick',
                            value: {
                                type: 'legend',
                                subtype: 'color',
                                id: _id,
                                data: d.raw
                            }
                        };

                        _mouseclick(xy[0], xy[1], mouseclickInput);
                    }
                })
                .on('mousemove', function (d, i) {
                    if (_mousemove) {
                        var xy = d3.mouse(_svg.node());
                        var mousemoveInput = {
                            key: 'mousemove',
                            value: {
                                type: 'legend',
                                subtype: 'color',
                                id: _id,
                                data: d.raw
                            }
                        };

                        _mousemove(xy[0], xy[1], mousemoveInput);
                    }
                });
        }


        function addLegendPanel(data, panel, x, y) {
            var legendData = data.map(function (entry, index) {
                var entryHeight = 15;
                return {
                    key: entry.value.label,
                    x: 100,
                    y: 3 + (entryHeight * index),
                    textWidth: 10,
                    colorWidth: 12,
                    height: 12,
                    color: entry.value.color,
                    opacity: entry.value.opacity
                };
            });

            var attrsText = panel.select('.legend-text').node().getBBox();
            var attrsRect = panel.select('.legend-rects').node().getBBox();

            if (legendData.length) {
                panel.select('.legend-border')
                    .attr({
                        x: attrsText.x - 5,
                        y: attrsText.y - 5,
                        width: (attrsText.width + attrsRect.width + 5 + 10) + 'px',
                        height: (attrsText.height + 10) + 'px'
                    })
                    .style({
                        stroke: 'black',
                        'stroke-width': 1
                    });

                var legendRight,
                    newX,
                    newY;

                if ('right' === metadata.align) {
                    legendRight = metadata.x;
                    newX = legendRight - (attrsText.width + attrsRect.width + 10 + 5);
                    newY = metadata.y;
                    panel.attr('transform' , 'translate(' + newX + ',' + newY + ')');
                }
                if ('center' === metadata.align) {
                    legendRight = metadata.x;
                    newX = legendRight - ((attrsText.width + attrsRect.width + 10 + 5) / 2);
                    newY = metadata.y;
                    panel.attr('transform' , 'translate(' + newX + ',' + newY + ')');
                }
                panel.select('.legend-border')
                    .attr({
                        x: attrsText.x - 5,
                        y: attrsText.y - 5,
                        width: (attrsText.width + attrsRect.width + 5 + 10) + 'px',
                        height: (attrsText.height + 10) + 'px'
                    })
                    .style({
                        stroke: 'black',
                        'stroke-width': 1
                    });
            } else {
                panel.select('.legend-border').style('stroke-width', 0);
            }
        }

    }

    plotviz.Legend = Legend;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function LineViewer (svg, id, data) {
        var _svg = svg;
        var _id = id;
        var _panel = null;
        var _tooltip = null;
        var _tooltipFunc = null;

        _panel = _svg.append('g')
            .attr({
                id: id,
                transform: 'translate(' + data.metadata.x + ',' + data.metadata.y + ')'
            });

        _panel.append('rect').attr({
            x: 0,
            y: 0,
            width: data.metadata.width,
            height: data.metadata.height,
            'class': 'border'
        })
        .style({
            stroke: 'black',
            fill: 'none',
            'stroke-width': 2
        });

        this.tooltipPanel = function (tooltip) {
            if (tooltip) {
                _tooltip = tooltip;
                return this;
            } else {
                return _tooltip;
            }
        };

        this.tooltipFunction = function (func) {
            if (func) {
                _tooltipFunc = func;
                return this;
            } else {
                return _tooltipFunc;
            }
        };

        this.render = function (data, x, y, config) {
            _svg.select('g#' + _id).attr('transform', 'translate(' + config.x + ',' + config.y + ')');
            _panel.select('.border').attr({ width:config.width, height: config.height });
            addLines(data, _panel, x, y);
        };

        function addLines (data, panel, x, y) {
            var pathData = data.map(function (lineData) {
                return {
                    line: lineData.value.points.map(function (linePoint) {
                        return {
                            x: x(linePoint.key) + (x.rangeBand() / 2),
                            y: y(linePoint.value.median)
                        };
                    }),
                    color: lineData.value.color,
                    key: lineData.key,
                    style: lineData.value.style
                };
            });

            var lineFunction = d3.svg.line()
                                .x(function (d) { return d.x; })
                                .y(function (d) { return d.y; })
                                .interpolate('linear');

            var lineSelection = panel.selectAll('path').data(pathData);
            lineSelection.enter().append('path');

            lineSelection.attr('d', function (d) { return lineFunction(d.line); })
            .style({
                stroke: function (d) { return d.color; },
                fill: 'none',
                'stroke-width': function (d) {
                    if ('undefined' !== typeof d.style && 'undefined' !== typeof d.style.strokeWidth) {
                        return d.style.strokeWidth;
                    } else {
                        return 1;
                    }
                }
            });
        }

        /**
         * Sorts the major and minor keys in the data to be visualized. Some
         * default sorting function options available are 'alphabetical',
         * 'increasing', and 'decreasing'. 'increasing' and 'decreasing' for the
         * minor keys base it on the median of the minor keys. 'increasing' and
         * 'decreasing' for the major keys base it on the average of the medians
         * for the minor keys in their grouping.
         *
         * @param - string/function - sortFunction - The function that will
         *          be used to sort the major keys. A string can be used to
         *          call a default supported sorting function.
         */
        this.sort = function (data, config) {

            // TODO: Needs to be looked at for possible consicions and cleaning.
            var values, key,
                newData = JSON.parse(JSON.stringify(data));
            if ('alphabetical' === config.sorting) {
                newData.data.forEach(function (line) {
                    line.value.points.sort(function (pointA, pointB) {
                        return pointA.key < pointB.key ? -1 : 1;
                    });
                });
                return newData;
            } else if ('increasing' === config.sorting) {
                values = {};
                newData.data.forEach(function (line) {
                    line.value.points.map(function (point) {
                        if (point.key in values) {
                            values[point.key].push(point.value.median);
                        } else {
                            values[point.key] = [point.value.median];
                        }
                    });
                });

                Object.keys(values).forEach(function (key) {
                    values[key] = values[key].reduce(function (keyA, keyB) {
                        return keyA + keyB;
                    }) / values[key].length;
                });

                newData.data.forEach(function (line) {
                    line.value.points.sort(function (pointA, pointB) {
                        return values[pointA.key] - values[pointB.key];
                    });
                });
                return newData;
            } else {
                values = {};
                newData.data.map(function (line) {
                    line.value.points.map(function (point) {
                        if (point.key in values) {
                            values[point.key].push(point.value.median);
                        } else {
                            values[point.key] = [point.value.median];
                        }
                    });
                });

                Object.keys(values).forEach(function (key) {
                    values[key] = values[key].reduce(function (keyA, keyB) {
                        return keyA + keyB;
                    }) / values[key].length;
                });

                newData.data.map(function (line) {
                    line.value.points.sort(function (pointA, pointB) {
                        return values[pointB.key] - values[pointA.key];
                    });
                });
                return newData;
            }
        };

        this.dataTransform = function (data, config) {
            var newData = JSON.parse(JSON.stringify(data));

            if ('log' === config.scale) {
                newData = logTransform(newData);
            }

            return newData;
        };

        function logTransform (data) {
            // Fix for IE11
            Math.log10 = Math.log10 || function (x) { return Math.log(x) / Math.log(10); };
            var transform = function (x) { return Math.log10(x + 0.05); };

            var newData = {};
            newData.legend = JSON.parse(JSON.stringify(data.legend));
            newData.metadata = JSON.parse(JSON.stringify(data.metadata));
            newData.data = data.data.map(function (lines) {
                return {
                    key: lines.key,
                    value: {
                        color: lines.value.color,
                        points: lines.value.points.map(function (point) {
                            return {
                                key: point.key,
                                value: {
                                    median: transform(point.value.median),
                                    extra: point.value.extra
                                }
                            };
                        })
                    }
                };
            });

            return newData;
        }

    }

    plotviz.LineViewer = LineViewer;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function Filter (svg, id, metadata, that) {
        var _svg = svg;
        var _id = id + "test";
        var _panel = null;
        var _mouseclick = null;
        var _mousemove = null;
        var _data = null;
        var _filterButton = null;
        var _plot = that;

        var _available = null;
        var _type = null;
        var _priorType = null;
        var _current = [];

        this.mousemove = function (func) {
            if (func) {
                _mousemove = func;
                return this;
            } else {
                return _mousemove;
            }
        };

        this.mouseclick = function (func) {
            if (func) {
                _mouseclick = func;
                return this;
            } else {
                return _mouseclick;
            }
        };

        panelCreate = function() {
           _panel = d3.select('#plotviz-controlDiv')
            .append('div')
            .attr('class', 'filter-context-menu')
            .append('ul')
            .attr('class','checkbox-grid');
        }

        panelDestroy = function() {
          d3.select('.filter-context-menu').style('display','none')
          d3.select('.filter-context-menu').remove('');
          _filterButton = null;
          panelCreate();
          d3.select('.footer').style({'top':'70px'});
        }

        panelCreate();

        xcopy = function(x) {
          return JSON.parse(JSON.stringify(x));
        }

        clickFilterOff = function() {
          var e = document.createEvent('UIEvents');
          e.initUIEvent('click', true, true, window, 1);
          d3.select('#filter-buttons .button-options .btn-inactive').node().dispatchEvent(e);
        }


        this.render = function (data, x, y, config) {
            data.filter = data.data.map(function(d) { return d.key; });

            if ('filteredState' in config && config.filter === 'off') {
                delete config.filteredState;
                _current = xcopy(data.filter); // reset current
                _plot.config(config);
            }

            if('resetFilter' in config && config.filter === 'off' ) {
                delete config.resetFilter;
                _data = xcopy(data);
                _plot.dataCache(data); // set the dataCache
                _plot.config(config);
            }

            var controlType = d3.select('#format-buttons .button-options .btn-active').text()

            // change in data format
            if(_type === null) {
                _type = xcopy(controlType);
                _available = xcopy(data.filter);
                _current = xcopy(data.filter);
                _priorType = null

                _data = xcopy(data);
                _plot.dataCache(data); // set the dataCache
            }

            if(_type !== controlType) {
                // check the status of the filter button
                // if filter is active, reset
                var inactiveFilter = d3.select('#filter-buttons .button-options .btn-inactive').text();
                _available = xcopy(data.filter);
                _current = xcopy(data.filter);
                _plot.dataCache(data); // set dataCache on format change
                if(inactiveFilter === 'Off') {
                  _pastType = _type;
                  _type = controlType;
                  clickFilterOff();
                  // set config filter
                  config.filter = 'off';
                  _plot.config(config);
                  panelDestroy();
                } else {
                  // filter was inactive, ignore, but destroy panel
                  panelDestroy();
                }
            }

            // consolidate data.filter with _current and _available.
            xdata = [];
            _available.forEach(function(x) {
                xdata.push({'name': x, 'source': _type,
                            'current':_current.indexOf(x) >= 0,
                            'filtered':data.filter.indexOf(x) >= 0})
            })

            //var clickedFilter = null;
            //// If render event is triggered without the source of the click
            //// being the sort buttons, etc, the panel will display if hidden.
            //if(d3.event !== null) {
            //   foundFilter = function(pathElements,i) {
            //       pathElement = d3.select(pathElements[i]);
            //       if(pathElement.attr('id') == 'filter-buttons') return true;
            //       var active = i+1;
            //       if(pathElements.length-1 >= active) {
            //         return foundFilter(pathElements, active);
            //       }
            //   }
            //   try {
            //       var paths = null;
            //       if(typeof d3.event.path !== 'undefined') {
            //         // chrome
            //         paths = d3.event.path
            //       } else {
            //         if (typeof d3.event.srcElement !== 'undefined') {
            //            // safari
            //            paths = d3.selectAll(d3.event.srcElement.parentElement.parentElement);
            //         } else {
            //            // firefox
            //            paths = d3.selectAll(d3.event.target.parentElement.parentElement);
            //         }
            //       }
            //       var clickedFilter = foundFilter(paths, 0);
            //   } catch (e) {
            //       if (e instanceof TypeError) {
            //         console.log(e);
            //       }
            //   }
            //}

            if(config.filter === 'on') {
                // don't recreate the panel if already displayed.
               // if(clickedFilter === true && d3.select('.filter-context-menu').style('display') === 'none') {
                    addFilterPanel(xdata, _panel, x, y);
                //}
                // update config
                config = _plot.config();
                config.filteredState = 'true';
                _plot.config(config);
            }
            if(config.filter  === 'off') {
                hideFilterPanel();
            }
            // ensure _type is consistent with active selection.
            _type = controlType
        };

        function addFilterPanel(data, panel, x, y) {
            d3.select('.filter-error-menu').remove();

            var filters = panel.selectAll("input")
              .data(data)
              .enter()

            filters.forEach(function(d,i) {
                var li = filters.append('li')
                li.append('input')
                    .attr('type', 'checkbox')
                    .property({'checked': function(d){ return d.filtered; }})
                    .attr('id', function(d,i) { return 'a' + i; })
                    .attr('name', function(d) { return d.name; })
                    .attr('class', "filterCheck")
                li.append('label')
                    .attr('for', function(d,i) { return 'a' + i;} )
                    .text(function(d) { return d.name; })
            });

            // push footer down
            d3.select('.footer').style({'top':'330px'});

            preButton = function(d, data, config) {
                if(d.eClass === 'all') {
                    d3.selectAll('input').property({'checked': true})
                }
                if(d.eClass === 'none') {
                    d3.selectAll('input').property({'checked': false})
                }
            }

            postButton = function(d, data, config) {
                if(d.eClass === 'submit') {
                      var sf2 = d3.selectAll('.filterCheck').filter(function(cx) {
                          return d3.select(this).property('checked') == true;
                      });

                      if(sf2.empty() === true) {
                          // create message panel if doesn't exist
                          if(d3.select('.filter-error-menu').empty()) {
                               d3.select('.filter-context-menu')
                                 .insert('div', '.checkbox-grid')
                                 .attr('class', 'filter-error-menu')
                                 .text('At least one cohort selection is required to filter.')
                          }
                          return;

                      }

                      var merged = [].concat.apply([], sf2);
                      var checked = d3.map(merged, function(x) { return x.name; });

                      _current = Object.keys(checked._);

                      newData = _plot.data();
                      //Filter data by keys
                      newData.data = _data.data.filter(function (boxGroup) {
                          return (checked.keys().indexOf(boxGroup.key) >= 0);
                      });

                      _plot.data(newData);
                      _plot.render(newData, config);

                      d3.select('.filter-context-menu').style('display','none');

                      // pull footer up
                      d3.select('.footer').style({'top':'70px'});
                }
                if(d.eClass === 'cancel') {
                      d3.select('.filter-context-menu').style('display','none');
                      clickFilterOff();
                      // pull footer up
                      d3.select('.footer').style({'top':'70px'});
                }
            }

            var filterButtons = [
                {id: 'filter-btn-select-all' , eClass:'all', bClass: 'button btn-left', text: 'Select All', active: true, pre: preButton, post: postButton},
                {id: 'filter-btn-select-none' , eClass: 'none', bClass: 'button btn', text: 'Select None', active: false, pre: preButton, post: postButton},
                {id: 'filter-btn-submit' , eClass: 'submit', bClass: 'button btn', text: 'Submit', active: false, pre: preButton, post: postButton},
                {id: 'filter-btn-cancel' , eClass: 'cancel', bClass: 'button btn-right', text: 'Cancel', active: false, pre: preButton, post: postButton}]

            if(_filterButton === null) {
              d3.select('.filter-context-menu').append('div')
                   .attr('class', 'button-options')
                   .attr('class', 'button-lower')
                 .selectAll("input")
                   .data(filterButtons)
                 .enter().append('div')
                   .attr('class', function (d,i) {
                     var spaced = i < 2 ? ' btn-link' : 'btn-form'
                     return d.bClass + ' btn-active' + spaced;
                   })
                   .text(function(d) { return d.text; })
                   .on('click', function(d) {
                      if (d.pre) {
                          d.pre(d, data, data.config);
                      }
                      if (d.post) {
                          d.post(d, data, data.config);
                      }
              });
              _filterButton = 1;
            }

            // Ensure page event
            if(d3.event !== null) {
              d3.select('.filter-context-menu')
                .style('right', (d3.event.pageX + 300) + 'px')
                .style('top', (d3.event.pageY - 800 ) + 'px')
                .style('display', 'block');
            }
        }

        function hideFilterPanel() {
            d3.select('.filter-context-menu').style('display', 'none');
            d3.select('.footer').style({'top':'70px'});
        }

    }

    plotviz.Filter = Filter;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    
    function generateFilteringControl () {
        return {
            key: 'filter-control',
            value: {
                id: 'filter-buttons',
                text: 'Filter',
                buttons: [{
                    key: 'button1',
                    value: {
                        text: 'On',
                        className: 'button btn-left',
                        pre: function(plot, data, config) {
                            plot.option('filter', 'on')
                        },
                        post: function(plot, data, config) {
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: 'Off',
                        className: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('filter', 'off');
                        },
                        post: function(plot, data, config) {
                        }
                    }
                }]
            }
        };
    }
    function generateSortingControl () {
        return {
            key: 'sort-control',
            value: {
                id: 'sort-buttons',
                text: 'Sort',
                buttons: [{
                    key: 'button1',
                    value: {
                        text: 'ABC',
                        className: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('sorting', 'alphabetical');
                        },
                        post: function (plot, data, config) {
                            plot.render(plot.sort(data, config), config);
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: '\u25B2',
                        className: 'button',
                        pre: function (plot, data, config) {
                            plot.option('sorting', 'increasing');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                                plot.option('sorting'),
                                                plot.option('sorting')),
                                        plot.config());
                        }
                    }
                },
                {
                    key: 'button3',
                    value: {
                        text: '\u25BC',
                        className: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('sorting', 'decreasing');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                                plot.option('sorting'),
                                                plot.option('sorting')),
                                        plot.config());
                        }
                    }
                }]
            }
        };
    }

    function generateScalingControl () {
        return {
            key: 'scale-control',
            value: {
                id: 'scale-buttons',
                text: 'Scale',
                buttons: [{
                    key: 'button1',
                    value: {
                        text: 'Log',
                        className: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('scale', 'log');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                            plot.option('sorting'),
                                            plot.option('sorting')),
                                        plot.config());
                        }
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: 'Linear',
                        className: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('scale', 'linear');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                            plot.option('sorting'),
                                            plot.option('sorting')),
                                        plot.config());
                        },
                        active: true
                    }
                }]
            }
        };
    }

    function generateCrosshairControl () {
        return {
            key: 'crosshair-control',
            value: {
                id: 'crosshair-buttons',
                text: 'Crosshair',
                buttons: [{
                    key: 'button1',
                    value: {
                        text: 'On',
                        className: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('crosshair', 'on');
                        },
                        post: function (plot, data, config) {
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: 'Off',
                        className: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('crosshair', 'off');
                        },
                        post: function (plot, data, config) {
                        }
                    }
                }]
            }
        };
    }

    function generateOutlierControl () {
        return {
            key: 'outliers-control',
            value: {
                id: 'outliers-buttons',
                text: 'Outliers',
                buttons: [{
                    key: 'button1',
                    value: {
                        text: 'On',
                        className: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('outliers', 'on');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                                plot.option('sorting'),
                                                plot.option('sorting')),
                                        plot.config());
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: 'Off',
                        className: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('outliers', 'off');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                                plot.option('sorting'),
                                                plot.option('sorting')),
                                        plot.config());
                        }
                    }
                }]
            }
        };
    }

    function generateMedianOnlyControl () {
        return {
            key: 'medians-control',
            value: {
                id: 'medians-buttons',
                text: 'Medians',
                buttons: [{
                    key: 'button1',
                    value: {
                        text: 'All',
                        className: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('medians', 'all');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                                plot.option('sorting'),
                                                plot.option('sorting')),
                                        plot.config());
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: 'Only',
                        className: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('medians', 'only');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                                plot.option('sorting'),
                                                plot.option('sorting')),
                                        plot.config());
                        }
                    }
                }]
            }
        };
    }

    plotviz.toolbox = {
        generateFilteringControl: generateFilteringControl,
        generateSortingControl: generateSortingControl,
        generateScalingControl: generateScalingControl,
        generateCrosshairControl: generateCrosshairControl,
        generateOutlierControl: generateOutlierControl,
        generateMedianOnlyControl: generateMedianOnlyControl
    };

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function GtexPlot (div, url, url2) {
        var _boxplotContainer;
        var _lineplotContainer;
        var _boxplot;
        var _lineplot;
        var _root;

        var _gene;

        var _queryGeneData;
        var _geneColorData;
        var _maleData;
        var _femaleData;
        var _ageData = {};

        var _server = url;
        var _server2 = url2;
        //var _colorURL = 'http://gtexportal.org/api/v1/samples';
        var _colorURL = 'https://gtexportal.org/rest/v1/samples';

        var _emphasizedIsoform = null;
        var _emphasizedIsoformWidth = 12;

        var CONTROL_POSITION = {
            left: 1/8,
            top: 0.05 
        };
        var TITLE_POSITION = {
            x: 0.5,
            y: 0.8,
            align: 'center'
        };

        function genderBoxplotSort(data, config) {
            var newData = JSON.parse(JSON.stringify(data));
            if ('alphabetical' === config.sorting) {
                newData.data.sort(function (boxGroupA, boxGroupB) {
                    if (boxGroupA.key > boxGroupB.key) return 1;
                    if (boxGroupA.key < boxGroupB.key) return -1;
                    return 0;
                });
            }
            if ('increasing' === config.sorting) {
                newData.data.sort(function (boxGroupA, boxGroupB) {
                    return boxGroupA.value[0].value.median + boxGroupA.value[1].value.median - (boxGroupB.value[0].value.median + boxGroupB.value[1].value.median);
                });
            }
            if ('decreasing' === config.sorting) {
                newData.data.sort(function (boxGroupA, boxGroupB) {
                    return boxGroupB.value[0].value.median + boxGroupB.value[1].value.median - (boxGroupA.value[0].value.median + boxGroupA.value[1].value.median);
                });
            }

            newData.data.forEach(function (boxGroup) {
                boxGroup.value.sort(function (boxA, boxB) {
                    if ('male' === boxA.key && 'female' === boxB.key) return -1;
                    if ('female' === boxA.key && 'male' === boxB.key) return 1;
                    return 0; // Should not be reachable
                });
            });

            return newData;
        }

        var minimumSize = 1150;
        //var _width = Math.max(parseInt(window.getComputedStyle(div).width), minimumSize);
        var _width = 1150;

        _root = d3.select(div).append('div')
            .attr({
                id: 'root',
                'class': 'root'
            });

        _boxplotContainer = _root.append('div');
        _boxplot = new plotviz.Plot(_boxplotContainer.node());

        _lineplotContainer = _root.append('div');
        _lineplot = new plotviz.Plot(_lineplotContainer.node());

        var _buttons;

        var holdResize = window.resize;

        window.addEventListener('resize', function () {
            if (_gene) {
                //_width = Math.max(parseInt(window.getComputedStyle(div).width), minimumSize);
                _width = 1150;
                console.log(_width);
                var newData;

                if ('none' === _boxplotContainer.style('display')) {
                    newData = _lineplot.data();

                    newData.metadata.width = _width;
                    _lineplot.data(newData);
                    setButtonsToSync('line', 'line');
                    _lineplot.render(newData);
                }
                if ('none' === _lineplotContainer.style('display')) {
                    newData = _boxplot.data();

                    newData.metadata.width = _width;
                    _boxplot.data(newData);
                    _boxplot.render(newData);
                    setButtonsToSync('box', 'box');
                }
            }
        });

        function create (url) {

        }

        function start () {

        }

        function grabButtons () {
            _buttons = {
                gene: {
                    plot: {
                        gene: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#plot-buttons div.button-options div.button.btn-left'),
                        isoform: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#plot-buttons div.button-options div.button.btn-right')
                    },
                    differentiation: {
                        none: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#differentiation-buttons div.button-options div.button.btn-left'),
                        gender: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#differentiation-buttons div.button-options div.button.btn-right')
                    },
                    scale: {
                        log: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#scale-buttons div.button-options div.button.btn-left'),
                        linear: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#scale-buttons div.button-options div.button.btn-right')
                    },
                    sort: {
                        alphabetical: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#sort-buttons div.button-options div.button.btn-left'),
                        increasing: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#sort-buttons div.button-options div.button.btn-middle'),
                        decreasing: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#sort-buttons div.button-options div.button.btn-right')
                    },
                    crosshair: {
                        on: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#crosshair-buttons div.button-options div.button.btn-left'),
                        off: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#crosshair-buttons div.button-options div.button.btn-right')
                    },
                    outliers: {
                        on: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#outliers-buttons div.button-options div.button.btn-left'),
                        off: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#outliers-buttons div.button-options div.button.btn-right')
                    },
                    medians: {
                        on: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#medians-buttons div.button-options div.button.btn-left'),
                        off: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#medians-buttons div.button-options div.button.btn-right')
                    }
                },
                isoform: {
                    plot: {
                        gene: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#plot-buttons div.button-options div.button.btn-left'),
                        isoform: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#plot-buttons div.button-options div.button.btn-right')
                    },
                    scale: {
                        log: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#scale-buttons div.button-options div.button.btn-left'),
                        linear: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#scale-buttons div.button-options div.button.btn-right')
                    },
                    sort: {
                        alphabetical: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#sort-buttons div.button-options div.button.btn-left'),
                        increasing: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#sort-buttons div.button-options div.button.btn-middle'),
                        decreasing: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#sort-buttons div.button-options div.button.btn-right')
                    },
                    range: {
                        relative: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#range-buttons div.button-options div.button.btn-left'),
                        absolute: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#range-buttons div.button-options div.button.btn-right')
                    }
                }
            };
        }

        function deactivateButton (button) {
            button.className = button.className.replace
                        (/(?:^|\s)btn-active(?!\S)/g, ' btn-inactive');
        }

        function activateButton (button) {
            button.className = button.className.replace
                        (/(?:^|\s)btn-inactive(?!\S)/g, ' btn-active');
        }

        function setButtonsToSync (fromType, toType) {
            if ('box' === fromType && 'line' === toType) {
                activateButton(_buttons.isoform.plot.isoform.node());
                deactivateButton(_buttons.isoform.plot.gene.node());
                if ('log' === _boxplot.option('scale')) {
                    _buttons.isoform.scale.log.node().click();
                }
                if ('linear' === _boxplot.option('scale')) {
                    _buttons.isoform.scale.linear.node().click();
                }
                if ('alphabetical' === _boxplot.option('sorting')) {
                    _buttons.isoform.sort.alphabetical.node().click();
                }
                if ('increasing' === _boxplot.option('sorting')) {
                    _buttons.isoform.sort.increasing.node().click();
                }
                if ('decreasing' === _boxplot.option('sorting')) {
                    _buttons.isoform.sort.decreasing.node().click();
                }
            }
            if ('box' === fromType && 'box' === toType) {
                if ('log' === _boxplot.option('scale')) {
                    _buttons.gene.scale.log.node().click();
                }
                if ('linear' === _boxplot.option('scale')) {
                    _buttons.gene.scale.linear.node().click();
                }
                if ('alphabetical' === _boxplot.option('sorting')) {
                    _buttons.gene.sort.alphabetical.node().click();
                }
                if ('increasing' === _boxplot.option('sorting')) {
                    _buttons.gene.sort.increasing.node().click();
                }
                if ('decreasing' === _boxplot.option('sorting')) {
                    _buttons.gene.sort.decreasing.node().click();
                }
            }
            if ('line' === fromType && 'box' === toType) {
                activateButton(_buttons.gene.plot.gene.node());
                deactivateButton(_buttons.gene.plot.isoform.node());
                if ('log' === _lineplot.option('scale')) {
                    _buttons.gene.scale.log.node().click();
                }
                if ('linear' === _lineplot.option('scale')) {
                    _buttons.gene.scale.linear.node().click();
                }
                if ('alphabetical' === _lineplot.option('sorting')) {
                    _buttons.gene.sort.alphabetical.node().click();
                }
                if ('increasing' === _lineplot.option('sorting')) {
                    _buttons.gene.sort.increasing.node().click();
                }
                if ('decreasing' === _lineplot.option('sorting')) {
                    _buttons.gene.sort.decreasing.node().click();
                }
                _buttons.gene.differentiation.none.node().click();
            }
            if ('line' === fromType && 'line' === toType) {
                if ('log' === _lineplot.option('scale')) {
                    _buttons.isoform.scale.log.node().click();
                }
                if ('linear' === _lineplot.option('scale')) {
                    _buttons.isoform.scale.linear.node().click();
                }
                if ('alphabetical' === _lineplot.option('sorting')) {
                    _buttons.isoform.sort.alphabetical.node().click();
                }
                if ('increasing' === _lineplot.option('sorting')) {
                    _buttons.isoform.sort.increasing.node().click();
                }
                if ('decreasing' === _lineplot.option('sorting')) {
                    _buttons.isoform.sort.decreasing.node().click();
                }
            }

        }

        function setGene (gene) {
            var flagOptions = '?boxplot=true&isoforms=true';
            var url = _server + gene + flagOptions;

            _gene = gene;

            var oReq = new XMLHttpRequest();

            oReq.open('GET', url);

            oReq.onload = function (event) {
                var status = oReq.status;
                var response = oReq.responseText;

                var parsedResponse = JSON.parse(response);
                _queryGeneData = parsedResponse;

                var oReq2 = new XMLHttpRequest();

                oReq2.open('GET', _colorURL);

                oReq2.onload = function (event2) {
                    var colorResponse = JSON.parse(oReq2.responseText);
                    _geneColorData = colorResponse;

                    var oReq3 = new XMLHttpRequest();

                    //oReq3.open('GET', 'http://vgtxportaltest:9000/v3/expression/' + gene + '?boxplot=true&gender=male');
                    oReq3.open('GET', _server2 + gene + '?boxplot=true&gender=male');

                    oReq3.onload = function (event3) {
                        var status3 = oReq3.status;
                        var response3 = oReq3.responseText;

                        _maleData = JSON.parse(response3);

                        var oReq4 = new XMLHttpRequest();

                        //oReq4.open('GET', 'http://vgtxportaltest:9000/v3/expression/' + gene + '?boxplot=true&gender=female');
                        oReq4.open('GET', _server2 + gene + '?boxplot=true&gender=female');

                        oReq4.onload = function (event4) {
                            var status4 = oReq4.status;
                            var response4 = oReq4.responseText;

                            _femaleData = JSON.parse(response4);

                    var boxplotData = generateBoxData(_queryGeneData.generpkm, _geneColorData);
                    var lineplotData = generateLineData(_queryGeneData.isoformrpkm, _geneColorData);
                    _boxplot.create(boxplotData, 'boxname');
                    _boxplot.data(boxplotData);
                    _boxplot.tooltip(boxToolTipFunction);
                    _boxplot.render(boxplotData);

                    _lineplot.create(lineplotData, 'linename');
                    _lineplot.data(lineplotData);
                    _lineplot.mouseclick(mouseClickFunction);
                    _lineplot.mousemove(mouseMoveFunction);
                    _lineplot.render(lineplotData);
                    _lineplotContainer.style('display', 'none');

                    // TODO: Figure out a better way to sync buttons than this
                    grabButtons();
                    _buttons.gene.scale.log.node().click();
                        };

                        oReq4.onerror = function (event4) {
                            
                        };

                        oReq4.send();
                    };

                    oReq3.onerror = function (event3) {

                    };

                    oReq3.send();
                };

                oReq2.onerror = function (event2) {

                };

                oReq2.send();

            };

            oReq.onerror = function (event) {
                console.log('Error: couldn\'t load ' + url);
            };

            oReq.send();
        }

        function generateGenderData (male, female, colors) {
            return {
                metadata: {
                    type: 'box',
                    title: _gene + ' Gender Gene View',
                    width: _width,
                    height: 800,
                    xlabel: '',
                    ylabel: 'RPKM',
                    boxGroupSpacing: 0.3,
                    significanceLine: {
                        key: 'on',
                        value: {
                            significanceValue: 0.1
                        }
                    },
                    position: {
                        control: CONTROL_POSITION,
                        title: TITLE_POSITION,
                        yAxisLabel: {
                            rotation: 90
                        },
                        xAxisLabel: {
                            tickRotation: -45,
                            tickTranslate: -15,
                            tickAlign: 'end'
                        }
                    },
                    options: [{key: 'differentiation', value: {key: 'differentiation', initial: 'gender'}}],
                    controls: [
                        generateGeneIsoformControl(),
                        generateNoneGenderAgeControl(),
                        generateLogLinearScaleControl(),
                        generateSortingControl(),
                        'crosshair',
                        'outliers',
                        'medians'
                    ],
                },
                data: convertToGenderData(male.generpkm, female.generpkm, colors),
                legend: [
                    {
                        key: 'male',
                        value: {
                            label: 'male',
                            color: 'rgb(58, 152, 219)'
                        }
                    },
                    {
                        key: 'female',
                        value: {
                            label: 'female',
                            color: 'rgb(247, 73, 73)'
                        }
                    }
                ]
            };
        }

        function generateAgeData (ageData, colors) {
            return {
                metadata: {
                    type: 'box',
                    title: _gene + ' Age Gene View',
                    width: _width,
                    height: 800,
                    xlabel: '',
                    ylabel: 'RPKM',
                    position: {
                        control: CONTROL_POSITION,
                        title: TITLE_POSITION,
                        yAxisLabel: {
                            rotation: 90
                        },
                        xAxisLabel: {
                            tickRotation: -45,
                            tickTranslate: -15,
                            tickAlign: 'end'
                        }
                    },
                    options: [],
                    controls: [
                        generateGeneIsoformControl(),
                        generateNoneGenderAgeControl(),
                        generateLogLinearScaleControl(),
                        generateSortingControl(),
                        'crosshair',
                        'outliers',
                        'medians'
                    ],
                },
                data: convertToAgeData(ageData, colors),
                legend: []
            };
        }

        function generateBoxData (generpkm, colors) {
            return {
                metadata: {
                    type: 'box',
                    title: _gene + ' Gene View',
                    width: _width,
                    height: 800,
                    xlabel: '',
                    ylabel: 'RPKM',
                    position: {
                        control: CONTROL_POSITION,
                        title: TITLE_POSITION,
                        yAxisLabel: {
                            rotation: 90
                        },
                        xAxisLabel: {
                            tickRotation: -45,
                            tickTranslate: -15,
                            tickAlign: 'end'
                        }
                    },
                    options: [
                        { key: 'differentiation', value: { key:'differentiation', initial: 'none'}}
                    ],
                    controls: [
                        generateGeneIsoformControl(),
                        generateNoneGenderAgeControl(),
                        generateLogLinearScaleControl(),
                        generateSortingControl(),
                        'crosshair',
                        'outliers',
                        'medians'
                    ]
                },
                data: convertToBoxData(generpkm, colors),
                legend: [
                ]
            };
        }

        function convertToBoxLegend (raw, colors) {
            var legendData = [];

            for (var tissue in raw) {
                legendData.push({
                    key: tissue,
                    value: {
                        label: tissue,
                        color: 'rgb(' + colors[tissue].tissue_color_rgb + ')'
                    }
                });
            }

            return legendData;
        }

        function convertToAgeData (ageData, colors) {
            var data = [];

            Object.keys(ageData['20,30']).forEach(function (tissue) {
                data.push({
                    key: tissue,
                    axisLine: {color: colors[tissue]},
                    value: d3.range(20,81,10).map(function (ageStart) {
                        var ageEntry = ageData[ageStart + ',' + (ageStart + 10)];
                        return {
                            key: ageStart + ',' + (ageStart + 10),
                            value: {
                                    high_whisker: ageEntry[tissue].high_whisker,
                                    q3: ageEntry[tissue].q3,
                                    median: ageEntry[tissue].median,
                                    q1: ageEntry[tissue].q1,
                                    low_whisker: ageEntry[tissue].low_whisker,
                                    color: 'rgb(' + colors[tissue] + ')',
                                    outliers: ageEntry[tissue].outliers ? ageEntry[tissue].outliers.map(function (d, i) {
                                        return {
                                            key: i,
                                            value: {
                                                outlier: d
                                            }
                                        };
                                    }) : [],
                                    extra: {
                                        num_samples: ageEntry.num_samples
                                    }
                            }
                        };
                    })
                });
            });

            return data;
        }

        function convertToGenderData (male, female, colors) {
            var data = [];

            Object.keys(male).forEach(function (tissue) {
                var maleEntry = male[tissue];
                var femaleEntry = female[tissue];
                data.push({
                    key: tissue,
                    axisLine: {color: 'rgb(' + colors[tissue].tissue_color_rgb + ')'},
                    value: [{
                            key: 'male',
                            value: {
                                    // TODO: Remove Quality Control hack from these. Should get correct data from web service.
                                    high_whisker: maleEntry.high_whisker || maleEntry.q3 || maleEntry.median || 0,
                                    q3: maleEntry.q3 || maleEntry.median || 0,
                                    median: maleEntry.median,
                                    q1: maleEntry.q1 || maleEntry.median || 0,
                                    low_whisker: maleEntry.low_whisker || maleEntry.q1 || maleEntry.median,
                                    //color: 'rgb(' + colors[tissue].tissue_color_rgb + ')',
                                    color: 'rgb(58, 152, 219)',
                                    outliers: maleEntry.outliers ? maleEntry.outliers.map(function (d, i) {
                                        return {
                                            key: i,
                                            value: {
                                                outlier: d
                                            }
                                        };
                                    }) : [],
                                    extra: {
                                        num_samples: maleEntry.num_samples,
                                        medianColor: maleEntry.num_samples > 0 ? 'black' : 'rgb(58, 152, 219)',
                                        tissue: tissue
                                    }
                                }
                        },
                    {
                            key: 'female',
                            value: {
                                    high_whisker: femaleEntry.high_whisker,
                                    q3: femaleEntry.q3,
                                    median: femaleEntry.median,
                                    q1: femaleEntry.q1,
                                    low_whisker: femaleEntry.low_whisker,
                                    //color: 'rgb(' + colors[tissue].tissue_color_rgb + ')',
                                    color: 'rgb(247, 73, 73)',
                                    outliers: femaleEntry.outliers ? femaleEntry.outliers.map(function (d, i) {
                                        return {
                                            key: i,
                                            value: {
                                                outlier: d
                                            }
                                        };
                                    }) : [],
                                    extra: {
                                        num_samples: femaleEntry.num_samples,
                                        medianColor: femaleEntry.num_samples > 0 ? 'black' : 'rgb(247, 73, 73)',
                                        tissue: tissue
                                    }
                                }
                        }
                    ]
                });
            });

            return data;
        }

        function convertToBoxData (raw, colors) {
            var data = [];

            Object.keys(raw).forEach(function (tissue) {
                var entry = raw[tissue];
                data.push({
                    key: tissue,
                    axisLine: false,
                    value: [{
                        key: tissue,
                        value: {
                            high_whisker: entry.high_whisker,
                            q3: entry.q3,
                            median: entry.median,
                            q1: entry.q1,
                            low_whisker: entry.low_whisker,
                            color: 'rgb(' + colors[tissue].tissue_color_rgb + ')',
                            outliers: entry.outliers.map(function (d, i) {
                                return {
                                    key: i,
                                    value: {
                                        outlier: d
                                    }
                                };
                            }),
                            extra: {
                                num_samples: entry.num_samples
                            }
                        }
                    }]
                });
            });

            return data;
        }

        function generateLineData (isoformrpkm, colors) {

            return {
                metadata: {
                    type: 'line',
                    title: _gene + ' Isoform View',
                    //width: _width - (_width / 7),
                    width: _width,
                    height: 800,
                    xlabel: '',
                    ylabel: 'RPKM',
                    position: {
                        control: CONTROL_POSITION,
                        title: TITLE_POSITION,
                        legend: {
                            left: 6/7,
                            top: 1/8,
                            right: 6/7
                        },
                        xAxisLabel: {
                            tickRotation: -45,
                            tickTranslate: -15,
                            tickAlign: 'end'
                        }
                    },
                    options: [
                        {
                            key: 'range',
                            value: {
                                key: 'range',
                                initial: 'absolute'
                            }
                        }
                    ],
                    controls: [
                        generateGeneIsoformControl(),
                        generateLogLinearScaleControl(),
                        generateSortingControl(),
                        generateAbsoluteRelativeControl()
                    ]
                },
                data: convertToLineData(isoformrpkm, generateIsoformColors(isoformrpkm)),
                legend: convertToLineLegend(isoformrpkm, generateIsoformColors(isoformrpkm))
            };
        }

        function generateRelativeLineData (isoformrpkm, colors) {

            return {
                metadata: {
                    type: 'line',
                    title: _gene + ' Isoform View',
                    //width: _width - (_width / 7),
                    width: _width,
                    height: 800,
                    xlabel: '',
                    ylabel: 'RPKM',
                    position: {
                        control: CONTROL_POSITION,
                        title: TITLE_POSITION,
                        legend: {
                            left: 6/7,
                            top: 1/8,
                            right: 6/7
                        },
                        xAxisLabel: {
                            tickRotation: -45,
                            tickTranslate: -15,
                            tickAlign: 'end'
                        }
                    },
                    options: [
                        {
                            key: 'range',
                            value: {
                                key: 'range',
                                initial: 'absolute'
                            }
                        }
                    ],
                    controls: [
                        generateGeneIsoformControl(),
                        generateLogLinearScaleControl(),
                        generateSortingControl(),
                        generateAbsoluteRelativeControl()
                    ]
                },
                data: convertToRelativeLineData(isoformrpkm, generateIsoformColors(isoformrpkm)),
                legend: convertToLineLegend(isoformrpkm, generateIsoformColors(isoformrpkm))
            };
        }

        function convertToLineData (raw, colors) {
            var data = [];

            for (var isoform in raw) {
                var iso = raw[isoform];
                var isodata = [];
                for (var tissue in iso) {
                    isodata.push({
                        key: tissue,
                        value: {
                            median: iso[tissue].median
                        }
                    });
                }
                data.push({
                    key: isoform,
                    value: {
                        color: colors[isoform],
                        points: isodata,
                        style: {
                            strokeWidth: isoform === _emphasizedIsoform ? 12 : 1
                        }
                    }
                });
            }

            return data;
        }

        function convertToRelativeLineData (raw, colors) {
            var data = [];

            var totals = {};

            Object.keys(raw).forEach(function (isoform) {
                Object.keys(raw[isoform]).forEach(function (tissue) {
                    if (totals[tissue]) {
                        totals[tissue] += raw[isoform][tissue].median;
                    } else {
                        totals[tissue] = raw[isoform][tissue].median;
                    }
                });
            });

            for (var isoform in raw) {
                var iso = raw[isoform];
                var isodata = [];
                for (var tissue in iso) {
                    isodata.push({
                        key: tissue,
                        value: {
                            median: iso[tissue].median / totals[tissue]
                        }
                    });
                }
                data.push({
                    key: isoform,
                    value: {
                        color: colors[isoform],
                        points: isodata
                    }
                });
            }

            return data;
        }

        function convertToLineLegend (raw, colors) {
            return Object.keys(raw).map(function (isoform) {
                return {
                    key: isoform,
                    value: {
                        label: isoform,
                        color: colors[isoform]
                    }
                };
            });
        }

        function generateGeneIsoformControl () {
            return {
                key: 'plot',
                value: {
                    id: 'plot-buttons',
                    text: 'Plot',
                    buttons: [{
                        key: 'button1',
                        value: {
                            text: 'Gene',
                            className: 'button btn-left',
                            pre: null,
                            post: function (plot, data, config) {
                                _boxplot.data(generateBoxData(_queryGeneData.generpkm, _geneColorData));
                                _boxplotContainer.style('display', '');
                                _boxplot.render(generateBoxData(_queryGeneData.generpkm, _geneColorData));
                                _lineplotContainer.style('display', 'none');
                                setButtonsToSync(plot.data().metadata.type, 'box');
                                _buttons.gene.differentiation.none.node().click();
                            },
                            active: true
                        }
                    },
                    {
                        key: 'button2',
                        value: {
                            text: 'Isoform',
                            className: 'button btn-right',
                            pre: null,
                            post: function (plot, data, config) {
                                _boxplotContainer.style('display', 'none');
                                _lineplotContainer.style('display', '');
                                _lineplot.render(generateLineData(_queryGeneData.isoformrpkm, _geneColorData));
                                setButtonsToSync(plot.data().metadata.type, 'line');
                            }
                        }
                    }]
                }
            };
        }

        function generateNoneGenderAgeControl () {
            return {
                key: 'differentiation',
                value: {
                    id: 'differentiation-buttons',
                    text: 'Differentiation',
                    buttons: [{
                        key: 'button1',
                        value: {
                            text: 'None',
                            className: 'button btn-left',
                            pre: function (plot, data, config) {
                                plot.option('differentiation', 'none');
                            },
                            post: function (plot, data, config) {
                                _boxplot.data(generateBoxData(_queryGeneData.generpkm, _geneColorData));
                                _boxplotContainer.style('display', '');
                                _boxplot.render(generateBoxData(_queryGeneData.generpkm, _geneColorData));
                                _lineplotContainer.style('display', 'none');
                                setButtonsToSync(plot.data().metadata.type, 'box');
                            },
                            active: true
                        }
                    },
                    {
                        key: 'button2',
                        value: {
                            text: 'Gender',
                            className: 'button btn-right',
                            pre: function (plot, data, config) {
                                plot.option('differentiation', 'gender');
                            },
                            post: function (plot, data, config) {
                                _boxplot.data(generateGenderData(_maleData, _femaleData, _geneColorData));
                                _boxplotContainer.style('display', '');
                                _boxplot.render(generateGenderData(_maleData, _femaleData, _geneColorData));
                                _lineplotContainer.style('display', 'none');
                                setButtonsToSync(plot.data().metadata.type, 'box');
                            }
                        }
                    }]
                }
            };
        }

        function generateLogLinearScaleControl () {
            return {
                key: 'scale',
                value: {
                    id: 'scale-buttons',
                    text: 'Scale',
                    buttons: [{
                        key: 'button1',
                        value: {
                            text: 'Log',
                            className: 'button btn-left',
                            pre: function (plot, data, config) {
                                plot.option('scale', 'log');
                            },
                            post: function (plot, data, config) {
                                var newData = JSON.parse(JSON.stringify(data));
                                if ('relative' === plot.option('range')) {
                                    newData = generateRelativeLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                }
                                newData.metadata.ylabel = 'Log10(RPKM)';
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render('gender' === plot.option('differentiation') ? genderBoxplotSort(newData, config) : plot.sort(newData, config));
                            },
                        }
                    },
                    {
                        key: 'button2',
                        value: {
                            text: 'Linear',
                            className: 'button btn-right',
                            pre: function (plot, data, config) {
                                plot.option('scale', 'linear');
                            },
                            post: function (plot, data, config) {
                                var newData = JSON.parse(JSON.stringify(data));
                                if ('relative' === plot.option('range')) {
                                    newData = generateRelativeLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                }
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render('gender' === plot.option('differentiation') ? genderBoxplotSort(newData, config) : plot.sort(newData, config));
                            },
                            active: true
                        }
                    }]
                }
            };
        }

        function generateSortingControl () {
            return {
                key: 'sort',
                value: {
                    id: 'sort-buttons',
                    text: 'Sort',
                    buttons: [{
                        key: 'button1',
                        value: {
                            text: 'ABC',
                            className: 'button btn-left',
                            pre: function (plot, data, config) {
                                plot.option('sorting', 'alphabetical');
                            },
                            post: function (plot, data, config) {
                                var newData = JSON.parse(JSON.stringify(data));
                                if ('relative' === plot.option('range')) {
                                    newData = generateRelativeLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                }
                                if ('log' === plot.option('scale')) {
                                    newData.metadata.ylabel = 'Log10(RPKM)';
                                }
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render('gender' === plot.option('differentiation') ? genderBoxplotSort(newData, config) : plot.sort(newData, config));
                            },
                            active: true
                        }
                    },
                    {
                        key: 'button2',
                        value: {
                            text: '\u25B2',
                            className: 'button btn-middle',
                            pre: function (plot, data, config) {
                                plot.option('sorting', 'increasing');
                            },
                            post: function (plot, data, config) {
                                var newData = JSON.parse(JSON.stringify(data));
                                if ('relative' === plot.option('range')) {
                                    newData = generateRelativeLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                }
                                if ('log' === plot.option('scale')) {
                                    newData.metadata.ylabel = 'Log10(RPKM)';
                                }
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render('gender' === plot.option('differentiation') ? genderBoxplotSort(newData, config) : plot.sort(newData, config));
                            }
                        }
                    },
                    {
                        key: 'button3',
                        value: {
                            text: '\u25BC',
                            className: 'button btn-right',
                            pre: function (plot, data, config) {
                                plot.option('sorting', 'decreasing');
                            },
                            post: function (plot, data, config) {
                                var newData = JSON.parse(JSON.stringify(data));
                                if ('relative' === plot.option('range')) {
                                    newData = generateRelativeLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                }
                                if ('log' === plot.option('scale')) {
                                    newData.metadata.ylabel = 'Log10(RPKM)';
                                }
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render('gender' === plot.option('differentiation') ? genderBoxplotSort(newData, config) : plot.sort(newData, config));
                            }
                        }
                    }]
                }
            };
        }

        function generateAbsoluteRelativeControl () {
            return {
                key: 'range',
                value: {
                    id: 'range-buttons',
                    text: 'Range',
                    buttons: [{
                        key: 'button1',
                        value: {
                            text: 'Relative',
                            className: 'button btn-left',
                            pre: function (plot, data, config) {
                                plot.option('range', 'relative');
                            },
                            post: function (plot, data, config) {
                                var newData = generateRelativeLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                if ('log' === plot.option('scale')) {
                                    newData.metadata.ylabel = 'Log10(RPKM)';
                                }
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render(plot.sort(newData, config));
                            }
                        }
                    },
                    {
                        key: 'button2',
                        value: {
                            text: 'Absolute',
                            className: 'button btn-right',
                            pre: function (plot, data, config) {
                                plot.option('range', 'absolute');
                            },
                            post: function (plot, data, config) {
                                var newData = generateLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                if ('log' === plot.option('scale')) {
                                    newData.metadata.ylabel = 'Log10(RPKM)';
                                }
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render(plot.sort(newData, config));
                                _buttons.isoform.plot.isoform.node().click();
                            },
                            active: true
                        }
                    }]
                }
            };
        }

        function boxToolTipFunction (x, y, input) {
            if ('tooltip' === input.key) {
                if ('box' === input.value.type) {
                    return input.value.data ? input.value.data.key + (input.value.data.key === 'male' || input.value.data.key === 'female' ? '<br/>' + input.value.data.value.extra.tissue : '') + '<br/>Number of Samples: ' + input.value.data.value.extra.num_samples : null;
                }
                if ('outlier' === input.value.type) {
                    return 'Outlier RPKM: ' + input.value.data.value.outlier;
                }
            }

        }

        function lineToolTipFunction () {

        }

        function legendMouseClickFunction (x, y, input) {
            if ('legend' === input.value.type) {
                console.log('Legend clicked! ' + JSON.stringify(input));
                var isoform = input.value.data.key;
                _boxplotContainer.style('display', '');
                _lineplotContainer.style('display', 'none');

                var boxSpecificData = _queryGeneData.isoformrpkm[isoform];
                boxSpecificData = Object.keys(boxSpecificData).map(function (tissue) {
                    var localBox = boxSpecificData[tissue];
                    return {
                        key: tissue,
                        value: [{
                            key: tissue,
                            value: {
                                high_whisker: localBox.high_whisker,
                                q3: localBox.q3,
                                median: localBox.median,
                                q1: localBox.q1,
                                low_whisker: localBox.low_whisker,
                                color: input.value.data.value.color,
                                outliers: localBox.outliers.map(function (outlier, i) {
                                    return {
                                        key: i,
                                        value: {
                                                outlier: outlier
                                           }
                                    };
                                }),
                                extra: {
                                    opacity: 1
                                }
                            }
                        }]
                    };
                });

                var newBoxPlotData = {
                    metadata: {
                        type: 'box',
                        title: _gene + ' Isoform View ' + isoform,
                        //width: _width - (_width / 7),
                        width: _width,
                        height: 800,
                        xlabel: '',
                        ylabel: 'RPKM',
                        position: {
                            control: CONTROL_POSITION,
                            title: TITLE_POSITION,
                            yAxisLabel: {
                                rotation: 90
                            },
                            xAxisLabel: {
                                tickRotation: -45,
                                tickTranslate: -15,
                                tickAlign: 'end'
                            }
                        },
                        options: [

                        ],
                        controls: [
                            generateGeneIsoformControl(),
                            generateLogLinearScaleControl(),
                            generateSortingControl(),
                            'crosshair',
                            'outliers',
                            'medians'
                        ]
                    },
                    data: boxSpecificData,
                    legend: convertToLineLegend(_queryGeneData.isoformrpkm, generateIsoformColors(_queryGeneData.isoformrpkm))
                };

                _boxplot.data(newBoxPlotData);
                _boxplot.mouseclick(mouseClickFunction);
                _boxplot.render(newBoxPlotData);
            }
        }

        function axisMouseClickFunction (x, y, input) {
            if ('axis' === input.value.type && 'tick' === input.value.subtype) {
                console.log('Axis click! ' + JSON.stringify(input));
                var tissue = input.value.data;

                var boxSpecificData = Object.keys(_queryGeneData.isoformrpkm).map(
                    function (isoform) {
                        var localIsoform = _queryGeneData.isoformrpkm[isoform];
                        var colors = generateIsoformColors(_queryGeneData.isoformrpkm);
                        return {
                            key: isoform,
                            value: [{
                                key: isoform,
                                value: {
                                    high_whisker: localIsoform[tissue].high_whisker,
                                    q3: localIsoform[tissue].q3,
                                    median: localIsoform[tissue].median,
                                    q1: localIsoform[tissue].q1,
                                    low_whisker: localIsoform[tissue].low_whisker,
                                    outliers: localIsoform[tissue].outliers.map(
                                        function (outlier, index) {
                                            return {
                                                key: index,
                                                value: {
                                                    outlier: outlier
                                                }
                                            };
                                        }),
                                    extra: {
                                        opacity: 1,
                                        num_samples: localIsoform[tissue].num_samples
                                    },
                                    color: colors[isoform]
                                }
                            }]
                        };
                    });

                var newBoxPlotData = {
                    metadata: {
                        type: 'box',
                        title: _gene + ' Isoform View ' + tissue,
                        //width: _width - (_width / 7),
                        width: _width,
                        height: 800,
                        xlabel: '',
                        ylabel: 'RPKM',
                        position: {
                            control: CONTROL_POSITION,
                            title: TITLE_POSITION,
                            yAxisLabel: {
                                rotation: 90
                            },
                            xAxisLabel: {
                                tickRotation: -45,
                                tickTranslate: -15,
                                tickAlign: 'end'
                            },
                            legend: {
                                left: 6/7,
                                top: 1/8,
                                right: 6/7,
                                align: 'left'
                            }
                        },
                        options: [

                        ],
                        controls: [
                            generateGeneIsoformControl(),
                            generateLogLinearScaleControl(),
                            generateSortingControl(),
                            'crosshair',
                            'outliers',
                            'medians'
                        ]
                    },
                    data: boxSpecificData,
                    legend: convertToLineLegend(_queryGeneData.isoformrpkm, generateIsoformColors(_queryGeneData.isoformrpkm))
                };

                _boxplot.data(newBoxPlotData);
                _boxplot.mouseclick(mouseClickFunction2);
                _boxplotContainer.style('display', '');
                _boxplot.render(newBoxPlotData);
                _lineplotContainer.style('display', 'none');
            }
        }

        function axisMouseClickFunction2 (x, y, input) {
            if ('axis' === input.value.type && 'tick' === input.value.subtype) {
                console.log('Legend clicked! ' + JSON.stringify(input));
                var isoform = input.value.data;
                _boxplotContainer.style('display', '');
                _lineplotContainer.style('display', 'none');

                var boxSpecificData = _queryGeneData.isoformrpkm[isoform];
                boxSpecificData = Object.keys(boxSpecificData).map(function (tissue) {
                    var localBox = boxSpecificData[tissue];
                    var colors = generateIsoformColors(_queryGeneData.isoformrpkm);
                    return {
                        key: tissue,
                        value: [{
                            key: tissue,
                            value: {
                                high_whisker: localBox.high_whisker,
                                q3: localBox.q3,
                                median: localBox.median,
                                q1: localBox.q1,
                                low_whisker: localBox.low_whisker,
                                color: colors[isoform],
                                outliers: localBox.outliers.map(function (outlier, i) {
                                    return {
                                        key: i,
                                        value: {
                                                outlier: outlier
                                           }
                                    };
                                }),
                                extra: {
                                    opacity: 1
                                }
                            }
                        }]
                    };
                });

                var newBoxPlotData = {
                    metadata: {
                        type: 'box',
                        title: _gene + ' Isoform View ' + isoform,
                        //width: _width - (_width / 7),
                        width: _width,
                        height: 800,
                        xlabel: '',
                        ylabel: 'RPKM',
                        position: {
                            control: CONTROL_POSITION,
                            title: TITLE_POSITION,
                            yAxisLabel: {
                                rotation: 90
                            },
                            xAxisLabel: {
                                tickRotation: -45,
                                tickTranslate: -15,
                                tickAlign: 'end'
                            },
                            legend: {
                                left: 6/7,
                                top: 1/8,
                                right: 6/7,
                                align: 'left'
                            }
                        },
                        options: [

                        ],
                        controls: [
                            generateGeneIsoformControl(),
                            generateLogLinearScaleControl(),
                            generateSortingControl(),
                            'crosshair',
                            'outliers',
                            'medians'
                        ]
                    },
                    data: boxSpecificData,
                    legend: convertToLineLegend(_queryGeneData.isoformrpkm, generateIsoformColors(_queryGeneData.isoformrpkm))
                };

                _boxplot.data(newBoxPlotData);
                _boxplot.mouseclick(mouseClickFunction);
                _boxplot.render(newBoxPlotData);
            }
        }

        function mouseClickFunction (x, y, input) {
            legendMouseClickFunction(x, y, input);
            axisMouseClickFunction(x, y, input);
        }

        function mouseMoveFunction (x, y, input) {
            var isoform = input.value.data.key;

            _emphasizedIsoform = isoform;

            var lineplotData = generateLineData(_queryGeneData.isoformrpkm, _geneColorData);
            //lineplotData.data.forEach(function (iso) {
            //    if (isoform === iso.key) {
            //        iso.value.style = iso.value.style || {};
            //        iso.value.style.strokeWidth = 12;
            //    }
            //});

            //_lineplot.render(_lineplot.sort(lineplotData, _lineplot.config()));
            if ('log' === _lineplot.option('scale')) {
                _buttons.isoform.scale.log.node().click();
            }
            if ('linear' === _lineplot.option('scale')) {
                _buttons.isoform.scale.linear.node().click();
            }
        }

        function mouseClickFunction2 (x, y, input) {
            legendMouseClickFunction(x, y, input);
            axisMouseClickFunction2(x, y, input);
        }

        generateIsoformColors = function (data) {
            var colors = {
                0: '#c41708',
                1: '#1fccf9',
                2: '#79e537',
                3: '#ddb501',
                4: '#60119a',
                5: '#3ea0a1',
                6: '#296f18',
                7: '#f5dbfc',
                8: '#b4e6fa',
                9: '#65079a',
                10: '#6216a4',
                11: '#8a24c6',
                12: '#a82d20',
                13: '#07ad84',
                14: '#d50fd1',
                15: '#249e5a',
                16: '#af3067',
                17: '#644ffb',
                18: '#1bb80a',
                19: '#33c5fa',
                20: '#668be6',
                21: '#cedc2a',
                22: '#6ea417',
                23: '#f80ddb',
                24: '#e3f3e4',
                25: '#1be427',
                26: '#93a3df',
                27: '#94416b',
                28: '#a37e55',
                29: '#9ba900',
                30: '#750f69',
                31: '#abfb4f',
                32: '#d257ee',
                33: '#094e9d',
                34: '#9a3574',
                35: '#cf4cc3',
                36: '#0357de',
                37: '#dd4571',
                38: '#ef6215',
                39: '#086b2b',
                40: '#e7e006',
                41: '#646a42',
                42: '#a7cebf',
                43: '#a1fd8f',
                44: '#168939',
                45: '#f6ee4d',
                46: '#1e70cb',
                47: '#92f910',
                48: '#cc41b0',
                49: '#1cd065',
                50: '#c17f19',
                51: '#d5701d',
                52: '#49e889',
                53: '#97344d',
                54: '#6ccbfa',
                55: '#b51460',
                56: '#3aa9e7',
                57: '#c4b580',
                58: '#f550b5',
                59: '#02af26',
                60: '#dbbe1c',
                61: '#9ac744',
                62: '#250501',
                63: '#176468',
                64: '#a0e7c7',
                65: '#f7cf08',
                66: '#f7cf08',
                67: '#4c0313',
                68: '#e58e54',
                69: '#f06bdb',
                70: '#c83de1',
                71: '#6bbcd0',
                72: '#b201b0',
                73: '#976027',
                74: '#da523d',
                75: '#4e74f8',
                76: '#dfc523',
                77: '#f6f43f',
                78: '#01e6c5',
                79: '#19fce0',
                80: '#3f3189',
                81: '#6a9fa6',
                82: '#f340af',
                83: '#113996',
                84: '#a0ec80',
                85: '#513f54',
                86: '#a7b48f',
                87: '#f90084',
                88: '#637acc',
                89: '#616de7',
                90: '#ec5494',
                91: '#95f459',
                92: '#8d3297',
                93: '#bc5a81',
                94: '#06e704',
                95: '#a03654',
                96: '#4576c0',
                97: '#3f8649',
                98: '#8b8a7f',
                99: '#e5c0ee'
            };

            var isoformColors = {};

            Object.keys(data).map(function (isoform) {
                return {
                    isoform:isoform,
                    maxValue: Math.max.apply(null, Object.keys(data[isoform]).map(function (tissue) {
                        return data[isoform][tissue].median;
                    }))
                };
            }).sort(function (a, b) {
                return b.maxValue - a.maxValue;
            }).map(function (isovalue, index) {
                return {
                    isoform: isovalue.isoform,
                    color: colors[index]
                };
            }).forEach(function (isoform) {
                isoformColors[isoform.isoform] = isoform.color;
            });

            return isoformColors;
        };

        this.setGene = setGene;
    }

    plotviz.GtexPlot = GtexPlot;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function EqtlPlot (div, url) {

        var _eqtlPlotContainer = div;
        var _data;
        var _plot;
        var _server = url;
        var _plotCreated = false;

        _plot = new plotviz.Plot(div);

        function query (snpId, geneId, tissue, geneSymbol) {
            var url = _server + '?snp_id=' + snpId + '&gene_id=' + geneId + '&tissue=' + tissue;

            var oReq = new XMLHttpRequest();

            oReq.open('GET', url);

            oReq.onload = function (event) {
                var status = oReq.status;
                var response = oReq.responseText;

                _data = serverResponseToPlotvizInput(response, snpId, geneId, tissue, geneSymbol);
                _plot.data(_data);

                if (!_plotCreated) {
                    _plot.create(_data, 'eqtl');
                    _plotCreated = true;
                }

                render();
            };

            oReq.onerror = function (error) {

            };

            oReq.send();
        }

        function render () {
            _plot.render(_data);
        }

        function serverResponseToPlotvizInput (response, snpId, geneId, tissue, geneSymbol) {
            var parsed = JSON.parse(response);
            return {
                metadata: {
                    type: 'box',
                    title: tissue + ' eQTL ' + snpId + ' ' + (geneSymbol ? geneSymbol : geneId),
                    width: 600,
                    height: 800,
                    xlabel: 'p-value = ' + parsed['p-value'].toPrecision(2),
                    ylabel: 'Rank Normalized Gene Expression',
                    position: {
                        viewer: {
                            left: 1/6,
                            right: 0.9,
                            top: 0.25,
                            bottom: 0.75
                        },
                        control: {
                            left: 0.27,
                            top: 1/8
                        },
                        title: {
                            x: 0.5,
                            y: 0.9,
                            align: 'center'
                        },
                        yAxisLabel: {
                            x: 0.2,
                            y: 0.5,
                            rotation: 90,
                            //align: 'center' // Not implemented
                        },
                        xAxisLabel: {
                            x: 0.5,
                            y: 0.35,
                            rotation: 0,
                            tickRotation: 0,
                            tickTranslate: 0,
                            tickAlign: 'center'
                            //align: 'center' // Not implemented
                        }
                    },
                    options: [],
                    controls: [generateDataPointsControl(),
                                generateMediansControl(),
                                'crosshair'],
                    outlierRadius: 3,
                    outlierJitter: 0.25
                },
                data: parseResponse(response),
                legend: []
            };
        }

        function eqtlExpressionPlotSort (data) {
            var mapping = {
                'Homo Ref': 0,
                'Het': 1,
                'Homo Alt': 2
            };

            data.data.sort(function (a, b) {
                return mapping[a.value.key] - mapping[b.value.key];
            });

            return data;
        }

        function generateDataPointsControl () {
            return {
                key: 'dataPoints',
                value: {
                    id: 'data-points-buttons',
                    text: 'Data Points',
                    buttons: [{
                        key: 'button1',
                        value: {
                            text: 'On',
                            className: 'button btn-left',
                            pre: function (plot, data, config) {
                                plot.option('outliers', 'on');
                            },
                            post: function (plot, data, config) {
                                plot.render(eqtlExpressionPlotSort(data));
                            },
                            active: true
                        }
                    },{
                        key: 'button2',
                        value: {
                            text: 'Off',
                            className: 'button btn-right',
                            pre: function (plot, data, config) {
                                plot.option('outliers', 'off');
                            },
                            post: function (plot, data, config) {
                                plot.render(eqtlExpressionPlotSort(data));
                            }
                        }
                    }]
                }
            };
        }

        function generateMediansControl () {
            return {
                key: 'Medians',
                value: {
                    id: 'medians-buttons',
                    text: 'Medians',
                    buttons: [{
                        key: 'button1',
                        value: {
                            text: 'All',
                            className: 'button btn-left',
                            pre: function (plot, data, config) {
                                plot.option('medians', 'all');
                            },
                            post: function (plot, data, config) {
                                plot.render(eqtlExpressionPlotSort(data));
                            },
                            active: true
                        }
                    },{
                        key: 'button2',
                        value: {
                            text: 'Only',
                            className: 'button btn-right',
                            pre: function (plot, data, config) {
                                plot.option('medians', 'only');
                            },
                            post: function (plot, data, config) {
                                plot.render(eqtlExpressionPlotSort(data));
                            }
                        }
                    }]
                }
            };
        }

        function parseResponse (response) {

            var parsed = JSON.parse(response);
            var HET = 1;
            var HOMO_REF = 0;
            var HOMO_ALT = 2;
            var mappingKey = parsed.genotypes.split(',').map(function (hashValue) {return parseInt(hashValue);});
            var mappingValues = parsed.expression_values.split(',').map(function (expressionValue) {return parseFloat(expressionValue);});
            var het_circles = mappingValues.filter(function (expressionValue, index) {return HET === mappingKey[index];});
            var homo_ref_circles = mappingValues.filter(function (expressionValue, index) {return HOMO_REF === mappingKey[index];});
            var homo_alt_circles = mappingValues.filter(function (expressionValue, index) {return HOMO_ALT === mappingKey[index];});
            return [
                inputToBox(parsed.boxplot.homo_ref, 'Homo Ref', homo_ref_circles),
                inputToBox(parsed.boxplot.het, 'Het', het_circles),
                inputToBox(parsed.boxplot.homo_alt, 'Homo Alt', homo_alt_circles)
            ];

            function inputToBox (input, keyString, circles) {
                return {
                    key: keyString + '<br/> N = ' + input.num_samples,
                    value: [{
                        key: keyString,
                        value: {
                            high_whisker: input.high_whisker,
                            q3: input.q3,
                            median: input.median,
                            q1: input.q1,
                            low_whisker: input.low_whisker,
                            color: 'rgb(142, 149, 222)',
                            outliers: input.outliers.concat(circles).map(
                                function (outlier, index) {
                                    return {
                                        key: index,
                                        value: {
                                            outlier: outlier
                                        }
                                    };
                                }),
                            extra: (input.high_whisker === 0 && input.q3 === 0 && input.median === 0 && input.q1 === 0 && input.low_whisker === 0) ? {opacity: 0, whiskerOpacity: 0, medianOpacity: 0, outlierOpacity: 0} : {opacity: 1, whiskerOpacity: 1, medianOpacity: 1, outlierOpacity: 1}
                        }
                    }]
                };
            }
        }

        this.query = query;
        this.render = render;
    }

    plotviz.EqtlPlot = EqtlPlot;

    return plotviz;
}) (plotviz || {});
