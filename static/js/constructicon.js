// with this we make js less forgiving so that we catch
// more hidden errors during development
'use strict';


function build_search_index(record_numbers, records, keys) {
    var search_index = new JsSearch.Search('record');
    for (var key of keys) {
        search_index.addIndex(key);
    }
    for (var record_number of record_numbers) {
        search_index.addDocuments([records[record_number]]);
    }
    return search_index;
}


function collect_options(record_numbers, records, key, is_list) {
    var s = new Set();
    for (var record_number of record_numbers) {
        if (is_list) {
            for (var element of records[record_number][key]) {
                if (element != null) {
                    s.add(element);
                }
            }
        } else {
            var element = records[record_number][key];
            if (element != null) {
                s.add(element);
            }
        }
    }

    var tree = [];
    for (var element of Array.from(s)) {
        tree.push({
            id: element,
            label: element
        });
    }

    return tree;
}


function object_is_empty(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}


// translates array to list of items
function _helper(array) {
    var tree = [];

    for (var prop in array) {
        if (Object.prototype.hasOwnProperty.call(array, prop)) {
            if (object_is_empty(prop)) {
                tree.push({
                    id: prop,
                    label: prop,
                });
            } else {
                tree.push({
                    id: prop,
                    label: prop,
                    children: _helper(array[prop]),
                });
            }
        }
    }

    return tree;
}


