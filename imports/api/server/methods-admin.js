import {Meteor} from "meteor/meteor";

import {Keywords} from "../keywords.js";

Meteor.methods({
    removeKeywordAdmin(id) {
        if (isAdmin(this.userId)) {
            Keywords.remove({_id: id});
        }
    },
    updateKeywordAdmin(id, action) {
        if (isAdmin(this.userId)) {
            Keywords.update({_id: id}, {$set: {enabled: action === 'enable'}});
        }
    },
    addKeywordAdmin(name, section) {
        if (isAdmin(this.userId)) {
            Keywords.insert({
                name: name,
                section: section,
                enabled: false,
                votes: []
            });
        }
    },
    saveKeywordAdmin(id, name, section) {
        if (isAdmin(this.userId)) {
            Keywords.update({_id: id}, {
                $set: {
                    name: name,
                    section: section
                }
            })
        }
    },
    moveVotesAdmin(fromId, toId) {
        if (isAdmin(this.userId)) {
            const toVotes = Keywords.findOne({_id: toId}).votes;

            Keywords.findOne({_id: fromId}).votes
                .filter((fromVote) => !toVotes.some(toVote => toVote.userId === fromVote.userId))
                .forEach((fromVote) => toVotes.push(fromVote));

            Keywords.update({_id: toId}, {
                $set: {
                    votes: toVotes
                }
            });

            Keywords.update({_id: fromId}, {
                $set: {
                    votes: []
                }
            })
        }
    }
});

function isAdmin(userId) {
    if (!userId) {
        return false;
    }
    const user = Meteor.users.findOne({_id: userId});
    return user && user.admin;
}
