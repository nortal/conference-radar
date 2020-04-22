import {Template} from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var'

import {Sections, Stages} from '/imports/api/constants.js';
import {GetQueryParam} from '/imports/api/shared.js';
import {RadarBuilder} from '/imports/api/radar.js';
import './radar-view.css';

import d3 from 'd3';
import _ from 'underscore';

Template.radar.onCreated(function () {
    this.blips = new ReactiveVar();
    this.selectedQuadrant = Sections.find(s => s.id === this.data);
    this.logs = new ReactiveVar({frameworks: [], platforms: [], techniques: [], tools: []});
    this.layout = getLayoutParams();
    this.logSize = parseInt(GetQueryParam('logSize')) || 3;

    // init highlight session variables
    Session.set("currentKeywordIndex", 0);
    Session.set("currentQuadrant", 0);
    Session.set("voteCount", 0);
});

Template.radar.onRendered(function () {
    const self = this;

    //check every 3 seconds for update
    setTimeout(() => pollDrawing(self), 500);
    setInterval(() => pollDrawing(self), 3000);

    // render on resize
    $(window).resize(throttledOnWindowResize);
});

Template.radar.onDestroyed(function () {
    $(window).off('resize', throttledOnWindowResize);
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
    stages: function () {
        return Stages;
    },
    quadrants: function () {
        return Template.instance().layout.sections;
    },
    quadrantClass: function () {
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

function pollDrawing(self) {
    Meteor.call('getVoteCount', null, (error, response) => {
        if (error) {
            return;
        }

        if (Session.get("voteCount") !== response) {
            draw(self);
            Session.set("voteCount", response);
        }
    });
}

function draw(self) {
    Meteor.call('getResults', null, (error, response) => {
        if (error) {
            return;
        }

        _.each(Sections, function (section) {
            const svg = d3.select("svg#" + section.id);

            // single view
            if (!svg.node()) {
                return;
            }

            initializeSvg(svg, response[section.id]);
            resizeSvg(svg);
        });
    });

    // get initial log entries
    Meteor.call('getLastVotes', null, (error, response) => {
        if (error) {
            return;
        }

        for (let i = 0; i < response.length; i++) {
            const section = response[i].section;
            const votes = response[i].votes;

            for (let j = 0; j < votes.length; j++) {
                const vote = votes[j];
                addLogEntry(self, section, vote.keyword, vote.stage, vote.time, vote.index);
            }
        }
    });
}

function resizeSvg(element) {
    const svg = element.node();
    const bbox = svg.getBBox();

    svg.setAttribute("width", svg.parentNode.getBoundingClientRect().width);
    svg.setAttribute("height", bbox.y + bbox.height + bbox.y);
}

function initializeSvg(svg, initialData) {
    const settings = {
        columnWidth: svg.node().parentNode.getBoundingClientRect().width,
        rowHeightWithPadding: 20,
        labelWidth: parseInt(GetQueryParam('labelWidth')) || 90,
        headerHeight: 20,
        filterTop: parseInt(GetQueryParam('filterTop')) || 15,
        circleRadius: 5,
    };

    const radarBuilder = new RadarBuilder(settings);
    const d3DataStructure = radarBuilder.buildDataStructure(initialData);

    radarBuilder.buildCols(svg, d3DataStructure);
}

const throttledOnWindowResize = _.throttle(draw, 500, {
    leading: false
});

function addLogEntry(template, section, keyword, stage, time, index) {
    const formatTimestamp = function (time) {
        const now = new Date(time);
        return ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
    };

    const transformIndex = function (index) {
        return (index < 10 ? '0' : '') + index;
    };

    const logs = template.logs.get();
    const sectionLogs = logs[section];

    sectionLogs.push({
        index: transformIndex(index),
        timestamp: formatTimestamp(time),
        technology: keyword,
        stage: stage,
        conference: Meteor.settings.public.conferenceName
    });

    // trim to last n entries
    if (logs[section].length > template.logSize) {
        logs[section] = logs[section].slice(1, template.logSize + 1);
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
