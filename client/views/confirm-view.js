import {Template} from 'meteor/templating';
import {Users} from '../../imports/api/keywords.js';

Template.confirm.onCreated(function () {
    this.invalidInput = new ReactiveVar();
});

Template.confirm.events({
    'click #nextButton': function (event, template) {

        event.preventDefault();

        var submitEmail = Session.get('email') || template.$("#emailText").val();
        var submitName = Session.get('name') || template.$("#nameText").val();
        var recruitmentChecked = template.$('#recruitmentCheck').is(':checked');
        var participateChecked = template.$('#participateCheck').is(':checked');

        if (!submitEmail || !validateEmail(submitEmail)) {
            template.invalidInput.set("Invalid email");
            return;
        }

        if (!submitName || !validateName(submitName)) {
            template.invalidInput.set("Invalid name");
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
    },
    getInvalidInput: function () {
        return Template.instance().invalidInput.get();
    }
});


function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function validateName(name) {
    return name.length >= 3;
}
