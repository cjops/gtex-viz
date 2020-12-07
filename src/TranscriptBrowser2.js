/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

/*
TODO
1. refactoring
 */
'use strict';

import {select, selectAll} from "d3-selection";
import {json} from "d3-fetch";
import * as d3 from "d3";

import {createSvg, generateRandomMatrix, checkDomId, createCanvas} from "./modules/utils";
import {range} from "d3-array";
import {randomNormal} from "d3-random";
import Heatmap from "./modules/Heatmap";
import DendroHeatmapConfig from "./modules/DendroHeatmapConfig";
import DendroHeatmap from "./modules/DendroHeatmap";
import GroupedViolin from "./modules/GroupedViolin";
import IsoformTrackViewer from "./modules/IsoformTrackViewer";
import BubbleMap from "./modules/BubbleMap";
import HalfMap from "./modules/HalfMap";

export function getMongoData(geneName, track){
    return json('https://gandallab.connor.jp/gene?geneId=' + geneName + '&track=' + track)
}

export function transcriptBubbles(par){
    let exonH = 20;
    let height = exonH*(par.data.transcripts.length+1);
    let width = par.width;
    let transcripts = par.data.transcripts;
    var i;
    for (i = 0; i < transcripts.length; i += 1) {
        transcripts[i].enum = i;
    }
    let annotations = transcripts.filter(tx => tx.hasOwnProperty('expression') && tx.expression.length);
    //console.log(transcripts)
    //console.log(annotations);
    if (annotations.length == 0) {
        return;
    }

    let margin = {top: 20, right: 30, bottom: 0, left: 30};

    // create the SVG
    let svgId=`${par.id}-svg`;
    let svg = d3.select("#"+par.id).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("max-width", `${width}px`)
        .style("font", "10px san-serif")
        .attr("id", svgId);

    let x = d3.scalePoint()
        .domain(annotations[0].expression.map(d => d.cell_type))
        .range([margin.left, width - margin.right])
        .padding(0)
        .round(true);

    let y = d3.scalePoint()
        .domain(annotations[0].expression.map(d => d.cell_type))
        .range([margin.left, width - margin.right])
        .padding(0)
        .round(true);

    let r = d3.scaleLinear()
        .domain([0, d3.max(annotations, d => d3.max(d.expression, e => e.pct_exp))])
        .range([1, 10])
        .interpolate(d3.interpolateRound);

    console.log(r.domain()[1])

    let color = d3.scaleSequential()
        .domain([-0.5 , 2.5])
        .interpolator(d3.interpolateLab("lightgrey", "blue"));

    svg.selectAll(".tx_row")
        .data(annotations)
        .join("g")
        .attr("class", "tx_row")
        .attr("class", d => d.transcriptId.replace(".", "_"))
        .attr("transform", (d) => `translate(0,${margin.top+r.range()[1]+18.3*d.enum})`)
        .selectAll("circle")
        .data(d => d.expression)
        .join("circle")
            .attr("cx", d => x(d.cell_type)+0.5)
            .attr("cy", 10)
            .attr("r", d => r(d.pct_exp))
            .attr("fill", d => color(d.avg_exp_scaled));
    
    svg.append("g")
        .attr("transform", `translate(0,${margin.top})`)
        .call(d3.axisTop(x))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("line").remove())
        .selectAll("text")
        .attr("y", 0)
        .attr("x", 9)
        .attr("dy", ".35em")
        .attr("transform", "rotate(90)")
        .style("text-anchor", "end");
}

export function transcriptTracks(par){
    const exonH = 20;
    par.height = exonH*(par.data.transcripts.length+1)

    let margin = {
        top: par.marginTop,
        right: par.marginRight,
        bottom: par.marginBottom,
        left: par.marginLeft
    };
    let inWidth = par.width - (par.marginLeft + par.marginRight);
    let inHeight = par.height - (par.marginTop + par.marginBottom);

    // test input params
    checkDomId(par.id);

    // create the SVG
    let svg = createSvg(par.id, par.width, par.height, margin);

    let svgDefs = select(`#${par.id}-svg`).append("defs").lower();

    /*  <polyline points="0,0 30,25 0,50"
            fill="none" stroke="black", stroke-width="10", stroke-linejoin="round"  /> */

    svgDefs.append("symbol")
        .attr("id","chevron-right")
        //.attr("viewBox", "0 0 15 15")
        //.attr("width", 15)
        //.attr("height", 15)
        .append("polyline")
        .attr("points", "0,3 5,7.5 0,12")
        .attr("fill", "none")
        .attr("stroke", "#555f66")
        //.attr("stroke-linejoin", "round");

        svgDefs.append("symbol")
        .attr("id","chevron-left")
        //.attr("viewBox", "0 0 15 15")
        //.attr("width", 15)
        //.attr("height", 15)
        .append("polyline")
        .attr("points", "5,3 0,7.5 5,12")
        .attr("fill", "none")
        .attr("stroke", "#555f66")
        //.attr("stroke-linejoin", "round");

    // render the transcripts
    let config = {
        x: 0,
        y: 0,
        w: inWidth,
        h: inHeight,
        labelOn: par.labelPos
    };
    let viewer = new IsoformTrackViewer(par.data.transcripts, par.data.exons, par.data.modelExons, config);
    viewer.render(false, svg, par.labelPos);

    _customizeIsoformTracks(svg);
}

function _customizeIsoformTracks(mapSvg){
    mapSvg.selectAll(".isotrack")
        .on("mouseover", function(){
            let tx_id = select(this).attr('id');
            select("#expressionBubbles ."+tx_id).classed("highlighted", true);
        })
        .on("mouseout", function(){
            let tx_id = select(this).attr('id');
            select("#expressionBubbles ."+tx_id).classed("highlighted", false);
        })
    mapSvg.selectAll(".isotrack").selectAll('.exon-curated')
        .on("mouseover", function(d){
            select(this).classed("highlighted", true);
        })
        .on("mouseout", function(){
            select(this).classed("highlighted", false);
            mapSvg.selectAll(".exon-curated").classed("highlighted", false);
        })
        .each(function(d){
            if (d.oriExon) {
                tippy(this, {
                    content: `Exon ${d.oriExon.exonNumber}: ${d.chromStart} - ${d.chromEnd} (${Number(d.chromEnd) - Number(d.chromStart) + 1} bp)`,
                    aria: null,
                    trigger: 'mouseenter',
                    followCursor: 'horizontal',
                    hideOnClick: false,
                    interactive: true,
                    appendTo: document.body
                });
            }
        });
    
}

