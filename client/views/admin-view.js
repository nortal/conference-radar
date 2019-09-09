import {Template} from 'meteor/templating';
import {Keywords, Users} from "../../imports/api/keywords";
import {DevelopFunctions} from "../../imports/api/develop";

Template.admin.helpers({
    'getAllUsers'() {
        return Users.find().fetch();
    },
    'getEnabledKeywords'() {
        return Keywords.find({enabled: true}).fetch();
    },
    'getDisabledKeywords'() { // {votes: {$elemMatch: {email: user.email}}}
        return Keywords.find({enabled: false}).fetch();
    }
});

Template.adminKeywordList.events({
    'click button[data-action]'(event, template) {
        const target = $(event.target);
        const action = target.data('action');
        const id = target.data('id');

        if (action === 'delete') {
            Keywords.remove({_id: id});
        } else {
            Keywords.update({_id: id}, {$set: {enabled: action === 'enable'}});
        }
    }
});

Template.adminKeywordVoteList.events({
    'click button[data-action]'(event, template) {
        const target = $(event.currentTarget);
        const action = target.data('action');
        const stage = target.data('stage');
        const email = target.data('email');
        const id = target.data('id');

        console.log(email, stage);

        if (action === 'delete') {
            Keywords.update(
                { _id: id },
                {
                    $pull: {votes: {email: email, stage: stage}},
                });
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
    },
});
