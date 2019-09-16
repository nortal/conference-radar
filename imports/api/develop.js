export const DevelopFunctions = {
    isDevMode: () => {
        return Meteor.settings.public.environment === "development"
    }
};
