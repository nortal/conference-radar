import { Meteor } from 'meteor/meteor';
import { Keywords } from '../imports/api/keywords.js';
import _ from "underscore";
import {Stages} from "../imports/api/constants";

const keywordClassifier = require('/public/keywords.json');

Meteor.startup(() => {
    if (Keywords.find().fetch().length === 0) {
        initialDatabaseConfiguration(keywordClassifier);
    }
});

function initialDatabaseConfiguration(classifiers) {
    if (!classifiers) {
        throw new Error("No classifiers provided");
    }

    let allKeywords = Keywords.find().fetch();
    if (allKeywords.length) {
        throw new Error("Database is not empty!");
    }

    console.log("Setting up database")

    const votes = {};
    _.each(Stages.map(s => s.id), function (stage) {
        votes[stage] = [];
    });

    _.each(classifiers, function (classifier) {
        Keywords.insert({
            name: classifier.name,
            section: classifier.section,
            enabled: true,
            votes: votes
        });
    });

    allKeywords = Keywords.find().fetch();
    console.log("Database setup finished. Generated entries: ", allKeywords)
}
