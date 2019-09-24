import {Stages} from "./constants.js";

import d3 from "d3";
import _ from 'underscore';

export class RadarBuilder {
    /**
     * Configures the builder instance
     * @param newSettings
     */
    constructor(newSettings) {
        this.settings = {
            // Width of current column
            columnWidth: 300,
            // Horizontal padding between rows
            rowHeightWithPadding: 20,
            // Width of row labels, cut from line width
            labelWidth: 90,
            // Height of column titles
            headerHeight: 15,
            // Magic number centers circle on dotted line
            verticalOffset: 3.5,
            // Length of dotted line
            dottedLineLength: undefined,
            // Vertical length of the 5 tickmarks on the dotted line
            lineSeparatorHeight: 6,
            // Display n top results
            filterTop: 15,
            // Radius of the circles
            circleRadius: 5,
        };

        _.each(newSettings, (val, key) => {
            if (this.settings.hasOwnProperty(key)) {
                this.settings[key] = val;
            }
        });

        // Calculate the dotted line length. Magic number 6 adds spacing
        this.settings.dottedLineLength = this.settings.columnWidth - this.settings.labelWidth - 6;
    };

    /**
     * Find circle x-coordinate on dotted line based on graph score
     * @param score
     */
    calculateBlipX(score) {
        return d3.scaleLinear()
            .domain([-4, 4])
            .range([this.settings.circleRadius, this.settings.dottedLineLength - this.settings.circleRadius])
            (score);
    };

    /**
     * Find row y-coordinate
     * @param index Row's index
     * @returns {number}
     */
    calculateDataRowY(index) {
        const calculatedY = (index + 1) * this.settings.rowHeightWithPadding;
        const itemIndexInColumn = Math.ceil(calculatedY / this.settings.rowHeightWithPadding);
        return itemIndexInColumn * this.settings.rowHeightWithPadding + this.settings.headerHeight;
    };

