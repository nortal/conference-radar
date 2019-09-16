import {Template} from 'meteor/templating';
import {DevelopFunctions} from "../../imports/api/develop";
import '/imports/ui/login-view.css';

function loginOrSignUp() {
    const user = Meteor.users.findOne();
    if (user && user.agreesTerms) {
        Router.go('/submit');
        return;
    }

    const profile = user.services.google || user.services.facebook;
    Session.set('signUpDetails', {
        email: profile.email,
        name: profile.name,
        appId: profile.appId
    });
    Router.go('/confirm');
}

Template.login.events({
    'click #facebookLogin': function (event, template) {
        event.preventDefault();
        template.inProgress.set(true);

        Meteor.loginWithFacebook({
            requestPermissions: ['public_profile', 'email']
        }, (err) => {
            if (err) {
                template.inProgress.set(false);
            } else {
                loginOrSignUp();
            }
        });
    },

    'click #googleLogin': function (event, template) {
        event.preventDefault();
        template.inProgress.set(true);

        Meteor.loginWithGoogle({
            requestPermissions: ['profile', 'email']
        }, (err) => {
            if (err) {
                template.inProgress.set(false);
            } else {
                loginOrSignUp();
            }
        });
    },
});

Template.login.onCreated(function () {
    Session.set('title', 'Login & vote!');

    this.inProgress = new ReactiveVar(false);
});

Template.login.helpers({
    inProgress: function () {
        return Template.instance().inProgress.get();
    }
});
