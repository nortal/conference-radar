import { Template } from 'meteor/templating';
import { Keywords } from '../imports/api/keywords.js';

import './main.html';
import '../imports/ui/login-view.html';
import '../imports/ui/submit-view.html';
import '../imports/ui/radar-view.html';

import './views/login-view.js';
import './views/submit-view.js';
import './views/radar-view.js';

Router.route('/', function () {
    this.render('login');
});

Router.route('/submit', function () {
    if (Session.get("isLoggedIn")) {
        this.render('submit');
    } else {
        Router.go("/");
    }
});

Router.route('/radar', function () {
    this.render('radar');
});