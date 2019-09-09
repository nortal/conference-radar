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
