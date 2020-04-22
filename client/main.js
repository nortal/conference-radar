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
import {Meteor} from "meteor/meteor";

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
    if (Meteor.user()) {
        Router.go('/confirm');
        return;
    }
    this.render('login');
});

Router.route('/confirm', function () {
    const user = Meteor.user();
    if (!user) {
        Router.go('/login');
        return;
    }

    if (user && user.agreesTerms) {
        Router.go('/submit');
        return;
    }

    this.render('confirm');
});

Router.route('/submit', function () {
    if (!Meteor.user()) {
        Router.go('/login');
        return;
    }

    this.render('submit');
});

Router.route('/radar', function () {
    this.layout('radarLayout');
    this.render('radar');
});

Router.route('/admin', function () {
    const user = Meteor.user();
    if (!user || !user.admin) {
        Router.go('/login');
        return;
    }

    this.render('admin');
});

Template.registerHelper('getConferenceLogo', function() {
    return Meteor.settings.public.conferenceLogo;
});
Template.registerHelper('getConferenceName', function() {
    return Meteor.settings.public.conferenceName;
});
Template.registerHelper('getConferenceFinished', function() {
    return Meteor.settings.public.conferenceFinished;
});
Template.registerHelper('getConferenceYear', function() {
    return Meteor.settings.public.conferenceYear;
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
Template.registerHelper('getUser', function() {
    return Meteor.users.findOne();
});
