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

    const columnWidth = 250;
    const labelWidth = 100; // Cut from the above columnWidth

    const rowHeightWithPadding = 20;

    const boundingClientRect = svg.node().parentNode.getBoundingClientRect();
    const containerHeight = boundingClientRect.height - 100;

    /**
     * Calculates the beginning of the row considering wrapping
     */
    const calculateDataRowX = function (data, index) {
        const calculatedY = (index + 1) * rowHeightWithPadding;
        // x calculation uses 0 based index
        const columnIndex = Math.floor(calculatedY / containerHeight)
        return columnIndex * columnWidth;
    }

    const calculateDataRowY = function (data, index) {
        const calculatedY = (index + 1) * rowHeightWithPadding;
        // y calculation uses 0 based index
        const columnIndex = Math.floor(calculatedY / containerHeight)
        const itemIndexInColumn = Math.ceil((calculatedY - (columnIndex * containerHeight)) / rowHeightWithPadding);
        return itemIndexInColumn * rowHeightWithPadding;
    }

    const calculateScoreMarkerRadius = function (scoreMarkerValue) {
        return 2.6 * Math.sqrt(scoreMarkerValue);
    }

    const row = svg.selectAll('g').data(data).enter().append("g");

    const dottedLineLength = columnWidth - labelWidth - 6; // Magic number adds spacing

    row.append("text")
        .attr("x", calculateDataRowX)
        .attr("y", calculateDataRowY)
        .attr("font-size", "10px")
        .attr("fill", "gray")
        .attr("textLength", dottedLineLength)
        .text("··········································································");

    var blipX = d3.scaleLinear()
        .domain([1, 4])
        // We substract maximum score marker radius for spacing
        .range([calculateScoreMarkerRadius(1), dottedLineLength - calculateScoreMarkerRadius(4)]);

    row.append("text")
        .attr("x", (d, i) => calculateDataRowX(d, i) + columnWidth - labelWidth)
        .attr("y", calculateDataRowY)
        .attr("font-size", "10px")
        .text(d => d.name);

    row.append("circle")
        .attr("r", d => calculateScoreMarkerRadius(d.value))
        .attr("class", "position-marker")
        .attr("cx", (d, i) => calculateDataRowX(d, i) + blipX(d.value))
        .attr("cy", (d, i) => Math.max(calculateDataRowY(d, i) - 3.5),0); // Magic number is cemtering circle on the dotted line

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

        ;
        if (!summarizedBlips.hasOwnProperty(value.section)) {
            summarizedBlips[value.section] = [];
        }
        summarizedBlips[value.section].push({ "name": prop, "value": totalScore });
    });

    return summarizedBlips;

}
