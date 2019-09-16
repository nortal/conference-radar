import {Template} from 'meteor/templating';
import {Keywords} from "../../imports/api/keywords";
import {DevelopFunctions} from "../../imports/api/develop";

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

Template.adminKeywordVoteList.events({
    'click button[data-action]'(event, template) {
        const target = $(event.currentTarget);
        const action = target.data('action');
        const stage = target.data('stage');
        const userId = target.data('userId');
        const id = target.data('id');

        if (action === 'delete') {
            Meteor.call('removeVoteAdmin', id, userId, stage)
        }
    }
});

Template.adminKeywordList.helpers({
    'keywordColorClass'(enabled) {
        return enabled ? 'text-success' : 'text-danger';
    },
});

Template.adminControl.events({
    'click #randomGenButton'() {
        DevelopFunctions.generateRandomData();
    },
    'click #databaseClearButton'() {
        DevelopFunctions.clearDatabase();
    },
    'click #votesClearButton'() {
        DevelopFunctions.clearVotes();
    },
    'click #usersClearButton'() {
        DevelopFunctions.clearUsers();
    }
});
