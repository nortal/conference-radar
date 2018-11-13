import { Template } from 'meteor/templating';
import { Users } from '../../imports/api/keywords.js';

Template.login.events({
    'click #loginButton': function (event, template) {

        event.preventDefault();
        var uname = template.$("#usernameInput").val();
        var pword = template.$("#passwordInput").val();
        var foundUsers = Users.find({ username: uname, password: pword }).fetch();
        

        if (foundUsers.length > 0) {
            Session.set("isLoggedIn", true);
            Router.go('/submit');
        }

    },
});