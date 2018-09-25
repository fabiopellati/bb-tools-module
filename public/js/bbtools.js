(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
var Collection = Backbone.Collection.extend({
    collection_name: '',
    _first_page: '',
    _next_page: '',
    _prev_page: '',
    _last_page: '',
    _self_page: '',

    _selected: [],
    initialize: function (options) {
        this.bind('add', function (model) {
            model.bind('select', this.onSelectModel, this);
            model.bind('unselect', this.onUnSelectModel, this);
        }, this);
        // this.model.on('error', this.onModelError, this);
    },

    // onModelError:function(model, response, options){
    //     this.trigger('error',{"model":model, "response":response, "options":options});
    // },

    delete_selected: function () {
        if (this._selected.length == 0) {
            var message = "<h4>nessuna riga selezionata</h4>";
            var modal_options = {
                message: message
            }
        } else {
            var message = "<h4>saranno eliminate le seguenti righe:</h4><ul>";
            _.each(this._selected, function (id) {
                var model = this.get(id);
                var identifier=model.getIdentifier();
                message = message + "<li><h5>" + identifier + "</h5></li>";
            },this);
            message = message + "</ul>";
            message = message + "<h4>si desidera proseguire?</h4>";
            var modal_options = {
                buttons: ['yes', 'no'],
                message: message
            }

        }
        modal_options.id = 'delete_selected';
        var modal = new BbTools.View.Modal.Responsive(modal_options);
        modal.bind('modal.before.show', this.onEvent, this);
        modal.bind('modal.show', this.onEvent, this);
        modal.bind('modal.before.hide', this.onEvent, this);
        modal.bind('modal.hide', this.onEvent, this);
        modal.bind('yes', this.onDeleteYes, this);
        modal.show();
    },
    /**
     * evento generico e.type permette di testare che tipo di evento è stato scatenato
     * @param e
     */
    onEvent: function (e) {

    },
    /**
     * evento eseguito quando vine confermata con yes la richiesta di eliminazione sulla modal
     * @see delete_selected
     * @param e
     */
    onDeleteYes: function (e) {
        App.blockUI();
        var that=this;
        _.each(this._selected, function (id) {
            this.get(id).destroy({
                wait:true,
                error: function (model, response, options) {
                    var modal = new BbTools.View.Modal.Responsive({
                        id: 'delete_failed_' + model.getIdentifier(),
                        message: '<h4>la riga ' + model.getIdentifier() + ' non è stata eliminata</h4>'
                    });
                    modal.show();
                },
                success: function(context, model, resp, options){
                    var modal = new BbTools.View.Modal.Responsive({
                        id: 'delete_success_' + context.getIdentifier(),
                        message: '<h4>la riga ' + context.getIdentifier() + ' è stata eliminata</h4>'
                    });
                    modal.show();
                    // that.fetch();

                }
            });
        }, this);
        this._selected = [];
        this.fetch();
        // BbTools.Debug.log(e, 'collection cancel yes');

    },

    /**
     * listener eseguito quando il model in una collection viene contrassegnato come selected
     * @param e
     */
    onSelectModel: function (e) {
        this._selected.push(e.id);
        this._selected = _.uniq(this._selected);
        // BbTools.Debug.log(e, 'collection on selectModel');
    },

    /**
     * listener eseguito quando il model in una collection viene rimosso dall'elenco dei selected
     * @param e
     */
    onUnSelectModel: function (e) {
        var index = this._selected.indexOf(e.id);
        if (index > -1) {
            this._selected.splice(index, 1);
        }
    },
    /**
     * apigility restituisce un oggetto con
     * _embedded{
     *      nome_risorsa:[
     *          righe,
     *      ]
     *
     * vengono estratte le righe prendendo i valori della prima chiave (none_risorsa nell'esempio)
     * prendendo come per assodato che ci sia sempre solo una chiave.
     *
     * @param data
     */
    parse: function (data) {
        this.page = data.page;
        this.page_count = data.page_count;
        this.page_size = data.page_size;
        this.total_items = data.total_items;
        return _.first(_.values(data._embedded));
    },
    first_page: function () {
        if (_.isString(this._links.first.href)) {
            this.url = this._links.first.href;
            this.fetch();
        }
    },
    prev_page: function () {
        if (_.isString(this._links.prev.href)) {
            this.url = this._links.prev.href;
            this.fetch();
        }
    },
    next_page: function () {
        if (_.isString(this._links.next.href)) {
            this.url = this._links.next.href;
            this.fetch();
        }
    },
    last_page: function () {
        if (_.isString(this._links.last.href)) {
            this.url = this._links.last.href;
            this.fetch();
        }
    },
    go_page: function (page) {
        this.url = this._links.first.href;
        this.fetch({data: {page: page}});
    },
    goFetch: function (options) {
        var uri = this.url;
        var url_split = {};
        uri.replace(
            new RegExp("([^?=&]+)(=([^&]*))?", "g"),
            function ($0, $1, $2, $3) {
                if ($0 == $1 && typeof $3 == 'undefined') {
                    url_split['url'] = $1;
                } else {
                    url_split[$1] = $3;
                }
            }
        );

        this.url = url_split.url;
        if (typeof options == 'undefined') var options = {};
        this.fetch(options);

    }

});

module.exports = Collection;
},{}],2:[function(require,module,exports){
'use strict';

var Debug = {
    enable: false,
    log: function ($var, $label) {
        if (this.enable == false) {
            return;
        }
        if (typeof $label != 'undefined') {
            console.log([$label, $var]);
        } else {
            console.log($var);

        }
    }
};

module.exports = Debug;
},{}],3:[function(require,module,exports){
'use strict';
var Model = require('./Model');
var Collection = require('../Collection/Collection');

var ApigilityModel = Model.extend({

    linksCollections: {},

    /**
     * apigility rest espone una chiave con links questo metodo restituisce una Collection che punta a questi link
     *
     * @param link
     * @returns {*}
     */
    getLink: function (link) {
        var links = this.attributes._links;
        if (_.isObject(links) && _.has(links, link)) {
            var linkObject = _.propertyOf(links)(link);
            switch (linkObject.type) {
                case 'collection':
                    var Link = Collection.extend({
                        collection_name: link,
                        url: linkObject.href,
                        model: ApigilityModel
                    });
                    break;
                case 'entity':
                    var Link = ApigilityModel.extend({
                        collection_name: link,
                        url: linkObject.href
                    });
                    break;
            }
            return new Link();
        }
        return false;
    },

});
module.exports = ApigilityModel;
},{"../Collection/Collection":1,"./Model":5}],4:[function(require,module,exports){
'use strict';

var EnvironmentModel = Backbone.Model.extend({

    bindModels: [],

    initialize: function () {
        this.on('change', this.onChange, this);
    },

    /**
     *
     * @param m
     * @param options
     */
    onChange: function (m, options) {
        var that=this;
        _.mapObject(m.changed, function (value, key) {

            that.bindModels.map(function (bindModel) {
                bindModel.set(key, value);
            });
        })
    },

    /**
     *
     * @param model
     */
    bindModel: function (model) {
        this.bindModels.push(model);
    }

});
module.exports = EnvironmentModel;
},{}],5:[function(require,module,exports){
'use strict';

var Model = Backbone.Model.extend({
    initialize: function (options) {
        this.bind('select', this.onSelect, this);
        this.bind('unselect', this.onUnSelect, this);
    },

    /**
     * listener eseguito quando il model in una collection viene contrassegnato come selected
     * @param e
     */
    onSelect: function (e) {
    }
    ,

    /**
     * listener eseguito quando il model in una collection viene rimosso dall'elenco dei selected
     * @param e
     */
    onUnSelect: function (e) {
    },


    /**
     * restituisce il testo per identificare il model nelle interfaccie
     * per default restituisce l'attributo id
     *
     * @returns {*}
     */
    getIdentifier: function () {
        return this.id;
    }
});
module.exports = Model;
},{}],6:[function(require,module,exports){
'use strict';
var template = require('./template/responsive.html');

var Responsive = Backbone.View.extend({
    tagName: 'div',
    el: 'body',
    events: {
        "click button#button-yes": "onYes",
        "click button#button-no": "onNo",
        "click button#button-ok": "onOk",
        "click button#button-cancel": "onCancel",
    },
    title: 'Attenzione',
    message: '',
    buttons: ['chiudi'],
    id: 'responsive',

    initialize: function (options) {
        if (typeof  options.template != 'undefined') {
            this.template = options.template;
        } else {
            this.template = _.template(template);
        }

        if (typeof  options.id != 'undefined') {
            this.id = options.id;
        }
        if (typeof  options.title != 'undefined') {
            this.title = options.title;
        }
        if (typeof  options.buttons != 'undefined') {
            this.buttons = options.buttons;
        }
        if (typeof  options.message != 'undefined') {
            this.message = options.message;
        }
        if (typeof  options.onClose == 'function') {
            this.onClose = options.onClose;
        }
    },
    render: function () {
        // this._ensureElement();
        var options = {
            id: this.id,
            title: this.title,
            buttons: this.buttons,
            message: this.message
        };
        this.$('#' + this.id).remove();

        this.$el.append(this.template(options));
        this.delegateEvents();
        this.$el.on('show.bs.modal', {this: this}, this.onModalBeforeShow);
        this.$el.on('shown.bs.modal', {this: this}, this.onModalShow);
        this.$el.on('hide.bs.modal', {this: this}, this.onModalBeforeHide);
        this.$el.on('hidden.bs.modal', {this: this}, this.onModalHide);
        return this;
    },
    show: function () {
        this.render();
        this.$('#' + this.id).modal('show');
    },

    onYes: function (e) {
        this.trigger('yes', e);
        this.$('#' + this.id).modal('hide');
    },
    onNo: function (e) {
        this.trigger('no', e);
        this.$('#' + this.id).modal('hide');
    },
    onOk: function (e) {
        this.trigger('ok', e);
        this.$('#' + this.id).modal('hide');
    },
    onCancel: function (e) {
        this.trigger('cancel', e);
        this.$('#' + this.id).modal('hide');
    },

    onClose: function (e) {
        this.trigger('modal.close', e);
    },

    onModalBeforeShow: function (e) {
        e.data.this.trigger('modal.before.show', e);
    },

    onModalShow: function (e) {
        e.data.this.trigger('modal.show', e);
    },

    onModalBeforeHide: function (e) {
        e.data.this.trigger('modal.before.hide', e);
    },

    /**
     * le righe 104 105 sono state commentate perchè avevano un effetto non desiderabile:
     * la prima eliminava completamente dal dom il target che era un campo input di una form
     * la seconda eliminava la modal ma lasciava nel dom il fadein; se la rimozione dovesse avere degli effetti
     * altrove cercare una soluzione alternativa
     * @param e
     */
    onModalHide: function (e) {
        var that = e.data.this;
        that.trigger('modal.hide', e);
        // e.target.remove();
        // that.$('#' + that.id).remove();
    }

});
module.exports = Responsive;
},{"./template/responsive.html":7}],7:[function(require,module,exports){
module.exports = "<div id=\"<%- id %>\" class=\"modal responsive fade\" tabindex=\"-1\" aria-hidden=\"true\" data-backdrop=\"static\">\n    <div class=\"modal-dialog\">\n        <div class=\"modal-content\">\n            <div class=\"modal-header\">\n                <% if(buttons.length<2) { %>\n                <button type=\"button\" class=\"close\" data-dismiss=\"modal\"\n                        aria-hidden=\"true\"></button>\n                \n                <% } %>\n                <h4 class=\"modal-title\"><%- title %></h4>\n            </div>\n            <div class=\"modal-body\">\n                <div class=\"scroller\" style=\"height:200px\" data-always-visible=\"1\" data-rail-visible1=\"1\">\n                    <div class=\"row\">\n                        <div class=\"col-md-12\">\n                            <%= message %>\n                        </div>\n                    </div>\n                </div>\n            </div>\n            <div class=\"modal-footer\">\n                <% _.each(buttons, function(button) { %>\n                    <% if(button==\"yes\"){%>\n                             <button type=\"button\" class=\"btn green\" id=\"button-yes\"\n                                     style=\"padding-left: 20px;padding-right: 20px;\">Si\n                             </button>\n                    <% }%>\n                    <% if(button==\"no\"){%>\n                             <button type=\"button\" class=\"btn blue\" id=\"button-no\"\n                                     style=\"padding-left: 20px;padding-right: 20px;\">No</button>\n                    <% }%>\n                    <% if(button==\"ok\"){%>\n                             <button type=\"button\" class=\"btn green\" id=\"button-ok\"\n                                     style=\"padding-left: 20px;padding-right: 20px;\">Ok</button>\n                    <% }%>\n                    <% if(button==\"cancel\"){%>\n                             <button type=\"button\" class=\"btn green\" id=\"button-cancel\">Cancel</button>\n                    <% }%>\n                    <% if(button==\"chiudi\"){%>\n                <button type=\"button\" data-dismiss=\"modal\" class=\"btn dark btn-outline\">Chiudi</button>\n                    <% }%>\n                \n                <% }) %>\n            </div>\n        </div>\n    </div>\n</div>\n";

},{}],8:[function(require,module,exports){
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
            root.BbTools = factory(root, exports);
        });

        // Next for Node.js or CommonJS.
    } else if (typeof exports !== 'undefined') {
        factory(root, exports);

        // Finally, as a browser global.
    } else {
        root.BbTools = factory(root, {});
    }

})(function (root, BbTools) {

    var BbTools = {};
    BbTools.Debug = require('./Debug');
    BbTools.Collection = require('./Collection/Collection');
    // BbTools.Risorsa = require('./Model/Risorsa');
    BbTools.Model = require('./Model/Model');
    BbTools.ApigilityModel = require('./Model/ApigilityModel');
    BbTools.EnvironmentModel = require('./Model/EnvinonmentModel');
    BbTools.View = {};
    BbTools.View.Modal = {};
    BbTools.View.Modal.Responsive = require('./View/Modal/Responsive');


    BbTools.init = function () {
    };


    root.BbTools = BbTools;
    return BbTools;
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Collection/Collection":1,"./Debug":2,"./Model/ApigilityModel":3,"./Model/EnvinonmentModel":4,"./Model/Model":5,"./View/Modal/Responsive":6}]},{},[8]);
