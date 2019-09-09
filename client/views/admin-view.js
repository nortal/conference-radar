import {Template} from 'meteor/templating';
import {Keywords, Users} from "../../imports/api/keywords";

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
