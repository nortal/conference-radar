import {Template} from 'meteor/templating';
import {Users} from '../../imports/api/keywords.js';
import {UserValidation} from '../../imports/api/constants.js';

Template.confirm.onCreated(function () {
    this.invalidInput = new ReactiveVar();
});

Template.confirm.events({
    'click #nextButton': function (event, template) {

        event.preventDefault();

        const appId = Session.get('appId');
        const submitEmail = Session.get('email') || template.$("#emailText").val();
        const submitName = Session.get('name') || template.$("#nameText").val();
        const recruitmentChecked = template.$('#recruitmentCheck').is(':checked');
        const participateChecked = template.$('#participateCheck').is(':checked');
        const termsChecked = template.$('#termsCheck').is(':checked');

        if (!submitEmail || !UserValidation.email.test(submitEmail.toLowerCase())) {
            template.invalidInput.set("Invalid email");
            $("#toast").toast("show");
            return;
        }

        if (!submitName || !UserValidation.name.test(submitName)) {
            template.invalidInput.set("Invalid name");
            $("#toast").toast("show");
            return;
        }

        if (!termsChecked) {
            template.invalidInput.set("You must accept the terms before proceeding");
            $("#toast").toast("show");
            return;
        }

        const foundUsers = Users.find({email: submitEmail}).fetch();
        if (foundUsers.length === 0) {
            Users.insert({
                appId: appId,
                name: submitName,
                email: submitEmail,
                wantsRecruitment: recruitmentChecked,
                wantsParticipation: participateChecked,
                agreesTerms: termsChecked
            });
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
