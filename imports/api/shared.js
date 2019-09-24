import {Keywords} from '../../imports/api/keywords.js';
import {Sections, Stages} from '../../imports/api/constants.js';
import {UserValidation} from "../../imports/api/constants";

export class Result {
    constructor(ok, message) {
        this.ok = ok;
        this.message = message;
    }
}

export const GetQueryParam = function (key) {
    return Router.current().params.query[key];
};

export const UserInputVerification = {
    verifyStage(stage) {
        if (!stage) {
            return new Result(false, 'submit.enter_stage');
        }

        stage = stage.trim().toLowerCase();
        if (Stages.some(s => s.id === stage)) {
            return new Result(true);
        }
        return new Result(false, 'submit.enter_valid_stage');
    },
    verifySection(section) {
        if (!section) {
            return new Result(false, 'submit.enter_section');
        }

        section = section.trim().toLowerCase();
        if (Sections.some(s => s.id === section)) {
            return new Result(true);
        }
        return new Result(false, 'submit.enter_valid_section');
    },
    verifyKeyword(section, keyword) {
        const sectionResult = this.verifySection(section);
        if (!sectionResult.ok) {
            return sectionResult;
        }

        if (!keyword) {
            return new Result(false, 'submit.enter_keyword');
        } else if (!Keywords.find({name: keyword.trim(), section: section}).count()) {
            return new Result(false, 'submit.enter_valid_keyword');
        }
        return new Result(true);
    },
    verifySuggestion(keyword) {
        if (!keyword) {
            return new Result(false, 'submit.enter_suggestion');
        }

        keyword = keyword.trim();
        if (!keyword) {
            return new Result(false, 'submit.enter_valid_suggestion');
        } else if (keyword.length > UserValidation.suggestionMaxLen) {
            return new Result(false, 'submit.enter_long_suggestion');
        }
        return new Result(true);
    },
    verifyEmail(email) {
        if (!email) {
            return new Result(false, 'confirm.email_missing');
        } else if (!UserValidation.email.test(email.toLowerCase())) {
            return new Result(false, 'confirm.email_invalid');
        }
        return new Result(true);
    },
    verifyName(name) {
        if (!name) {
            return new Result(false, 'confirm.name_missing');
        } else if (!UserValidation.name.test(name.toLowerCase())) {
            return new Result(false, 'confirm.name_invalid');
        }
        return new Result(true);
    },
    verifyKeywordExists(keyword, section) {
        return new Result(Keywords.find().fetch().some((kw) => {
            return kw.name.toLowerCase() === keyword.toLowerCase() && kw.section === section;
        }));
    }
};
