import {Meteor} from "meteor/meteor";

import {Keywords} from "../keywords.js";
import {Logs} from "../logs";

Meteor.publish('user', function () {
    if (!this.userId) {
        return this.ready();
    }
    return Meteor.users.find({_id: this.userId}, {
        fields: {services: 0}
    });
});

Meteor.publish('keywords', function () {
    return Keywords.find({}, {
        fields: {votes: 0}
    });
});

Meteor.publish('logs', function () {
    const user = Meteor.user();
    if (!user || !user.admin) {
        return this.ready();
    }
    return Logs.find({}, {limit: 256});
});
