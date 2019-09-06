import {Keywords, Users} from "./keywords";
import {Stages} from "./constants";
import _ from "underscore";

export const DevelopFunctions = {
    clearDatabase: () => {
        if (!DevelopFunctions.isDevMode()) {
            throw new Error("Function should only be called in develop environment");
        }

        console.log('clearing database...');

        let keywords = Keywords.find().fetch();

        for (let i = 0; i < keywords.length; i++) {
            Keywords.remove({_id: keywords[i]._id});
        }

        console.log('database cleared');
    },
    clearUsers: () => {
        if (!DevelopFunctions.isDevMode()) {
            throw new Error("Function should only be called in develop environment");
        }

        console.log('clearing users...');

        let users = Users.find().fetch();

        for (let i = 0; i < users.length; i++) {
            Users.remove({_id: users[i]._id});
        }

        console.log('users cleared');
    },
    generateRandomData: (userCount, quadrantCount) => {
        quadrantCount = quadrantCount || 64;
        userCount = userCount || 16;

        if (!DevelopFunctions.isDevMode()) {
            throw new Error("Function should only be called in develop environment");
        }

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

                const modifier = {};
                modifier["votes." + randomStage] = email;

                Keywords.update(
                    { _id: randomQuadrant._id },
                    {
                        $addToSet: modifier
                    });
            }
        }
    },
    isDevMode: () => {
        return Meteor.settings.public.environment === "development"
    },
    clearVotes() {
        if (!DevelopFunctions.isDevMode()) {
            throw new Error("Function should only be called in develop environment");
        }

        console.log('clearing votes...');

        let allKeywords = Keywords.find().fetch();

        for (let i = 0; i < allKeywords.length; i++) {
            const modifier = {};
            _.each(Stages, function (stage) {
                modifier["votes." + stage.id] = [];
            });

            Keywords.update(
                { _id: allKeywords[i]._id },
                {
                    $set: modifier
                });
        }

        console.log('votes cleared');
    }
};
