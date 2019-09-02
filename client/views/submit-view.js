import {Template} from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var'
import {Keywords} from '../../imports/api/keywords.js';
import _ from 'underscore';

const keywordClassifier = require('/public/keywords.json');

Template.submit.onCreated(function() {
    this.autocomplete = new ReactiveVar({matches: [], dirty: false});
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
        return Template.instance().autocomplete.get().matches;
    },
    noResults: () => {
        var autocomplete = Template.instance().autocomplete.get();
        return !autocomplete.matches.length && autocomplete.dirty;
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

        if (!keywordName || !keywordName.length || !chosenSection) {
            template.invalidInput.set("No quadrant selected!");
            $("#errorToast").toast("show");
            return;
        }

        if (!chosenStage) {
            template.invalidInput.set("No stage selected!");
            $("#errorToast").toast("show");
            return;
        }

        $("#errorToast").toast("hide");
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
            $("#alreadyVotedToast").toast("show");
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
        $("#savedToast").toast("show");
    },

    'keyup #keywordText': _.debounce((event, template) => {
        event.preventDefault();

        template.selectWidth.set(event.target.getBoundingClientRect().width);


        template.autocomplete.set({matches: [], dirty: true});
        if (!event || !event.target || !event.target.value) {
            return;
        }

        keywordClassifier.forEach((keyword) => {
            if (keyword && keyword.name && keyword.name.toLowerCase().indexOf(event.target.value.toLowerCase()) >= 0 &&
                template.autocomplete.get().matches.length <= 12) {
                template.autocomplete.get().matches.push(keyword);
            }
        });

    }, 100),

    'mousedown .typeahead-result'(event) {
        event.preventDefault();
    },

    'click .typeahead-result'(event, template) {
        event.preventDefault();
        const data = $(event.currentTarget).data();
        template.autocomplete.set({matches: [], dirty: false});
        $("#errorToast").toast("hide");
        template.invalidInput.set();
        template.$("#keywordText").val(data.name);
        template.$("#sectionText").val(data.section);
    },

    'focusout #keywordText'(event, template) {
        template.autocomplete.set({matches: [], dirty: false});
    },

    'click #finishButton'() {
        Router.go('/finish');
    },
});
