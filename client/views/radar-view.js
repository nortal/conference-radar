import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var'
import { Keywords } from '../../imports/api/keywords.js';
import d3 from 'd3';
import _ from 'underscore';

Template.radar.onCreated(function () {
    this.blips = new ReactiveVar();
    this.legends = new ReactiveVar();

    // init highlight session variables
    Session.set("currentKeywordIndex", 0);
    Session.set("currentQuadrant", 0);
    // init conditional re-draw variable
    Session.set("lastEntryCount", 0);

    // cycle highlight every 5 seconds
    //setInterval(highlightBlips, 5000);
});

Template.radar.helpers({
    currentKeywordIndex: function () {
        return Template.instance().currentKeywordIndex.get();
    },
    blips: function () {
        return Template.instance().blips.get();
    },
    quadrants: function() {
        return [
            {name: "Languages & Frameworks", id: "frameworks"},
            {name: "Platforms", id: "platforms"},
            {name: "Techniques", id: "techniques"},
            {name: "Tools", id: "tools"}
        ];
    },
    quadrantClass: function() {
        switch (Router.current().params.query.rows) {
            case "1":
                return "col-3";
            case "2":
                return "col-6";
            case "4":
                return "col-12";
            default:
                return "col-3"
        }
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
    setTimeout(pollDrawing, 100);
    setInterval(pollDrawing, 3000);
});

function pollDrawing() {
    var len = Keywords.find().fetch().length;
    if (Session.get("lastEntryCount") !== len) {
        draw();
        Session.set("lastEntryCount", len);
    }
}

function draw() {

    var keywords = Keywords.find().fetch();
    var visualizeEntries = initalizeEntries(keywords);

    d3.selectAll("svg > *").remove();

    initalizeSvg(d3.select("svg#tools"), visualizeEntries['Tools']);
    initalizeSvg(d3.select("svg#techniques"), visualizeEntries['Techniques']);
    initalizeSvg(d3.select("svg#frameworks"), visualizeEntries['Frameworks']);
    initalizeSvg(d3.select("svg#platforms"), visualizeEntries['Platforms']);
}

function initalizeSvg(svg, data) {
    data = _.sortBy(data, 'value').reverse();

    // bounding rect of current column
    const columnRect = svg.node().parentNode.getBoundingClientRect();
    const columnWidth = columnRect.width;

    // padding between entries
    const rowHeightWithPadding = 20;

    // width of the labels, cut from width
    const labelWidth = 50;

    // Magic number centers circle on the dotted line
    const verticalOffset = 3.5;
    // length of the dotted line
    const dottedLineLength = columnWidth - labelWidth - 6; // Magic number adds spacing



    const calculateDataRowY = function (data, index) {
        const calculatedY = (index + 1) * rowHeightWithPadding;
        const itemIndexInColumn = Math.ceil(calculatedY / rowHeightWithPadding);
        return itemIndexInColumn * rowHeightWithPadding;
    };

    const calculateScoreMarkerRadius = function (scoreMarkerValue) {
        return 2.6 * Math.sqrt(scoreMarkerValue);
    };

    const row = svg.selectAll('g').data(data).enter().append("g");

    row.append("line")
        .attr("x1", 0)
        .attr("x2", dottedLineLength)
        .attr("y1", (d, i) => calculateDataRowY(d, i) - verticalOffset)
        .attr("y2", (d, i) => calculateDataRowY(d, i) - verticalOffset)
        .attr("class", "dotted-line");

    var blipX = d3.scaleLinear()
        .domain([1, 4])
        // We substract maximum score marker radius for spacing
        .range([calculateScoreMarkerRadius(1), dottedLineLength - calculateScoreMarkerRadius(4)]);

    row.append("text")
        .attr("x", columnWidth - labelWidth)
        .attr("y", (d, i) => calculateDataRowY(d, i))
        .attr("font-size", "10px")
        .text(d => d.name);

    row.append("circle")
        .attr("r", d => calculateScoreMarkerRadius(d.value))
        .attr("class", "position-marker")
        .attr("cx", (d, i) => blipX(d.value))
        .attr("cy", (d, i) => Math.max(calculateDataRowY(d, i) - verticalOffset),0);
}

/**
 * Merges provided blip into another object
 */
function mergeBlip(blip, mergedBlips) {
    var mergedBlip = mergedBlips[blip.keyword];
    if (!mergedBlip) {
        mergedBlip = { "section": blip.section }
    }

    mergedBlip[blip.stage] = blip.votes;
    mergedBlips[blip.keyword] = mergedBlip;
}

// calculates score
function initalizeEntries(keywords) {


    var mergedBlips = {};
    keywords.forEach(k => mergeBlip(k, mergedBlips));

    var summarizedBlips = {};
    _.each(mergedBlips, function (value, prop) {
        var adoptVotes = value['Adopt'] || 0;
        var trialVotes = value['Trial'] || 0;
        var assessVotes = value['Assess'] || 0;
        var avoidVotes = value['Avoid'] || 0;

        var totalScore = (avoidVotes * 1 + assessVotes * 2 + trialVotes * 3 + adoptVotes * 4) / (avoidVotes + assessVotes + trialVotes + adoptVotes);


        if (!summarizedBlips.hasOwnProperty(value.section)) {
            summarizedBlips[value.section] = [];
        }
        summarizedBlips[value.section].push({ "name": prop, "value": totalScore });
    });

    return summarizedBlips;

}
