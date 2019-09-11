import {Template} from 'meteor/templating';
import {DevelopFunctions} from "../../imports/api/develop";
import {Users} from "../../imports/api/keywords";
import '/imports/ui/login-view.css';

function loadJsSdk(id, src, onLoad) {
    var fjs = document.getElementsByTagName('script')[0];
    if (document.getElementById(id)) return;
    var js = document.createElement('script');
    js.id = id;
    js.src = src;
    fjs.parentNode.insertBefore(js, fjs);
    js.addEventListener('load', onLoad);
}

function loginOrSignUp(email, name, appId) {
    // check if user already exists
    const user = Users.findOne({"$or": [{email: email}, {appIds: appId}]});
    if (user) {
        Session.set('userId', user._id);
        Router.go('/submit');
        return;
    }

    Session.set('signUpDetails', {
        email: email,
        name: name,
        appId: appId
    });

    Router.go('/confirm');
}

Template.login.events({
    'click #skipLogin': function (event, template) {
        if (!DevelopFunctions.isDevMode()) {
            return;
        }

        event.preventDefault();
        loginOrSignUp('user@test.dev', 'Test User');

    },

    'click #facebookLogin': function (event, template) {

        event.preventDefault();
        template.inProgress.set(true);

        FB.login(function (response) {
            if (response.authResponse) {
                console.log('Fetching information....');
                FB.api('/me', {fields: 'name,email,id'}, function (response) {
                    loginOrSignUp(response.email, response.name, response.id);
                });
            } else {
                template.inProgress.set(false);
            }
        }, {scope: 'email'});

    },

    'click #googleLogin': function (event, template) {

        event.preventDefault();
        template.inProgress.set(true);

        template.auth2.signIn().then(function (googleUser) {
            var profile = googleUser.getBasicProfile();
            loginOrSignUp(profile.getEmail(), profile.getName(), profile.getId());
        }).catch(function () {
            template.inProgress.set(false);
        })

    },
});

Template.login.onCreated(function () {
    this.inProgress = new ReactiveVar(false);
    const self = this;

    // Load login SDKs
    loadJsSdk('facebook-jssdk', 'https://connect.facebook.net/en_US/sdk.js', function () {
        FB.init({
            appId: Meteor.settings.public.auth.facebook.appId,
            cookie: true,
            xfbml: true,
            version: Meteor.settings.public.auth.facebook.apiVersion
        });
    });

    loadJsSdk('google-sdk', 'https://apis.google.com/js/client.js', function () {
        gapi.load('auth2', function () {
            // Assign to template instance so it's accessible in event listeners
            self.auth2 = gapi.auth2.init({
                client_id: Meteor.settings.public.auth.google.clientId,
                cookiepolicy: 'single_host_origin'
            });
        });
    });
});

Template.login.helpers({
    inProgress: function () {
        return Template.instance().inProgress.get();
    }
});
