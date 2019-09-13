import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var'
import { Keywords } from '../../imports/api/keywords.js';
import { Stages, Sections } from '../../imports/api/constants.js';
import { GetQueryParam } from '../../imports/api/shared.js';
import d3 from 'd3';
import _ from 'underscore';
import '/imports/ui/radar-view.css';

Template.radar.onCreated(function () {
    this.blips = new ReactiveVar();
    this.legends = new ReactiveVar();
    this.selectedQuadrant = Sections.find(s => s.id === this.data);
    this.logs = new ReactiveVar({frameworks: [], platforms: [], techniques: [], tools: []});
    this.voteCounts = {};
    this.layout = getLayoutParams();

    // init highlight session variables
    Session.set("currentKeywordIndex", 0);
    Session.set("currentQuadrant", 0);
    // init conditional re-draw variable
    Session.set("lastEntryCount", 0);

    // cycle highlight every 5 seconds
    //setInterval(highlightBlips, 5000);
});

Template.radar.onRendered(function () {
    let query = Keywords.find({enabled: true});
    const self = this;

    let handle = query.observeChanges({
        changed: function (id, data) {
            // when a new vote gets registered on an existing blip, re-draw
            draw();
            appendLog(self, id, data);
        },
        added: function (id, data) {
            // added keywords
            self.voteCounts[id] = data.votes.length;
            appendLog(self, id, data);
        },
        removed: function (id, data) {
            // removed keywords
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
        return Template.instance().selectedQuadrant !== undefined;
    },
    stages: function() {
        return Stages;
    },
    quadrants: function() {
        return Template.instance().layout.sections;
    },
    quadrantClass: function() {
        const layout = Template.instance().layout;

        if (layout.sections.length === 4) {
            switch (layout.rowCount) {
                case 1:
                    return "col-3";
                case 2:
                    return "col-6";
                case 4:
                    return "col-12";
                default:
                    return "col-12 col-md-6 col-xl-3"
            }
        } else if (layout.sections.length === 2) {
            if (layout.rowCount === 2) {
                return "col-12";
            } else {
                return "col-6";
            }
        } else {
            return "col-12";
        }
    },
    getLogs: function (section) {
        return Template.instance().logs.get()[section];
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
    const labelWidth = 90;
    // Magic number centers circle on the dotted line
    const headerHeight = 15;
    const verticalOffset = 3.5;
    // length of line
    const dottedLineLength = columnWidth - labelWidth - 6; // Magic number adds spacing
    const lineSeparatorHeight = 6;

    const calculateDataRowY = function (index) {
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

    const calculateCircleSize = function (data, i) {
        let circleRadius = 4;

        if (isFirstOfStage(data, i)) {
            circleRadius = 5;
        }

        return circleRadius;
    };

    const dottedLineClass = function (data, i) {
        let lineClass = 'dotted-line';

        if (isFirstOfStage(data, i)) {
            lineClass += ' dotted-line-thick';
        }

        return lineClass;
    };

    const tickMarkClass = function (data, i) {
        let lineClass = 'line-separator';

        if (isFirstOfStage(data, i)) {
            lineClass += ' line-separator-thick';
        }

        return lineClass;
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
            .attr("y1", (d, i) => calculateDataRowY(i) - verticalOffset)
            .attr("y2", (d, i) => calculateDataRowY(i) - verticalOffset)
            .attr("class", (d, i) => dottedLineClass(data, i))
            .attr("x1", 0)
            .attr("x2", dottedLineLength);

        _.each([0,0.25,0.50,0.75,1], (placement) => {
            enter.append("rect")
                .attr("x", placement * dottedLineLength)
                .attr("y", (d, i) => calculateDataRowY(i) - verticalOffset - lineSeparatorHeight / 2)
                .attr("height", lineSeparatorHeight)
                .attr("class", (d, i) => tickMarkClass(data, i));
        });

        enter.append("text")
            .text(d => d.name)
            .attr("y", (d, i) => calculateDataRowY(i))
            .attr("x", columnWidth - labelWidth)
            .attr("class", (d,i) => calculateTextColor(data, i));

        enter.append("circle")
            .attr("cy", (d, i) => Math.max(calculateDataRowY(i) - verticalOffset),0)
            .attr("class", (d,i) => calculateCircleColor(data, i))
            .transition().duration(500)
            .attr("cx", (d, i) => calculateBlipX(d.graphScore))
            .attr("r", 2)
            .transition().duration(500)
            .attr("r", (d,i) => calculateCircleSize(data,i));

        nodes.merge(enter);
        nodes.exit().remove();
    };

    const buildHeader = function (selection, data) {
        const nodes = selection.selectAll('g.' + data.groupClass)
            .data(data.parent, (d) => d.toString());

        const enter = nodes.enter()
            .append('g')
            .attr('class', data.groupClass)
            .call(d => buildHeaderTexts(d, data));

        nodes.merge(enter);
        nodes.exit().remove();
    };

    const buildHeaderTexts = function (selection, data) {
        const nodes = selection.selectAll('text.' + data.textClass)
            .data(data.child);

        const sectionLength = dottedLineLength / data.child.length;
        const centerOffset = sectionLength / 2;

        const enter = nodes.enter()
            .append('text')
            .attr('class', (d) => data.textClass + ' color-' + d.name)
            .attr("y", data.yOffset + headerHeight * 1.3)
            .attr("x", (d,i) => i * sectionLength + centerOffset);

        enter.append('tspan')
            .text(d => d.name)
            .attr("text-anchor", "middle");

        nodes.merge(enter);
        nodes.exit().remove();
    };

    const buildHeaderData = function(width) {
        // get stages
        const stages = Stages.map(stage => stage.id).reverse();

        // bind width to each stage
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


    const mainData = sortData(data, columnWidth);
    const headerFooterData = buildHeaderData(columnWidth);
    const totalRowHeight = calculateDataRowY(mainData.length);
    const titleDataBind = columnWidth.toString() + totalRowHeight;

    buildMain(svg, mainData);
    buildHeader(svg, {
        parent: [titleDataBind],
        child: headerFooterData,
        yOffset: 0,
        groupClass: 'radar-row-header',
        textClass: 'radar-row-header-title'
    });

    // find position of last element so we can append the footer
    const footerOffset = calculateDataRowY(mainData.length - 1) - verticalOffset;
    buildHeader(svg, {
        parent: [titleDataBind],
        child: headerFooterData,
        yOffset: footerOffset,
        groupClass: 'radar-row-footer',
        textClass: 'radar-row-footer-title'
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

function appendLog(template, id, data) {
    const keyword = Keywords.findOne({_id: id});
    const lastVoteCount = template.voteCounts[id];
    template.voteCounts[id] = keyword.votes.length;

    if (!data.votes.length || lastVoteCount > keyword.votes.length) {
        // don't log vote removals
        return;
    }

    const makeTimestamp = function () {
        const now = new Date();
        return ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
    };

    const transformIndex = function (index) {
        return (index < 10 ? '0' : '') + index;
    };

    const stageColorClass = function (stage) {
        switch (stage) {
            case 'avoid':
                return 'color-avoid';
            case 'assess':
                return 'color-assess';
            case 'trial':
                return 'color-trial';
            case 'adopt':
                return 'log-row-stage';
        }
    };

    const logs = template.logs.get();
    const sectionLogs = logs[keyword.section];
    const nextLogIndex = sectionLogs.length
        ? parseInt(sectionLogs[sectionLogs.length - 1].index) + 1
        : 0;
    const stage =  keyword.votes[keyword.votes.length - 1].stage;

    logs[keyword.section].push({
        index: transformIndex(nextLogIndex),
        timestamp: makeTimestamp(),
        technology: keyword.name,
        stageClass: stageColorClass(stage),
        stage: stage
    });

    // trim to last n entries
    if (logs[keyword.section].length > 3) {
        logs[keyword.section] = logs[keyword.section].slice(1, 4);
    }

    template.logs.set(logs);
}

function getLayoutParams() {
    const layout = {
        rowCount: 0,
        sections: Sections
    };

    let rows = GetQueryParam('rows');
    if (rows) {
        layout.rowCount = parseInt(rows);
    }

    let sections = GetQueryParam('sections');
    if (sections) {
        const paramSections = sections.split(',');
        layout.sections = Sections.filter(s => paramSections.includes(s.id));
    }

    return layout;
}
