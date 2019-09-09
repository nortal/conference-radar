import { Meteor } from 'meteor/meteor';
import { Keywords } from '../imports/api/keywords.js';
import _ from "underscore";

const keywordClassifier = require('/public/keywords.json');

Meteor.startup(() => {
    if (!Keywords.find().fetch().length) {
        initialDatabaseConfiguration(keywordClassifier);
    }
});

function initialDatabaseConfiguration(classifiers) {
    if (!classifiers) {
        throw new Error("No classifiers provided");
    }

    if (Keywords.find().fetch().length) {
        throw new Error("Database is not empty!");
    }

    console.log("Setting up database");

    _.each(classifiers, function (classifier) {
        Keywords.insert({
            name: classifier.name,
            section: classifier.section,
            enabled: true,
            votes: []
        });
    });

    console.log("Database setup finished. Generated entries: ", Keywords.find().fetch())
}
