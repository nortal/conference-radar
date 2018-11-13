import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var'
import { Keywords } from '../../imports/api/keywords.js';
import Chart from 'chart.js/src/chart.js';
import d3 from 'd3v4';

Template.radar.onCreated(function () {
    this.blips = new ReactiveVar();

    // init highlight session variables
    Session.set("currentKeywordIndex", 0);
    Session.set("currentQuadrant", 0);
    // init conditional re-draw variable
    Session.set("lastEntryCount", 0);

    // cycle highlight every 5 seconds
    setInterval(highlightBlips, 5000);
});

Template.radar.helpers({
    currentKeywordIndex: function () {
        return Template.instance().currentKeywordIndex.get();
    },
    blips: function () {
        return Template.instance().blips.get();
    }
});

Template.radar.onRendered(function () {

    let query = Keywords.find();
    let handle = query.observeChanges({
        changed: function (id, data) {
            // when a new vote gets registered on an existing blip, re-draw
            draw();
        },
        added: function (id, data) {
            // added stuff
        }
    });

    //check every 3 seconds for update
    setInterval(pollDrawing, 3000);
});

function pollDrawing() {
    var len = Keywords.find().fetch().length;
    if (Session.get("lastEntryCount") !== len) {
        draw();
        Session.set("lastEntryCount", len);
    }
}

function random() {
    return Math.floor((Math.random() * 100) + 1);
}

