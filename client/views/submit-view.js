import {Template} from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var'
import {Keywords, Users} from '../../imports/api/keywords.js';
import {Sections, Stages} from '../../imports/api/constants.js';
import {UserInputVerification} from "../../imports/api/shared";
import _ from 'underscore';
import '/imports/ui/submit-view.css';

Template.submit.onCreated(function () {
    Session.set('title', 'Vote!');

    this.autocomplete = new ReactiveVar({matches: [], dirty: false});
    this.selectWidth = new ReactiveVar();
    this.keywordText = new ReactiveVar();
    this.selectedStage = new ReactiveVar();
    this.showSuggestionForm = new ReactiveVar(false);
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
        const user = Users.findOne({_id: Session.get('userId')});
        if (!user) {
            return null;
        }
        return Keywords.find({votes: {$elemMatch: {email: user.email}}}).fetch()
            .sort((kw1, kw2) => {
                const stage1 = Stages.find((stage) => stage.id === getStage(kw1.votes));
                const stage2 = Stages.find((stage) => stage.id === getStage(kw2.votes));
                return stage1 !== stage2 ? stage2.value - stage1.value : stage1.name - stage2.name;
            });
    },
    stages: () => {
        return Stages.reverse();
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
        const user = Users.findOne({_id: Session.get('userId')});

        // find matching keyword
        const keyword = Keywords.find({_id: id}).fetch()[0];
        if (!keyword) {
            template.toast.show("alert-danger", "Could not find that keyword!");
            return;
        }

        // find stage user has voted for, if any
        const oldVote = keyword.votes.find((vote) => vote.email === user.email);

        // user has not voted for that
        if (!oldVote) {
            template.toast.show("alert-danger", "You have not voted for that option!");
            return;
        }

        Keywords.update(
            {_id: id},
            {
                $pull: {votes: {email: user.email, stage: oldVote.stage}},
            });
    },

    'keyup #keywordText': _.debounce((event, template) => {
        event.preventDefault();

        template.keywordText.set(template.$("#keywordText").val());
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
            .find({enabled: true, name: {$regex: value, $options: 'i'}})
            .fetch()
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

    'focusout #keywordText'(event, template) {
        // is user clicked on a link that opens the suggestion modal
        if (event.relatedTarget && event.relatedTarget.dataset.toggle === "modal") {
            event.preventDefault();
            return;
        }

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
        clearForm(template);
    },

    'click #submitSuggestionButton'(event, template) {
        const suggestion = template.$('#keywordText').val();
        const section = template.$('#suggestionSectionDropdown').val();
        const stage = template.selectedStage.get();
        const user = Users.findOne({_id: Session.get('userId')});

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
                if (allKeywords[i].votes.find((votes) => votes.email === user.email)) {
                    template.toast.show("alert-danger", "You have already suggested this!");
                    return;
                }

                // Already suggested but not enabled yet
                if (!allKeywords[i].enabled) {
                    Keywords.update(
                        {_id: allKeywords[i]._id},
                        {$addToSet: {votes: {email: user.email, stage: stage}}}
                    );
                    template.toast.show("alert-success", "Thank you!<br>Your suggestion has been saved.");
                    clearAutocomplete(template, false);
                    clearForm(template);
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
            votes: [{email: user.email, stage: stage}]
        });

        template.toast.show("alert-success", "Thank you!<br>Your suggestion has been saved.");
        clearAutocomplete(template, false);
        clearForm(template);
        template.showSuggestionForm.set(false);
    },

    'click #suggestButton'(event, template) {
        template.showSuggestionForm.set(true);
        clearForm(template);
    },

    'click #submitButton'(event, template) {
        // Prevent default browser form submit
        event.preventDefault();

        const user = Users.findOne({_id: Session.get('userId')});
        var keywordName = template.$("#keywordText").val();
        var chosenStage = template.selectedStage.get();
        var chosenSection = template.$("#sectionText").val();

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

        //template.toast.hide();
        clearForm(template);

        const keyword = Keywords.find({name: keywordName, section: chosenSection}).fetch()[0];
        if (!keyword) {
            template.toast.show("alert-danger", "Invalid keyword!");
            return;
        }

        // find stage user has voted for, if any
        const oldVote = keyword.votes.find((vote) => vote.email === user.email);

        if (oldVote) {
            template.toast.show("alert-warning", "You have already voted for this option!");
            return;
        }

        Keywords.update(
            {_id: keyword._id},
            {
                $addToSet: {votes: {email: user.email, stage: chosenStage}}
            });

        template.toast.show("alert-success", "Thank you!<br>Your opinion has been saved.");
    },
});

function getStage(votes) {
    const user = Users.findOne({_id: Session.get('userId')});
    return _.find(votes, (vote) => vote.email === user.email).stage;
}

function clearAutocomplete(template, dirty) {
    template.autocomplete.set({matches: [], dirty: dirty});
}

function clearForm(template) {
    template.$('#keywordText').val("");
    template.keywordText.set();
    if (template.$('#suggestionSectionDropdown').length) {
        template.$('#suggestionSectionDropdown')[0].selectedIndex = 0;
    }
    template.$("#sectionText").val("0");
    template.selectedStage.set();
}
