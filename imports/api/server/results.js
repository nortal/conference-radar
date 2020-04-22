import _ from "underscore";

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
