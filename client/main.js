import './main.html';
import '/imports/ui/login/login-view.html';
import '/imports/ui/confirm/confirm-view.html';
import '/imports/ui/submit/submit-view.html';
import '/imports/ui/radar/radar-view.html';
import '/imports/ui/admin/admin-view.html';

import '/imports/ui/login/login-view.js';
import '/imports/ui/confirm/confirm-view.js';
import '/imports/ui/submit/submit-view.js';
import '/imports/ui/radar/radar-view.js';
import '/imports/ui/admin/admin-view.js';
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

Template.mainLayout.helpers({
    'isAdmin': function () {
        const user = Meteor.users.findOne();
        return user && user.admin;
    },
    'getTitle': function () {
        return Session.get('title');
    }
});

Template.registerHelper('getConferenceLogo', function() {
    return Meteor.settings.public.conferenceLogo;
});
Template.registerHelper('sections', function() {
    return Sections;
});
