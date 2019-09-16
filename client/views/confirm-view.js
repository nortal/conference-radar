import {Template} from 'meteor/templating';
import {UserValidation} from '../../imports/api/constants.js';

Template.confirm.onCreated(function () {
    Session.set('title', 'Login & vote!');

    this.nameText = new ReactiveVar({text: '', valid: true});
    this.emailText = new ReactiveVar({text: '', valid: true});
    this.invalidInput = new ReactiveVar();
});

Template.confirm.events({
    'keyup #nameText': function (event, template) {
        template.nameText.set({text: template.$("#nameText").val(), valid: true});
    },
    'keyup #emailText': function (event, template) {
        template.emailText.set({text: template.$("#emailText").val(), valid: true});
    },
    'click #nextButton': function (event, template) {
        event.preventDefault();

        const signUpDetails = Session.get('signUpDetails');
        const submitEmail = signUpDetails.email || template.$("#emailText").val();
        const submitName = signUpDetails.name || template.$("#nameText").val();
        const recruitmentChecked = template.$('#recruitmentCheck').is(':checked');
        const participateChecked = template.$('#participateCheck').is(':checked');
        const termsChecked = template.$('#termsCheck').is(':checked');

        template.nameText.set(
            {text: template.$("#nameText").val(), valid: UserValidation.name.test(submitName)}
        );
        template.emailText.set(
            {text: template.$("#emailText").val(), valid: UserValidation.email.test(submitEmail.toLowerCase())}
        );

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

        Meteor.call('updateUser', submitEmail, recruitmentChecked, participateChecked, termsChecked);

        // Order is important. If signUpDetails is cleared first, the user will lose
        // access to the current page and will be redirected back to the front
        Router.go('/submit');
        Session.set('signUpDetails', undefined);
    }
});

Template.confirm.helpers({
    getClasses: function (inputName) {
        const input = Template.instance()[inputName].get();
        return (input.text.length ? '' : 'empty') + (input.valid ? '' : ' error');
    },
    isDisabled: function (key) {
        const details = Session.get('signUpDetails');
        return details && details[key] ? 'disabled' : '';
    },
    getInvalidInput: function () {
        return Template.instance().invalidInput.get();
    },
    getDetails: function (key) {
        const details = Session.get('signUpDetails');
        return details ? details[key] : '';
    }
});
