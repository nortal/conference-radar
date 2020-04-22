import {Template} from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var'

import {Keywords} from '/imports/api/keywords.js';
import {Sections, Stages} from '/imports/api/constants.js';
import {UserInputVerification} from "/imports/api/shared.js";
import './submit-view.css';

import _ from 'underscore';
import {Meteor} from "meteor/meteor";

Template.submit.onCreated(function () {
    Session.set('title', 'title.vote');

    this.autocomplete = new ReactiveVar({matches: [], dirty: false});
    this.selectWidth = new ReactiveVar();
    this.keywordText = new ReactiveVar();
    this.selectedStage = new ReactiveVar();
    this.showSuggestionForm = new ReactiveVar(false);
    this.submittedKeywords = new ReactiveVar();
    setSubmittedKeywords(this);
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
    getSubmittedKeywords() {
        return Template.instance().submittedKeywords.get();
    },
    stages: () => {
        return Stages.slice().reverse();
    },
    sections: () => {
        return Sections
    },
    getStage: (votes) => {
        return getStage(votes);
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
    isEmpty: (key) => {
        return !Template.instance()[key].get();
    },
    isSelected: (stage) => {
        return Template.instance().selectedStage.get() === stage;
    },
    showSuggestionForm: () => {
        return Template.instance().showSuggestionForm.get();
    }
});

Template.submit.events({
    'click button.close.remove'(event, template) {
        const id = $(event.currentTarget).data("value");

        // find matching keyword
        const keyword = Keywords.find({_id: id}).fetch()[0];
        if (!keyword) {
            template.toast.show("alert-danger", TAPi18n.__("submit.not_found"));
            return;
        }

        // find stage user has voted for, if any
        const oldVote = keyword.votes.find((vote) => vote.userId === Meteor.userId());

        // user has not voted for that
        if (!oldVote) {
            template.toast.show("alert-danger", TAPi18n.__("submit.not_voted"));
            return;
        }

        Meteor.call('removeVote', id, oldVote.stage);
        setSubmittedKeywords(template);
    },

    'keyup #keywordText': _.debounce((event, template) => {
        event.preventDefault();

        const keyword = template.$("#keywordText");
        keyword.removeClass('error');

        template.keywordText.set(keyword.val());
        template.selectWidth.set(event.target.getBoundingClientRect().width);
        clearAutocomplete(template, true);

        if (!event || !event.target || !event.target.value) {
            return;
        }

        const nameComparator = (name1, name2, value) => {
            if (name1 === value) {
                return -1;
            } else if (name2 === value) {
                return 1;
            }
            return name1 - name2;
        };

        const value = event.target.value.toLowerCase();

        template.autocomplete.get().matches = Keywords
            .find({enabled: true})
            .fetch()
            .filter(kw => kw.name.toLowerCase().indexOf(value) !== -1)
            .filter(kw => !kw.votes.some(vote => vote.userId === Meteor.userId()))
            .sort((kw1, kw2) => nameComparator(kw1.name.toLowerCase(), kw2.name.toLowerCase(), value))
            .slice(0, 11);
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

    'click .typeahead-no-matches'(event, template) {
        template.$("#keywordText").removeClass('error');
        template.showSuggestionForm.set(true);
    },


    'focusout #keywordText'(event, template) {
        clearAutocomplete(template, false);
    },

    'click .stage-option'(event, template) {
        const selectedStage = $(event.currentTarget).data().value;
        if (selectedStage === template.selectedStage.get()) {
            template.selectedStage.set();
        } else {
            template.selectedStage.set(selectedStage);
        }
    },

    'click #cancelSuggestionButton'(event, template) {
        template.showSuggestionForm.set(false);
    },

    'click #submitSuggestionButton'(event, template) {
        const suggestion = template.$('#keywordText').val();
        const section = template.$('#suggestionSectionDropdown').val();
        const stage = template.selectedStage.get();

        const suggestionResult = UserInputVerification.verifySuggestion(suggestion);
        if (!suggestionResult.ok) {
            template.$("#keywordText").addClass('error');
            template.toast.show("alert-danger", TAPi18n.__(suggestionResult.message));
            return;
        }

        const sectionResult = UserInputVerification.verifySection(section);
        if (!sectionResult.ok) {
            template.toast.show("alert-danger", TAPi18n.__(sectionResult.message));
            return;
        }

        const stageResult = UserInputVerification.verifyStage(stage);
        if (!stageResult.ok) {
            template.toast.show("alert-danger", TAPi18n.__(stageResult.message));
            return;
        }


        const allKeywords = Keywords.find().fetch();
        for (let i = 0; i < allKeywords.length; i++) {
            if (allKeywords[i].name.toLowerCase() === suggestion.toLowerCase() && allKeywords[i].section === section) {

                // Already suggested
                if (allKeywords[i].votes.find((votes) => votes.userId === Meteor.userId())) {
                    template.toast.show("alert-danger", TAPi18n.__("submit.already_suggested"));
                    return;
                }

                // Already suggested but not enabled yet
                if (!allKeywords[i].enabled) {
                    Meteor.call('addVote', allKeywords[i]._id, stage);
                    setSubmittedKeywords(template);
                    template.toast.show("alert-success", TAPi18n.__("submit.suggestion_saved"));
                    clearAutocomplete(template, false);
                    clearForm(template);
                    return;
                }

                template.toast.show("alert-danger", TAPi18n.__("submit.already_exists"));
                return;
            }
        }

        Meteor.call('addSuggestion', suggestion, section, stage);
        setSubmittedKeywords(template);

        template.toast.show("alert-success", TAPi18n.__("submit.suggestion_saved"));
        clearAutocomplete(template, false);
        clearForm(template);
        template.showSuggestionForm.set(false);
    },

    'click #suggestButton'(event, template) {
        template.$("#keywordText").removeClass('error');
        template.showSuggestionForm.set(true);
    },

    'click #submitButton'(event, template) {
        // Prevent default browser form submit
        event.preventDefault();

        var keywordName = template.$("#keywordText").val();
        var chosenStage = template.selectedStage.get();
        var chosenSection = template.$("#sectionText").val();

        const keywordResult = UserInputVerification.verifyKeyword(chosenSection, keywordName);
        if (!keywordResult.ok) {
            template.$("#keywordText").addClass('error');
            template.toast.show("alert-danger", TAPi18n.__(keywordResult.message));
            return;
        }

        const stageResult = UserInputVerification.verifyStage(chosenStage);
        if (!stageResult.ok) {
            template.toast.show("alert-danger", TAPi18n.__(stageResult.message));
            return;
        }

        keywordName = keywordName.trim(); // case-sensitive
        chosenStage = chosenStage.trim().toLowerCase();
        chosenSection = chosenSection.trim().toLowerCase();

        //template.toast.hide();
        clearForm(template);

        const keyword = Keywords.find({name: keywordName, section: chosenSection}).fetch()[0];
        if (!keyword) {
            template.toast.show("alert-danger", TAPi18n.__("submit.invalid_keyword"));
            return;
        }

        // find stage user has voted for, if any
        const oldVote = keyword.votes.find((vote) => vote.userId === Meteor.userId());

        if (oldVote) {
            template.toast.show("alert-warning", TAPi18n.__("submit.already_voted"));
            return;
        }

        Meteor.call('addVote', keyword._id, chosenStage);
        setSubmittedKeywords(template);

        template.toast.show("alert-success", TAPi18n.__("submit.opinion_saved"));
    },
});

function getStage(votes) {
    return _.find(votes, (vote) => vote.userId === Meteor.userId())?.stage;
}

function setSubmittedKeywords(template) {
    Meteor.call('getSubmittedKeywords', (error, result) => {
        if (!error && result) {
            template.submittedKeywords.set(result.sort((kw1, kw2) => {
                const stage1 = Stages.find((stage) => stage.id === getStage(kw1.votes));
                const stage2 = Stages.find((stage) => stage.id === getStage(kw2.votes));
                return stage1 !== stage2 ? stage2.value - stage1.value : stage1.name - stage2.name;
            }));
        }
    });
}

function clearAutocomplete(template, dirty) {
    template.autocomplete.set({matches: [], dirty: dirty});
}

function clearForm(template) {
    template.$('#keywordText').val("");
    template.keywordText.set();
    if (template.$('#suggestionSectionDropdown').length) {
        template.$('#suggestionSectionDropdown')[0].selectedIndex = -1;
    }
    template.$("#sectionText").val("0");
    template.selectedStage.set();
}
