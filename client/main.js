import './main.html';
import '/imports/ui/pages/login/login-view.html';
import '/imports/ui/pages/confirm/confirm-view.html';
import '/imports/ui/pages/submit/submit-view.html';
import '/imports/ui/pages/radar/radar-view.html';
import '/imports/ui/pages/admin/admin-view.html';
import '/imports/ui/pages/login/login-view.js';
import '/imports/ui/pages/confirm/confirm-view.js';
import '/imports/ui/pages/submit/submit-view.js';
import '/imports/ui/pages/radar/radar-view.js';
import '/imports/ui/pages/admin/admin-view.js';

import '/imports/ui/layouts/main-layout.html';
import '/imports/ui/layouts/radar-layout.html';

import {Sections} from "/imports/api/constants.js";

import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "../node_modules/bootstrap/dist/js/bootstrap.bundle.min";

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
    const user = Meteor.users.findOne();
    if (!user) {
        Router.go('/');
        return;
    }

    if (user.agreesTerms) {
        Router.go('/submit');
    } else {
        this.render('confirm');
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
    const user = Meteor.users.findOne();
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

Template.registerHelper('getConferenceLogo', function() {
    return Meteor.settings.public.conferenceLogo;
});
Template.registerHelper('getConferenceName', function() {
    return Meteor.settings.public.conferenceName;
});
Template.registerHelper('sections', function() {
    return Sections;
});
Template.registerHelper('getTitle', function() {
    return Session.get('title');
});
Template.registerHelper('isAdmin', function() {
    const user = Meteor.users.findOne();
    return user && user.admin;
});
