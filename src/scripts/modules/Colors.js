import * as d4 from "d3";

export function colorChart(){
    return shuffle([
        "lightpink", "palevioletred", "hotpink", "mediumvioletred", "orchid",
        "crimson", "darkmagenta", "mediumorchid", "indigo", "mediumslateblue",
        "lightskyblue", "darkslateblue", "cornflowerblue", "lightslategray", "dodgerblue",
        "steelblue","deepskyblue","cadetblue", "darkturquoise", "paleturquoise",
        "mediumaquamarine","teal", "medianturquoise", "darkseagreen","limegreen",
        "palegreen", "forestgreen", "darkgreen", "yellowgreen", "wheat",
        "olivedrab","olive", "darkkhaki", "khaki", "gold",
        "goldenrod", "darkgoldenrod", "orange", "tan", "peru",
        "sandybrown", "chocolate","saddlebrown", "sienna", "lightsalmon",
        "coral","orangered", "darksalmon", "tomato", "salmon",
        "lightcoral", "rosybrown", "indianred", "red", "firebrick",
        "darkred", "gainsboro", "silver", "darkgray", "gray", "dimgray"
    ]);

}

function shuffle(array) {
    // Fisher-Yates shuffle
    let counter = array.length;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }

    return array;
}

export function getColors(theme){
    const palette = {
        // colorbrewer
        ylgnbu:["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58","#040e29"],
        orrd: ["#edf8b1",'#fff7ec','#fee8c8','#fdd49e','#fdbb84','#fc8d59','#ef6548','#d7301f','#b30000','#7f0000','#4c0000'],
        gnbu: ['#f0f0f0','#f7fcf0','#e0f3db','#ccebc5','#a8ddb5','#7bccc4','#4eb3d3','#2b8cbe','#0868ac','#084081','#052851'],
        rdpu: ['#fff7f3','#fde0dd','#fcc5c0','#fa9fb5','#f768a1','#dd3497','#ae017e','#7a0177','#49006a'],

        // other sources
        reds: ["#FFE4DE", "#FFC6BA", "#F7866E", "#d9745e", "#D25C43", "#b6442c", "#9b3a25","#712a1c", "#562015", "#2d110b"],
        purples: ['#fcfbfd','#efedf5','#dadaeb','#bcbddc','#9e9ac8','#807dba','#6a51a3','#54278f','#3f007d'],
        reds2: ['#f0f0f0', '#fff5f0','#fee0d2','#fcbba1','#fc9272','#fb6a4a','#ef3b2c','#cb181d','#a50f15','#67000d']
    };
    if(!palette.hasOwnProperty(theme)) throw "Color theme not found: " + theme;
    return palette[theme]
}

/**
 * scaleQuantile maps the continuous domain to a discrete range of colors
 * @param data {List} of numerical data
 * @param colors {List} of hexadecimal colors
 */
export function setColorScale(data, colors, dmin = 0) {
    // let dmin = Math.round(d4.min(data));
    let dmax = Math.round(d4.max(data));
    return d4.scaleQuantile()
        .domain([dmin, dmax])
        .range(colors);
}

/**
 *
 * @param title {String}
 * @param dom {object} D3 dom object
 * @param scale {Object} D3 scale of the color
 * @param config {Object} with attr: x, y
 * @param useLog {Boolean}
 * @param cell
 */
export function drawColorLegend(title, dom, scale, config, useLog, cell={h:5, w:50}){

    const data = [0].concat(scale.quantiles()); // add 0 to the list of values
    // legend title
    dom.append("text")
        .attr("class", "legend normal")
        .text(title)
        .attr("x", -10)
        .attr("text-anchor", "end")
        .attr("y", cell.h)
        .attr("transform", `translate(${config.x}, ${config.y})`);

    // legend groups
    const legends = dom.append("g").attr("transform", `translate(${config.x}, ${config.y})`)
                    .selectAll(".legend").data(data);

    const g = legends.enter().append("g").classed("legend", true);
    g.append("rect")
        .attr("x", (d, i) => cell.w*i)
        .attr("y", 5)
        .attr("width", cell.w)
        .attr("height", cell.h)
        .style("fill", (d) => scale(d));

    g.append("text")
        .attr("class", "normal")
        .text((d) => useLog?(Math.pow(10, d)-1).toPrecision(2):d) // TODO: assuming log is base 10
        .attr("x", (d, i) => cell.w * i)
        .attr("y", 0);


}