import {Template} from 'meteor/templating';
import {UserInputVerification} from "../../imports/api/shared";

Template.confirm.onCreated(function () {
    Session.set('title', 'title.login_and_vote');

    const user = Meteor.users.findOne();
    const profile = user.services.google || user.services.facebook;

    this.profile = profile;
    this.nameText = new ReactiveVar({text: profile.name, valid: true, message: ''});
    this.emailText = new ReactiveVar({text: profile.email, valid: true, message: ''});
    this.invalidInput = new ReactiveVar();
});

Template.confirm.events({
    'keyup #nameText': function (event, template) {
        template.nameText.set({text: template.$("#nameText").val(), valid: true, message: ''});
        template.$('#nameText').removeClass('error');
    },
    'keyup #emailText': function (event, template) {
        template.emailText.set({text: template.$("#emailText").val(), valid: true, message: ''});
        template.$('#emailText').removeClass('error');
    },
    'click #nextButton': function (event, template) {
        event.preventDefault();

        const submitEmail = template.$("#emailText").val();
        const submitName = template.$("#nameText").val();
        const recruitmentChecked = template.$('#recruitmentCheck').is(':checked');
        const participateChecked = template.$('#participateCheck').is(':checked');
        const termsChecked = template.$('#termsCheck').is(':checked');

        const emailResult = UserInputVerification.verifyEmail(submitEmail);
        if (!emailResult.ok) {
            template.emailText.set({text: submitEmail, valid: false, message: emailResult.message});
            return;
        }

        const nameResult = UserInputVerification.verifyName(submitName);
        if (!nameResult.ok) {
            template.nameText.set({text: submitName, valid: false, message: nameResult.message});
            return;
        }

        if (!termsChecked) {
            template.invalidInput.set("confirm.terms_invalid");
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
    getInvalidInput: function () {
        return Template.instance().invalidInput.get();
    },
    getError: function (inputName) {
        const input = Template.instance()[inputName].get();
        return input.message;
    },
    getValue: function(inputName) {
        const input = Template.instance()[inputName].get();
        return input.text;
    }
});