const mapRange = (num, in_min, in_max, out_min, out_max) => {
    var result = (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    return Math.min(Math.max(result, out_min), out_max);
}

function getRing(keyword) {
    if (keyword.stage === "Adopt") {
        return 1;
    } else if (keyword.stage === "Trial") {
        return 2;
    } else if (keyword.stage === "Assess") {
        return 3;
    } else {
        return 4;
    }
}

function getQuadrant(keyword) {
    if (keyword.section === "Tools") {
        return 3;
    } else if (keyword.section === "Techniques") {
        return 0;
    } else if (keyword.section === "Platforms") {
        return 1;
    } else {
        return 2;
    }
}

function draw() {

    var keywords = Keywords.find().fetch();
    var entries = [];

    keywords.forEach(pushEntry);

    function pushEntry(value, index, array) {
        entries.push({
            label: value.keyword,
            quadrant: getQuadrant(value),   // 0, 1, 2, 3 (clockwise, starting from bottom right)
            ring: getRing(value),        // 0, 1, 2, 3 (inside -> out)
            size: mapRange(value.votes, 1, 50, 1.0, 3.5),
            votes: value.votes,
            stage: value.stage,
            section: value.section
        });
    }

    d3.selectAll("svg > *").remove();

    radar_visualization({
        svg_id: "techRadar",
        width: screen.availWidth,
        height: screen.availHeight - 20,
        colors: {
            background: "#EEF2F5",
            grid: "#FFFFFF",
            inactive: "#ddd"
        },
        title: "Nortal TechRadar",
        quadrants: [
            { name: "Techniques" },
            { name: "Platforms" },
            { name: "Frameworks" },
            { name: "Tools" }
        ],
        rings: [
            { name: "", color: "#009639" },
            { name: "Adopt", color: "#743EBC" },
            { name: "Trial", color: "#AD85FF" },
            { name: "Assess", color: "#62DE81" },
            { name: "Avoid", color: "#009639" }
        ],
        print_layout: true,
        entries: entries,
    });
}



function radar_visualization(config) {
    // The MIT License (MIT)

    // Copyright (c) 2017 Zalando SE

    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:

    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.

    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.

    clearInterval();

    // custom random number generator, to make random sequence reproducible
    // source: https://stackoverflow.com/questions/521295
    var seed = 42;
    function random(seed) {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    function random_between(min, max) {
        return min + random() * (max - min);
    }

    function normal_between(min, max) {
        return min + (random() + random()) * 0.5 * (max - min);
    }

    // radial_min / radial_max are multiples of PI
    const quadrants = [
        { radial_min: 0.15, radial_max: 0.5, factor_x: 1, factor_y: 1, baseColor: "#912E57", startAngle: Math.PI * 1.5, endAngle: Math.PI * 2.0},
        { radial_min: 0.5, radial_max: 0.85, factor_x: -1, factor_y: 1, baseColor: "#47307D", startAngle: Math.PI * 1.0, endAngle: Math.PI * 1.5 },
        { radial_min: -0.85, radial_max: -0.5, factor_x: -1, factor_y: -1, baseColor: "#3086A0", startAngle: Math.PI * 0.5, endAngle: Math.PI * 1.0 },
        { radial_min: -0.5, radial_max: -0.15, factor_x: 1, factor_y: -1, baseColor: "#005C37", startAngle: 0, endAngle: Math.PI * 0.5 }
    ];

    const rings = [
        { radius: 100, opacity: "FF" },
        { radius: 170, opacity: "FF" },
        { radius: 240, opacity: "C3" },
        { radius: 310, opacity: "87" },
        { radius: 380, opacity: "4B"  }
    ];

    const ringLabelOffset = [
        { x: -100 },
        { x: -162 },
        { x: -233 },
        { x: -304 },
        { x: -375 }
    ];

    const legend_offset = [
        { x: 500, y: 100 },
        { x: -785, y: 100 },
        { x: -785, y: -380 },
        { x: 500, y: -380 }
    ];

    function polar(cartesian) {
        var x = cartesian.x;
        var y = cartesian.y;
        return {
            t: Math.atan2(y, x),
            r: Math.sqrt(x * x + y * y)
        }
    }

    function cartesian(polar) {
        return {
            x: polar.r * Math.cos(polar.t),
            y: polar.r * Math.sin(polar.t)
        }
    }

    function bounded_interval(value, min, max) {
        var low = Math.min(min, max);
        var high = Math.max(min, max);
        return Math.min(Math.max(value, low), high);
    }

    function bounded_ring(polar, r_min, r_max) {
        return {
            t: polar.t,
            r: bounded_interval(polar.r, r_min, r_max)
        }
    }

    function bounded_box(point, min, max) {
        return {
            x: bounded_interval(point.x, min.x, max.x),
            y: bounded_interval(point.y, min.y, max.y)
        }
    }

    function segment(quadrant, ring) {
        var polar_min = {
            t: quadrants[quadrant].radial_min * Math.PI,
            r: ring == 0 ? 60 : rings[ring - 1].radius
        };
        var polar_max = {
            t: quadrants[quadrant].radial_max * Math.PI,
            r: rings[ring].radius
        };
        var cartesian_min = {
            x: 15 * quadrants[quadrant].factor_x,
            y: 15 * quadrants[quadrant].factor_y
        };
        var cartesian_max = {
            x: rings[4].radius * quadrants[quadrant].factor_x,
            y: rings[4].radius * quadrants[quadrant].factor_y
        };
        return {
            clipx: function (d) {
                var c = bounded_box(d, cartesian_min, cartesian_max);
                var p = bounded_ring(polar(c), polar_min.r + 30, polar_max.r - 30);
                d.x = cartesian(p).x; // adjust data too!
                return d.x;
            },
            clipy: function (d) {
                var c = bounded_box(d, cartesian_min, cartesian_max);
                var p = bounded_ring(polar(c), polar_min.r + 30, polar_max.r - 30);
                d.y = cartesian(p).y; // adjust data too!
                return d.y;
            },
            random: function () {
                return cartesian({
                    t: random_between(polar_min.t, polar_max.t),
                    r: normal_between(polar_min.r, polar_max.r)
                });
            }
        }
    }

    // position each entry randomly in its segment
    for (var i = 0; i < config.entries.length; i++) {
        var entry = config.entries[i];
        entry.segment = segment(entry.quadrant, entry.ring);
        var point = entry.segment.random();
        entry.x = point.x;
        entry.y = point.y;
        entry.color = entry.active || config.print_layout ?
            config.rings[entry.ring].color : config.colors.inactive;
    }

    // partition entries according to segments
    var segmented = new Array(4);
    for (var quadrant = 0; quadrant < 4; quadrant++) {
        segmented[quadrant] = new Array(4);
        for (var ring = 0; ring < 4; ring++) {
            segmented[quadrant][ring] = [];
        }
    }
    for (var i = 0; i < config.entries.length; i++) {
        var entry = config.entries[i];
        segmented[entry.quadrant][entry.ring - 1].push(entry);
    }

    // assign unique sequential id to each entry
    var id = 1;
    for (var quadrant of [2, 3, 1, 0]) {
        for (var ring = 0; ring < 4; ring++) {
            var entries = segmented[quadrant][ring];
            entries.sort(function (a, b) { return a.label.localeCompare(b.label); })
            for (var i = 0; i < entries.length; i++) {
                entries[i].id = "" + id++;
            }
        }
    }

    function translate(x, y) {
        return "translate(" + x + "," + y + ")";
    }

    function viewbox(quadrant) {
        return [
            Math.max(0, quadrants[quadrant].factor_x * 400) - 420,
            Math.max(0, quadrants[quadrant].factor_y * 400) - 420,
            440,
            440
        ].join(" ");
    }

    var svg = d3.select("svg#" + config.svg_id)
        .style("background-color", config.colors.background)
        .attr("width", config.width)
        .attr("height", config.height);

    var radar = svg.append("g");
    if ("zoomed_quadrant" in config) {
        svg.attr("viewBox", viewbox(config.zoomed_quadrant));
    } else {
        radar.attr("transform", translate(config.width / 2, config.height / 2));
    }

    var grid = radar.append("g");

    // draw grid lines
    grid.append("line")
        .attr("x1", 0).attr("y1", -400)
        .attr("x2", 0).attr("y2", 400)
        .style("stroke", config.colors.grid)
        .style("stroke-width", 1);
    grid.append("line")
        .attr("x1", -400).attr("y1", 0)
        .attr("x2", 400).attr("y2", 0)
        .style("stroke", config.colors.grid)
        .style("stroke-width", 1);

    var defs = grid.append("defs");
    var filter = defs.append("filter")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 1)
        .attr("height", 1)
        .attr("id", "solid");
    filter.append("feFlood")
        .attr("flood-color", "rgb(0, 0, 0, 0.8)");
    filter.append("feComposite")
        .attr("in", "SourceGraphic");

    // draw rings
    for (var i = 0; i < rings.length; i++) {
        grid.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", rings[i].radius)
            .style("fill", "none")
            .style("stroke", config.colors.grid)
            .style("stroke-width", 1);

        // draw labels (for each quadrant, but use rings as offset point)
        if (i != 0) {
            grid.append("rect")
                .attr("x", ringLabelOffset[i].x)
                .attr("y", 10)
                .attr("height", 20)
                .attr("width", 60)
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("fill", config.rings[i].color + "CD");

            grid.append("text")
                .text(config.rings[i].name.toUpperCase())
                .attr("x", ringLabelOffset[i].x + 30)
                .attr("y", 25)
                .attr("text-anchor", "middle")
                .style("fill", "#ffffff")
                .style("font-family", "Roboto, sans-serif")
                .style("font-size", 14)
                .style("font-weight", "light")
                .style("pointer-events", "none")
                .style("text-anchor", "middle")
                .style("user-select", "none");

            grid.append("rect")
                .attr("x", ringLabelOffset[i].x)
                .attr("y", -30)
                .attr("height", 20)
                .attr("width", 60)
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("fill", config.rings[i].color + "CD");

            grid.append("text")
                .text(config.rings[i].name.toUpperCase())
                .attr("x", ringLabelOffset[i].x + 30)
                .attr("y", -15)
                .attr("text-anchor", "middle")
                .style("fill", "#ffffff")
                .style("font-family", "Roboto, sans-serif")
                .style("font-size", 14)
                .style("font-weight", "light")
                .style("pointer-events", "none")
                .style("text-anchor", "middle")
                .style("user-select", "none");

            grid.append("rect")
                .attr("x", -ringLabelOffset[i].x - 60)
                .attr("y", -30)
                .attr("height", 20)
                .attr("width", 60)
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("fill", config.rings[i].color + "CD");

            grid.append("text")
                .text(config.rings[i].name.toUpperCase())
                .attr("x", -ringLabelOffset[i].x - 30)
                .attr("y", -15)
                .attr("text-anchor", "middle")
                .style("fill", "#ffffff")
                .style("font-family", "Roboto, sans-serif")
                .style("font-size", 14)
                .style("font-weight", "light")
                .style("pointer-events", "none")
                .style("text-anchor", "middle")
                .style("user-select", "none");

            grid.append("rect")
                .attr("x", -ringLabelOffset[i].x - 60)
                .attr("y", 10)
                .attr("height", 20)
                .attr("width", 60)
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("fill", config.rings[i].color + "CD");

            grid.append("text")
                .text(config.rings[i].name.toUpperCase())
                .attr("x", -ringLabelOffset[i].x - 30)
                .attr("y", 25)
                .attr("text-anchor", "middle")
                .style("fill", "#ffffff")
                .style("font-family", "Roboto, sans-serif")
                .style("font-size", 14)
                .style("font-weight", "light")
                .style("pointer-events", "none")
                .style("text-anchor", "middle")
                .style("user-select", "none");
        }
    }

    function legend_transform(quadrant, ring, index = null) {
        var dx = ring < 2 ? 0 : 120;
        var dy = (index == null ? -16 : index * 12);
        if (ring % 2 == 1) {
            dy = dy + 36 + segmented[quadrant][ring - 1].length * 12;
        }
        return translate(
            legend_offset[quadrant].x + dx,
            legend_offset[quadrant].y + dy
        );
    }

    // draw title and legend (only in print layout)
    if (config.print_layout) {

        radar.append("svg:image")
            .attr("transform", translate(-800, -540))
            .attr('width', 174)
            .attr('height', 91)
            .attr("xlink:href", "/images/Nortal_RGB_positive.png")

        // legend
        var legend = radar.append("g");
        for (var quadrant = 0; quadrant < 4; quadrant++) {
            legend.append("text")
                .attr("transform", translate(
                    legend_offset[quadrant].x,
                    legend_offset[quadrant].y - 45
                ))
                .text(config.quadrants[quadrant].name)
                .style("font-family", "Roboto, sans-serif")
                .style("font-weight", "bold")
                .style("font-size", "26");
            for (var ring = 1; ring < 5; ring++) {
                var ringIndex = ring - 1;
                legend.append("text")
                    .attr("transform", legend_transform(quadrant, ringIndex))
                    .text(config.rings[ringIndex + 1].name)
                    .style("font-family", "Roboto, sans-serif")
                    .style("font-size", "22")
                    .style("font-weight", "light");
                legend.selectAll(".legend" + quadrant + ringIndex)
                    .data(segmented[quadrant][ringIndex])
                    .enter()
                    .append("text")
                    .attr("transform", function (d, i) { return legend_transform(quadrant, ringIndex, i); })
                    .attr("class", "legend" + quadrant + ringIndex)
                    .attr("id", function (d, i) { return "legendItem" + d.id; })
                    .text(function (d, i) { return d.id + ". " + d.label; })
                    .style("font-family", "Roboto, sans-serif")
                    .style("font-size", "13")
                    .on("mouseover", function (d) { highlightLegendItem(d); })
                    .on("mouseout", function (d) { dehighlightLegendItem(d); });
            }
        }
    }

    // layer for entries
    var entries = radar.append("g")
        .attr("id", "entries");

    function highlightLegendItem(d) {
        var legendItem = document.getElementById("legendItem" + d.id);
        legendItem.setAttribute("class", "legend-text-highlight");
    }

    function dehighlightLegendItem(d) {
        var legendItem = document.getElementById("legendItem" + d.id);
        legendItem.setAttribute("class", "legend-text");
    }

    // draw blips on radar
    var blips = entries.selectAll(".blip")
        .data(config.entries)
        .enter()
        .append("g")
        .attr("class", "blip")
        .attr("transform", function (d, i) { return legend_transform(d.quadrant, d.ring, i); })
        .on("mouseover", function (d) { highlightLegendItem(d); })
        .on("mouseout", function (d) { dehighlightLegendItem(d); });

    this.blips = blips;

    // configure each blip
    blips.each(function (d) {
        var blip = d3.select(this);

        // blip link
        if (!config.print_layout && d.active && d.hasOwnProperty("link")) {
            blip = blip.append("a")
                .attr("xlink:href", d.link);
        }

        blip.append("circle")
            .attr("r", 9 * d.size)
            .attr("stroke-width", 1)
            .attr("stroke", "white")
            .attr("fill", d.color);

        // blip text
        if (d.active || config.print_layout) {
            var blip_text = config.print_layout ? d.id : d.label.match(/[a-z]/i);
            blip.append("text")
                .text(blip_text)
                .attr("y", 3)
                .attr("text-anchor", "middle")
                .style("fill", "#fff")
                .style("font-family", "Roboto, sans-serif")
                .style("font-size", function (d) { return blip_text.length > 2 ? "12" : "13"; })
                .style("font-weight", "light")
                .style("pointer-events", "none")
                .style("user-select", "none");
        }
    });

    // make sure that blips stay inside their segment
    function ticked() {
        blips.attr("transform", function (d) {
            return translate(d.segment.clipx(d), d.segment.clipy(d));
        })
    }

    
    // distribute blips, while avoiding collisions
    d3.forceSimulation()
        .nodes(config.entries)
        .velocityDecay(0.19) // magic number (found by experimentation)
        .force("collision", d3.forceCollide().radius(11).strength(0.85))
        .on("tick", ticked);

}

function highlightBlips() {
    function getNextKeywordInQuadrant() {
        var currentKeywordIndex = Session.get("currentKeywordIndex") + 1;
        function getQuadrantKeywords(item, index) {
            if (Session.get("currentQuadrant") === getQuadrant(item)) {
                quadrantKeywords.push(item);
            }
        }

        var allKeywords = Keywords.find().fetch();

        var quadrantKeywords = [];
        allKeywords.forEach(getQuadrantKeywords);

        // switch quadrant when done with current one
        if (currentKeywordIndex >= quadrantKeywords.length) {
            currentKeywordIndex = 0;
            var currentQuadrant = Session.get("currentQuadrant") >= 3 ? 0 : Session.get("currentQuadrant") + 1;
            Session.set("currentQuadrant", currentQuadrant);
            quadrantKeywords = [];
            allKeywords.forEach(getQuadrantKeywords);
        }
        Session.set("currentKeywordIndex", currentKeywordIndex);
        return quadrantKeywords[currentKeywordIndex];
    }

    Session.set("currentKeyword", getNextKeywordInQuadrant());
    //var highlightedBlipsPerQuadrant = [{ quadrant: 0, blips: [] }, { quadrant: 1, blips: [] }, { quadrant: 2, blips: [] }, { quadrant: 3, blips: [] }];

    // highlight blips if available
    if (this.blips) {
        this.blips.each(function (d) {
            var blip = d3.select(this);

            var circle = blip.select("circle");
            var data = circle.datum();
            //highlightedBlipsPerQuadrant[data.quadrant].blips.push(blip);

            // highlight all matching blips
            if (Session.get("currentKeyword") && data.label === Session.get("currentKeyword").keyword) {
                var color = data.color + "FF";
                circle.style("fill", color);
                circle.style("stroke", "black");
                var e = document.createEvent('UIEvents');
                e.initUIEvent('mouseover', true, true, /* ... */);
                circle.node().dispatchEvent(e);
            } else {
                var color = data.color + "46";
                circle.style("fill", color);
                circle.style("stroke", "white");
                var e = document.createEvent('UIEvents');
                e.initUIEvent('mouseout', true, true, /* ... */);
                circle.node().dispatchEvent(e);
            }
        });

        //highlightedBlipsPerQuadrant.forEach(sortBlips);

        //function sortBlips(item, index) {
        //    item.blips.sort(function (a, b) {
        //        return a.select("circle").datum().ring - b.select("circle").datum().ring;
        //    })
        //}

    }
}