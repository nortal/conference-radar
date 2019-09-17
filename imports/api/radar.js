import d3 from "d3";
import _ from 'underscore';
import {Stages} from "./constants";

export class RadarBuilder {
    constructor(newSettings) {
        this.settings = {
            // width of current column
            columnWidth: 300,
            // padding between entries
            rowHeightWithPadding: 20,
            // width of labels, cut from line width
            labelWidth: 90,
            // Magic number centers circle on the dotted line
            headerHeight: 15,
            headerOffset: 17,
            verticalOffset: 3.5,
            // length of line
            dottedLineLength: 204,
            lineSeparatorHeight: 6,
            filterTop: 15,
            circleRadius: 5,
        };

        _.each(newSettings, (val, key) => {
            if (this.settings.hasOwnProperty(key)) {
                this.settings[key] = val;
            }
        });
    };

    calculateBlipX(score) {
        return d3.scaleLinear()
            .domain([-4, 4])
            .range([this.settings.circleRadius, this.settings.dottedLineLength - this.settings.circleRadius])
            (score);
    };

    calculateDataRowY(index) {
        const calculatedY = (index + 1) * this.settings.rowHeightWithPadding;
        const itemIndexInColumn = Math.ceil(calculatedY / this.settings.rowHeightWithPadding);
        return itemIndexInColumn * this.settings.rowHeightWithPadding + this.settings.headerHeight;
    };

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

    isFirstOfStage(data, i) {
        const currentStage = this.getStage(data[i].graphScore);
        const blipsOnCurrentStage = data.filter(d => this.getStage(d.graphScore) === currentStage);
        return blipsOnCurrentStage[0] === data[i];
    };

    labelClass(data, i) {
        let textClass = "radar-row-name";

        if (this.isFirstOfStage(data, i)) {
            textClass += " font-weight-bold";
            const currentStage = this.getStage(data[i].graphScore);
            textClass += " color-" + currentStage;
        }

        return textClass;
    };

    circleClass(data, i) {
        let circleClass = "position-marker";

        if (this.isFirstOfStage(data, i)) {
            const currentStage = this.getStage(data[i].graphScore);
            circleClass += " color-" + currentStage;
        }

        return circleClass;
    };

    dottedLineClass(data, i) {
        let lineClass = 'dotted-line';

        if (this.isFirstOfStage(data, i)) {
            lineClass += ' dotted-line-thick';
        }

        return lineClass;
    };

    tickMarkClass(data, i) {
        let lineClass = 'line-separator';

        if (this.isFirstOfStage(data, i)) {
            lineClass += ' line-separator-thick';
        }

        return lineClass;
    };

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
                            yOffset: this.settings.headerOffset,
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
