import {Template} from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var'
import {Keywords} from '../../imports/api/keywords.js';
import _ from 'underscore';

const keywordClassifier = require('/public/keywords.json');

function makeid() {
    var text = "";
    var possible = "AB";

    for (var i = 0; i < getRandom(4, 7); i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function makerealid() {
    var possible = ["React", "Angular", "Docker", "Lombok", "Techradar", "Intellij", "Unity", "LAMP", "MEAN", "Meteor", "Ruby", "C#", "Java", "Kotlin", "PHP", "Apache", "Graphite", "Avro", "Hadoop", "YARN", "Azure", ".net", "Gradle", "Swift", "Blaze"];
    return possible[Math.floor(Math.random() * possible.length)];
}

function getRandom(start, max) {
    return Math.floor(Math.random() * max) + start;
}

function getRandomStage() {
    var rand = getRandom(0, 4);
    if (rand === 0) {
        return "Adopt";
    } else if (rand === 1) {
        return "Trial";
    } else if (rand === 2) {
        return "Assess";
    } else {
        return "Avoid";
    }
}

function getRandomSection() {
    var rand = getRandom(0, 4);
    if (rand === 0) {
        return "Tools";
    } else if (rand === 1) {
        return "Techniques";
    } else if (rand === 2) {
        return "Platforms";
    } else {
        return "Frameworks";
    }
}

Template.submit.onCreated(function() {
    this.matches = new ReactiveVar([]);
    this.selectWidth = new ReactiveVar();
    this.invalidInput = new ReactiveVar();
});

Template.submit.helpers({
    submittedKeywords: () => {
        return Keywords.find({ emails: Session.get("email") }).fetch();
    },
    stages: () => {
        return ["Adopt", "Trial", "Assess", "Avoid"];
    },
    getByStage: (votes, stage) => {
        return votes.filter(vote => vote.stage === stage);
    },
    matches: () => {
        return Template.instance().matches.get();
    },
    getSelectWidth: () => {
        return Template.instance().selectWidth.get();
    },
    getInvalidInput: function () {
        return Template.instance().invalidInput.get();
    }
});

Template.submit.events({
    'click #submitButton'(event, template) {
        // Prevent default browser form submit
        event.preventDefault();

        var keywordName = template.$("#keywordText").val();
        var chosenStage = template.$("#stageDropdown").val();
        var chosenSection = template.$("#sectionText").val();
        var email = Session.get("email");

        // test data generation, uncomment to spam test data into database
        //for (count = 0; count < 250; count++) {
            //var newKeyword = makerealid();
            //var chosenStage = getRandomStage();
            //var chosenSection = getRandomSection();


            if (!keywordName || !keywordName.length || !chosenSection) {
                template.invalidInput.set("No quadrant selected");
                return;
            }

            if (!chosenStage) {
                template.invalidInput.set("No stage selected");
                return;
            }

            template.invalidInput.set();

            var keyword; // = Keywords.find({ keyword: newKeyword, stage: chosenStage, section: chosenSection }).fetch();
            var allKeywords = Keywords.find().fetch();

            // case insensitive search
            for (i = 0; i < allKeywords.length; ++i) {
                if (allKeywords[i].keyword.toLowerCase() === keywordName.toLowerCase() &&
                    allKeywords[i].stage === chosenStage &&
                    allKeywords[i].section === chosenSection) {
                    keyword = allKeywords[i];
                    break;
                }
            }

            if (keyword && keyword.emails && keyword.emails.indexOf(email) >= 0) {
                template.$('#keywordText').val("");
                template.$("#stageDropdown").val("0");
                template.$("#sectionText").val("0");
                document.getElementById('alreadyVotedContainer').style.opacity = '1';
                window.setTimeout(() => {
                    document.getElementById('alreadyVotedContainer').style.opacity = '0'
                }, 4000);
                return;
            }

            if (keyword) {
                var voteString = 'votes';
                var action = {};
                action[voteString] = 1;
                var addEmail = {emails: email};
                Keywords.update(
                    { _id: keyword._id },
                    {
                        $addToSet: addEmail,
                        $inc: action
                    });
            } else {
                var newKeyword = {
                    keyword: keywordName,
                    stage: chosenStage,
                    section: chosenSection,
                    emails: [email],
                    votes: 1,
                };
                Keywords.insert(newKeyword);
            }

            var oldVote = allKeywords.find((kw) => {
                return kw.emails.indexOf(email) >= 0 &&
                    kw.keyword === keywordName &&
                    kw.section === chosenSection &&
                    kw.stage !== chosenStage;
            });

            if (oldVote) {
                Keywords.update(
                    { _id: oldVote._id },
                    {
                        $pull: {emails: email},
                        $inc: {votes: -1}
                    });
            }

            // Clear form
            template.$('#keywordText').val("");
            template.$("#stageDropdown").val("0");
            template.$("#sectionText").val("0");

            document.getElementById('faderContainer').style.opacity = '1';

            function fadeout() {
                document.getElementById('faderContainer').style.opacity = '0';
            }

            window.setTimeout(fadeout, 4000);


        //}
    },

    'keyup #keywordText': _.debounce((event, template) => {
        event.preventDefault();

        template.selectWidth.set(event.target.getBoundingClientRect().width);


        template.matches.set([]);
        if (!event || !event.target || !event.target.value) {
            return;
        }

        keywordClassifier.forEach((keyword) => {
            if (keyword && keyword.name && keyword.name.toLowerCase().indexOf(event.target.value.toLowerCase()) >= 0) {
                template.matches.get().push(keyword);
            }
        });
    }, 500),

    'click .typeahead-result'(event, template) {
        event.preventDefault();

        const data = $(event.target).data();
        template.matches.set([]);
        template.invalidInput.set();
        template.$("#keywordText").val(data.name);
        template.$("#sectionText").val(data.section);
    },

    'click #finishButton'() {
        Router.go('/finish');
    },

    'click'(event, template) {
        console.log('click template')
        template.matches.set([]);
    }
});

Template.body.events({
    'click'(event, template) {
        console.log('click body');
        template.matches.set([]);
    }
});
