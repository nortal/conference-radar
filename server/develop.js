import {Keywords} from "../imports/api/keywords";
import {Stages} from "../imports/api/constants";
import {Meteor} from "meteor/meteor";

Meteor.methods({
    clearDatabaseDev() {
        if (isDevMode()) {
            Keywords.find().fetch().forEach((keyword) => Keywords.remove({_id: keyword._id}));
        }
    },
    clearUsersDev() {
        if (isDevMode()) {
            Meteor.users.find().fetch().forEach((user) => Meteor.users.remove({_id: user._id}));
        }
    },
    clearVotesDev() {
        if (isDevMode()) {
            Keywords.find().fetch().forEach((keyword) => {
                Keywords.update(
                    {_id: keyword._id},
                    {$set: {votes: []}}
                );
            });
        }
    },
    generateRandomDataDev(userCount, quadrantCount) {
        if (!isDevMode()) {
            return;
        }
        quadrantCount = quadrantCount || 64;
        userCount = userCount || 16;

        console.log('starting data generation with params: quadrantCount', quadrantCount, 'userCount', userCount);

        const allKeywords = Keywords.find().fetch();

        // Pick n random quadrants so the selection does not get diluted
        let quadrantSelection = [];
        for (let i = 0; i < quadrantCount; i++) {
            quadrantSelection.push(allKeywords[Math.floor(Math.random() * allKeywords.length)]);
        }

        console.log("selected quadrants:", quadrantSelection);

        for (let j = 0; j < userCount; j++) {
            let email = Math.random().toString();
            // how many votes this user will cast
            let voteCount = Math.floor(Math.random() * quadrantSelection.length);

            // vote for n random quadrants
            for (let i = 0; i < voteCount; i++) {
                let randomQuadrant = quadrantSelection[Math.floor(Math.random() * quadrantSelection.length)];
                let randomStage = Stages[Math.floor(Math.random() * Stages.length)].id;

                console.log(email, "voted", randomStage, randomQuadrant.name);

                Keywords.update(
                    {_id: randomQuadrant._id},
                    {
                        $addToSet: {
                            votes: {
                                userId: "email",
                                stage: randomStage,
                                time: Date.now(),
                                conference: Meteor.settings.public.conferenceName
                            }
                        }
                    });
            }
        }
    }
});

function isDevMode() {
    return Meteor.settings.public.environment === "development"
}
