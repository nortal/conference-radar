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
        return Keywords.find({votes: {$elemMatch: {email: Session.get("email")}}}).fetch();
    },
    stages: () => {
        return Stages
    },
    sections: () => {
        return Sections
    },
    getStageName: (votes) => {
        const email = Session.get("email");
        const vote = _.find(votes, (vote) =>  vote.email === email);
        return Stages.find(s => s.id === vote.stage).name;
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
        const oldVote = keyword.votes.find((vote) => vote.email === email);

        // user has not voted for that
        if (!oldVote) {
            template.toast.show("alert-danger", "You have not voted for that option!");
            return;
        }

        Keywords.update(
            { _id: id },
            {
                $pull: {votes: {email: email, stage: oldVote.stage}},
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
        const oldVote = keyword.votes.find((vote) => vote.email === email);

        if (oldVote) {
            template.toast.show("alert-warning", "You have already voted for this option!");
            return;
        }

        Keywords.update(
            { _id: keyword._id },
            {
                $addToSet: {votes: {email: email, stage: chosenStage}}
            });

        template.toast.show("alert-success", "Thank you!<br>Your opinion has been saved.");
    },

    'keyup #keywordText': _.debounce((event, template) => {
        event.preventDefault();

        template.selectWidth.set(event.target.getBoundingClientRect().width);
        clearAutocomplete(template, true);

        if (!event || !event.target || !event.target.value) {
            return;
        }

        const value = event.target.value.toLowerCase();

        // todo: improve search
        const allKeywords = Keywords.find({enabled: true}).fetch();
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
        clearAutocomplete(template, false);
        template.$("#keywordText").val(data.name);
        template.$("#sectionText").val(data.section);
    },

    'focusout #keywordText'(event, template) {
        // is user clicked on a link that opens the suggestion modal
        if (event.relatedTarget && event.relatedTarget.dataset.toggle === "modal") {
            event.preventDefault();
            return;
        }

        clearAutocomplete(template, false);
    },

    'click #suggestButton'(event, template) {
        const suggestion = template.$('#suggestionText').val();
        const section = template.$('#suggestionSectionDropdown').val();
        const stage = template.$('#suggestionStageDropdown').val();
        const email = Session.get("email");

        if (!UserInputVerification.verifySection(section)) {
            template.toast.show("alert-danger", "Please enter a valid section!");
            return;
        }
        if (!UserInputVerification.verifyStage(stage)) {
            template.toast.show("alert-danger", "Please enter a valid stage!");
            return;
        }

        if (!suggestion || !suggestion.trim()) {
            template.toast.show("alert-danger", "Please enter a suggestion!");
            return;
        }

        const allKeywords = Keywords.find().fetch();
        for (let i = 0; i < allKeywords.length; i++) {
            if (allKeywords[i].name.toLowerCase() === suggestion.toLowerCase() && allKeywords[i].section === section) {

                // Already suggested
                if (allKeywords[i].votes.find((votes) => votes.email === email)) {
                    template.toast.show("alert-danger", "You have already suggested this!");
                    return;
                }

                // Already suggested but not enabled yet
                if (!allKeywords[i].enabled) {
                    template.toast.show("alert-success", "Thank you!<br>Your suggestion has been saved.");
                    return;
                }

                template.toast.show("alert-danger", "Technology already exists!");
                return;
            }
        }

        Keywords.insert({
            name: suggestion,
            section: section,
            enabled: false,
            votes: [{email: email, stage: stage}]
        });

        template.$('#suggestionText').val("");
        template.$('#suggestionSectionDropdown')[0].selectedIndex = 0;
        template.$('#suggestionStageDropdown')[0].selectedIndex = 0;
        template.$("#suggestionModal").modal("hide");
        template.toast.show("alert-success", "Thank you!<br>Your suggestion has been saved.");
    }
});

function clearAutocomplete(template, dirty) {
    template.autocomplete.set({matches: [], dirty: dirty});
}

function clearForm(template) {
    template.$('#keywordText').val("");
    template.$("#stageDropdown").val("0");
    template.$("#sectionText").val("0");
}
