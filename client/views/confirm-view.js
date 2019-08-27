import {Template} from 'meteor/templating';
import {Users} from '../../imports/api/keywords.js';

Template.confirm.events({
    'click #nextButton': function (event, template) {

        event.preventDefault();

        var submitEmail = Session.get('email') || template.$("#emailText").val();
        var submitName = Session.get('name') || template.$("#nameText").val();
        var recruitmentChecked = template.$('#recruitmentCheck').is(':checked');
        var participateChecked = template.$('#participateCheck').is(':checked');

        //todo: valid email + name check & invalid input warning
        if (!submitEmail || !submitName) {
            console.log('invalid input');
            return;
        }

        var userPayload = {
            name: submitName,
            email: submitEmail,
            wantsRecruitment: recruitmentChecked,
            wantsParticipation: participateChecked,
        };

        var foundUsers = Users.find({email: submitEmail}).fetch();
        if (foundUsers.length === 0) {
            Users.insert(userPayload);
        }

        Session.set('isLoggedIn', true);
        Session.set('email', submitEmail);
        Session.set('name', submitName);

        Router.go('/submit');
    }

});

Template.confirm.helpers({
    isDisabled: function (key) {
        return !Session.get(key) ? '' : 'disabled';
    },
    getSessionVal: function (key) {
        return Session.get(key);
    }
});

