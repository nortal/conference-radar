import { Template } from 'meteor/templating';


Template.login.events({
    'click #loginButton': function (event, template) {

        event.preventDefault();
        var uname = template.$("#usernameInput").val();
        var pword = template.$("#passwordInput").val();

        if (uname === "test" && pword === "test") {
            Session.set("isLoggedIn", true);
            Router.go('/submit');
        }

    },
});