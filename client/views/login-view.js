import {Template} from 'meteor/templating';
import '/imports/ui/login-view.css';

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
                Router.go('/confirm');
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
                Router.go('/confirm');
            }
        });
    },
});

Template.login.onCreated(function () {
    Session.set('title', 'title.login_and_vote');

    this.inProgress = new ReactiveVar(false);
});

Template.login.helpers({
    inProgress: function () {
        return Template.instance().inProgress.get();
    }
});