    /**
     * Finds stage a circle belongs to based on its score
     * @param graphScore
     * @returns {string}
     */
    getStage (graphScore) {
        const scorePercentage = this.calculateBlipX(graphScore) / this.settings.dottedLineLength * 100;

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

    /**
     * Checks if current row is the first of its stage
     * @param data
     * @param i
     * @returns {boolean}
     */
    isFirstOfStage(data, i) {
        const currentStage = this.getStage(data[i].graphScore);
        const blipsOnCurrentStage = data.filter(d => this.getStage(d.graphScore) === currentStage);
        return blipsOnCurrentStage[0] === data[i];
    };

    /**
     * Sets classes for row labels
     * @param data
     * @param i
     * @returns {string}
     */
    labelClass(data, i) {
        let textClass = "radar-row-name";

        if (this.isFirstOfStage(data, i)) {
            textClass += " font-weight-bold";
            const currentStage = this.getStage(data[i].graphScore);
            textClass += " color-" + currentStage;
        }

        return textClass;
    };

    /**
     * Sets classes for row circles
     * @param data
     * @param i
     * @returns {string}
     */
    circleClass(data, i) {
        let circleClass = "position-marker";

        if (this.isFirstOfStage(data, i)) {
            const currentStage = this.getStage(data[i].graphScore);
            circleClass += " color-" + currentStage;
        }

        return circleClass;
    };

    /**
     * Sets classes for row dotted lines
     * @param data
     * @param i
     * @returns {string}
     */
    dottedLineClass(data, i) {
        let lineClass = 'dotted-line';

        if (this.isFirstOfStage(data, i)) {
            lineClass += ' dotted-line-thick';
        }

        return lineClass;
    };

    /**
     * Sets classes for row dotted line tick marks
     * @param data
     * @param i
     * @returns {string}
     */
    tickMarkClass(data, i) {
        let lineClass = 'line-separator';

        if (this.isFirstOfStage(data, i)) {
            lineClass += ' line-separator-thick';
        }

        return lineClass;
    };

    /**
     * Builds logical columns inside the section container
     * @param selection
     * @param data
     */
    buildCols(selection, data) {
        const nodes = selection.selectAll('g.radar-col')
            .data(data.columns, d => d);

        const enter = nodes.enter()
            .append('g')
            .merge(nodes)
            .attr('class', 'radar-col');

        this.buildTitles(enter);
        this.buildRows(enter);

        nodes.exit().remove();
    };

    /**
     * Builds rows inside the logical columns
     * @param selection
     */
    buildRows(selection) {
        let data;
        const nodes = selection.selectAll("g.radar-row")
            .data((d) => {
                data = d.rows;
                return d.rows;
            }, d => d.key);

        const enter = nodes.enter()
            .append("g")
            .attr("class", "radar-row");

        enter.append("line")
            .attr("y1", (d, i) => this.calculateDataRowY(i) - this.settings.verticalOffset)
            .attr("y2", (d, i) => this.calculateDataRowY(i) - this.settings.verticalOffset)
            .attr("class", (d, i) => this.dottedLineClass(data, i))
            .attr("x1", 0)
            .attr("x2", this.settings.dottedLineLength);

        _.each([0, 0.25, 0.50, 0.75, 1], (placement) => {
            enter.append("rect")
                .attr("x", placement * this.settings.dottedLineLength)
                .attr("y", (d, i) => this.calculateDataRowY(i) - this.settings.verticalOffset - this.settings.lineSeparatorHeight / 2)
                .attr("height", this.settings.lineSeparatorHeight)
                .attr("class", (d, i) => this.tickMarkClass(data, i));
        });

        enter.append("text")
            .text(d => d.name)
            .attr("y", (d, i) => this.calculateDataRowY(i))
            .attr("x", this.settings.columnWidth - this.settings.labelWidth)
            .attr("class", (d, i) => this.labelClass(data, i));

        enter.append("circle")
            .attr("cy", (d, i) => Math.max(this.calculateDataRowY(i) - this.settings.verticalOffset), 0)
            .attr("class", (d, i) => this.circleClass(data, i))
            .transition().duration(500)
            .attr("cx", (d, i) => this.calculateBlipX(d.graphScore))
            .attr("r", 2)
            .transition().duration(500)
            .attr("r", this.settings.circleRadius);

        nodes.exit().remove();
    };

    /**
     * Appends header and footer title groups to the logical columns
     * @param selection
     */
    buildTitles(selection) {
        const nodes = selection.selectAll('g.radar-col-title')
            .data((d) => d.titles, d => d);

        const enter = nodes.enter()
            .append('g')
            .merge(nodes)
            .attr('class', 'radar-col-title');

        this.buildTitleTexts(enter);

        nodes.exit().remove();
    };

    /**
     * Builds header and footer title texts in their parent groups
     * @param selection
     */
    buildTitleTexts(selection) {
        const nodes = selection.selectAll('text.radar-col-title')
            .data((d) => d, d => d.key);

        const sectionLength = this.settings.dottedLineLength / 4;

        const enter = nodes.enter()
            .append('text')
            .attr('class', (d) => 'radar-col-title color-' + d.id)
            .attr("y", (d) => d.yOffset)
            .attr("x", (d, i) => i * sectionLength + sectionLength / 2);

        enter.append('tspan')
            .text(d => d.id)
            .attr("text-anchor", "middle");

        nodes.exit().remove();
    };

    /**
     * Constructs a d3-compatible data structure for the radar's functions to use
     * @param data
     * @returns {{columns: {titles: [*, *], rows: *}[]}}
     */
    buildDataStructure(data) {
        // votes descending
        data = _.sortBy(data, 'votes').reverse();
        // top 15
        data = data.slice(0, this.settings.filterTop);
        // score descending
        data = _.sortBy(data, 'graphScore').reverse();
        // add key for binding
        _.each(data, (d, i) => (d.key = d.name + i + d.graphScore + window.innerWidth));

        return {
            columns: [
                {
                    titles: [
                        Stages.map(s => ({
                            id: s.id,
                            yOffset: this.settings.headerHeight,
                            key: s + data.length + window.innerWidth
                        })).reverse(),
                        Stages.map(s => ({
                            id: s.id,
                            yOffset: this.calculateDataRowY(data.length),
                            key: s + data.length + window.innerWidth
                        })).reverse()
                    ],
                    rows: data
                }
            ]
        };
    };
}


/**
 * Calculates scores for keywords based on votes
 * @param keywords
 */
export function initializeEntries(keywords) {
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

        summarizedBlips[value.section].push({
            "name": prop,
            "averageScore": averageScore,
            "totalScore": totalScore,
            "votes": totalVotes
        });

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

/**
 * Merges provided blip into another object
 * @param blip
 * @param mergedBlips
 */
function mergeBlip(blip, mergedBlips) {
    var mergedBlip = mergedBlips[blip.name];
    if (!mergedBlip) {
        mergedBlip = {"section": blip.section}
    }

    _.each(blip.votes, function (vote) {
        if (!mergedBlip[vote.stage]) {
            mergedBlip[vote.stage] = 0;
        }
        mergedBlip[vote.stage]++;
    });

    mergedBlips[blip.name] = mergedBlip;
}

/**
 * Finds the numeric quartile a score belongs to
 * @param score
 * @returns {number}
 */
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
