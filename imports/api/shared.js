import {Keywords,Users} from '../../imports/api/keywords.js';
import {Stages,Sections} from '../../imports/api/constants.js';

export const GetQueryParam = function (key) {
    return Router.current().params.query[key];
};

export const UserInputVerification = {
    verifyStage(stage) {
        if (!stage) {
            return false;
        }

        stage = stage.trim().toLowerCase();
        return Stages.some(s => s.id === stage);
    },
    verifySection(section) {
        if (!section) {
            return false;
        }

        section = section.trim().toLowerCase();
        return Sections.some(s => s.id === section);
    },
    verifyKeyword(section, keyword) {
        if (!this.verifySection(section)) {
            return false;
        }

        if (!keyword) {
            return false;
        }

        keyword = keyword.trim();
        const keywords = Keywords.find({ name: keyword, section: section }).fetch();
        return keywords.length;
    },
};
