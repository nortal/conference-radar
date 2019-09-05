import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var'
import { Keywords, Users } from '../../imports/api/keywords.js';
import { Stages, Sections } from '../../imports/api/constants.js';
import { DevelopFunctions } from '../../imports/api/develop.js';
import d3 from 'd3';
import _ from 'underscore';

const keywordClassifier = require('/public/keywords.json');

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
    setTimeout(pollDrawing, 500);
    setInterval(pollDrawing, 3000);

    // render on resize
    $(window).resize(throttledOnWindowResize);
});

Template.radar.helpers({
    currentKeywordIndex: function () {
        return Template.instance().currentKeywordIndex.get();
    },
    blips: function () {
        return Template.instance().blips.get();
    },
    isSingleQuadrantView: function () {
        return Sections.find(quadrant => { return quadrant.id === Template.instance().data }) !== undefined;
    }
});

Template.radar.events({
    'click #randomGenButton'() {
        DevelopFunctions.generateRandomData(keywordClassifier);
    },
    'click #databaseClearButton'() {
        DevelopFunctions.clearDatabase();
    },
    'click #usersClearButton'() {
        DevelopFunctions.clearUsers();
    },
});

Template.combinedRadar.helpers({
    stages: function() {
        return Stages;
    },
    quadrants: function() {
        return Sections;
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
                return "col-12 col-sm-6 col-lg-3"
        }
    },
});

Template.singleRadar.onCreated(function () {
    this.selectedQuadrant = Sections.find(quadrant => { return quadrant.id === this.data });
});

Template.singleRadar.helpers({
    quadrantData: function (field) {
        return Template.instance().selectedQuadrant[field];
    },
});

