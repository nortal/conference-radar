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
    }
});

Template.adminKeywordList.events({
    'click button[data-action]'(event) {
        const target = $(event.target);
        const action = target.data('action');
        const id = target.data('id');

        if (action === 'delete') {
            Meteor.call('removeKeywordAdmin', id);
        } else {
            Meteor.call('updateKeywordAdmin', id, action);
        }
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

        Meteor.call('addKeywordAdmin', name.val(), section.val());
        name.val('');
        section.val('');
    }
});

Template.adminKeywordList.helpers({
    'keywordColorClass'(enabled) {
        return enabled ? 'text-success' : 'text-danger';
    },
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
