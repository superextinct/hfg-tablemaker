/**
 * Table Maker plugin for Craft CMS
 *
 *  Field JS
 *
 * @author    Supercool Ltd
 * @copyright Copyright (c) 2018 Supercool Ltd
 * @link      http://www.supercooldesign.co.uk/
 * @package   TableMaker
 * @since     1.0.0TableMaker
 */

 ;(function ( $, window, document, undefined ) {

    var pluginName = "TableMaker",
        defaults = {
        };

    // Plugin constructor
    function Plugin( element, options ) {
        this.element = element;

        this.options = $.extend( {}, defaults, options) ;

        this._defaults = defaults;
        this._name = pluginName;

        this.init();
    }

    Plugin.prototype = {

        init: function(id) {
            var _this = this;

            $(function () {

/* -- _this.options gives us access to the $jsonVars that our FieldType passed down to us */

            });
        }
    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function ( options ) {
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName,
                new Plugin( this, options ));
            }
        });
    };



/**
 * TableMaker Class
 *
 * An awful lot of this is taken directly from TableFieldsSettings.js
 */
Craft.TableMaker = Garnish.Base.extend(
{

    columnsTableId: null,
    rowsTableId: null,
    columnsTableName: null,
    rowsTableName: null,
    columnsTableInputPath: null,
    rowsTableInputPath: null,
    columns: null,
    rows: null,
    columnSettings: null,
    fieldId: null,

    columnsTable: null,
    rowsTable: null,

    $columnsTable: null,
    $rowsTable: null,
    $input: null,

    init: function(fieldId, columnsTableId, rowsTableId, columnsTableName, rowsTableName, columns, rows, columnSettings)
    {

        this.columnsTableId = columnsTableId;
        this.rowsTableId = rowsTableId;

        this.columnsTableName = columnsTableName;
        this.rowsTableName = rowsTableName;

        this.columnsTableInputPath = this.columnsTableId.split('-');
        this.rowsTableInputPath = this.rowsTableId.split('-');

        this.columns = columns;
        this.rows = rows;

        this.columnSettings = columnSettings;
        this.fieldId = fieldId


        this.$columnsTable = $('#'+this.columnsTableId);
        this.$rowsTable = $('#'+this.rowsTableId);
        this.$input = $('#'+fieldId+'-field').find('input.table-maker-field');


        // set up columns table
        this.initColumnsTable();

        // set up rows table
        this.initRowsTable();

        // make the data blob
        this.makeDataBlob();

    },

    onColumnsAddRow: function()
    {

        this.bindColumnsTableChanges();
        this.reconstructRowsTable();

    },

    onRowsAddRow: function()
    {

        this.bindRowsTableTextChanges();
        this.makeDataBlob();

    },

    bindColumnsTableChanges: function()
    {

        // text changes
        var $textareas = this.columnsTable.$tbody.find('textarea');
        this.addListener($textareas, 'textchange', 'reconstructRowsTable');

        // select changes
        var $selects = this.columnsTable.$tbody.find('select');
        this.addListener($selects, 'change', 'reconstructRowsTable');

    },

    bindRowsTableTextChanges: function()
    {

        var $textareas = this.rowsTable.$tbody.find('textarea');
        this.addListener($textareas, 'textchange', 'makeDataBlob');

    },

    initColumnsTable: function()
    {

        this.columnsTable = new Craft.EditableTable(this.columnsTableId, this.columnsTableName, this.columnSettings, {
            rowIdPrefix: 'col',
            onAddRow: $.proxy(this, 'onColumnsAddRow'),
            onDeleteRow: $.proxy(this, 'reconstructRowsTable')
        });

        this.bindColumnsTableChanges();

        this.columnsTable.sorter.settings.onSortChange = $.proxy(this, 'reconstructRowsTable');

    },

    initRowsTable: function()
    {

        this.rowsTable = new Craft.EditableTable(this.rowsTableId, this.rowsTableName, this.columns, {
            rowIdPrefix: 'row',
            onAddRow: $.proxy(this, 'onRowsAddRow'),
            onDeleteRow: $.proxy(this, 'makeDataBlob')
        });

        this.bindRowsTableTextChanges();

        this.rowsTable.sorter.settings.onSortChange = $.proxy(this, 'makeDataBlob');

    },

    reconstructRowsTable: function()
    {

        // get data
        this.getDataFromTables();

        // prep table
        var tableHtml = '<thead>' +
                 '<tr>';

        // re-do columns of rowsTable
        for (var colId in this.columns)
        {
            if (this.columns[colId].type == 'url') {
                this.columns[colId].placeholder = 'http://';
            }

            tableHtml += '<th scope="col" class="header">'+(this.columns[colId].heading ? this.columns[colId].heading : '&nbsp;')+'</th>';
        }

        tableHtml += '<th class="header" colspan="2"></th>' +
                 '</tr>' +
             '</thead>';

        var $table = $('<table/>', {
                id: this.rowsTableId,
                'class': 'editable shadow-box'
            }).append(tableHtml);

        var $tbody = $('<tbody/>').appendTo($table);

        // merge in the current rows content
        for (var rowId in this.rows)
        {
            if (!this.rows.hasOwnProperty(rowId)) {
                continue;
            }

            Craft.EditableTable.createRow(rowId, this.columns, this.rowsTableName, this.rows[rowId]).appendTo($tbody);
        }


        this.rowsTable.$table.replaceWith($table);
        this.rowsTable.destroy();
        delete this.rowsTable;
        this.initRowsTable(this.columns);
        this.makeDataBlob();
    },

    getDataFromTables: function()
    {

        // get data out from the tables
        var columns = Craft.expandPostArray(Garnish.getPostData(this.columnsTable.$tbody)),
                rows = Craft.expandPostArray(Garnish.getPostData(this.rowsTable.$tbody));

        // travel down the input paths to find where the data we’re interested in actually is

        if ( ! $.isEmptyObject(columns) )
        {

            for (var i = 0; i < this.columnsTableInputPath.length; i++)
            {
                var key = this.columnsTableInputPath[i];
                columns = columns[key];
            }

        }

        this.columns = columns;

        if ( ! $.isEmptyObject(rows) )
        {

            for (var i = 0; i < this.rowsTableInputPath.length; i++)
            {
                var key = this.rowsTableInputPath[i];
                rows = rows[key];
            }

        }

        this.rows = rows;

    },

    makeDataBlob: function()
    {

        // get data
        this.getDataFromTables();

        var dataBlob = {
            'columns' : this.columns,
            'rows' : this.rows
        };

        this.$input.val(JSON.stringify(dataBlob));
    }

});




})( jQuery, window, document );
