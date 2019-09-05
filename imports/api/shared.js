export const GetQueryParam = function (key) {
    return Router.current().params.query[key];
};
