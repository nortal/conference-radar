import './main.html';
import '../imports/ui/login-view.html';
import '../imports/ui/confirm-view.html';
import '../imports/ui/submit-view.html';
import '../imports/ui/radar-view.html';
import '../imports/ui/admin-view.html';

import './views/confirm-view';
import './views/login-view.js';
import './views/submit-view.js';
import './views/radar-view.js';
import './views/admin-view.js';

import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "../node_modules/bootstrap/dist/js/bootstrap.bundle.min";

import {DevelopFunctions} from '../imports/api/develop.js';

Tracker.autorun(() => {
    Meteor.subscribe('user');
    Meteor.subscribe('keywords');
});

Router.configure({
    layoutTemplate: 'mainLayout'
});

Router.route('/', function () {
    Router.go('/login');
});

Router.route('/login', function () {
    this.render('login');
});

Router.route('/confirm', function () {
    // set in login page
    if (Session.get('signUpDetails')) {
        this.render('confirm');
    } else {
        Router.go("/");
    }
});

Router.route('/submit', function () {
    // set in login or confirm page
    if (Meteor.userId()) {
        this.render('submit');
    } else {
        Router.go('/');
    }
});

Router.route('/radar', function () {
    this.layout('radarLayout');
    this.render('radar');
});

Router.route('/admin', function () {
    const user = Meteor.users.findOne();;
    if (!user) {
        Router.go('/');
        return;
    }

    if (user.admin) {
        this.render('admin');
    } else {
        Router.go('/');
    }
});

Template.registerHelper('isDevMode', DevelopFunctions.isDevMode);
Template.registerHelper('isAdmin', function () {
    const userId = Session.get('userId');
    if (!userId) {
        return false;
    }

    const user = Users.findOne({_id: userId});
    return user && user.admin;
});
Template.registerHelper('getTitle', function () {
    return Session.get('title');
});
