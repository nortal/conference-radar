import './main.html';
import '../imports/ui/login-view.html';
import '../imports/ui/confirm-view.html';
import '../imports/ui/submit-view.html';
import '../imports/ui/radar-view.html';

import './views/confirm-view';
import './views/login-view.js';
import './views/submit-view.js';
import './views/radar-view.js';

import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "../node_modules/bootstrap/dist/js/bootstrap.bundle.min";

import {DevelopFunctions} from '../imports/api/develop.js';

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
    if (Session.get('signUpDetails')) {
        this.render('confirm');
    } else {
        Router.go("/");
    }
});

Router.route('/submit', function () {
    if (Session.get('user')) {
        this.render('submit');
    } else {
        Router.go('/');
    }
});

Router.route('/radar', function () {
    this.layout('radarLayout');
    this.render('radar');
});

Router.route('/radar/:mode', function () {
    this.layout('radarLayout');

    this.render('radar', {
        data: function () {
            return this.params.mode;
        }
    });
});

Template.registerHelper('isDevMode', DevelopFunctions.isDevMode);
