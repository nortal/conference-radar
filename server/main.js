import {Meteor} from 'meteor/meteor';

import "/imports/api/server/publish.js";
import "/imports/api/server/methods.js"
import {Keywords} from '../imports/api/keywords.js';

import _ from "underscore";

Meteor.startup(() => {
    if (!Keywords.find().count()) {
        initialDatabaseConfiguration(JSON.parse(Assets.getText("keywords.json")));
    }

    createServiceConfiguration('facebook', Meteor.settings.private.auth.facebook.appId, Meteor.settings.private.auth.facebook.secret);
    createServiceConfiguration('google', Meteor.settings.private.auth.google.clientId, Meteor.settings.private.auth.google.secret);

    Accounts.onCreateUser((options, user) => {
        if (user.services.google) {
            user.email = user.services.google.email;
            user.services.google.picture = undefined;
        } else if (user.services.facebook) {
            user.email = user.services.facebook.email;
            user.services.facebook.picture = undefined;
        }
        user.wantsRecruitment = false;
        user.wantsParticipation = false;
        user.agreesTerms = false;
        return user;
    })
});

function initialDatabaseConfiguration(classifiers) {
    if (!classifiers) {
        throw new Error("No classifiers provided");
    }

    if (Keywords.find().count()) {
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

function createServiceConfiguration(service, clientId, secret) {
    ServiceConfiguration.configurations.remove({
        service: service
    });

    if (service === 'facebook') {
        ServiceConfiguration.configurations.insert({
            service: service,
            appId: clientId,
            secret: secret
        })
    } else {
        ServiceConfiguration.configurations.insert({
            service: service,
            clientId: clientId,
            secret: secret
        })
    }
}
