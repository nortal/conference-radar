import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var'
import { Keywords } from '../../imports/api/keywords.js';
import { Stages, Sections } from '../../imports/api/constants.js';
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
    'click #randomGenButton'(e,t) {
        generateRandomData()
    },
    'click #databaseClearButton'(e,t) {
        clearDatabase();
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
    var data = initalizeEntries(keywords);

    //d3.selectAll("svg > *").remove();

    _.each(Sections, function (section) {
        let svg = d3.select("svg#" + section.id);
        let sectionData = data[section.id];

        // single section view
        if (!svg.node()) {
            return;
        }

        initializeSvg(svg, sectionData);
        resizeSvg(section.id);
    });
}

function resizeSvg(section) {
    let container = $("svg#" + section)[0];
    let bbox = container.getBBox();
    container.setAttribute("width", bbox.x + bbox.width + bbox.x);
    container.setAttribute("height", bbox.y + bbox.height + bbox.y);
}

function initializeSvg(svg, data) {
    // order by votes descending, get the top 15
    data = _.sortBy(data, 'votes').reverse();
    data = data.slice(0, 15);
    // order by score descending
    data = _.sortBy(data, 'value').reverse();

    // width of current column
    const columnWidth = svg.node().parentNode.getBoundingClientRect().width;
    // padding between entries
    const rowHeightWithPadding = 20;
    // width of labels, cut from line width
    const labelWidth = 70;
    // Magic number centers circle on the dotted line
    const verticalOffset = 3.5;
    // length of line
    const dottedLineLength = columnWidth - labelWidth - 6; // Magic number adds spacing

    const calculateDataRowY = function (data, index) {
        const calculatedY = (index + 1) * rowHeightWithPadding;
        const itemIndexInColumn = Math.ceil(calculatedY / rowHeightWithPadding);
        return itemIndexInColumn * rowHeightWithPadding;
    };

    const calculateScoreMarkerRadius = function (scoreMarkerValue) {
        return 2.6 * Math.sqrt(scoreMarkerValue);
    };

    // blip x-pos based on score of 1-4
    var blipX = d3.scaleLinear()
        .domain([1, 4])
        // We substract maximum score marker radius for spacing
        .range([calculateScoreMarkerRadius(1), dottedLineLength - calculateScoreMarkerRadius(4)]);
    // blip opacity based on score of 1-4
    var blipOpacity = d3.scaleLinear()
        .domain([1, 4])
        .range([0.1, 1.0]);

    //svg.selectAll("g").remove();

    console.log(123)

    // define group
    let nodes = svg.selectAll("g")
        .data(data, (d, i, collection) => {return collection[i]});
//(d,i, collection) => d.name !== collection[i].name || d.value !== collection[i].value || d.votes !== collection[i].votes
    // exit, remove
    nodes.exit().remove();

    // enter
    const enter = nodes.enter().append("g");


    enter.append("line")
        .attr("y1", (d, i) => calculateDataRowY(d, i) - verticalOffset)
        .attr("y2", (d, i) => calculateDataRowY(d, i) - verticalOffset)
        .attr("class", "dotted-line")
        .transition()
        .attr("x1", 0)
        .attr("x2", dottedLineLength);

    enter.append("text")
        .text(d => d.name)
        .attr("y", (d, i) => calculateDataRowY(d, i))
        .attr("x", columnWidth - labelWidth)
        .attr("font-size", "10px");

    enter.append("circle")
        .attr("cy", (d, i) => Math.max(calculateDataRowY(d, i) - verticalOffset),0)
        .attr("cx", (d, i) => blipX(d.value))
        .transition()
        .attr("r", d => 6)
        //.attr("class", "position-marker")
        .attr("opacity", (d, i) => blipOpacity(d.value));

    nodes.merge(enter);
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
    keywords.filter(k => k.votes > 0).forEach(k => mergeBlip(k, mergedBlips));

    var summarizedBlips = {};
    _.each(mergedBlips, function (value, prop) {
        var adoptVotes = value['adopt'] || 0;
        var trialVotes = value['trial'] || 0;
        var assessVotes = value['assess'] || 0;
        var avoidVotes = value['avoid'] || 0;

        var totalVotes = adoptVotes + trialVotes + assessVotes + avoidVotes;
        var totalScore = (avoidVotes * 1 + assessVotes * 2 + trialVotes * 3 + adoptVotes * 4) / (avoidVotes + assessVotes + trialVotes + adoptVotes);

        if (!summarizedBlips.hasOwnProperty(value.section)) {
            summarizedBlips[value.section] = [];
        }
        summarizedBlips[value.section].push({ "name": prop, "value": totalScore, "votes": totalVotes });
    });

    return summarizedBlips;
}


const throttledOnWindowResize = _.throttle(draw, 500, {
    leading: false
});

function clearDatabase() {
    console.log('clearing database...');
    Keywords.drop();
    console.log('database cleared');
}

/**
 * Floods database with random votes
 */
function generateRandomData(userCount, quadrantCount) {
    quadrantCount = quadrantCount || 64;
    userCount = userCount || 16;

    console.log('starting data generation with params: quadrantCount=' + quadrantCount + ', userCount='+userCount);

    // Pick n random quadrants so the selection does not get diluted
    let quadrantSelection = [];
    for (let i = 0; i < quadrantCount; i++) {
        quadrantSelection.push(keywordClassifier[Math.floor(Math.random() * keywordClassifier.length)]);
    }

    console.log("selected quadrants:")
    console.log(quadrantSelection)

    for (let j = 0; j < userCount; j++) {
        let email = "" + Math.random();
        // how many votes this user will cast
        let voteCount = Math.floor(Math.random() * quadrantSelection.length);

        // vote for n random quadrants
        for (let i = 0; i < voteCount; i++) {
            let randomQuadrant = quadrantSelection[Math.floor(Math.random() * quadrantSelection.length)];
            let randomStage = Stages[Math.floor(Math.random() * Stages.length)].id;

            let lookupPayload = {
                keyword: randomQuadrant.name,
                stage: randomStage,
                section: randomQuadrant.section
            };

            let dbEntry = Keywords.find(lookupPayload).fetch();
            if (dbEntry.length) {
                console.log('updated ' + dbEntry[0]._id + ': ' + lookupPayload.keyword + ' ' + lookupPayload.section + ' ' + lookupPayload.stage);
                Keywords.update(
                    { _id: dbEntry[0]._id },
                    {
                        $push: {emails: email},
                        $inc: {votes: 1}
                    });
            } else {
                console.log('inserted: ' + randomQuadrant.name + ' ' + randomQuadrant.section + ' ' + randomStage);
                Keywords.insert({
                    keyword: randomQuadrant.name,
                    stage: randomStage,
                    section: randomQuadrant.section,
                    emails: [email],
                    votes: 1,
                });
            }
        }
    }
}
