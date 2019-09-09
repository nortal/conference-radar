import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var'
import { Keywords } from '../../imports/api/keywords.js';
import { Stages, Sections } from '../../imports/api/constants.js';
import { DevelopFunctions } from '../../imports/api/develop.js';
import { GetQueryParam } from '../../imports/api/shared.js';
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
        DevelopFunctions.generateRandomData();
    },
    'click #databaseClearButton'() {
        DevelopFunctions.clearDatabase();
    },
    'click #votesClearButton'() {
        DevelopFunctions.clearVotes();
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
        switch (GetQueryParam["rows"]) {
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
    var len = Keywords.find({enabled: true}).count();
    if (Session.get("lastEntryCount") !== len) {
        draw();
        Session.set("lastEntryCount", len);
    }
}

function draw() {
    var keywords = Keywords.find({enabled: true}).fetch();
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
    const lineSeparatorHeight = 6;

    const calculateDataRowY = function (data, index) {
        const calculatedY = (index + 1) * rowHeightWithPadding;
        const itemIndexInColumn = Math.ceil(calculatedY / rowHeightWithPadding);
        return itemIndexInColumn * rowHeightWithPadding + headerHeight;
    };

    const calculateBlipX = function (score) {
        const blipX = d3.scaleLinear()
            .domain([-4, 4])
            // We substract maximum score marker radius for spacing
            .range([4, dottedLineLength - 4]);

        return blipX(score);
    };


    const calculateTextColor = function (data, i) {
        let textClass = "radar-row-name";

        if (isFirstOfStage(data, i)) {
            textClass += " font-weight-bold";
            const currentStage = getStage(data[i].graphScore);
            textClass += " color-" + currentStage;
        }

        return textClass;
    };

    const calculateCircleColor = function (data, i) {
        let circleClass = "position-marker";

        if (isFirstOfStage(data, i)) {
            const currentStage = getStage(data[i].graphScore);
            circleClass += " color-" + currentStage;
        }

        return circleClass;
    };

    const isFirstOfStage = function (data, i) {
        const currentStage = getStage(data[i].graphScore);
        const blipsOnCurrentStage = data.filter(d => getStage(d.graphScore) === currentStage);
        return blipsOnCurrentStage[0] === data[i];
    };

    const getStage = function(graphScore) {
        const scorePercentage = calculateBlipX(graphScore) / dottedLineLength * 100;

        if (scorePercentage > 75) {
            return "adopt";
        } else if (scorePercentage > 50) {
            return "trial";
        } else if (scorePercentage > 25) {
            return "assess";
        } else {
            return "avoid";
        }
    };

    const buildMain = function(selection, data) {
        const nodes = selection.selectAll("g.radar-row")
            .data(data, (d,i) => d.width + d.name + d.graphScore + i);

        const enter = nodes.enter()
            .append("g")
            .attr("class", "radar-row");

        enter.append("line")
            .attr("y1", (d, i) => calculateDataRowY(d, i) - verticalOffset)
            .attr("y2", (d, i) => calculateDataRowY(d, i) - verticalOffset)
            .attr("class", "dotted-line")
            .attr("x1", 0)
            .attr("x2", dottedLineLength);

        _.each([0,0.25,0.50,0.75,1], (placement) => {
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
            .attr("class", (d,i) => calculateTextColor(data, i));

        enter.append("circle")
            .attr("cy", (d, i) => Math.max(calculateDataRowY(d, i) - verticalOffset),0)
            .attr("class", (d,i) => calculateCircleColor(data, i))
            .transition().duration(500)
            .attr("cx", (d, i) => calculateBlipX(d.graphScore))
            .attr("r", 2)
            .transition().duration(500)
            .attr("r", 4);

        nodes.merge(enter);
        nodes.exit().remove();
    };

    const buildHeader = function (selection, data) {
        const nodes = selection.selectAll('g.radar-row-header')
            .data(data.parent, (d) => d.toString());

        const enter = nodes.enter()
            .append('g')
            .attr('class', 'radar-row-header')
            .call(d => buildHeaderTexts(d, data));

        nodes.merge(enter);
        nodes.exit().remove();
    };

    const buildHeaderTexts = function (selection, data) {
        const nodes = selection.selectAll('text.radar-header-title')
            .data(data.child);

        const sectionLength = dottedLineLength / Stages.length;
        const centerOffset = sectionLength / 2;

        const enter = nodes.enter()
            .append('text')
            .attr('class', (d) => 'radar-header-title color-' + d.name)
            .attr("y", headerHeight * 1.3)
            .attr("x", (d,i) => i * sectionLength + centerOffset);

        enter.append('tspan')
            .text(d => d.name)
            .attr("text-anchor", "middle");

        nodes.merge(enter);
        nodes.exit().remove();
    };

    const buildHeaderData = function(stages, width) {
        stages = stages.reverse();

        const data = [];
        _.each(stages, function (stage) {
            data.push({
                name: stage,
                width: width
            });
        });

        return data;
    };


    const sortData = function(data, width) {
        // add width for binding
        _.each(data, (d) => d.width = width);
        // votes descending
        data = _.sortBy(data, 'votes').reverse();
        // top 15
        data = data.slice(0, GetQueryParam("top") || 15);
        // score descending
        return _.sortBy(data, 'graphScore').reverse();
    };


    data = sortData(data, columnWidth);

    buildMain(svg, data);

    const stages = Stages.map(stage => stage.id);
    buildHeader(svg, {
        parent: [columnWidth],
        child: buildHeaderData(stages, columnWidth)
    });
}

/**
 * Merges provided blip into another object
 */
function mergeBlip(blip, mergedBlips) {
    var mergedBlip = mergedBlips[blip.name];
    if (!mergedBlip) {
        mergedBlip = { "section": blip.section }
    }

    _.each(blip.votes, function (vote) {
        if (!mergedBlip[vote.stage]) {
            mergedBlip[vote.stage] = 0;
        }
        mergedBlip[vote.stage]++;
    });

    mergedBlips[blip.name] = mergedBlip;
}

// calculates score
function initializeEntries(keywords) {
    var mergedBlips = {};
    keywords.forEach(k => mergeBlip(k, mergedBlips));

    var quartileMaxVotes = {};
    var summarizedBlips = {};
    _.each(mergedBlips, function (value, prop) {
        var adoptVotes = value['adopt'] || 0;
        var trialVotes = value['trial'] || 0;
        var assessVotes = value['assess'] || 0;
        var avoidVotes = value['avoid'] || 0;

        var totalVotes = adoptVotes + trialVotes + assessVotes + avoidVotes;
        var totalScore = (avoidVotes * -2 + assessVotes * -1 + trialVotes * 1 + adoptVotes * 2);
        var averageScore = totalScore / totalVotes;

        if (totalVotes === 0) {
            return;
        }

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
    if (score >= 1) {
        return 0;
    } else if (score < 1 && score >= 0) {
        return 1;
    } else if (score < 0 && score >= -1) {
        return 2;
    } else if (score < -1) {
        return 3;
    } else {
        return -1;
    }
}
