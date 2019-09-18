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
            return new Result(false, 'Please select a stage');
        }

        stage = stage.trim().toLowerCase();
        if (Stages.some(s => s.id === stage)) {
            return new Result(true);
        } else {
            return new Result(false, 'Please select a valid stage');
        }
    },
    verifySection(section) {
        if (!section) {
            return new Result(false, 'Please enter a section');
        }

        section = section.trim().toLowerCase();
        if (Sections.some(s => s.id === section)) {
            return new Result(true);
        } else {
            return new Result(false, 'Please select a valid section');
        }
    },
    verifyKeyword(section, keyword) {
        const sectionResult = this.verifySection(section);
        if (!sectionResult.ok) {
            return sectionResult;
        }

        if (!keyword) {
            return new Result(false, 'Please enter a keyword');
        }

        keyword = keyword.trim();
        const keywords = Keywords.find({ name: keyword, section: section }).fetch();
        if (keywords.length) {
            return new Result(true);
        } else {
            return new Result(false, 'Please select a valid keyword');
        }
    },
    verifySuggestion(keyword) {
        if (!keyword) {
            return new Result(false, 'Please enter a suggestion');
        }

        keyword = keyword.trim();
        if (!keyword) {
            return new Result(false, 'Please select a valid suggestion');
        } else if (keyword.length > 32) {
            return new Result(false, 'Please enter 32 characters at maximum');
        } else {
            return new Result(true);
        }
    },
};
