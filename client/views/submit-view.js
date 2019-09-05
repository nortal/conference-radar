import {Template} from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var'
import {Keywords,Users} from '../../imports/api/keywords.js';
import {Stages,Sections} from '../../imports/api/constants.js';
import _ from 'underscore';

const keywordClassifier = require('/public/keywords.json');

Template.submit.onCreated(function() {
    this.autocomplete = new ReactiveVar({matches: [], dirty: false});
    this.selectWidth = new ReactiveVar();
});

Template.submit.onRendered(function () {
    this.toast = {
        element: $('#toast'),
        show(styleClass, content) {
            $("div.toast-body", this.element)
                .attr("class", "toast-body " + styleClass)
                .html(content);

            this.element.toast("show");
            return this;
        },
        hide() {
            this.element.toast("hide");
            return this;
        }
    };
});

Template.submit.helpers({
    submittedKeywords: () => {
        const email = Session.get("email");
        const stages = []
        Stages.forEach((stage) => stages.push({["votes." + stage.id]: email}));
        return Keywords.find({$or: stages}).fetch();
    },
    stages: () => {
        return Stages
    },
    getStageName: (votes) => {
        const email = Session.get("email");
        const stage = _.findKey(votes, (emails) =>  emails.includes(email));
        return Stages.find(s => s.id === stage).name;
    },
    getSectionName: (id) => {
        return Sections.find(s => s.id === id).name;
    },
    getByStage: (votes, stage) => {
        return votes.filter(vote => vote.stage === stage.id);
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
    }
});

Template.submit.events({
    'click button.close'(event, template) {
        const id = $(event.currentTarget).data("value");
        const email = Session.get("email");

        // find matching keyword
        const keyword = Keywords.find({ _id: id }).fetch();

        // no results with that id
        if (!keyword.length) {
            template.toast.show("alert-danger", "Invalid entry!");
            return;
        }

        // user has not voted for that
        if (!keyword[0].emails.includes(email)) {
            template.toast.show("alert-danger", "Cannot remove that entry!");
            return;
        }

        Keywords.update(
            { _id: id },
            {
                $pull: {emails: email},
                $inc: {votes: -1}
            });
    },

    'click #submitButton'(event, template) {
        // Prevent default browser form submit
        event.preventDefault();

        var keywordName = template.$("#keywordText").val().trim().toLowerCase();
        var chosenStage = template.$("#stageDropdown").val().trim().toLowerCase();
        var chosenSection = template.$("#sectionText").val().trim().toLowerCase();
        var email = Session.get("email");

        if (!keywordName || !keywordName.length || !chosenSection) {
            template.toast.show("alert-danger", "No quadrant selected!");
            return;
        }

        if (!chosenStage) {
            template.toast.show("alert-danger", "No stage selected!");
            return;
        }

        if (!Stages.find(s => s.id === chosenStage)) {
            template.toast.show("alert-danger", "Invalid stage!");
            return;
        }

        template.toast.hide();

        var keyword; // = Keywords.find({ keyword: newKeyword, stage: chosenStage, section: chosenSection }).fetch();
        var allKeywords = Keywords.find().fetch();

        // case insensitive search
        for (i = 0; i < allKeywords.length; ++i) {
            if (allKeywords[i].name.toLowerCase() === keywordName &&
                allKeywords[i].section === chosenSection) {
                keyword = allKeywords[i];
                break;
            }
        }

        if (!keyword) {
            template.toast.show("alert-danger", "Invalid keyword!");
            return;
        }

        const oldVotedStage = Object.keys(keyword.votes).find(function (stage) {
            return keyword.votes[stage].indexOf(email) !== -1;
        });

        if (oldVotedStage === chosenStage) {
            clearForm(template);
            template.toast.show("alert-warning", "You have already voted for this option!");
            return;
        }

        // remove old vote
        if (oldVotedStage) {
            const modifier = {};
            modifier["votes." + oldVotedStage] = email;

            Keywords.update(
                { _id: keyword._id },
                {
                    $pull: {votes: voteRemoveModifier}
                });
        }

        const modifier = {};
        modifier["votes." + chosenStage] = email;

        Keywords.update(
            { _id: keyword._id },
            {
                $addToSet: modifier
            });

        clearForm(template);
        template.toast.show("alert-success", "Thank you!<br>Your opinion has been saved.");
    },

    'keyup #keywordText': _.debounce((event, template) => {
        event.preventDefault();

        template.selectWidth.set(event.target.getBoundingClientRect().width);
        template.autocomplete.set({matches: [], dirty: true});

        if (!event || !event.target || !event.target.value) {
            return;
        }

        const value = event.target.value.toLowerCase();

        // todo: improve search
        const allKeywords = Keywords.find().fetch();
        _.each(allKeywords, function (keyword) {
            if (keyword.name.toLowerCase().indexOf(value) >= 0 &&
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
        clearAutocomplete(template);
        template.$("#keywordText").val(data.name);
        template.$("#sectionText").val(data.section);
    },

    'focusout #keywordText'(event, template) {
        if (event.relatedTarget && event.relatedTarget.id === "suggestButton") {
            suggestEvent(event, template);
        }

        clearAutocomplete(template);
    },

    'click #finishButton'() {
        const user = Users.findOne({email: Session.get("email")});
        Users.update(
            {_id: user._id, },
            {"$set": {finished: true}}
            );
        Router.go('/finish');
    },

});

function clearAutocomplete(template) {
    template.autocomplete.set({matches: [], dirty: false});
}

function clearForm(template) {
    template.$('#keywordText').val("");
    template.$("#stageDropdown").val("0");
    template.$("#sectionText").val("0");
}

function suggestEvent(event, template) {
    const suggestion = template.$('#keywordText');

    //console.log(Keywords.find().fetch())
    // todo: check if exists. if yes, error. if not, create entry + show toast

    template.$('#keywordText').val("");
    //template.toast.show("alert-success", "Thank you!<br>Your suggestion has been saved.");
    template.toast.show("alert-warning", "Sorry! This feature is currently disabled!");
}
