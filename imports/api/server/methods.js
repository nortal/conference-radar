import {Meteor} from "meteor/meteor";

import {UserInputVerification} from "../shared.js";
import {Keywords} from "../keywords.js";
import "./methods-admin.js";
import "./methods-develop.js"

Meteor.methods({
    updateUser(name, email, wantsRecruitment, wantsParticipation, agreesTerms) {
        const nameResult = UserInputVerification.verifyName(name);
        const emailResult = UserInputVerification.verifyEmail(email);
        if (!nameResult.ok || !emailResult.ok) {
            return;
        }

        Meteor.users.update(
            {_id: this.userId},
            {
                $set: {
                    name: name,
                    email: email,
                    wantsRecruitment: wantsRecruitment,
                    wantsParticipation: wantsParticipation,
                    agreesTerms: agreesTerms,
                    conference: Meteor.settings.public.conferenceName
                }
            }
        )
    },
    getSubmittedKeywords() {
        return Keywords.find({votes: {$elemMatch: {userId: this.userId}}}).fetch();
    },
    removeVote(id, stage) {
        Keywords.update(
            {_id: id},
            {$pull: {votes: {userId: this.userId, stage: stage}}});
    },
    addVote(id, stage) {
        const stageResult = UserInputVerification.verifyStage(stage);
        if (!stageResult.ok) {
            return;
        }

        Keywords.update(
            {_id: id},
            {
                $addToSet: {
                    votes: {
                        userId: this.userId,
                        stage: stage,
                        time: Date.now(),
                        conference: Meteor.settings.public.conferenceName
                    }
                }
            }
        );
    },
    addSuggestion(name, section, stage) {
        const suggestionResult = UserInputVerification.verifySuggestion(name);
        if (!suggestionResult.ok) {
            return;
        }

        const sectionResult = UserInputVerification.verifySection(section);
        if (!sectionResult.ok) {
            return;
        }

        const stageResult = UserInputVerification.verifyStage(stage);
        if (!stageResult.ok) {
            return;
        }

        Keywords.insert({
            name: name,
            section: section,
            enabled: false,
            votes: [{
                userId: this.userId,
                stage: stage,
                time: Date.now(),
                conference: Meteor.settings.public.conferenceName
            }]
        });
    }
});
