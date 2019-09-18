import {Keywords} from '../../imports/api/keywords.js';
import {Stages,Sections} from '../../imports/api/constants.js';

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
        } else {
            return new Result(false, 'submit.enter_valid_stage');
        }
    },
    verifySection(section) {
        if (!section) {
            return new Result(false, 'submit.enter_section');
        }

        section = section.trim().toLowerCase();
        if (Sections.some(s => s.id === section)) {
            return new Result(true);
        } else {
            return new Result(false, 'submit.enter_valid_section');
        }
    },
    verifyKeyword(section, keyword) {
        const sectionResult = this.verifySection(section);
        if (!sectionResult.ok) {
            return sectionResult;
        }

        if (!keyword) {
            return new Result(false, 'submit.enter_keyword');
        }

        keyword = keyword.trim();
        const keywords = Keywords.find({ name: keyword, section: section }).fetch();
        if (keywords.length) {
            return new Result(true);
        } else {
            return new Result(false, 'submit.enter_valid_keyword');
        }
    },
    verifySuggestion(keyword) {
        if (!keyword) {
            return new Result(false, 'submit.enter_suggestion');
        }

        keyword = keyword.trim();
        if (!keyword) {
            return new Result(false, 'submit.enter_valid_suggestion');
        } else if (keyword.length > 32) {
            return new Result(false, 'submit.enter_long_suggestion');
        } else {
            return new Result(true);
        }
    },
};
