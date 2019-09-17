import {Template} from 'meteor/templating';
import {Keywords} from "../../imports/api/keywords";
import {UserInputVerification} from "../../imports/api/shared";

Template.admin.helpers({
    'getAllUsers'() {
        return Meteor.users.find();
    },
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

        if (!UserInputVerification.verifySection(section.val())) {
            console.log('Invalid section');
            return;
        }
        if (!UserInputVerification.verifySuggestion(name.val())) {
            console.log('Invalid name');
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