Template.radar.onDestroyed(function() {
    $(window).off('resize', throttledOnWindowResize);
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
    var data = initializeEntries(keywords);

    _.each(Sections, function (section) {
        const svg = d3.select("svg#" + section.id);

        // single view
        if (!svg.node()) {
            return;
        }

        initializeSvg(svg, data[section.id]);
        resizeSvg(svg);
    });
}

function resizeSvg(element) {
    const svg = element.node();
    const bbox = svg.getBBox();

    svg.setAttribute("width", svg.parentNode.getBoundingClientRect().width);
    svg.setAttribute("height", bbox.y + bbox.height + bbox.y);
}

function initializeSvg(svg, data) {
    const sortData = function(data) {
        // votes descending
        data = _.sortBy(data, 'votes').reverse();
        // top 15
        data = data.slice(0, 15);
        // score descending
        return _.sortBy(data, 'graphScore').reverse();
    };

    data = sortData(data);

    // width of current column
    const columnWidth = svg.node().parentNode.getBoundingClientRect().width;
    // padding between entries
    const rowHeightWithPadding = 20;
    // width of labels, cut from line width
    const labelWidth = 70;
    // Magic number centers circle on the dotted line
    const headerHeight = 15;
    const verticalOffset = 3.5;
    // length of line
    const dottedLineLength = columnWidth - labelWidth - 6; // Magic number adds spacing
    const lineSeparatorHeight = 4;

    _.each(data, (d) => d.width = columnWidth);

    const calculateDataRowY = function (data, index) {
        const calculatedY = (index + 1) * rowHeightWithPadding;
        const itemIndexInColumn = Math.ceil(calculatedY / rowHeightWithPadding);
        return itemIndexInColumn * rowHeightWithPadding + headerHeight;
    };

    const calculateScoreMarkerRadius = function (scoreMarkerValue) {
        return 2.6 * Math.sqrt(scoreMarkerValue);
    };

    // blip x-pos based on score of 1-8
    var blipX = d3.scaleLinear()
        .domain([1, 8])
        // We substract maximum score marker radius for spacing
        .range([calculateScoreMarkerRadius(1), dottedLineLength - calculateScoreMarkerRadius(8)]);

    const headerFontSize = d3.scaleLinear()
        .domain([0, dottedLineLength])
        .range([0, 10]);

    // define group
    let nodes = svg.selectAll("g.radar-row").data(data, (d,i) => d.width + d.name + d.graphScore + i);
    nodes.exit().remove();

    // enter
    let enter = nodes.enter().append("g").attr("class", "radar-row");

    enter.append("line")
        .attr("y1", (d, i) => calculateDataRowY(d, i) - verticalOffset)
        .attr("y2", (d, i) => calculateDataRowY(d, i) - verticalOffset)
        .attr("class", "dotted-line")
        .attr("x1", 0)
        .attr("x2", dottedLineLength);

    // line separators
    _.each([0.25,0.50,0.75], (placement) => {
        enter.append("rect")
            .attr("x", placement * dottedLineLength)
            .attr("y", (d, i) => calculateDataRowY(d, i) - verticalOffset - lineSeparatorHeight / 2)
            .attr("height", lineSeparatorHeight)
            .attr("class", "line-separator");
    });

    enter.append("text")
        .text(d => d.name)
        .attr("y", (d, i) => calculateDataRowY(d, i))
        .attr("x", columnWidth - labelWidth)
        .attr("font-size", "10px");

    enter.append("circle")
        .attr("cy", (d, i) => Math.max(calculateDataRowY(d, i) - verticalOffset),0)
        .transition().duration(500)
        .attr("cx", (d, i) => blipX(d.graphScore))
        .attr("r", d => 2)
        .transition().duration(500)
        .attr("r", d => 6)
        .attr("class", "position-marker");

    nodes.merge(enter);

    const buildHeader = function (data) {
        const nodes = svg.selectAll('g.radar-row-header')
            .data(data.parent, (d) => d.toString());

        nodes.enter()
            .append('g')
            .attr('class', 'radar-row-header')
            .merge(nodes)
            .call(d => buildHeaderTexts(d, data));

        nodes.exit().remove();
    };

    const buildHeaderTexts = function (selection, data) {
        const nodes = selection.selectAll('text.radar-header-title')
            .data(data.child);

        const sectionLength = dottedLineLength / Stages.length;
        const centerOffset = sectionLength / 2;

        const enter = nodes.enter()
            .append('text')
            .attr('class', 'radar-header-title')
            .attr("y", headerHeight * 1.3)
            .attr("x", (d,i) => i * sectionLength + centerOffset);

        enter.append('tspan')
            .text(d => d.name)
            .attr("text-anchor", "middle");

        nodes.merge(enter);
        nodes.exit().remove();
    };

    const buildHeaderData = function(stages) {
        stages = stages.reverse();
        _.each(stages, (d) => d.width = columnWidth);
        return stages;
    };

    buildHeader({
        parent: [columnWidth],
        child: buildHeaderData(Stages)
    });
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
function initializeEntries(keywords) {
    var mergedBlips = {};
    keywords.filter(k => k.votes > 0).forEach(k => mergeBlip(k, mergedBlips));

    var quartileMaxVotes = {};
    var summarizedBlips = {};
    _.each(mergedBlips, function (value, prop) {
        var adoptVotes = value['adopt'] || 0;
        var trialVotes = value['trial'] || 0;
        var assessVotes = value['assess'] || 0;
        var avoidVotes = value['avoid'] || 0;

        var totalVotes = adoptVotes + trialVotes + assessVotes + avoidVotes;
        var totalScore = (avoidVotes * 1 + assessVotes * 2 + trialVotes * 3 + adoptVotes * 4);
        var averageScore = totalScore / totalVotes;

        if (!summarizedBlips.hasOwnProperty(value.section)) {
            summarizedBlips[value.section] = [];
        }
        summarizedBlips[value.section].push({ "name": prop, "averageScore": averageScore, "totalScore": totalScore, "votes": totalVotes });

        if (!quartileMaxVotes.hasOwnProperty(value.section)) {
            quartileMaxVotes[value.section] = {0: 0, 1: 0, 2: 0, 3: 0};
        }

        const quartile = getQuartile(averageScore);
        if (quartileMaxVotes[value.section][quartile] < totalVotes) {
            quartileMaxVotes[value.section][quartile] = totalVotes;
        }
    });

    _.each(summarizedBlips, function (framework, prop) {
        _.each(framework, function (value) {
            const quartile = getQuartile(value.averageScore);
            value.graphScore = value.averageScore + value.totalScore / quartileMaxVotes[prop][quartile];
        });
    });
    return summarizedBlips;
}


const throttledOnWindowResize = _.throttle(draw, 500, {
    leading: false
});

function getQuartile(score) {
    if (score >= 3) {
        return 0;
    } else if (score < 3 && score >= 2) {
        return 1;
    } else if (score < 2 && score >= 1) {
        return 2;
    } else if (score < 1) {
        return 3;
    } else {
        return -1;
    }
}