function collect_options_tree(record_numbers, records, key) {
    // first we build up a simpler array tree from all entries
    var tree_array = {};
    for (var record_number of record_numbers) {
        if (records[record_number][key] != null) {
            for (var element_0 of records[record_number][key]) {
                let type_0 = element_0["type"];
                if (!(type_0 in tree_array)) {
                    tree_array[type_0] = {};
                }
                if ("subtypes" in element_0) {
                    for (var element_1 of element_0["subtypes"]) {
                        let type_1 = element_1["type"];
                        if (!(type_1 in tree_array[type_0])) {
                            tree_array[type_0][type_1] = {};
                        }
                        if ("subtypes" in element_1) {
                            for (var element_2 of element_1["subtypes"]) {
                                let type_2 = element_2["type"];
                                if (!(type_2 in tree_array[type_0][type_1])) {
                                    tree_array[type_0][type_1][type_2] = {};
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // in the second step we translate this to a structure required by https://vue-treeselect.js.org/
    var tree = _helper(tree_array);

    return tree;
}


async function fetch_data(data, url_prefix) {
    console.log("fetching data");
    // let r = await axios.get(url_prefix + 'data-combined-debug.yml');
    let r = await axios.get(url_prefix + 'data-combined.yml');
    var json_data = jsyaml.load(r.data);

    var records = {};
    var record_numbers = [];
    var levels = new Set();

    for (var key of Object.keys(json_data)) {
        records[key] = json_data[key];
        records[key].record = key;
        record_numbers.push(key);
        levels.add(json_data[key].cefr_level);
    }

    data.records = records;
    data.record_numbers = record_numbers;

    data.levels = Array.from(levels);
    data.levels.sort();

    data.semantic_roles_options = collect_options(data.record_numbers, data.records, 'semantic_roles', true);
    data.morphology_options = collect_options(data.record_numbers, data.records, 'morphology', true);
    data.syntactic_type_of_construction_options = collect_options(data.record_numbers, data.records, 'syntactic_type_of_construction', true);
    data.syntactic_function_of_anchor_options = collect_options(data.record_numbers, data.records, 'syntactic_function_of_anchor', true);
    data.syntactic_structure_of_anchor_options = collect_options(data.record_numbers, data.records, 'syntactic_structure_of_anchor', true);
    data.part_of_speech_of_anchor_options = collect_options(data.record_numbers, data.records, 'part_of_speech_of_anchor', true);
    data.level_options = collect_options(data.record_numbers, data.records, 'cefr_level', false);

    data.semantic_types_options = collect_options_tree(data.record_numbers, data.records, 'semantic_types');

    var keys = [
        'semantic_roles',
        'morphology',
        'syntactic_type_of_construction',
        'syntactic_function_of_anchor',
        'syntactic_structure_of_anchor',
        'part_of_speech_of_anchor',
        'cefr_level',
        'semantic_types',
    ];
    data.search_index_advanced = build_search_index(data.record_numbers, data.records, keys);

    data.search_index_simple = build_search_index(data.record_numbers, data.records, ['name', 'illustration']);

    data.all_data_loaded = true;
    data.show_data_spinner = false;
}


// based on https://stackoverflow.com/a/19270021 (CC-BY-SA 3.0)
function random_selection(arr, n_max) {
    var len = arr.length;
    var n = Math.min(n_max, len);
    var result = new Array(n);
    var taken = new Array(len);
    while (n--) {
        var x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}


Vue.component('treeselect', VueTreeselect.Treeselect);


var app = new Vue({
    el: '#app',
    delimiters: ['{[', ']}'],
    data: {
        search_index_advanced: null,
        search_index_simple: null,
        show_additional_information: false,
        show_data_spinner: true,
        all_data_loaded: false,
        current_record_number: null,
        record_numbers: [],
        record_numbers_matching_search: [],
        records: {},
        daily_dose_level: 'A1',
        search_string: '',
        levels: [],
        semantic_roles_options: [],
        semantic_roles_selected: null,
        morphology_options: [],
        morphology_selected: null,
        syntactic_type_of_construction_options: [],
        syntactic_type_of_construction_selected: null,
        syntactic_function_of_anchor_options: [],
        syntactic_function_of_anchor_selected: null,
        syntactic_structure_of_anchor_options: [],
        syntactic_structure_of_anchor_selected: null,
        part_of_speech_of_anchor_options: [],
        part_of_speech_of_anchor_selected: null,
        level_options: [],
        level_selected: null,
        semantic_types_options: [],
        semantic_types_selected: null,
    },
    created: function () {
        this.show_data_spinner = true;
        fetch_data(this, 'https://raw.githubusercontent.com/constructicon/russian-data/generated/');

        // https://lodash.com/docs#debounce
        this.search_debounced = _.debounce(this.search, 500);
        this.advanced_search_debounced = _.debounce(this.advanced_search, 500);
    },
    watch: {
        all_data_loaded: function (new_, old_) {
            // to make sure that when we load the page first time, we see all results
            this.search();
        },
        search_string: function (new_, old_) {
            this.search_debounced();
        },
        semantic_roles_selected: function (new_, old_) {
            this.advanced_search_debounced();
        },
        morphology_selected: function (new_, old_) {
            this.advanced_search_debounced();
        },
        syntactic_type_of_construction_selected: function (new_, old_) {
            this.advanced_search_debounced();
        },
        syntactic_function_of_anchor_selected: function (new_, old_) {
            this.advanced_search_debounced();
        },
        syntactic_structure_of_anchor_selected: function (new_, old_) {
            this.advanced_search_debounced();
        },
        part_of_speech_of_anchor_selected: function (new_, old_) {
            this.advanced_search_debounced();
        },
        level_selected: function (new_, old_) {
            this.advanced_search_debounced();
        },
        semantic_types_selected: function (new_, old_) {
            this.advanced_search_debounced();
        },
    },
    methods: {
        // for x={'this': 'that'} returns 'this'
        key: function (x) {
            return Object.keys(x)[0];
        },
        // for x={'this': 'that'} returns 'that'
        value: function (x) {
            return x[Object.keys(x)[0]];
        },
        search: function () {
            var record_numbers_matching_search = [];
            if (this.search_string == '') {
                record_numbers_matching_search = this.record_numbers;
            } else {
                for (var result of this.search_index_simple.search(this.search_string)) {
                    record_numbers_matching_search.push(result.record);
                }
            }
            record_numbers_matching_search.sort((a, b) => a - b);
            this.record_numbers_matching_search = record_numbers_matching_search;
        },
        advanced_search: function () {
            var record_numbers_matching_search = [];
            var l = [];
            l = l.concat(this.semantic_roles_selected);
            l = l.concat(this.morphology_selected);
            l = l.concat(this.syntactic_type_of_construction_selected);
            l = l.concat(this.syntactic_type_of_anchor_selected);
            l = l.concat(this.syntactic_structure_of_anchor_selected);
            l = l.concat(this.part_of_speech_of_anchor_selected);
            l = l.concat(this.semantic_types_selected);
            l = l.concat(this.level_selected);

            var search_string = '"' + l.join('" "') + '"';
            for (var result of this.search_index_advanced.search(search_string)) {
                record_numbers_matching_search.push(result.record);
            }
            record_numbers_matching_search.sort((a, b) => a - b);
            this.record_numbers_matching_search = record_numbers_matching_search;
        },
        annotate: function (text) {
            // renders words that come right after [...] as subscript with color
            let matches = text.match(/(?<=\])[A-Za-z]+/g);
            for (var substring of matches) {
                text = text.replace(substring, '<sub><span style="color: #db2f6d">' + substring + '</span></sub>');
            }
            return text;
        },
        get_random_selection: function () {
            var records_with_this_level = [];
            for (var record_number of this.record_numbers) {
                if (this.records[record_number].cefr_level == this.daily_dose_level) {
                    records_with_this_level.push(record_number);
                }
            }
            var selected = random_selection(records_with_this_level, 5);
            selected.sort((a, b) => a - b);
            this.record_numbers_matching_search = selected;
        }
    }
})
