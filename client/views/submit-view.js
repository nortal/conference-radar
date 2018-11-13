import { Template } from 'meteor/templating';
import { Keywords } from '../../imports/api/keywords.js';
import { Guests } from '../../imports/api/keywords.js';

Template.submit.events({
    'click #submitButton'(event, template) {
        // Prevent default browser form submit
        event.preventDefault();


        var newKeyword = template.$("#keywordText").val();
        var chosenStage = template.$("#stageDropdown").val();
        var chosenSection = template.$("#sectionDropdown").val();
        var keyword = Keywords.find({ keyword: newKeyword, stage: chosenStage, section: chosenSection }).fetch();

        if (chosenStage !== null && chosenSection !== null) {
            if (keyword.length > 0) {
                var voteString = 'votes';
                var action = {};
                action[voteString] = 1;

                Keywords.update(
                    { _id: keyword[0]._id },
                    { $inc: action });
            } else {
                var newKeyword = {
                    keyword: newKeyword,
                    stage: chosenStage,
                    section: chosenSection,
                    votes: 1,
                };

                Keywords.insert(newKeyword);
            }

            // Clear form
            template.$('#keywordText').val("");
            template.$("#stageDropdown").val("0");
            template.$("#sectionDropdown").val("0");
        }


        var submitName = template.$('#nameText').val();
        var submitEmail = template.$('#emailText').val();
        var recruitmentChecked = template.$('#recruitmentCheck').is(':checked');
        var participateChecked = template.$('#participateCheck').is(':checked');

        if (submitEmail) {
            var newGuest = {
                name: submitName,
                email: submitEmail,
                wantsRecruitment: recruitmentChecked,
                wantsParticipation: participateChecked,
            };

            Guests.insert(newGuest);

            template.$('#nameText').val("");
            template.$('#emailText').val("");
            template.$('#recruitmentCheck').prop('checked', false);
            template.$('#participateCheck').prop('checked', false);
        }

    },
});