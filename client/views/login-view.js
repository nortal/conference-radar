import {Template} from 'meteor/templating';
import {Users} from '../../imports/api/keywords.js';

function loadJsSdk(id, src, onLoad) {
    var fjs = document.getElementsByTagName('script')[0];
    if (document.getElementById(id)) return;
    var js = document.createElement('script');
    js.id = id;
    js.src = src;
    fjs.parentNode.insertBefore(js, fjs);
    js.addEventListener('load', onLoad);
}

function loginOrSignUp(email, name) {
    var payload = {email: email};
    var foundUsers = Users.find(payload).fetch();

    if (foundUsers.length === 0) {
        payload.name = name;
        Users.insert(payload);
    }

    console.log('Logged in with email: ' + email + ', name: ' + name);
    Session.set('isLoggedIn', true);
    Session.set('email', email);
    Session.set('name', name);
    Router.go('/confirm');
}

Template.login.events({
    //todo: remove me
    'click #skipLogin': function (event, template) {

        event.preventDefault();
        loginOrSignUp('user@test.dev', 'Test User');

    },

    'click #facebookLogin': function (event, template) {

        event.preventDefault();

        FB.login(function (response) {
            if (response.authResponse) {
                console.log('Fetching information....');
                FB.api('/me', {fields: 'name,email'}, function (response) {
                    loginOrSignUp(response.email, response.name);
                });
            } else {
                console.log('User cancelled login or did not fully authorize.');
            }
        }, {scope: 'email'});

    },

    'click #googleLogin': function (event, template) {

        event.preventDefault();
        template.auth2.signIn().then(function (googleUser) {
            var profile = googleUser.getBasicProfile();

            loginOrSignUp(profile.getEmail(), profile.getName());
        })

    },
});

Template.login.onCreated(function () {
    const self = this;

    // Load login SDKs
    loadJsSdk('facebook-jssdk', 'https://connect.facebook.net/en_US/sdk.js', function () {
        FB.init({
            appId: Meteor.settings.public.auth.facebook.appId,
            cookie: true,
            xfbml: true,
            version: Meteor.settings.public.auth.facebook.apiVersion
        });

        FB.getLoginStatus(function(response) {
            console.log('facebook signed in: ' + (response.status === 'connected'));
        });
    });

    loadJsSdk('google-sdk', 'https://apis.google.com/js/client.js', function () {
        gapi.load('auth2', function () {

            // Assign to template instance so it's accessible in event listeners
            self.auth2 = gapi.auth2.init({
                client_id: Meteor.settings.public.auth.google.clientId,
                cookiepolicy: 'single_host_origin'
            });

            console.log('google signed in: ' + self.auth2.isSignedIn.get());
        });
    });

});
