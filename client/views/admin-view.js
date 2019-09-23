import {Template} from 'meteor/templating';
import {Keywords} from "../../imports/api/keywords";
import {UserInputVerification} from "../../imports/api/shared";
import {Meteor} from "meteor/meteor";

Template.admin.helpers({
    'getEnabledKeywords'() {
        return Keywords.find({enabled: true}).fetch();
    },
    'getDisabledKeywords'() {
        return Keywords.find({enabled: false}).fetch();
    },
    'isDevMode'() {
        return Meteor.settings.public.environment === "development";
    }
});

Template.adminKeywordList.events({
    'click button[data-action="enable"], click button[data-action="disable"]'(event) {
        const target = $(event.target);
        const action = target.data('action');
        const id = target.data('id');
        Meteor.call('updateKeywordAdmin', id, action);
    },
    'click button[data-action="edit"]'(event) {
        const modal = $('#editModal');
        const id = $(event.target).data('id');

        const keyword = Keywords.findOne({_id: id});

        modal.data('id', id);
        $('#editKeywordName', modal).val(keyword.name);
        $('#editKeywordSection', modal).val(keyword.section);
        modal.modal('show');
    }
});

Template.adminAddKeyword.events({
    'click #addKeywordButton'() {
        const name = $('#addKeywordName');
        const section = $('#addKeywordSection');

        const sectionResult = UserInputVerification.verifySection(section.val());
        if (!sectionResult.ok) {
            console.log(TAPi18n.__(sectionResult.message));
            return;
        }

        const suggestionResult = UserInputVerification.verifySuggestion(name.val());
        if (!suggestionResult.ok) {
            console.log(TAPi18n.__(sectionResult.message));
            return;
        }

        const allKeywords = Keywords.find().fetch();
        for (let i = 0; i < allKeywords.length; i++) {
            if (allKeywords[i].name.toLowerCase() === name.val().toLowerCase() && allKeywords[i].section === section.val()) {
                console.log(TAPi18n.__('submit.already_exists'));
                return;
            }
        }

        Meteor.call('addKeywordAdmin', name.val(), section.val());
        name.val('');
    }
});

Template.adminEditKeyword.events({
    'click button[data-action="delete"]'(event, template) {
        const modal = template.$('#editModal');
        const id = modal.data('id');
        Meteor.call('removeKeywordAdmin', id);
        modal.modal('hide');
    },
    'click button[data-action="save"]'(event, template) {
        const modal = template.$('#editModal');
        const id = template.$('#editModal', modal).data('id');
        const name = template.$('#editKeywordName', modal).val();
        const section = template.$('#editKeywordSection', modal).val();

        const sectionResult = UserInputVerification.verifySection(section);
        if (!sectionResult.ok) {
            console.log(TAPi18n.__(sectionResult.message));
            return;
        }

        const suggestionResult = UserInputVerification.verifySuggestion(name);
        if (!suggestionResult.ok) {
            console.log(TAPi18n.__(suggestionResult.message));
            return;
        }

        const existsResult = UserInputVerification.verifyKeywordExists(name, section);
        if (existsResult.ok) {
            console.log(TAPi18n.__('submit.already_exists'));
            return;
        }

        Meteor.call('saveKeywordAdmin', id, name, section);
        modal.modal('hide');
    },
    'click #moveVoteButton'(event, template) {
        const modal = template.$('#editModal');
        const fromId = template.$('#editModal', modal).data('id');
        const toId = template.$('#editMoveVote').val();
        Meteor.call('moveVotesAdmin', fromId, toId);
    }
});

Template.adminKeywordList.helpers({
    'keywordColorClass'(enabled) {
        return enabled ? 'text-success' : 'text-danger';
    }
});

Template.adminEditKeyword.helpers({
    'keywords'() {
        return Keywords.find({}, {sort:  {section: 1}}).fetch();
    }
});

Template.adminControl.events({
    'click #randomGenButton'() {
        Meteor.call('generateRandomDataDev');
    },
    'click #databaseClearButton'() {
        Meteor.call('clearDatabaseDev');
    },
    'click #votesClearButton'() {
        Meteor.call('clearVotesDev');
    },
    'click #usersClearButton'() {
        Meteor.call('clearUsersDev');
    }
});
