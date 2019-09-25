import {ReactiveVar} from "meteor/reactive-var";
import {Keywords} from "../../../api/keywords";
import _ from "underscore";

import './keywordSearch.html';
import './keywordSearch.css';

Template.keywordSearch.onCreated(function () {
    this.keywordInput = this.data.keywordInput;
    this.typeaheadWidth = new ReactiveVar(200);
    this.autocomplete = new ReactiveVar({
        matches: [],
        dirty: false,
        show: false
    });
});

Template.keywordSearch.helpers({
    hasInputLabel() {
        const data = Template.instance().data;
        return data && data.label;
    },
    inputLabel() {
        return Template.instance().data.label;
    },
    inputPlaceholder() {
        const data = Template.instance().data;
        return data && data.placeholder ? data.placeholder : '';
    },
    typeaheadWidth: () => {
        return Template.instance().typeaheadWidth.get();
    },
    noResults: () => {
        const autocomplete = Template.instance().autocomplete.get();
        return !autocomplete.matches.length && autocomplete.dirty;
    },
    matches: () => {
        return Template.instance().autocomplete.get().matches;
    },
    showAutoComplete: () => {
        return Template.instance().autocomplete.get().show;
    },
    hideNoResults: () => {
        const data = Template.instance().data;
        return data && data.hideNoResults;
    },
    inputId() {
        return Template.instance().data.id;
    },
    matchColorClass(enabled) {
        return enabled ? 'text-success' : 'text-danger';
    }
});

Template.keywordSearch.events({
    'keyup input[name="keywordInput"]': _.debounce((event, template) => {
        const $keywordInput = template.$('input[name="keywordInput"]');
        const autocomplete = template.autocomplete.get();
        const value = event.target.value.toLowerCase();

        $keywordInput.removeClass('error');
        template.typeaheadWidth.set(event.target.getBoundingClientRect().width);

        const query = {name: {$regex: value, $options: 'i'}};
        if (!template.data.showDisabled) {
            query.enabled = true;
        }

        autocomplete.matches = Keywords
            .find(query)
            .fetch()
            .sort((kw1, kw2) => autocompleteComparator(kw1.name.toLowerCase(), kw2.name.toLowerCase(), value))
            .slice(0, 11);

        autocomplete.show = !!value;
        autocomplete.dirty = !!value;
        template.autocomplete.set(autocomplete);
    }, 100),

    'focus input[name="keywordInput"]'(event, template) {
        const autocomplete = template.autocomplete.get();

        if (autocomplete.dirty) {
            autocomplete.show = true;
            template.autocomplete.set(autocomplete);
        }
    },

    'mousedown .typeahead-result'(event) {
        // prevent the typeahead from closing from focusout when clicking on a result
        event.preventDefault();
    },

    'click .typeahead-result'(event, template) {
        event.preventDefault();
        clearAutocomplete(template);

        const data = $(event.currentTarget).data();
        const $keywordInput = template.$('input[name="keywordInput"]');

        $keywordInput.val(data.name);
        $keywordInput.data('id', data.id);
    },

    'click .typeahead-no-matches'(event, template) {
        event.preventDefault();
        clearAutocomplete(template);
        template.$('input[name="keywordInput"]').removeClass('error');
    },

    'focusout input[name="keywordInput"]'(event, template) {
        const autocomplete = template.autocomplete.get();
        autocomplete.show = false;
        template.autocomplete.set(autocomplete);
    },
});

function autocompleteComparator(name1, name2, value) {
    if (name1 === value) {
        return -1;
    } else if (name2 === value) {
        return 1;
    }

    if (similarity(name1, value) > similarity(name2, value)) {
        return -1;
    } else {
        return 1
    }
}

function clearAutocomplete(template) {
    const autocomplete = template.autocomplete.get();
    autocomplete.matches = [];
    autocomplete.dirty = false;
    template.autocomplete.set(autocomplete);
}

function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = [];
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue),
                            costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}
