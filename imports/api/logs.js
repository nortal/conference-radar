import { Mongo } from 'meteor/mongo';

export const Logs = new Mongo.Collection('logs');

export function appendLog(action) {
  Logs.insert({
    time: Date.now(),
    user: Meteor.userId(),
    action: action
  });
}
