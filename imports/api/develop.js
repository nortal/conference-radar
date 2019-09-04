import {Keywords, Users} from "./keywords";
import {Stages} from "./constants";

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
    generateRandomData: (keywordClassifier, userCount, quadrantCount) => {
        quadrantCount = quadrantCount || 64;
        userCount = userCount || 16;

        if (!DevelopFunctions.isDevMode()) {
            throw new Error("Function should only be called in develop environment");
        }

        console.log('starting data generation with params: quadrantCount=' + quadrantCount + ', userCount='+userCount);

        // Pick n random quadrants so the selection does not get diluted
        let quadrantSelection = [];
        for (let i = 0; i < quadrantCount; i++) {
            quadrantSelection.push(keywordClassifier[Math.floor(Math.random() * keywordClassifier.length)]);
        }

        console.log("selected quadrants:")
        console.log(quadrantSelection)

        for (let j = 0; j < userCount; j++) {
            let email = "" + Math.random();
            // how many votes this user will cast
            let voteCount = Math.floor(Math.random() * quadrantSelection.length);

            // vote for n random quadrants
            for (let i = 0; i < voteCount; i++) {
                let randomQuadrant = quadrantSelection[Math.floor(Math.random() * quadrantSelection.length)];
                let randomStage = Stages[Math.floor(Math.random() * Stages.length)].id;

                let lookupPayload = {
                    keyword: randomQuadrant.name,
                    stage: randomStage,
                    section: randomQuadrant.section
                };

                let dbEntry = Keywords.find(lookupPayload).fetch();
                if (dbEntry.length) {
                    console.log('updated ' + dbEntry[0]._id + ': ' + lookupPayload.keyword + ' ' + lookupPayload.section + ' ' + lookupPayload.stage);
                    Keywords.update(
                        { _id: dbEntry[0]._id },
                        {
                            $push: {emails: email},
                            $inc: {votes: 1}
                        });
                } else {
                    console.log('inserted: ' + randomQuadrant.name + ' ' + randomQuadrant.section + ' ' + randomStage);
                    Keywords.insert({
                        keyword: randomQuadrant.name,
                        stage: randomStage,
                        section: randomQuadrant.section,
                        emails: [email],
                        votes: 1,
                    });
                }
            }
        }
    },
    isDevMode: () => {
        return Meteor.settings.public.environment === "development"
    }
};
