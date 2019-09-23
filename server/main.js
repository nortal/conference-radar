import {Meteor} from 'meteor/meteor';
import {Keywords} from '../imports/api/keywords.js';
import _ from "underscore";

import "./admin.js";
import "./develop.js"
import {UserInputVerification} from "../imports/api/shared";

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

Meteor.publish('user', function () {
    if (!this.userId) {
        return this.ready();
    }
    return Meteor.users.find({_id: this.userId});
});

Meteor.publish('keywords', function () {
    return Keywords.find();
});

Meteor.methods({
    updateUser(name, email, wantsRecruitment, wantsParticipation, agreesTerms) {
        const nameResult = UserInputVerification.verifyName(name);
        const emailResult = UserInputVerification.verifyEmail(email);
        if (!nameResult.ok || !emailResult.ok) {
            return;
        }

        Meteor.users.update(
            {_id: this.userId},
            {
                $set: {
                    name: name,
                    email: email,
                    wantsRecruitment: wantsRecruitment,
                    wantsParticipation: wantsParticipation,
                    agreesTerms: agreesTerms,
                    conference: Meteor.settings.public.conferenceName
                }
            }
        )
    },
    getSubmittedKeywords() {
        return Keywords.find({votes: {$elemMatch: {userId: this.userId}}}).fetch();
    },
    removeVote(id, stage) {
        Keywords.update(
            {_id: id},
            {$pull: {votes: {userId: this.userId, stage: stage}}});
    },
    addVote(id, stage) {
        const stageResult = UserInputVerification.verifyStage(stage);
        if (!stageResult.ok) {
            return;
        }

        Keywords.update(
            {_id: id},
            {
                $addToSet: {
                    votes: {
                        userId: this.userId,
                        stage: stage,
                        time: Date.now(),
                        conference: Meteor.settings.public.conferenceName
                    }
                }
            }
        );
    },
    addSuggestion(name, section, stage) {
        const suggestionResult = UserInputVerification.verifySuggestion(name);
        if (!suggestionResult.ok) {
            return;
        }

        const sectionResult = UserInputVerification.verifySection(section);
        if (!sectionResult.ok) {
            return;
        }

        const stageResult = UserInputVerification.verifyStage(stage);
        if (!stageResult.ok) {
            return;
        }

        Keywords.insert({
            name: name,
            section: section,
            enabled: false,
            votes: [{
                    userId: this.userId,
                    stage: stage,
                    time: Date.now(),
                    conference: Meteor.settings.public.conferenceName
                }]
        });
    }
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
