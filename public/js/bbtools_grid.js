(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var CrudGridRouter;
CrudGridRouter = Backbone.Router.extend({
    page: null,
    query: null,
    search_into: null,
    filters: null,
    order: null,
    order_direction: null,
    initialize: function (options) {
        Backbone.Router.prototype.initialize.apply(this, [options]);
        this.collection = options.collection;
        this.gridView = options.gridView;
        this.gridView.bind('sort', this.onSort, this);
        if (typeof options.searchView != 'undefined') {
            this.searchView = options.searchView;
        }
        if (typeof options.pageNavigator != 'undefined') {
            this.pageNavigator = options.pageNavigator;
        }
        if (typeof options.filters == 'object') {
            this.filters = options.filters;
        }
        if (typeof options.searchView != 'undefined') {
            this.searchView.bind('search', this.onSearch, this);
        }
        if (typeof options.pageNavigator != 'undefined') {
            this.pageNavigator.bind('go', this.onPage, this);
        }
        if (typeof options.filters == 'object') {
            this.filters.bind('sync', this.onFilter, this);
        }

        this.collection.on('request', this.onRequest, this);
        this.collection.on('error', this.onModelError, this);


    },
    routes: {
        ':mode/(:page)(/:second_a)(/:second_b)(/:third_a)(/:third_b)(/:fourth_a)(/:fourth_b)': 'goMode',
    },


    /**
     * sulle request blocco l'interfaccia
     *
     * @param model
     * @param xhr
     * @param options
     */
    onRequest: function (model, xhr, options) {
        xhr.success(function () {
            App.unblockUI();
        });
        App.blockUI();
    },

    /**
     * listener dell'evento model change:[attribute]
     * @param response
     */
    onModelError: function (model, response, options) {
        if (response.status == 422) {
            if (_.has(response.responseJSON.validation_messages, this.key)) {
                var messages = _.propertyOf(response.responseJSON.validation_messages)(this.key);
                this.trigger('editor.model.error', {'messages': messages});
            }
        }
        App.unblockUI();
        var message = "<h4>" + response.statusText + "</h4>";
        message = message + "<h5>" + response.responseText + "</h5>";
        var modal_options = {
            buttons: ['ok'],
            message: message
        };
        var modal = new BbTools.View.Modal.Responsive(modal_options);
        modal.show();

    },

    /**
     *
     * @param e
     */
    onSort: function (e) {
        this.order = e.order;
        this.order_direction = e.order_direction;
        var route = this.composeRoute();
        this.navigate(route, {replace: true});
        this.goFetch();
    },

    /**
     *
     * @param e
     */
    onSearch: function (e) {
        this.query = e.search;
        this.search_into = e.search_into;
        this.page = null;
        var route = this.composeRoute();
        this.navigate(route, {replace: true});
        this.goFetch();

    },

    /**
     * e.filter si aspetta un object con una o più chiavi valorizzate dove la chiave è il nome del filtro (alias campo
     * filtrato ) e il valore è il valore da applicare al filtro
     * @param e
     */
    onFilter: function (e) {
        var route = this.composeRoute();

        this.navigate(route, {replace: true});
        this.goFetch();

    },

    /**
     *
     * @param e
     */
    onPage: function (e) {
        this.page = e.page;
        var route = this.composeRoute();
        this.navigate(route, {replace: true});
        this.goFetch();
    },

    /**
     * analizza il mode e in funzione di come è composto carica i parametri adeguatamente
     * p    solo page
     *
     * @param mode
     * @param page
     * @param second_a
     * @param second_b
     * @param third_a
     * @param third_b
     * @param fourth_a
     * @param fourth_b
     */
    goMode: function (mode, page, second_a, second_b, third_a, third_b, fourth_a, fourth_b) {
        this.reset();
        var mode_split = mode.split('');

        var first = mode_split.shift();
        if (_.isNull(page)) page = 1;

        this.page = page;
        var parserMode = function (mode, a, b, that) {
            if (_.isNull(a) || _.isNull(b)) return;
            if (mode === 'o') {
                that.order = a;
                that.order_direction = b;
                that.gridView.defaultOrder(that.order, that.order_direction);
            } else if (mode === 's') {
                that.query = a;
                that.search_into = b;
                that.searchView.default(that.query);
            } else if (mode === 'f') {
                if (_.isString(a)) {
                    a = a.split(',')
                }
                if (_.isString(b)) {
                    b = b.split(',')
                }

                var values = _.object(a, b);
                _.each(values, function (element, index, list) {
                    that.filters.set(index, element);
                });
            }

        };

        var second = mode_split.shift();
        if (typeof second != 'undefined') {
            parserMode(second, second_a, second_b, this);
        }
        var third = mode_split.shift();
        if (typeof third != 'undefined') {
            parserMode(third, third_a, third_b, this);
        }
        var fourth = mode_split.shift();
        if (typeof fourth != 'undefined') {
            parserMode(fourth, fourth_a, fourth_b, this);
        }

        this.goFetch();
    },


    /**
     * esegue il fetch sulla collection componendo adeguatamente i paramentri
     * nel caso venga invocato con la ricerca o i filtri e una pagina superiore alla lungezza del
     * paginatore il server restituirà un codice 409
     * questo evento viene gestito dalla callback error che imposta la pagina a 1
     */
    goFetch: function () {

        var data = {};
        if (!_.isNull(this.page)) data.page = this.page;
        if (!_.isNull(this.query)) data.search = this.query;
        if (!_.isNull(this.query)) data.search_into = this.search_into;
        if (_.isString(data.search_into)) {
            data.search_into = data.search_into.split(',')
        }
        if (!_.isNull(this.order)) data.order = this.order;
        if (!_.isNull(this.order)) data.order_direction = this.order_direction;
        if (!_.isNull(this.filters)) data.filters_keys = _.keys(this.filters.attributes);

        // if (
        //     !_.isNull(data.filters_keys) && !_.isNull(data.filters_values)
        //     && !_.isUndefined(data.filters_keys) && !_.isUndefined(data.filters_values)
        // ) {
            if (_.isString(data.filters_keys)) {
                data.filters_keys = data.filters_keys.split(',')
            }
            if (!_.isNull(this.filters)) data.filters_values = _.values(this.filters.attributes);
            if (_.isString(data.filters_values)) {
                data.filters_values = data.filters_values.split(',')
            }
        // }
        var that = this;
        var options = {
            error: function (e) {
                data.page = that.page = 1;
                that.navigate(that.composeRoute());
                that.collection.goFetch({data: data});
            }
        };
        if (data != {}) {
            options.data = data;
        }
        this.collection.goFetch(options);


    },


    /**
     * reset di tutti i parametri
     */
    reset: function () {
        this.page = null;
        this.order = null;
        this.order_direction = null;
        this.query = null;
        this.search_into = null;
    },

    /**
     * compone la rotta per le azioni di navigate
     *
     * @returns {string}
     */
    composeRoute: function () {
        var route = '';
        var mode = 'p';
        if (_.isNull(this.page) || _.isUndefined(this.page)) this.page = 1;
        // if(!_.isNull(this.query)) this.page=1;
        route += this.page;
        if (!_.isNull(this.order) && !_.isUndefined(this.order)) {
            mode += 'o';
            route += '/' + this.order;
            route += '/' + this.order_direction;
        }
        if (!_.isNull(this.query) && !_.isUndefined(this.query)) {
            mode += 's';
            route += '/' + this.query;
            route += '/' + this.search_into;
        }
        if (!_.isNull(this.filters) && !_.isUndefined(this.filters)) {
            mode += 'f';
            route += '/' + _.keys(this.filters.attributes);
            route += '/' + _.values(this.filters.attributes);
        }

        return mode + '/' + route;
    }
});
module.exports = CrudGridRouter;
},{}],2:[function(require,module,exports){
'use strict';

var BodyCellCheckboxView = Backbone.View.extend({
    tagName: 'label',
    events: {
        "change input ": "change",
        "click ": "click"
    },
    template: _.template('<input type="checkbox" name="<%- name %>" value="<%- row_id %>"/> <span></span>'),
    initialize: function (options) {
        if (typeof options.value != 'undefined') {
            this.value = options.value;
        }
    },
    render: function () {
        this.$el.empty();
        if (typeof this.attributes == 'undefined') this.attributes = {};
        this.attributes = _.extend(this.attributes, {'data-model-id': this.model.id});
        this.$el.attr(this.attributes);
        this.$el.append(this.template({row_id: this.model.id, name: this.attributes.name}));
        this.delegateEvents();
        return this;
    },
    change: function (e) {
        this.trigger('cell.change', {
            id: e.currentTarget.value,
            name: e.currentTarget.name,
            checked: e.currentTarget.checked,
            model: this.model
        });


    },
    click: function (e) {
        e.stopPropagation();
    }
});
module.exports = BodyCellCheckboxView;
},{}],3:[function(require,module,exports){
'use strict';

var BodyCellComponentView = Backbone.View.extend({
    tagName: 'td',
    events: {
        "click ": "clickCell"
    },

    initialize: function (options) {
        if (typeof options.value != 'undefined') {
            this.value = options.value;
            this.value.bind('selected', function (e) {
                this.trigger('selected', e)
            }, this);
            this.value.bind('cell.change', function (e) {
                this.trigger('cell.change', e)
            }, this);
        }

    },
    render: function () {
        this.$el.empty();
        if (typeof this.attributes == 'undefined') this.attributes = {};
        this.attributes = _.extend(this.attributes, {'data-model-id': this.model.get('id')});
        this.$el.attr(this.attributes);
        this.$el.model=this.model;
        this.$el.append(this.value.render().el);
        this.delegateEvents();
        return this;
    },
    clickCell: function (e) {

        this.trigger('cell.click', e);
    }
});
module.exports = BodyCellComponentView;

},{}],4:[function(require,module,exports){
'use strict';

var BodyCellStringView = Backbone.View.extend({
    tagName: 'td',
    events: {
        "click ": "clickCell"
    },

    initialize: function (options) {
        if (typeof options.value != 'undefined') {
            this.value = options.value;
        }

        if (_.isFunction(options.formatValue)) {
            this.formatValue = options.formatValue;
        }

    },
    render: function () {
        this.$el.empty();
        if (typeof this.attributes == 'undefined') this.attributes = {};
        this.attributes = _.extend(this.attributes, {'data-model-id': this.model.get('id')});
        this.$el.attr(this.attributes);
        var value = this.formatValue(this.model.get(this.value));
        this.$el.append(value);
        this.delegateEvents();
        return this;
    },
    formatValue: function (value) {
        return value;
    },

    clickCell: function (e) {
        this.trigger('cell.click', e);
    }
});
module.exports = BodyCellStringView;
},{}],5:[function(require,module,exports){
'use strict';

var BodyCellStringView = require('./BodyCellStringView');
var BodyCellComponentView = require('./BodyCellComponentView');

var BodyRowView = Backbone.View.extend({
        tagName: 'tr',
        events: {
            "click ": "clickRow",
        },

        initialize: function (options) {
            if (typeof options.columns != 'undeifned') {
                this.columns = options.columns;
            }
            if (typeof options.CellView != 'undefined') {
                this.CellView = options.CellView;
            } else {
                this.CellView = BodyCellStringView;
            }

            this.model.bind('change', this.initCells, this);
            this.initCells();
        },

        /**
         * inizializza le celle
         * per ogni colonna valuta il tipo di value
         * se è una stringa inserisce una CellView standard
         * se è un oggetto json cerca di crearlo utilizzando value.view come prototipo e value.options
         * come parametro del costruttore
         * se invece il prototipo di value è un Backbone.View allora crea  ina view concreat dal prototipo e
         * la passa come value ad un  BodyCellComponentView
         *
         *
         * @param e
         */
        initCells: function (e) {
            _.each(this.cells, function (cell) {
                cell.remove();
            }, this);
            this.cells = [];
            // var columns=_.values(this.columns);
            _.mapObject(this.columns, function (value, key) {
                if (value.prototype instanceof Backbone.View) {
                    var cellValue = new value({});
                    var cell = new BodyCellComponentView({model: this.model, value: cellValue})
                } else if (value instanceof Backbone.View) {
                    var cell = value;
                } else if (typeof value == 'object') {
                    value.options.model = this.model;
                    var attributes = (typeof value.attributes != 'undefined') ? value.attributes : {};
                    var valuecell = eval("new " + value.view + "(value.options)");
                    var cell = new BodyCellComponentView({model: this.model, value: valuecell, attributes: attributes});
                } else if (typeof value == 'string') {
                    var cell = new this.CellView({model: this.model, value: key, label: value});

                } else {
                    BbTools.Debug.log(value, 'tipo non supportato');
                }

                if (typeof cell != 'undefined') {
                    this.listenTo(cell, 'cell.change', this.onCellChange);
                    this.cells.push(cell);
                }
            }, this);

            this.render();
        },

        /**
         *
         * @returns {View}
         */
        render: function () {
            this.$el.empty();
            if (typeof this.attributes == 'undefined') this.attributes = {};
            this.attributes = _.extend(this.attributes, {'data-model-id': this.model.get('id')});
            this.$el.attr(this.attributes);

            _.each(this.cells, function (cell) {
                this.$el.append(
                    cell.render().el
                );
            }, this);

            this.delegateEvents();
            return this;
        },

        selectRow: function (id) {
            this.$el.addClass('selected');
            this.model.trigger('select', {id: this.model.getIdentifier()});

        },
        unSelectRow: function (id) {
            this.$el.removeClass('selected');
            this.model.trigger('unselect', {id:  this.model.getIdentifier()});

        },
        /**
         * metodo disponibile per l'override
         * @param e
         */
        clickRow: function (e) {
        },

        onCellChange: function (e) {
            if (e.name == 'select_row') {
                if (e.checked == true) {
                    this.selectRow(e.id);
                } else if (e.checked == false) {
                    // BbTools.Debug.log(e, 'BodyRowView.onCellChange');
                    this.unSelectRow(e.id);

                }
            }
        }

    })
;
module.exports = BodyRowView;
},{"./BodyCellComponentView":3,"./BodyCellStringView":4}],6:[function(require,module,exports){
'use strict';

var BodyRowView = require('./BodyRowView');


var BodyView = Backbone.View.extend({
    tagName: 'tbody',
    rows: [],
    initialize: function (options) {
        if (typeof options.columns != 'undeifned') {
            this.columns = options.columns;
        }
        if (typeof options.RowView != 'undefined') {
            this.RowView = options.RowView;
        } else {
            this.RowView = BodyRowView;
        }

        this.collection.bind('sync', this.initRows, this);
    },
    initRows: function (e) {
        _.each(this.rows, function (row) {
            row.remove();
        }, this);
        this.rows = [];
        _.each(this.collection.models, function (model) {
            var new_row = new this.RowView({model: model, columns: this.columns});
            this.listenTo(new_row, 'click', this.onClickRow);  // new_row.bind('row.click', this.onClickRow);
            this.rows.push(new_row);
        }, this);

        this.render();

    },
    render: function () {
        // var el = Backbone.$(this._createElement(_.result(this, 'tagName')));
        this.$el.empty();
        if (typeof this.attributes != 'undefined') this.$el.attr(this.attributes);

        _.each(this.rows, function (row) {
            this.$el.append(
                row.render().el
            );
        }, this);

        this.delegateEvents();
        return this;
    },
    onClickRow: function (e) {
    }
});
module.exports = BodyView;
},{"./BodyRowView":5}],7:[function(require,module,exports){
'use strict';
var Grid = {};

Grid.TableView = require('./TableView');

Grid.HeadView = require('./HeadView');
Grid.HeadRowView = require('./HeadRowView');
Grid.HeadCellView = require('./HeadCellStringView');

Grid.BodyView = require('./BodyView');
Grid.BodyRowView = require('./BodyRowView');
// Grid.BodyCellView = require('./BodyCellStringView');
Grid.BodyCellStringView = require('./BodyCellStringView');
Grid.BodyCellCheckboxView = require('./BodyCellCheckboxView');

module.exports = Grid;

},{"./BodyCellCheckboxView":2,"./BodyCellStringView":4,"./BodyRowView":5,"./BodyView":6,"./HeadCellStringView":9,"./HeadRowView":10,"./HeadView":11,"./TableView":12}],8:[function(require,module,exports){
'use strict';

var HeadCellComponentView = Backbone.View.extend({
    tagName: 'th',
    events: {
        "click ": "clickCell"
    },

    initialize: function (options) {
        if (typeof options.value != 'undefined') {
            this.value = options.value;
        }
        if (typeof options.sortable != 'undefined') {
            this.sortable = options.sortable;
        }
        if (this.value == 'id') {
            this.tagName = 'th';
        } else {
            this.tagName = 'td';
        }
        this.el = null;
        this._ensureElement();
    },
    render: function () {
        this.$el.empty();
        if (typeof this.attributes == 'undefined') this.attributes = {};
        this.$el.attr(this.attributes);
        this.$el.append(this.value.render().el);
        this.delegateEvents();
        return this;
    },
    clickCell: function (e) {
        this.trigger('cell.click', e);
    }
});
module.exports = HeadCellComponentView;
},{}],9:[function(require,module,exports){
'use strict';
var template = require('./template/head_cell.html');

var HeadCellStringView = Backbone.View.extend({
    tagName: 'th',
    events: {
        // "click ": "clickHeadCell",
        "click .sortable.both": "sortBoth",
        "click .sortable.desc": "sortAsc",
        "click .sortable.asc": "sortDesc"
    },

    initialize: function (options) {
        if (typeof options.value != 'undefined') {
            this.value = options.value;
        }
        if (typeof options.label != 'undefined') {
            this.label = options.label;
        } else {
            this.label = this.value.replace('_', ' ');
        }
      if (typeof options.sortable != 'undefined') {
        this.sortable = options.sortable;
      }
        this.template = _.template(template);
    },
    render: function () {
        this.$el.empty();
        if (typeof this.attributes == 'undefined') this.attributes = {};
        this.attributes = _.extend(this.attributes, {'data-field': this.value});
        this.$el.attr(this.attributes);


        this.$el.append(this.template({value: this.value, label: this.label}));
        if (this.value == "" || this.sortable===false) {
            this.$('.sortable').removeClass('sortable');
            this.$('.both').removeClass('both');
        }

        this.delegateEvents();
        return this;
    },
    sortBoth: function (e) {
        this.trigger('sort', {order: e.currentTarget.dataset.field, order_direction: 'asc'});
        Backbone.$(e.currentTarget).removeClass('both');
        Backbone.$(e.currentTarget).addClass('asc');

    },
    sortAsc: function (e) {
        this.trigger('sort', {order: e.currentTarget.dataset.field, order_direction: 'asc'});
        Backbone.$(e.currentTarget).removeClass('both');
        Backbone.$(e.currentTarget).removeClass('desc');
        Backbone.$(e.currentTarget).addClass('asc');

    },
    sortDesc: function (e) {
        this.trigger('sort', {order: e.currentTarget.dataset.field, order_direction: 'desc'});
        Backbone.$(e.currentTarget).removeClass('both');
        Backbone.$(e.currentTarget).removeClass('asc');
        Backbone.$(e.currentTarget).addClass('desc');

    },
    resetOrder: function () {
        Backbone.$('div.sortable').removeClass('asc');
        Backbone.$('div.sortable').removeClass('desc');
        Backbone.$('div.sortable').addClass('both');
    }
});
module.exports = HeadCellStringView;

},{"./template/head_cell.html":13}],10:[function(require,module,exports){
'use strict';

var HeadCellStringView = require('./HeadCellStringView');
var HeadCellComponentView = require('./HeadCellComponentView');
var HeadRowView = Backbone.View.extend({
    tagName: 'tr',
    events: {
        "click ": "clickHeadRow"
    },

    initialize: function (options) {
        if (typeof  options.columns != 'undefined') {
            this.columns = options.columns;
        }
        if (typeof options.CellView != 'undefined') {
            this.CellView = options.CellView;
        } else {
            this.CellView = HeadCellStringView;
        }
        // this.model.bin
        // d('change', this.initCells, this);
        this.initCells();
    },

    /**
     * inizializza le celle
     *
     * @param e
     */
    initCells: function (e) {
        _.each(this.cells, function (cell) {
            cell.remove();
        }, this);
        this.cells = [];
        _.mapObject(this.columns, function (value, key) {
            if (value.prototype instanceof Backbone.View) {
                /**
                 * se value è una view che estende unaa view di Backbone viene renderizzata direttamente
                 * sarà cura del'estensore prevedere un eventuale ogggetto per la renderizzazione della cella th o td
                 */
                var cell = new value({});
            } else if (value instanceof Backbone.View) {
                /**
                 * se value è una view di Backbone vien renderizzata una cella con value come contenuto
                 */
                var cell = new HeadCellComponentView({model: this.model, value: value});

            } else if (typeof value == 'object') {
                /**
                 * se viene passato un oggetto Json si da per assodato che sia una definizione di oggetto
                 * con alcune proprietà predefinite:
                 * - renderInHead booleano se true l'oggetto così come definito viene renderizzato
                 *   anche nei titoli di colonna iniettato in una HeadCellComponent
                 *   se false viene renderizzata una cella con value ''
                 */
                if (value.renderInHead == true) {
                    var cellView = eval("new " + value.view + "(value.options)");
                    var cell = new HeadCellComponentView({model: this.model, value: cellView})
                } else {
                    var label = (typeof value.options.label != 'undefined') ? value.options.label : '';
                    var cell = new HeadCellStringView({model: this.model, value: key, label: label, sortable: false});
                }
                cell.bind('sort', this.onSort, this);
            } else if (typeof value == 'string') {
                /**
                 * se vaue è una stringa si presuppone che sia una proprietà (campo) del model e viene
                 * visualizzato con la proprietà di ordinamento
                 */
                var cell = new this.CellView({model: this.model, value: key, label: value});
                cell.bind('sort', this.onSort, this);
            } else {
                BbTools.Debug.log(value, 'tipo non supportato');
            }
            if (typeof cell != 'undefined') {
                this.cells.push(cell);
            }

        }, this);
        this.render();
    },


    /**
     *
     * @returns {View}
     */
    render: function () {
        this.$el.empty();
        if (typeof this.attributes == 'undefined') this.attributes = {};
        // this.attributes = _.extend(this.attributes, {'data-model-id': this.model.get('id')});
        this.$el.attr(this.attributes);

        _.each(this.cells, function (cell) {
            this.$el.append(
                cell.render().el
            );
        }, this);

        this.delegateEvents();
        return this;
    },
    onSort: function (e) {
        this.resetOrder();
        this.trigger('sort', {order: e.order, order_direction: e.order_direction});

    },
    resetOrder: function () {
        _.each(this.cells, function (cell) {
            if (typeof cell.value == 'string') {
                cell.resetOrder();
            }

        });
    }
    ,
    defaultOrder: function (field, direction) {
        Backbone.$('th[data-field=' + field + '] > div.sortable').removeClass('both');
        Backbone.$('th[data-field=' + field + '] > div.sortable').addClass(direction);

    }
    ,
    /**
     * metodo disponibile per l'override
     * @param e
     */
    clickHeadRow: function (e) {

    }
});
module.exports = HeadRowView;
},{"./HeadCellComponentView":8,"./HeadCellStringView":9}],11:[function(require,module,exports){
'use strict';

var HeadRowView = require('./HeadRowView');
var HeadView = Backbone.View.extend({
    tagName: 'thead',
    rows: [],
    initialize: function (options) {
        if (typeof options.columns != 'undefined') {
            this.columns = options.columns;
        }
        if (typeof options.RowView != 'undefined') {
            this.RowView = options.RowView;
        } else {
            this.RowView = HeadRowView;
        }
        this.initRows();
        // this.model.bind('sync', this.initRows, this);
    },
    initRows: function (e) {
        _.each(this.rows, function (row) {
            row.remove();
        }, this);
        this.rows = [];
        var new_row = new this.RowView({columns: this.columns});
        this.listenTo(new_row, 'row.click', this.onClickHeadRow);
        this.listenTo(new_row, 'sort', this.onSort);
        this.rows.push(new_row);

        this.render();
    },
    render: function () {
        this.$el.empty();
        if (typeof this.attributes != 'undefined') this.$el.attr(this.attributes);

        _.each(this.rows, function (row) {
            this.$el.append(
                row.render().el
            );
        }, this);

        this.delegateEvents();
        return this;
    },
    onClickHeadRow: function (e) {
    },
    onSort: function (e) {
        this.trigger('sort', {order: e.order, order_direction: e.order_direction});

    },

    resetOrder: function () {
        _.each(this.rows, function (row) {
            row.resetOrder();
        }, this);
    },

    defaultOrder: function (field, direction) {
        this.resetOrder();
        _.each(this.rows, function (row) {
            row.defaultOrder(field, direction);
        }, this);
    }

});
module.exports = HeadView;
},{"./HeadRowView":10}],12:[function(require,module,exports){
'use strict';
var HeadView = require('./HeadView');
var BodyView = require('./BodyView');

var TableView = Backbone.View.extend({
    tagName: 'table',
    events: {
        "click tr": "onClickRow",
        "click td": "onClickCell"
    },

    initialize: function (options) {
        if (typeof options.columns != 'undeifned') {
            this.columns = options.columns;
        }

        /**
         * se passati moduli View dal costruttore
         * verranno usati per creare le view Body ed Head
         */
        if (typeof options.HeadView != 'undefined') {
            this.HeadView = options.HeadView;
        } else {
            this.HeadView = HeadView;
        }
        if (typeof options.BodyView != 'undefined') {
            this.BodyView = options.BodyView;
        } else {
            this.BodyView = BodyView;
        }

        if (typeof options.onClickRow != 'undefined') {
            this.onClickRow = options.onClickRow;
        }

        /**
         * pre inizializzazione delle subView
         */
        this.Head = new this.HeadView({
            columns: this.columns
        });
        this.Head.bind('sort', this.onSort, this);

        this.Body = new this.BodyView({
            columns: this.columns,
            collection: this.collection
        });

    },
    render: function () {
        var el = Backbone.$(this._createElement(_.result(this, 'tagName')));
        if (typeof this.attributes != 'undefined') el.attr(this.attributes);

        this.$el.empty();
        el.append(
            this.Head.render().el
        );
        el.append(
            this.Body.el
        );
        this.$el.append(el);

        this.delegateEvents();

        return this;
    },
    onSort: function (e) {
        this.trigger('sort', e);
    },
    defaultOrder: function (order, direction) {
        this.Head.defaultOrder(order, direction);
    },
    onClickRow: function (e) {
    },
    onClickCell: function (e) {
    }

});
module.exports = TableView;

},{"./BodyView":6,"./HeadView":11}],13:[function(require,module,exports){
module.exports = "<div class=\"th-inner sortable both\" data-field=\"<%- value %>\"><%- label %></div>\n";

},{}],14:[function(require,module,exports){
'use strict';

var template = require('./template/page_navigator.html');

var PageNavigatorView = Backbone.View.extend({
    initialize: function (options) {
        if (typeof  options.template != 'undefined') {
            this.template = options.template;
        } else {
            this.template = _.template(template);
        }

        this.collection.bind('sync', this.render, this);
    },
    events: {
        'click .pagination .first': 'first',
        'click .pagination .next': 'next',
        'click .pagination .prev': 'prev',
        'click .pagination .last': 'last',
        'click .pagination .page': 'page',
        'click .pagination .refresh': 'refresh'
    },

    render: function () {
        var data = {
            models: this.collection.models,
            links: this.collection._links,
            page: this.collection.page,
            page_count: this.collection.page_count,
            page_size: this.collection.page_size,
            total_items: this.collection.total_items

        };
        var nav_pages = [];
        for (var i = -2; i < 3; i++) {
            if (data.page + i > 0 && data.page + i <= data.page_count) {
                var nav_page = {
                    page: data.page,
                    class: 'page',
                    data_page: data.page + i,
                    caption: data.page + i
                };
                if (data.page + i == 0) {
                    nav_page.caption = data.page;
                    nav_page.data_page = data.page;
                }
                if (data.page + i == data.page) {
                    nav_page.class = 'active';
                }
                nav_pages.push(nav_page)
            }
        }
        if (data.page < 2) {
            if (4 < data.page_count) {
                nav_pages.push({
                    page_count: data.page_count,
                    page: data.page,
                    class: 'page',
                    data_page: 4,
                    caption: 4
                })
            }
        }
        if (data.page < 3) {
            if (5 < data.page_count) {
                nav_pages.push({
                    page_count: data.page_count,
                    page: data.page,
                    class: 'page',
                    data_page: 5,
                    caption: 5
                })
            }
        }

        data.nav_pages = nav_pages;
        this.$el.html(this.template(data));
    },
    refresh: function (e) {
        this.trigger('go', {page: e.currentTarget.dataset.page});

        // this.collection.first_page();
    },
    first: function (e) {
        this.trigger('go', {page: e.currentTarget.dataset.page});

        // this.collection.first_page();
    },
    prev: function (e) {
        this.trigger('go', {page: e.currentTarget.dataset.page});
        // this.collection.prev_page();
    },
    next: function (e) {
        this.trigger('go', {page: e.currentTarget.dataset.page});
        // this.collection.next_page();
    },
    last: function (e) {
        this.trigger('go', {page: e.currentTarget.dataset.page});
        // this.collection.last_page();
    },
    page: function (e) {
        this.trigger('go', {page: e.currentTarget.dataset.page});
        // this.collection.go_page(e.currentTarget.dataset.page);
    }

});
module.exports = PageNavigatorView;

},{"./template/page_navigator.html":15}],15:[function(require,module,exports){
module.exports = "<div class=\"row\">\n    <div class=\"col-md-5 col-sm-12\">\n        <div class=\"dataTables_info\" id=\"sample_1_info\" role=\"status\" aria-live=\"polite\">Pagina\n            <%= page %>\n            di <%= page_count %>\n            su <%= total_items %> record\n        </div>\n    </div>\n    <div class=\"col-md-7 col-sm-12\">\n        <div class=\"\" id=\"sample_1_paginate\">\n            <ul class=\"pagination\" style=\"visibility: visible;\">\n                <%\n                var first_class='disabled'\n                var prev_class='disabled'\n                if( page > 1) {\n                prev_class='prev';\n                first_class='first';\n                }\n                %>\n                <li class=\"<%= first_class %>\" data-page=\"<%= 1 %>\">\n                    <a title=\"First\">\n                        <i class=\"fa fa-angle-double-left\"></i>\n                    </a>\n                </li>\n                <li class=\"<%= prev_class %>\" data-page=\"<%= page - 1 %>\">\n                    <a title=\"Prev\">\n                        <i class=\"fa fa-angle-left\"></i>\n                    </a>\n                </li>\n\n                <% for(i=0;i < nav_pages.length;i++){ %>\n                <% var nav_page=nav_pages[i]; %>\n                <li class=\"<%= nav_page.class %>\" data-page=\"<%= nav_page.data_page %>\">\n                    <a title=\"Page_<%= nav_page.caption%>\"><%= nav_page.caption%></a>\n                </li>\n                <% } %>\n\n\n                <%\n                var next_class='disabled'\n                var last_class='disabled'\n                if( page < page_count) {\n                next_class='next';\n                last_class='last';\n                }\n                %>\n                <li class=\"<%= next_class%>\" data-page=\"<%= page + 1 %>\">\n                    <a title=\"Next\">\n                        <i class=\"fa fa-angle-right\"></i>\n                    </a>\n                </li>\n                <li class=\"<%= last_class%>\" data-page=\"<%= page_count %>\">\n                    <a title=\"Last\">\n                        <i class=\"fa fa-angle-double-right\"></i>\n                    </a>\n                </li>\n                <li class=\"refresh\" data-page=\"<%= page %>\">\n                    <a title=\"refresh\">\n                        <i class=\"fa fa-refresh\"></i>\n                    </a>\n                </li>\n            </ul>\n        </div>\n    </div>\n</div>\n";

},{}],16:[function(require,module,exports){
'use strict';

var IconButtonView = require('../Toolbar/IconButtonView');
var template = require('./template/search.html');
var SearchView = Backbone.View.extend({
    initialize: function (options) {
        if (typeof  options.template != 'undefined') {
            this.template = options.template;
        } else {
            this.template = _.template(template);
        }
        if (typeof  options.search_columns != 'undefined') {
            this.search_columns = options.search_columns;
        }
        this.render();
    },
    events: {
        'keyup  input': 'search',
    },

    render: function () {
        this.$el.html(this.template({}));
        if (typeof this.attributes != 'undefined') this.$el.attr(this.attributes);

    },

    default: function (query) {
        _.each(this.$('input'), function (element) {
            element.value = this.query;
        }, {query: query});
    },

    clearSearch: function () {
        _.each(this.$('input'), function (element) {
            element.value = '';
            this.trigger('search', {});
        }, this);

    },

    /**
     * salta alcuni tasti
     * key 16 Shift
     * @param e
     */
    search: function (e) {
        if (e.keyCode != 13) {
            return;
        }
        // if (e.key.length != 1
        //     && e.keyCode != 8
        //     && e.keyCode != 46
        // ) {
        //     return;
        // }
        var data = {
            search: e.currentTarget.value,
            search_into: this.search_columns
        };
        this.trigger('search', data);
        // this.collection.goFetch(data);
    },

    /**
     *
     */
    getResetButton: function () {
        var button = new IconButtonView({
            attributes: {
                class: 'btn btn-default',
                name: 'reset',
                title: 'Reset search'
            },
            icon: {
                class: 'fa fa-remove'
            },
            onEvent: function (e) {
                // BbTools.Debug.log(e, 'sulla definizione in SearchView');
                this.trigger('click');
            }
        });
        button.bind('click', this.clearSearch, this);
        button.render();
        return button;
    }
});
module.exports = SearchView;
},{"../Toolbar/IconButtonView":19,"./template/search.html":17}],17:[function(require,module,exports){
module.exports = "<input class=\"form-control\" type=\"text\" placeholder=\"Search\">\n";

},{}],18:[function(require,module,exports){
'use strict';

/**
 *
 * ESEMPIO DI OPTIONS DA PASSARE AL COSTRUTTORE
 * {
         *     view: 'View/Toolbar/IconButtonView',
         *         options: {
         *     attributes: {
         *     class: 'btn btn-default',
         *             name: 'reset',
         *             title: 'Reset search'
         *     },
         *     icon: {
         *     class: 'fa fa-remove'
         *     },
         *     onEvent:function(e){
         *         Debug.log(e, 'datta definizione');
         *     }
         * }
         *
         *
         */

var ButtonGroupView = Backbone.View.extend({
    tagName: 'div',
    childs: [],
    events: {
        'click': 'onEventGroup'
    },
    initialize: function (options) {
        var that = this;
        this.childs = [];
        _.each(options.tools, function (tool) {
            if (tool.prototype instanceof Backbone.View) {
                var child = new tool({});
            } else if (tool instanceof Backbone.View) {
                var child = tool;
            } else if (typeof tool == 'object') {
                var child = eval("new " + tool.view + "(tool.options)");
            } else {
                BbTools.Debug.log(tool, 'tipo non supportato');
                return false;
            }
            that.childs.push(child);
        });

    },
    render: function () {
        if (typeof this.attributes != 'undefined') this.$el.attr(this.attributes);
        // this.$el.empty();
        _.each(this.childs, function (child) {
            child.model=this.model;
            this.$el.append(child.el);
            child.render();
        }, this);

        this.delegateEvents();
        return this;
    },
    onEventGroup: function (e) {
        // BbTools.Debug.log(e, 'sul group');
    }

});
module.exports = ButtonGroupView;

},{}],19:[function(require,module,exports){
'use strict';

var IconButtonView = Backbone.View.extend({
  tagName: 'button',
  events: {
    "click ": "onEvent"
  },
  initialize: function (options) {
    if (typeof  options.icon != 'undefined') {
      this.icon = options.icon;
    }
    if (typeof  options.onEvent == 'function') {
      this.onEvent = options.onEvent;
    }
    if (typeof  options.beforeRender== 'function') {
      this.beforeRender = options.beforeRender;

    }
    this.template = _.template('<i class="<%- icon.class %>"></i>');
  },
  render: function () {
    this.beforeRender();
    this.$el.empty();
    this.$el.append(this.template({ icon: this.icon }));
    this.delegateEvents();
    return this;
  },
  onEvent: function (e) {
    this.trigger('button.event', this);
  },
  beforeRender: function (e) {
    this.trigger('button.before.render', this);
  }

});
module.exports = IconButtonView;

},{}],20:[function(require,module,exports){
'use strict';

var Toolbar = {};
Toolbar.IconButtonView = require('./IconButtonView');
Toolbar.ButtonGroupView = require('./ButtonGroupView');
module.exports = Toolbar;
},{"./ButtonGroupView":18,"./IconButtonView":19}],21:[function(require,module,exports){
(function (global){
'use strict';


(function (factory) {

    // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
    // We use `self` instead of `window` for `WebWorker` support.
    var root = (typeof self == 'object' && self.self === self && self) ||
        (typeof global == 'object' && global.global === global && global);

    // Set up Backbone appropriately for the environment. Start with AMD.
    if (typeof define === 'function' && define.amd) {
        define(['exports'], function (exports) {
            root.BbToolsGrid = factory(root, exports);
        });

        // Next for Node.js or CommonJS.
    } else if (typeof exports !== 'undefined') {
        factory(root, exports);

        // Finally, as a browser global.
    } else {
        root.BbToolsGrid = factory(root, {});
    }

})(function (root, BbToolsGrid) {

    var BbToolsGrid = {};
    BbToolsGrid.Router = require('./Router/CrudGridRouter');
    BbToolsGrid.Grid = require('./View/Grid/Grid');
    BbToolsGrid.PageNavigatorView = require('./View/PageNavigator/PageNavigatorView');
    BbToolsGrid.Toolbar = require('./View/Toolbar/Toolbar');
    BbToolsGrid.SearchView = require('./View/Search/SearchView');


    BbToolsGrid.init = function () {
    };


    root.BbToolsGrid = BbToolsGrid;
    return BbToolsGrid;
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Router/CrudGridRouter":1,"./View/Grid/Grid":7,"./View/PageNavigator/PageNavigatorView":14,"./View/Search/SearchView":16,"./View/Toolbar/Toolbar":20}]},{},[21]);
