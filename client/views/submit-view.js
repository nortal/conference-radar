import {Template} from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var'
import {Keywords} from '../../imports/api/keywords.js';
import {Sections, Stages} from '../../imports/api/constants.js';
import {UserInputVerification} from "../../imports/api/shared";
import _ from 'underscore';

Template.submit.onCreated(function () {
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
        const user = Session.get('user');
        return Keywords.find({votes: {$elemMatch: {email: user.email}}}).fetch();
    },
    stages: () => {
        return Stages
    },
    sections: () => {
        return Sections
    },
    getStageName: (votes) => {
        const user = Session.get('user');
        const vote = _.find(votes, (vote) =>  vote.email === user.email);
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
        const user = Session.get('user');

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

    'click #submitButton'(event, template) {
        // Prevent default browser form submit
        event.preventDefault();

        const user = Session.get('user');
        var keywordName = template.$("#keywordText").val();
        var chosenStage = template.$("#stageDropdown").val();
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

    'keyup #keywordText': _.debounce((event, template) => {
        event.preventDefault();

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
            .find({ enabled: true, name: { $regex: value, $options: 'i' } })
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

    'click #suggestButton'(event, template) {
        const suggestion = template.$('#suggestionText').val();
        const section = template.$('#suggestionSectionDropdown').val();
        const stage = template.$('#suggestionStageDropdown').val();
        const user = Session.get('user');

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
            votes: [{email: user.email, stage: stage}]
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
