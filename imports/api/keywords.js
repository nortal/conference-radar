import { Mongo } from 'meteor/mongo';

export const Keywords = new Mongo.Collection('keywords');
export const Guests = new Mongo.Collection('guests');
export const Users = new Mongo.Collection('users');