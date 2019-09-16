import {Keywords} from "./keywords";
import {Stages} from "./constants";

export const DevelopFunctions = {
    isDevMode: () => {
        return Meteor.settings.public.environment === "development"
    },
    checkDevMode: () => {
        if (!DevelopFunctions.isDevMode()) {
            throw new Error("Function should only be called in develop environment");
        }
    },
    clearDatabase: () => {
        DevelopFunctions.checkDevMode();
        console.log('clearing database...');
        Keywords.find().fetch().forEach((keyword) => Keywords.remove({_id: keyword._id}));
        console.log('database cleared');
    },
    clearUsers: () => {
        DevelopFunctions.checkDevMode();
        console.log('clearing users...');
        Meteor.users.find().fetch().forEach((user) => Meteor.users.remove({_id: user._id}));
        console.log('users cleared');
    },
    clearVotes: () => {
        DevelopFunctions.checkDevMode();
        console.log('clearing votes...');
        Keywords.find().fetch().forEach((keyword) => {
            Keywords.update(
                { _id: keyword._id },
                { $set: {votes: []} }
            );
        });
        console.log('votes cleared');
    },
    generateRandomData: (userCount, quadrantCount) => {
        DevelopFunctions.checkDevMode();

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
                    { _id: randomQuadrant._id },
                    {
                        $addToSet: {votes: {email: email, stage: randomStage, time: Date.now()}}
                    });
            }
        }
    }
};
