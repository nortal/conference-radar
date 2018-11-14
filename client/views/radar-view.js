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
            size: mapRange(value.votes, 1, 50, 0.85, 3.5),
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
            { name: "Languages & Frameworks" },
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
        { radial_min: 0.0, radial_max: 0.5, factor_x: 3.3, factor_y: 3.3 },
        { radial_min: 0.5, radial_max: 1.0, factor_x: -3.3, factor_y: 3.3 },
        { radial_min: -1.0, radial_max: -0.5, factor_x: -3.3, factor_y: -3.3 },
        { radial_min: -0.5, radial_max: -0.0, factor_x: 3.3, factor_y: -3.3 }
    ];

    const rings = [
        { radius: 100, opacity: "FF" },
        { radius: 180, opacity: "FF" },
        { radius: 260, opacity: "C3" },
        { radius: 340, opacity: "87" },
        { radius: 415, opacity: "4B"  }
    ];

    const ringLabelOffset = [
        { x: -100 },
        { x: -166 },
        { x: -250 },
        { x: -329 },
        { x: -410 }
    ];

    const legend_offset = [
        { x: 500, y: 100 },
        { x: -850, y: 100 },
        { x: -850, y: -330 },
        { x: 500, y: -330 }
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
            r: ring == 0 ? 100 : rings[ring - 1].radius
        };
        var polar_max = {
            t: quadrants[quadrant].radial_max * Math.PI,
            r: rings[ring].radius
        };
        var cartesian_min = {
            x: (7 * (ring + 1)) * quadrants[quadrant].factor_x,
            y: (7 * (ring + 1)) * quadrants[quadrant].factor_y
        };
        var cartesian_max = {
            x: (rings[4].radius) * quadrants[quadrant].factor_x,
            y: (rings[4].radius) * quadrants[quadrant].factor_y
        };
        return {
            clipx: function (d) {
                var c = bounded_box(d, cartesian_min, cartesian_max);
                var p = bounded_ring(polar(c), polar_min.r + 2, polar_max.r - 2);
                d.x = cartesian(p).x; // adjust data too!
                return d.x;
            },
            clipy: function (d) {
                var c = bounded_box(d, cartesian_min, cartesian_max);
                var p = bounded_ring(polar(c), polar_min.r + 2, polar_max.r - 2);
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
        segmented[quadrant] = [];
        //for (var ring = 0; ring < 4; ring++) {
        //    segmented[quadrant][ring] = [];
        //}
    }
    for (var i = 0; i < config.entries.length; i++) {
        var entry = config.entries[i];
        segmented[entry.quadrant].push(entry);
    }

    // assign unique sequential id to each entry
    var id = 1;
    for (var quadrant of [2, 3, 1, 0]) {
        var entries = segmented[quadrant];
        entries.sort(function (a, b) { return a.label.localeCompare(b.label); })
        for (var i = 0; i < entries.length; i++) {
            entries[i].id = "" + id++;
        }
    }

    function translate(x, y) {
        return "translate(" + x + "," + y + ")";
    }

    var svg = d3.select("svg#" + config.svg_id)
        .style("background-color", config.colors.background)
        .attr("width", config.width)
        .attr("height", config.height);

    var radar = svg.append("g");
        radar.attr("transform", translate(config.width / 2, config.height / 2));

    var grid = radar.append("g");

    // draw grid lines
    grid.append("line")
        .attr("x1", 0).attr("y1", -500)
        .attr("x2", 0).attr("y2", 500)
        .style("stroke", config.colors.grid)
        .style("stroke-width", 1);
    grid.append("line")
        .attr("x1", -500).attr("y1", 0)
        .attr("x2", 500).attr("y2", 0)
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
            .style("fill", i === 0 ? "white" : "none")
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
        console.log("legend: quadrant" + quadrant + " ring " + ring + " index " + index)
        var dx = 120 * (Math.floor(index / 21));
        var dy = 16 * (index % 21);
        return translate(
            legend_offset[quadrant].x + dx,
            legend_offset[quadrant].y + dy
        );
    }

    function legend_transform_blip(quadrant, ring, index = null) {
        var dx = ring < 2 ? 0 : 400;
        var dy = (index == null ? -16 : index * 36);
        if (ring % 2 == 1) {
            dy = dy + 72 + segmented[quadrant].length * 36;
        }
        return translate(
            legend_offset[quadrant].x + dx,
            legend_offset[quadrant].y + dy
        );
    }

    // draw title and legend (only in print layout)
    if (config.print_layout) {

        radar.append("svg:image")
            .attr("transform", translate(-910, -500))
            .attr('width', 174)
            .attr('height', 91)
            .attr("xlink:href", "/images/Nortal_RGB_positive.png")

        // legend
        var legend = radar.append("g");
        for (var quadrant = 0; quadrant < 4; quadrant++) {
            var counter = 0;

            legend.append("text")
                .attr("transform", translate(
                    legend_offset[quadrant].x,
                    legend_offset[quadrant].y - 45
                ))
                .text(config.quadrants[quadrant].name)
                .style("font-family", "Roboto, sans-serif")
                .style("font-weight", "bold")
                .style("font-size", "24");
            for (var ring = 1; ring < 5; ring++) {
                counter = counter + 1;
                var ringIndex = ring - 1;
                legend.selectAll(".legend" + quadrant)
                    .data(segmented[quadrant])
                    .enter()
                    .append("text")
                    .attr("transform", function (d, i) { return legend_transform(quadrant, ringIndex, i); })
                    .attr("class", "legend" + quadrant)
                    .attr("id", function (d, i) { return "legendItem" + d.id; })
                    .text(function (d, i) { return d.id + ". " + d.label; })
                    .style("font-family", "Roboto, sans-serif")
                    .style("font-size", "12")
                    .style("fill", "#616A73")
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
        legendItem.setAttribute("style", "fill: black; font-size: 12;");
    }

    function dehighlightLegendItem(d) {
        var legendItem = document.getElementById("legendItem" + d.id);
        legendItem.setAttribute("class", "legend-text");
        legendItem.setAttribute("style", "fill: #616A73; font-size: 12;");
    }

    // draw blips on radar
    var blips = entries.selectAll(".blip")
        .data(config.entries)
        .enter()
        .append("g")
        .attr("class", "blip")
        .attr("transform", function (d, i) { return legend_transform_blip(d.quadrant, d.ring, i); })
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
                .style("fill", "#FFFFFF")
                .style("font-family", "Roboto, sans-serif")
                .style("font-size", function (d) { return blip_text.length > 2 ? "11" : "12"; })
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
        .velocityDecay(0.15) // magic number (found by experimentation)
        .force("collision", d3.forceCollide().radius(9).strength(0.90))
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
            var text = blip.select("text");
            var data = circle.datum();
            //highlightedBlipsPerQuadrant[data.quadrant].blips.push(blip);

            // highlight all matching blips
            if (Session.get("currentKeyword") && data.label === Session.get("currentKeyword").keyword) {
                var color = data.color + "FF";
                circle.style("fill", color);
                circle.style("stroke", "white");
                var e = document.createEvent('UIEvents');
                e.initUIEvent('mouseover', true, true, /* ... */);
                circle.node().dispatchEvent(e);
            } else {
                var color = data.color + "2A";
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