import {Template} from 'meteor/templating';
import {Meteor} from "meteor/meteor";

import './../../components/keywordSearch/keywordSearch.js'
import './admin-view.css';

import {Keywords} from "/imports/api/keywords.js";
import {UserInputVerification} from "/imports/api/shared.js";
import {FindMatchingKeywords} from "../../../api/shared";
import {Logs} from "../../../api/logs";

Template.admin.helpers({
    'getEnabledKeywords'() {
        return Keywords.find({enabled: true}).fetch();
    },
    'getDisabledKeywords'() {
        return Keywords.find({enabled: false}).fetch();
    },
    'isDevMode'() {
        return Meteor.settings.public.environment === "development";
    }
});

Template.adminKeywordList.helpers({
    'keywordColorClass'(enabled) {
        return enabled ? 'text-success' : 'text-danger';
    }
});

Template.adminLogs.helpers({
    'getLogs'() {
        return Logs.find({}).fetch();
    },
    formatLog(log) {
        const now = new Date(log.time);
        const timestamp = ('0' + now.getHours()).slice(-2)
          + ':' + ('0' + now.getMinutes()).slice(-2)
          + ':' + ('0' + now.getSeconds()).slice(-2);
        const time = '[' + timestamp + ']';
        return `<span class="admin-log-time">${time} </span>
                <span class="admin-log-user">${log.user}</span>
                <span> executed action: </span>
                <span class="admin-log-action">${log.action}</span>`;

    }
});

Template.adminLogs.onRendered(function () {
    const $container =  $('.admin-log-container');
    $container.scrollTop($container[0].scrollHeight);

    Logs.find().observeChanges({
        added: function (id, data) {
            $container.scrollTop($container[0].scrollHeight);
        }
    });
});

Template.adminKeywordList.events({
    'click button[data-action="enable"], click button[data-action="disable"]'(event) {
        const target = $(event.target);
        const action = target.data('action');
        const id = target.data('id');
        Meteor.call('updateKeywordAdmin', id, action);
    },
    'click button[data-action="edit"]'(event) {
        const modal = $('#editModal');
        const id = $(event.target).data('id');
        const keyword = Keywords.findOne({_id: id});

        modal.data('id', id);
        $('#keywordInput', modal).val(keyword.name);
        $('#editKeywordSection', modal).val(keyword.section);
        $('#editAlert', modal).hide();
        modal.modal('show');
    }
});

Template.adminAddKeyword.events({
    'click #addKeywordButton'(event, template) {
        const name = $('#addKeywordName');
        const section = $('#addKeywordSection');
        const alert = template.$('#addAlert');

        const sectionResult = UserInputVerification.verifySection(section.val());
        if (!sectionResult.ok) {
            alert.html(TAPi18n.__(sectionResult.message))
                .show();
            return;
        }

        const suggestionResult = UserInputVerification.verifySuggestion(name.val());
        if (!suggestionResult.ok) {
            alert.html(TAPi18n.__(suggestionResult.message))
                .show();
            return;
        }

        const allKeywords = Keywords.find().fetch();
        for (let i = 0; i < allKeywords.length; i++) {
            if (allKeywords[i].name.toLowerCase() === name.val().toLowerCase() && allKeywords[i].section === section.val()) {
                alert.html(TAPi18n.__('submit.already_exists'))
                    .show();
                return;
            }
        }

        Meteor.call('addKeywordAdmin', name.val(), section.val(), (error, response) => {
            if (error) {
                alert.html(TAPi18n.__('admin.exception'))
                    .show();
                return;
            }

            alert.html(TAPi18n.__('admin.keyword_added'))
                .show();
        });
        alert.hide();
        name.val('');
    }
});


Template.adminEditKeyword.events({
    'click button[data-action="delete"]'(event, template) {
        const modal = template.$('#editModal');
        const id = modal.data('id');
        Meteor.call('removeKeywordAdmin', id);
        modal.modal('hide');
    },
    'click button[data-action="save"]'(event, template) {
        const modal = template.$('#editModal');
        const id = template.$('#editModal', modal).data('id');
        const name = template.$('#keywordInput', modal).val();
        const section = template.$('#editKeywordSection', modal).val();

        const sectionResult = UserInputVerification.verifySection(section);
        if (!sectionResult.ok) {
            $('#editAlert')
                .html(TAPi18n.__(sectionResult.message))
                .show();
            return;
        }

        const suggestionResult = UserInputVerification.verifySuggestion(name);
        if (!suggestionResult.ok) {
            $('#editAlert')
                .html(TAPi18n.__(suggestionResult.message))
                .show();
            return;
        }

        const results = FindMatchingKeywords(id, name, section);
        if (results.length) {
            $('#editAlert')
                .html(TAPi18n.__('submit.already_exists'))
                .show();
            return;
        }

        Meteor.call('saveKeywordAdmin', id, name, section);
        modal.modal('hide');
    },
    'click #moveVoteButton'(event, template) {
        const modal = template.$('#editModal');
        const fromId = template.$('#editModal', modal).data('id');
        const toId = template.$('#editMoveVote').data('id');
        const alert = $('#editAlert');

        Meteor.call('moveVotesAdmin', fromId, toId, (error, response) => {
            if (error) {
                alert.html(TAPi18n.__("admin.exception")).show();
                return;
            }

            alert.html(TAPi18n.__("admin.votes_moved")).show();
        });
    }
});

Template.adminEditKeyword.helpers({
    'keywords'() {
        return Keywords.find({}, {sort: {section: 1}}).fetch();
    }
});


Template.adminControl.events({
    'click #randomGenButton'() {
        Meteor.call('generateRandomDataDev');
    },
    'click #databaseClearButton'() {
        Meteor.call('clearDatabaseDev');
    },
    'click #votesClearButton'() {
        Meteor.call('clearVotesDev');
    },
    'click #usersClearButton'() {
        Meteor.call('clearUsersDev');
    }
});
