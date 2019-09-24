export const Sections = [
    {name: "Languages & Frameworks", id: "frameworks"},
    {name: "Platforms", id: "platforms"},
    {name: "Techniques", id: "techniques"},
    {name: "Tools", id: "tools"}
];
export const Stages = [
    {name: "Adopt", id: "adopt", value: 2},
    {name: "Trial", id: "trial", value: 1},
    {name: "Assess", id: "assess", value: -1},
    {name: "Avoid", id: "avoid", value: -2}
];
export const UserValidation = {
    email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    name: /^[^0-9]{3,}$/,
    suggestionMaxLen: 64
};
