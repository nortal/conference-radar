import {Template} from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var'
import {Keywords,Users} from '../../imports/api/keywords.js';
import {Stages,Sections} from '../../imports/api/constants.js';
import {UserInputVerification} from "../../imports/api/shared";
import _ from 'underscore';

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
        const keyword = Keywords.find({ _id: id }).fetch()[0];
        if (!keyword) {
            template.toast.show("alert-danger", "Could not find that keyword!");
            return;
        }

        // find stage user has voted for, if any
        const oldVotedStage = Object.keys(keyword.votes).find(function (stage) {
            return keyword.votes[stage].indexOf(email) !== -1;
        });

        // user has not voted for that
        if (!oldVotedStage) {
            template.toast.show("alert-danger", "You have not voted for that option!");
            return;
        }

        const modifier = {};
        modifier["votes." + oldVotedStage] = email;

        Keywords.update(
            { _id: id },
            {
                $pull: modifier,
            });
    },

    'click #submitButton'(event, template) {
        // Prevent default browser form submit
        event.preventDefault();

        var keywordName = template.$("#keywordText").val();
        var chosenStage = template.$("#stageDropdown").val();
        var chosenSection = template.$("#sectionText").val();
        var email = Session.get("email");

        if (!UserInputVerification.verifyStage(chosenStage)) {
            template.toast.show("alert-danger", "Invalid stage!");
            return;
        }

        if (!UserInputVerification.verifySection(chosenSection)) {
            template.toast.show("alert-danger", "Invalid section!");
            return;
        }

        if (!UserInputVerification.verifyKeyword(chosenSection, keywordName)) {
            template.toast.show("alert-danger", "Invalid keyword!");
            return;
        }

        keywordName = keywordName.trim(); // case-sensitive
        chosenStage = chosenStage.trim().toLowerCase();
        chosenSection = chosenSection.trim().toLowerCase();
        email = email.trim().toLowerCase();

        //template.toast.hide();
        clearForm(template);

        const keyword = Keywords.find({ name: keywordName, section: chosenSection }).fetch()[0];
        if (!keyword) {
            template.toast.show("alert-danger", "Invalid keyword!");
            return;
        }

        // find stage user has voted for, if any
        const oldVotedStage = Object.keys(keyword.votes).find(function (stage) {
            return keyword.votes[stage].indexOf(email) !== -1;
        });

        if (oldVotedStage) {
            template.toast.show("alert-warning", "You have already voted for this option!");
            return;
        }

        const modifier = {};
        modifier["votes." + chosenStage] = email;

        Keywords.update(
            { _id: keyword._id },
            {
                $addToSet: modifier
            });

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
