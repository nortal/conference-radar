import {Template} from 'meteor/templating';
import {Users} from '../../imports/api/keywords.js';

Template.confirm.events({
    'click #nextButton': function (event, template) {
        
        event.preventDefault();

        var submitEmail = Session.get('email') || template.$("#emailText").val();
        var submitName = Session.get('name') || template.$("#nameText").val();
        var recruitmentChecked = template.$('#recruitmentCheck').is(':checked');
        var participateChecked = template.$('#participateCheck').is(':checked');

        //todo: valid email + name check
        if (submitEmail) {
            var userPayload = {
                name: submitName,
                email: submitEmail,
                wantsRecruitment: recruitmentChecked,
                wantsParticipation: participateChecked,
            };

            Users.insert(userPayload);
            Router.go('/submit');
        } else {
            //todo: invalid input warning
            console.log('invalid input')
        }
    }

});

Template.confirm.helpers({
    isDisabled: function (key) {
        return !Session.get(key) ? '' : 'disabled';
    },
    getSessionVal: function (key) {
        return Session.get(key);
    }
});

