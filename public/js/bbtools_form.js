(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';


/**
 * specs:
 * - bind tra l'editor e un attributo del model
 * - evento change dell'editor aggiorna l'attributo del model
 * - evento change dell'attributo del model aggiorna il valore dell'editor
 * - archivia il valore in maniera indipendente dalla visualizzazione
 * - delega la validazione alla chiamata restful
 * - gestisce lo stato delle validazioni inoltrate dal Restful
 *
 * comportamento di default:
 * l'editor presuppone l'esistenza di un elemento con classe .data-editor che esponga la proprietà "value" e possa
 * lanciare un evento change
 *
 * sull'evento change di .data-editor aggiorna il valore di value ed esegue this.validate; se vengono violate regole
 * di validazione viene anciato l'evento editor.value.invalid
 *
 */
var FormFieldEditorView;
FormFieldEditorView = Backbone.View.extend({
    events: {
        'change .data-editor': 'onChange',
        'keyup .data-editor': 'onKeyUp',
        'blur .data-editor': 'onBlur',
        'focus .data-editor': 'onFocus',
    },
    attributes: {},
    view_attributes: {},
    input_attributes: {},
    initialize: function (options) {
        if (!options.model) throw new Error("option obbligatoria non definita: 'model'");
        if (typeof  options.onEvent == 'function') {
            this.onEvent = options.onEvent;
        }
        if (typeof  options.onChange == 'function') {
            this.onChange = options.onChange;
        }
        if (typeof  options.onKeyUp == 'function') {
            this.onKeyUp = options.onKeyUp;
        }
        this.view_attributes = (typeof options.view_attributes != 'undefined') ? options.view_attributes : this.view_attributes;
        this.input_attributes = (typeof options.input_attributes != 'undefined') ? options.input_attributes : this.input_attributes;

        this.bind('editor.value.invalid', this.onValueInvalid);
        if (typeof options.key != 'undefined') {
            this.key = options.key;
            this.model.bind('change:' + this.key, this.onModelChange, this);
        }
        this.name = (typeof options.name != 'undefined')? options.name : this.key;

        this.listenTo(this.model, 'error', this.onModelError, this);

    },
    /**
     * override di questo metodo per renderizzare l'editor
     *
     * @returns {ButtonSubmitEditorView}
     */
    render: function (options) {
        // console.log({'render':options});
        // console.trace();

        this.trigger('editor.render', {'editor': this});

        return this;
    },

    /**
     * evento generico
     *
     * @param e
     */
    onEvent: function (e) {
        this.trigger('editor.event', this);
    },

    /**
     * evento blur
     *
     * @param e
     */
    onBlur: function (e) {
        this.trigger('editor.blur', this);
    },
    /**
     * evento focus
     *
     * @param e
     */
    onFocus: function (e) {
        this.trigger('editor.focus', this);
    },

    /**
     * listener dell'evento editor.value.invalid
     * @param e
     */
    onValueInvalid: function (e) {
        BbTools.Debug.log(e, 'evento editor.value.invalid intercettato ');

    },

    /**
     * listener dell'evento model change:[attribute]
     * @param e
     */
    onModelError: function (model, e) {
        if (e.status == 422) {
            if (_.has(e.responseJSON.validation_messages, this.key)) {
                var messages = _.propertyOf(e.responseJSON.validation_messages)(this.key);
                this.trigger('editor.model.error', {'messages': messages});
            }
        }

    },

    /**
     * listener dell'evento model change:[attribute]
     * @param e
     */
    onModelChange: function (model, value, options) {
        this.setValue(value);

    },

    /**
     * get editor value
     * estendere e sovrascrivere per le specifiche dell'editor
     *
     * @returns {string}
     */
    getValue: function () {
        return this.value;
    },

    /**
     * set editor value
     * estendere e sovrascrivere per le specifiche dell'editor
     *
     * @param value
     */
    setValue: function (value) {
        this.value = value;
        this.trigger('editor.set.value', {editor: this, value: value});
    },

    /**
     * funzione che intercetta l'evento di change
     * estendere per personalizzare
     *
     * @param e
     */
    onChange: function (e) {
        var value = e.currentTarget.value;
        value = this.filter(value);
        this.model.set(this.key, value);
        this.trigger('editor.change', e);
    },

    /**
     * funzione che intercetta l'evento keyup sul campo
     * @param e
     */
    onKeyUp:function(e){
        this.trigger('editor.keyup', e);

    },

    /**
     *
     * @returns {boolean}
     */
    validate: function () {
        BbTools.Debug.log('metodo validate non implementato');
        return true;
    },

    /**
     * filtro da apllicare al value prima di scrivere nel model
     *
     * @param value
     */
    filter: function (value) {
        return value;
    }


});
module.exports = FormFieldEditorView;
},{}],2:[function(require,module,exports){
'use strict';


/**
 * specs:
 *
 */
var BaseView = require('./ButtonEditorView');

/**
 * genera un button con funzione di commit del model
 *
 */
var ButtonCommitEditorView = BaseView.extend({
        // template: _.template('<button class="<%= attributes.button_class %> editor commit" ><%- label%></button>'),

        label: 'salva',
        initialize: function (options) {
            BaseView.prototype.initialize.call(this, options);
            this.$el.addClass('commit');

            this.bind('model.commit.success', this.onModelCommitSuccess, this);
            this.bind('editor.event', this.onEditorEvent, this);

        },
        /**
         *
         * @param e
         */
        onEditorEvent: function (e) {
            this.commit();
        },

        /**
         * aggiorna i dati del model
         *
         * @param options
         */
        commit: function () {
            this.validate();
            var that = this;
            that.trigger('model.commit', {this: that});
            var callback = {
                success: function (data) {
                    that.trigger('model.commit.success', {this: that, data: data});
                    that.model.trigger('model.commit.success', {this: that, data: data})
                },
                error: function (e) {
                    that.trigger('model.commit.error', {this: that, e: e});
                }
            };
            this.model.save(null, callback);

        },

        /**
         *
         * @param e
         */
        onModelCommitSuccess: function (e) {
            // BbTools.Debug.log(e, 'model.commit.success');
        }
    })
;
module.exports = ButtonCommitEditorView;
},{"./ButtonEditorView":3}],3:[function(require,module,exports){
'use strict';


/**
 * specs:
 *
 */
var BaseView = require('../FormFieldEditorView');

/**
 * genera un button generico
 *
 */
var ButtonEditorView = BaseView.extend({
        tagName: 'button',
        // template: _.template('<button class="editor <%= attributes.button_class %> " ><%- label%></button>'),
        events: {
            'click ': 'onEvent'
        },
        label: 'label',
        initialize: function (options) {
            BaseView.prototype.initialize.call(this, options);
            if (typeof options.label != 'undefined') {
                this.label = options.label;
            }
            this.attributes = (typeof options.attributes != 'undefined') ? options.attributes : this.attributes;

            this.bind('editor.render', this.onEditorRender, this);
            this.render(this.cid);
        },

        /**
         * listener dell'evento editor.render
         *
         * @param e
         */
        onEditorRender: function (e) {
            // console.log({'onEditorRender':e});
            var data = {
                name: this.name,
                key: this.key,
                title: this.title, label: this.label,
                help: this.help,
                editorId: this.name + this.model.cid,
                attributes: this.view_attributes
            };

            this.$el.attr(this.attributes);
            this.$el.addClass('editor');
            this.$el.html(data.label);
            this.setValue(this.model.get(this.key));
        }
    })
;
module.exports = ButtonEditorView;
},{"../FormFieldEditorView":1}],4:[function(require,module,exports){
'use strict';


/**
 * specs:
 *
 */
var FormFieldEditorView = require('./TextEditorView');

var DateTextEditorView = FormFieldEditorView.extend({
    /**
     *
     * @param options
     */
    initialize: function (options) {
        FormFieldEditorView.prototype.initialize.call(this, options);
        if (typeof options.write_pattern != 'undefined') {
            this.write_pattern =  options.write_pattern;
        } else {
            this.write_pattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        }
        if (typeof options.write_replace != 'undefined') {
            this.write_replace =  options.write_replace;
        } else {
            this.write_replace = '$3-$2-$1';
        }

        if (typeof options.read_pattern != 'undefined') {
            this.read_pattern =  options.read_pattern;
        } else {
            this.read_pattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
        }
        if (typeof options.read_replace != 'undefined') {
            this.read_replace =  options.read_replace;
        } else {
            this.read_replace = '$3/$2/$1';
        }
    },

    /**
     *
     * @param value
     * @returns {*}
     */
    filter: function (value) {
        return this.filterForWrite(value);
    },

    /**
     * filtra value per la scrittura sul model
     *
     * @param value
     * @returns {*}
     */
    filterForWrite: function (value) {
        var pattern =this.write_pattern;
        if (_.isString(value)) {
            if (pattern.test(value)) {
                var replaced = value.replace(pattern, this.write_replace);
                return replaced;
            }
        }
        return value;

    },
    /**
     * filtra value per la scrittura sul model
     *
     * @param value
     * @returns {*}
     */
    filterForRead: function (value) {
        var pattern =this.read_pattern;
        if (_.isString(value) && pattern.test(value)) {
            var replaced = value.replace(pattern, this.read_replace);
            return replaced;
        }
        return value;

    },
    /**
     * listener dell'evento editor.set.value
     *
     * @param e
     */
    onEditorSetValue: function (e) {
        this.$el.removeClass('has-error');
        this.$el.find('.help-block.data-error').empty();
        var value = this.filterForRead(e.value);
        this.writeValue(value)

    }

});
module.exports = DateTextEditorView;
},{"./TextEditorView":8}],5:[function(require,module,exports){
'use strict';


/**
 * specs:
 *
 */
var FormFieldEditorView = require('../../FormFieldEditorView');

var ReadOnlyEditorView = FormFieldEditorView.extend({
    tagName: 'div',
    template: _.template('\
      <label class="<%= attributes.label_class %> control-label" for="<%= editorId %>"><%= title %></label>\
      <div class="<%= attributes.field_class %>">\
        <div class="<%= attributes.form_control_class %> form-control data-editor " id="<%= editorId %>" readonly></div>\
        <p class="<%= attributes.data_error_class %> help-block data-error"></p>\
        <p class="<%= attributes.help_block_class %>help-block"><%= help %></p>\
      </div>\
    '),


    view_attributes: {
        label_class: 'col-md-3',
        field_class: 'col-md-9',
        form_control_class: '',
        data_error_class: '',
        help_block_class: ''
    },

    /**
     *
     * @param options
     */
    initialize: function (options) {
        FormFieldEditorView.prototype.initialize.call(this, options);
        if (typeof options.key != 'undefined') {
            this.key = options.key;
        } else {
            throw new Error("editor bootstrap/InputTextEditorView option obbligatoria non definita: 'key' equivalente all'attrib nel model")
        }
        this.title = (typeof options.title != 'undefined') ? options.title : this.key;
        this.help = (typeof options.help != 'undefined') ? options.help : '';

        this.initAttributes(options);
        this.bind('editor.set.value', this.onEditorSetValue, this);
        this.bind('editor.render', this.onEditorRender, this);
        this.bind('editor.model.error', this.onEditorModelError, this);
        this.model.bind('model.commit.success', this.onEditorModelSuccess, this);
        this.render(this.cid);
    },

    /**
     * inizializza gli attributes dell'editor
     * @param options
     */
    initAttributes: function (options) {
        this.attributes = (typeof options.attributes != 'undefined') ? options.attributes : this.attributes;
        if (_.has(this.attributes, 'class')) {
            if (!/(form-group)/.test(this.attributes.class)) {
                this.attributes.class = 'form-group ' + this.attributes.class;
            }
        } else {
            _.extend(this.attributes, {class: 'form-group'});
        }
        _.extend(this.attributes, {"data-field": this.key});

    },

    /**
     * sul commit del model si sono verificati errori ed il model ha emesso il relativo evento
     *
     * @param e
     */
    onEditorModelError: function (e) {
        this.$el.addClass('has-error');

        this.$el.find('.help-block.data-error').empty();

        _.mapObject(e.messages, function (val, key) {
            var message = document.createElement('div');
            var text = document.createTextNode(val);
            message.appendChild(text);
            this.$el.find('.help-block.data-error').append(message);
        }, this);

    },

    /**
     * commit del model avvenuto con successo
     *
     * @param e
     */
    onEditorModelSuccess: function (e) {
        this.$el.removeClass('has-error');
        this.$el.addClass('has-success');

    },

    /**
     * listener dell'evento editor.render
     *
     * @param e
     */
    onEditorRender: function (e) {
        this.$el.empty();
        var data = {
            name: this.name,
            key: this.key,
            title: this.title,
            help: this.help,
            editorId: this.name + this.model.cid,
            attributes: this.view_attributes
        };
        this.$el.attr(this.attributes);
        this.$el.html(this.template(data));
        this.setValue(this.model.get(this.key));
    },

    /**
     * listener dell'evento editor.set.value
     *
     * @param e
     */
    onEditorSetValue: function (e) {
        this.$el.removeClass('has-error');
        this.$el.find('.help-block.data-error').empty();
        this.writeValue(e.value)
    },

    /**
     * evento generico
     *
     * @param e
     */
    onEvent: function (e) {
        this.trigger('editor.event', this);
        this.trigger('editor.text.event', this);
    }


});
module.exports = ReadOnlyEditorView;
},{"../../FormFieldEditorView":1}],6:[function(require,module,exports){
'use strict';


/**
 * specs:
 *
 */
var BaseView = require('../../FormFieldEditorView');

/**
 * genera una select con le options statiche
 *
 */
var SelectEditorView = BaseView.extend({
    tagName: 'div',
    template: _.template('\
      <label class="<%= attributes.label_class %> control-label" for="<%= editorId %>"><%= title %></label>\
      <div class="<%= attributes.field_class %>">\
        <select class="<%= attributes.form_control_class %> form-control data-editor" id="<%= editorId %>" <%=\
         disabled%> >\
         <% for(i=0;i < options.length;i++){ %>\
         <% var option=options[i]; %>\
         <option value="<%= option.value %>"><%= option.option %></option>\
         <% }%>\
        </select>\
        <p class="<%= attributes.data_error_class %> help-block data-error"></p>\
        <p class="<%= attributes.help_block_class %>help-block"><%= help %></p>\
      </div>\
    '),
    options: [],
    label: 'label',
    initialize: function (options) {
        BaseView.prototype.initialize.call(this, options);
        if (typeof options.key != 'undefined') {
            this.key = options.key;
        } else {
            throw new Error("editor bootstrap/SelectEditorView option obbligatoria non definita: 'key' equivalente all'attrib nel model")
        }
        if (typeof options.readonly != 'undefined' && options.readonly === true) {
            this.readonly=true;
        }
        this.name = (typeof options.name != 'undefined')? options.name : this.key;

        this.title = (typeof options.title != 'undefined') ? options.title : this.key;

        if (typeof options.label != 'undefined') {
            this.label = options.label;
        }
        this.initAttributes(options);
        this.bind('editor.render', this.onEditorRender, this);
        this.bind('editor.event', this.onEditorEvent, this);
        this.bind('editor.model.error', this.onEditorModelError, this);
        this.bind('editor.set.value', this.onEditorSetValue, this);
        this.model.bind('model.commit.success', this.onEditorModelSuccess, this);
        this.setSelectOptions(options);
    },

    /**
     * inizializza gli attributes dell'editor
     * @param options
     */
    initAttributes: function (options) {
        this.attributes = (typeof options.attributes != 'undefined') ? options.attributes : this.attributes;
        if (_.has(this.attributes, 'class')) {
            if (!/(form-group)/.test(this.attributes.class)) {
                this.attributes.class = 'form-group ' + this.attributes.class;
            }
        } else {
            _.extend(this.attributes, {class: 'form-group'});
        }
        _.extend(this.attributes, {"data-field": this.key});

    },

    /**
     *
     * @param options
     */
    setSelectOptions: function (options) {
        if (typeof options.options == 'undefined') {
            return;
        }
        this.options.push({value: '', option: '---'});
        _.each(options.options, function (option) {
            if (typeof option == 'string') {
                this.options.push({value: option, option: option});
            } else if (typeof option == 'object') {
                this.options.push({value: option.value, option: option.option});
            }
        }, this);
        this.render(this.cid);

    },

    /**
     * listener dell'evento editor.render
     *
     * @param e
     */
    onEditorRender: function (e) {
        var data = {
            name: this.name,
            key: this.key,
            title: this.title, label: this.label,
            help: this.help,
            editorId: this.name + this.model.cid,
            attributes: this.view_attributes,
            options: this.options,
            disabled: (this.readonly)?'disabled ':''
        };
        this.$el.attr(this.attributes);
        this.$el.html(this.template(data));
        this.setValue(this.model.get(this.key));
    },

    /**
     * listener dell'evento editor.set.value
     *
     * @param e
     */
    onEditorSetValue: function (e) {
        this.$el.removeClass('has-error');
        this.$('.help-block.data-error').empty();

        this.$el.find("option[value='" + e.value + "']").attr('selected', 'selected');
    },

    /**
     * sul commit del model si sono verificati errori ed il model ha emesso il relativo evento
     *
     * @param e
     */
    onEditorModelError: function (e) {
        this.$el.addClass('has-error');
        this.$('.help-block .data-error').empty();

        _.mapObject(e.messages, function (val, key) {
            var message = document.createElement('div');
            var text = document.createTextNode(val);
            message.appendChild(text);
            this.$('.help-block.data-error').append(message);
        }, this);

    },

    /**
     * commit del model avvenuto con successo
     *
     * @param e
     */
    onEditorModelSuccess: function (e) {
        this.$el.removeClass('has-error');
        this.$el.addClass('has-success');

    }
});
module.exports = SelectEditorView;
},{"../../FormFieldEditorView":1}],7:[function(require,module,exports){
'use strict';


/**
 * specs:
 *
 */
var BaseView = require('../../FormFieldEditorView');

/**
 * genera una select con le options basate su una collection
 *
 */
var SelectModelEditorView;
SelectModelEditorView = BaseView.extend({
    tagName: 'div',
    template: _.template('\
      <label class="<%= attributes.label_class %> control-label" for="<%= editorId %>"><%= title %></label>\
      <div class="<%= attributes.field_class %>">\
        <select class="<%= attributes.form_control_class %> form-control data-editor" id="<%= editorId %>">\
         <% for(i=0;i < options.length;i++){ %>\
         <% var option=options[i]; %>\
         <option value="<%= option.value %>"><%= option.option %></option>\
         <% }%>\
        </select>\
        <p class="<%= attributes.data_error_class %> help-block data-error"></p>\
        <p class="<%= attributes.help_block_class %>help-block"><%= help %></p>\
      </div>\
    '),
    options: [],
    label: 'label',
    initialize: function (options) {
        BaseView.prototype.initialize.call(this, options);
        if (typeof options.key != 'undefined') {
            this.key = options.key;
        } else {
            throw new Error("editor bootstrap/SelectModelEditorView option obbligatoria non definita: 'key' equivalente all'attrib nel model")
        }
        this.name = (typeof options.name != 'undefined') ? options.name : this.key;

        // if (!options.collection.prototype instanceof Backbone.Collection) {
        //     throw new Error("editor bootstrap/SelectModelEditorView option deve essere un model");
        //     return;
        // }
        this.title = (typeof options.title != 'undefined') ? options.title : this.key;

        if (typeof options.label != 'undefined') {
            this.label = options.label;
        }
        this.initAttributes(options);

        this.key_value = options.key_value;
        this.key_option = options.key_option;

        this.bind('editor.render', this.onEditorRender, this);
        this.bind('editor.event', this.onEditorEvent, this);
        this.bind('editor.model.error', this.onEditorModelError, this);
        this.bind('editor.set.value', this.onEditorSetValue, this);
        this.model.bind('model.commit.success', this.onEditorModelSuccess, this);
        if (_.isObject(this.collection)) {
            var fetch_data = (typeof options.fetch_data != 'undefined') ? options.fetch_data : {};
            this.setCollection({data: fetch_data});
        } else {
            this.setSelectOptions();
        }
    },

    /**
     * inizializza gli attributes dell'editor
     * @param options
     */
    initAttributes: function (options) {
        this.attributes = (typeof options.attributes != 'undefined') ? options.attributes : this.attributes;
        if (_.has(this.attributes, 'class')) {
            if (!/(form-group)/.test(this.attributes.class)) {
                this.attributes.class = 'form-group ' + this.attributes.class;
            }
        } else {
            _.extend(this.attributes, {class: 'form-group'});
        }
        _.extend(this.attributes, {"data-field": this.key});

    },

    /**
     *
     * @param options
     */
    setSelectOptions: function (options) {
        // _.each(this.options, function (row) {
        //     row.remove();
        // }, this);
        this.options = [];
        this.options.push({value: '', option: '---'});
        if (_.isObject(this.collection)) {

            _.each(this.collection.models, function (model) {
                var option_value = model.get(this.key_value);
                if (typeof this.key_option == 'string') {
                    var option_option = model.get(this.key_option);
                } else if (typeof this.key_option == 'object') {
                    var option_option = this.key_option.reduce(function (prev, curr) {
                        var a = model.get(prev);
                        var b = model.get(curr);
                        return a + ' ' + b;
                    });
                } else if (typeof this.key_option == 'function') {
                    var option_option = this.key_option(model);
                }
                this.options.push({value: option_value, option: option_option,});

            }, this);
        }
        this.render(this.cid);

    },

    /**
     * listener dell'evento editor.render
     *
     * @param e
     */
    onEditorRender: function (e) {
        // console.log({'onEditorRender':e});
        var data = {
            name: this.name,

            key: this.key,
            title: this.title, label: this.label,
            help: this.help,
            editorId: this.name + this.model.cid,
            attributes: this.view_attributes,
            options: this.options
        };

        this.$el.attr(this.attributes);
        this.$el.html(this.template(data));
        this.setValue(this.model.get(this.key));
    },

    /**
     * listener dell'evento editor.set.value
     *
     * @param e
     */
    onEditorSetValue: function (e) {
        this.$el.removeClass('has-error');
        this.$('.help-block.data-error').empty();

        this.$el.find("option[value='" + e.value + "']").attr('selected', 'selected');
    },
    /**
     * sul commit del model si sono verificati errori ed il model ha emesso il relativo evento
     *
     * @param e
     */
    onEditorModelError: function (e) {
        this.$el.addClass('has-error');
        this.$('.help-block .data-error').empty();

        _.mapObject(e.messages, function (val, key) {
            var message = document.createElement('div');
            var text = document.createTextNode(val);
            message.appendChild(text);
            this.$('.help-block.data-error').append(message);
        }, this);

    },

    /**
     * commit del model avvenuto con successo
     *
     * @param e
     */
    onEditorModelSuccess: function (e) {
        this.$el.removeClass('has-error');
        this.$el.addClass('has-success');

    },

    /**
     * options can contain data for fetch and collection
     *
     */
    setCollection: function (options) {

        if (_.isObject(this.collection)) {
            this.collection.off();
        }
        if (_.isObject(options.collection)) {
            this.collection = options.collection;
        }
        if (_.isObject(this.collection)) {
            this.collection.bind('sync', this.setSelectOptions, this);
            this.collection.fetch(options.data);
        }


    }

});
module.exports = SelectModelEditorView;
},{"../../FormFieldEditorView":1}],8:[function(require,module,exports){
'use strict';


/**
 * specs:
 *
 */
var TextEditorTemplate = require('./template/TextEditorTemplate.html');
var ReadOnlyTextEditorTemplate = require('./template/ReadOnlyTextEditorTemplate.html');
var FormFieldEditorView = require('../../FormFieldEditorView');

var TextEditorView = FormFieldEditorView.extend({
    tagName: 'div',
    template: _.template(TextEditorTemplate),

    view_attributes: {
        label_class: 'col-md-3',
        field_class: 'col-md-9',
        form_control_class: '',
        data_error_class: '',
        help_block_class: ''
    },


    /**
     *
     * @param options
     */
    initialize: function (options) {
        FormFieldEditorView.prototype.initialize.call(this, options);
        if (typeof options.key != 'undefined') {
            this.key = options.key;
        } else {
            throw new Error("editor bootstrap/InputTextEditorView option obbligatoria non definita: 'key' equivalente all'attrib nel model")
        }
        if (typeof options.readonly != 'undefined' && options.readonly === true) {
            this.readonly = true;
            this.template = _.template(ReadOnlyTextEditorTemplate);
        }

        this.title = (typeof options.title != 'undefined') ? options.title : this.key;
        this.help = (typeof options.help != 'undefined') ? options.help : '';

        this.initAttributes(options);
        this.bind('editor.set.value', this.onEditorSetValue, this);
        this.bind('editor.render', this.onEditorRender, this);
        this.bind('editor.model.error', this.onEditorModelError, this);
        this.model.bind('model.commit.success', this.onEditorModelSuccess, this);
        this.render(this.cid);
    },

    /**
     * inizializza gli attributes dell'editor
     * @param options
     */
    initAttributes: function (options) {
        this.attributes = (typeof options.attributes != 'undefined') ? options.attributes : this.attributes;
        if (_.has(this.attributes, 'class')) {
            if (!/(form-group)/.test(this.attributes.class)) {
                this.attributes.class = 'form-group ' + this.attributes.class;
            }
        } else {
            _.extend(this.attributes, {class: 'form-group'});
        }
        _.extend(this.attributes, {"data-field": this.key});

    },

    /**
     * sul commit del model si sono verificati errori ed il model ha emesso il relativo evento
     *
     * @param e
     */
    onEditorModelError: function (e) {
        this.$el.addClass('has-error');

        this.$el.find('.help-block.data-error').empty();

        _.mapObject(e.messages, function (val, key) {
            var message = document.createElement('div');
            var text = document.createTextNode(val);
            message.appendChild(text);
            this.$el.find('.help-block.data-error').append(message);
        }, this);

    },

    /**
     * commit del model avvenuto con successo
     *
     * @param e
     */
    onEditorModelSuccess: function (e) {
        this.$el.removeClass('has-error');
        this.$el.addClass('has-success');

    },

    /**
     * listener dell'evento editor.render
     *
     * @param e
     */
    onEditorRender: function (e) {
        this.$el.empty();
        var data = {
            name: this.name,
            key: this.key,
            title: this.title,
            help: this.help,
            editorId: this.name + this.model.cid,
            attributes: this.view_attributes,
            input_attributes: this.input_attributes
        };
        this.$el.attr(this.attributes);
        this.$el.html(this.template(data));
        this.setValue(this.model.get(this.key));
    },

    /**
     * scrive il valore etnendo conto del tipo di template caricato
     * @param value
     */
    writeValue: function (value) {
        if (this.readonly) {
            this.$('.data-editor').text(value);
        } else {
            this.$('.data-editor').val(value);
        }
    },
    /**
     *
     *
     */
    focus: function () {
        this.$('.data-editor').focus();
        this.trigger('editor.focus', this);

    },
    /**
     * listener dell'evento editor.set.value
     *
     * @param e
     */
    onEditorSetValue: function (e) {
        this.$el.removeClass('has-error');
        this.$el.find('.help-block.data-error').empty();
        this.writeValue(e.value);
    },


    /**
     * evento generico
     *
     * @param e
     */
    onEvent: function (e) {
        this.trigger('editor.event', this);
        this.trigger('editor.text.event', this);
    }


});
module.exports = TextEditorView;
},{"../../FormFieldEditorView":1,"./template/ReadOnlyTextEditorTemplate.html":9,"./template/TextEditorTemplate.html":10}],9:[function(require,module,exports){
module.exports = "<label class=\"<%= attributes.label_class %> control-label\" for=\"<%= editorId %>\"><%= title %></label>\n<div class=\"<%= attributes.field_class %>\">\n    <div class=\"<%= attributes.form_control_class %> form-control data-editor\" id=\"<%= editorId %>\" readonly></div>\n    <p class=\"<%= attributes.data_error_class %> help-block data-error\"></p>\n    <p class=\"<%= attributes.help_block_class %>help-block\"><%= help %></p>\n</div>\n";

},{}],10:[function(require,module,exports){
module.exports = "    <% var input_attributes_string = _.reduce(_.pairs(input_attributes), function(result, val){\n            return val[0]+': \\\"'+ val[1]+'\\\" ';\n    }) %>\n<label class=\"<%= attributes.label_class %> control-label\" for=\"<%= editorId %>\"><%= title %></label>\n<div class=\"<%= attributes.field_class %>\">\n    <input class=\"<%= attributes.form_control_class %> form-control data-editor\" id=\"<%= editorId %>\"\n    <%= input_attributes_string %>   >\n    <p class=\"<%= attributes.data_error_class %> help-block data-error\"></p>\n    <p class=\"<%= attributes.help_block_class %>help-block\"><%= help %></p>\n</div>";

},{}],11:[function(require,module,exports){
'use strict';

var Router = Backbone.Router.extend({
    initialize: function (options) {
        Backbone.Router.prototype.initialize.apply(this, [options]);
        this.model = options.model;
        if (typeof options.formView != 'undefined') {
            this.formView = options.formView;
        }

        if (typeof options.formTitle != 'undefined') {
            this.formTitle = options.formTitle;
        }

        _.each(Backbone.$('a.form-cancel'), function (element) {
            Backbone.$(element).bind('click', {this: this}, this.onFormCancel);
        }, this);
        this.model.on('sync', this.onModelSync, this);
        this.model.on('request', this.onRequest, this);
        this.bind('cancel', this.onFormCancel, this);
        this.listenTo(this.model, 'error', this.onModelError, this);

    },

    onFormCancel: function (e) {
        // var diff = this.history_length - history.length;
        // window.history.go(diff - 1);

    },

    /**
     * sulle request blocco l'interfaccia
     *
     * @param model
     * @param xhr
     * @param options
     */
    onRequest: function (model, xhr, options) {
        xhr.then(function () {
            App.unblockUI();
        });
        App.blockUI();
    },

    /**
     *
     * @param e
     */
    onModelSync: function (e) {
        Backbone.$('ul.page-breadcrumb > li > a.active').html(this.formTitle());
        Backbone.$('ul.page-breadcrumb > li > a.active').attr('href', window.location.href);
        Backbone.$('ul.page-breadcrumb > li > a.breadcrumb-grid').attr('href', 'javascript:history.back()');
    },
    formTitle: function (e) {
    },
    /**
     * listener dell'evento model change:[attribute]
     * @param response
     */
    onModelError: function (model, response, options) {
        if (response.status == 422) {
            var message = "<h4>Entità non processabile</h4>";
        } else {
            var message = "<h4>" + response.responseJSON.title + "</h4>";
        }
        message = message + "<h5>" + response.responseJSON.detail + "</h5>";
        var modal_options = {
            buttons: ['ok'],
            message: message
        };
        App.unblockUI();
        var modal = new BbTools.View.Modal.Responsive(modal_options);
        modal.show();
    },

});
module.exports = Router;

},{}],12:[function(require,module,exports){
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
            root.BbToolsForm = factory(root, exports);
        });

        // Next for Node.js or CommonJS.
    } else if (typeof exports !== 'undefined') {
        factory(root, exports);

        // Finally, as a browser global.
    } else {
        root.BbToolsForm = factory(root, {});
    }


})(function (root, BbToolsForm) {


    var BbToolsForm = {};
    BbToolsForm.editors = {};
    BbToolsForm.editors.TextEditorView = require('./Form/editors/bootstrap/TextEditorView');
    BbToolsForm.editors.DateTextEditorView = require('./Form/editors/bootstrap/DateTextEditorView');
    BbToolsForm.editors.SelectEditorView = require('./Form/editors/bootstrap/SelectEditorView');
    BbToolsForm.editors.SelectModelEditorView = require('./Form/editors/bootstrap/SelectModelEditorView');
    BbToolsForm.editors.ReadOnlyEditorView = require('./Form/editors/bootstrap/ReadOnlyEditorView');
    BbToolsForm.editors.ButtonEditorView = require('./Form/editors/ButtonEditorView');
    BbToolsForm.editors.ButtonCommitEditorView = require('./Form/editors/ButtonCommitEditorView');
    // BbToolsForm.BootstrapForm = require('./Form/BootstrapForm');
    // BbToolsForm.BootstrapForm.editors.DateText = require('./Form/editors/datetext');
    BbToolsForm.Router = require('./Router/CrudFormRouter');


    BbToolsForm.init = function () {
    };


    root.BbToolsForm = BbToolsForm;
    return BbToolsForm;
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Form/editors/ButtonCommitEditorView":2,"./Form/editors/ButtonEditorView":3,"./Form/editors/bootstrap/DateTextEditorView":4,"./Form/editors/bootstrap/ReadOnlyEditorView":5,"./Form/editors/bootstrap/SelectEditorView":6,"./Form/editors/bootstrap/SelectModelEditorView":7,"./Form/editors/bootstrap/TextEditorView":8,"./Router/CrudFormRouter":11}]},{},[12]);
