// =============================================================================
// Json data manipulation class
// =============================================================================

class Json extends EventTarget {
    #eventUpdated = null;
    #path = null;
    #data = null;

    // -------------------------------------------------------------------------
    // Constructor/destructor
    // -------------------------------------------------------------------------

    /**
     * Constructor of the class.
     *
     * @param {String} path The path of the JSON file to be loaded.
     */
    constructor(path) {
        super();

        this.#eventUpdated = new CustomEvent(EVENT.UPDATED);

        this.#path = path;

        this.load();
    }

    // -------------------------------------------------------------------------
    // Public
    // -------------------------------------------------------------------------

    /**
     * Return validity status of the data.
     *
     * @return {bool} true if data are valid, false otherwise.
     */
    isValid() {
        if(!this.#data) {
            return false;
        }

        if(!this.#data.configuration) {
            return false;
        }

        if(!this.#data.groups) {
            return false;
        }

        if(!this.#data.items) {
            return false;
        }

        if(!this.#data.item_categories) {
            return false;
        }

        if(!this.#data.eras) {
            return false;
        }

        if(!this.#data.markers) {
            return false;
        }

        return true;
    }

    /**
     * Load or reload the data from the filesystem.
     */
    load() {
        try {
            this.#data = JSON.parse(Utils.read(this.#path, MIMETYPE.JSON));

            this.#sortGroups();
        }
        catch(error) {
            this.#data = {};
        };

        // Add missing fields
        if(!this.#data.configuration) {
            this.#data.configuration = {};
        }

        if(!this.#data.groups) {
            this.#data.groups = [];
        }

        if(!this.#data.items) {
            this.#data.items = [];
        }

        if(!this.#data.item_categories) {
            this.#data.item_categories = {};
        }

        if(!this.#data.markers) {
            this.#data.markers = {};
        }

        if(!this.#data.eras) {
            this.#data.eras = [];
        }

        // Notify
        this.dispatchEvent(this.#eventUpdated);
    }

    /**
     * Save the data to the filesystem.
     *
     * @param {String} path The path of the JSON file where the data should be
     *                      written.
     */
    save(path) {
        const indent = 2;

        Utils.download(
            JSON.stringify(this.data, null, indent),
            path,
            MIMETYPE.JSON);
    }

    /**
     * Find a group by its ID and remove it from the list.
     *
     * @param  {String} id     Unique identifier of the group to be removed.
     * @param  {Object} parent Parent from which perform the search. If passing
     *                         null, then the search is performed from the root
     *                         of the groups tree.
     *
     * @return {Bool}          True if the group has been removed, false
     *                         otherwise.
     */
    removeGroup(id, parent = null) {
        var groups = parent === null ? this.data.groups : parent.childs;

        for(var index = 0; index < groups.length; index++) {
            var group = groups[index];

            if(group.id === id) {
                groups.splice(index, 1);

                this.dispatchEvent(this.#eventUpdated);
                return true;
            }

            const removed = this.removeGroup(id, group);
            if(removed) {

                this.dispatchEvent(this.#eventUpdated);
                return true;
            }
        }

        return false;
    }

    /**
     * Add a new group.
     *
     * The group is placed at the end of the list of groups.
     *
     * @param  {String} name Name of the group to be added.
     *
     * @return {Bool}        True if the group has been added, false otherwise.
     */
    addGroup(name) {
        if(!name) {
            return false;
        }

        this.data.groups.push({
          id: uuidv4(),
          name: name,
          category: '',
          position: this.data.groups.length + 1,
          visible: true,
          childs: []
        });

        this.dispatchEvent(this.#eventUpdated);
        return true;
    }

    /**
     * Find a group by its ID and rename it.
     *
     * @param  {String} id     Unique identifier of the group to be renamed.
     * @param  {String} name   New name to be set.
     * @param  {Object} parent Parent from which perform the search. If passing
     *                         null, then the search is performed from the root
     *                         of the groups tree.
     *
     * @return {Bool}          True if the group has been renamed, false
     *                         otherwise.
     */
    renameGroup(id, name, parent = null) {
        if(!name) {
            return false;
        }

        var groups = parent === null ? this.data.groups : parent.childs;

        for(var index = 0; index < groups.length; index++) {
            var group = groups[index];

            if(group.id === id) {
                group.name = name;

                this.dispatchEvent(this.#eventUpdated);
                return true;
            }

            const renamed = this.renameGroup(id, name, group);
            if(renamed) {
                this.dispatchEvent(this.#eventUpdated);
                return true;
            }
        }

        return false;
    }

    /**
     * Find a group by its ID and toggle its visibility.
     *
     * @param  {String} id     Unique identifier of the group to be toggled.
     * @param  {Object} parent Parent from which perform the search. If passing
     *                         null, then the search is performed from the root
     *                         of the groups tree.
     *
     * @return {Bool}          True if the group visibility has been toggled,
     *                         false otherwise.
     */
    toggleGroupVisibility(id, parent = null) {
        var groups = parent === null ? this.data.groups : parent.childs;

        for(var index = 0; index < groups.length; index++) {
            var group = groups[index];

            if(group.id === id) {
                group.visible = !group.visible;

                this.dispatchEvent(this.#eventUpdated);
                return true;
            }

            const toggled = this.toggleGroupVisibility(id, group);
            if(toggled) {
                this.dispatchEvent(this.#eventUpdated);
                return true;
            }
        }

        return false;
    }

    /**
     * Add a new item in list.
     *
     * @param  {Object} data Item data to be added.
     *
     * @return {Bool}        True if the item has been added, false otherwise.
     */
    addItem(data) {
        if(!data) {
            return false;
        }

        if(!('id' in data)) {
            return false;
        }

        // First check if the item is not already in list
        for(var index = 0; index < this.data.items.length; index++) {
            if(this.data.items[index].id === data.id) {
                return false;
            }
        }

        this.data.items.push(data);

        // Add its category if needed
        if('className' in data &&
           !(data.className in this.data.item_categories)) {

            this.data.item_categories[data.className] =
                Object.assign({}, VIS.ITEM.DEFAULT_STYLE);
        }

        this.dispatchEvent(this.#eventUpdated);
        return true;
    }

    /**
     * Find an item by its ID and update it.
     *
     * @param  {Object} data New item data to be set.
     *
     * @return {Bool}        True if the item has been updated, false
     *                       otherwise.
     */
    updateItem(data) {
        if(!data) {
            return false;
        }

        if(!('id' in data)) {
            return false;
        }

        for(var index = 0; index < this.data.items.length; index++) {
            var item = this.data.items[index];
            if(item.id !== data.id) {
                continue;
            }

            if('group' in data) {
                item.group = data.group;
            }

            if('content' in data) {
                item.content = data.content;
            }

            if('className' in data) {
                if(!(data.className in this.data.item_categories)) {
                    this.data.item_categories[data.className] =
                        Object.assign({}, VIS.ITEM.DEFAULT_STYLE);;
                }
            }

            if('start' in data) {
                item.start = data.start;
            }

            if('end' in data) {
                item.end = data.end;
            }

            if('type' in data) {
                item.type = data.type;
            }

            if('className' in data) {
                item.className = data.className;
            }

            if('description' in data) {
                item.description = data.description;
            }

            this.dispatchEvent(this.#eventUpdated);
            return true;
        }

        return false;
    }

    /**
     * Remove an item from list.
     *
     * @param  {Object} data Item data to be removed.
     *
     * @return {Bool}        True if the item has been removed, false otherwise.
     */
    removeItem(data) {
        if(!data) {
            return false;
        }

        if(!('id' in data)) {
            return false;
        }

        for(var index = 0; index < this.data.items.length; index++) {
            var item = this.data.items[index];
            if(item.id !== data.id) {
                continue;
            }

            this.data.items.splice(index, 1);

            this.dispatchEvent(this.#eventUpdated);
            return true;
        }

        return false;
    }

    /**
     * Add a marker to the list.
     *
     * @param {String} uuid Unique id of the marker.
     * @param {String} name Name of the marker.
     * @param {Date}   date Date of the marker.
     *
     * @return {Bool}       True if the marker has been added, false otherwise.
     */
    addMarker(uuid, name, date) {
        if(uuid in this.data.markers) {
            return false;
        }

        this.data.markers[uuid] = {
            name: name,
            date: date,
        };

        return true;
    }

    /**
     * Remove a marker from the list.
     *
     * @param {String} uuid Unique id of the marker.
     *
     * @return {Bool}       True if the marker has been removed, false
     *                      otherwise.
     */
    removeMarker(uuid) {
        if(!(uuid in this.data.markers)) {
            return false;
        }

        delete this.data.markers[uuid];

        return true;
    }

    /**
     * Update a marker from the list.
     *
     * @param {String} uuid Unique id of the marker.
     * @param {String} name Name of the marker.
     * @param {Date}   date Date of the marker.
     *
     * @return {Bool}       True if the marker has been updated, false
     *                      otherwise.
     */
    updateMarker(uuid, name, date) {
        if(!(uuid in this.data.markers)) {
            return false;
        }

        if(name) {
            this.data.markers[uuid].name = name;
        }

        if(date) {
            this.data.markers[uuid].date = date;
        }

        return true;
    }

    /**
     * Get an era in the list.
     *
     * @param {String}] uuid Unique id of the era to get
     *
     * @return {Object}      An object or null if the id is not found.
     */
    getEra(uuid) {
        if(uuid in this.data.eras) {
            return this.data.eras[uuid];
        }

        return null;
    }

    /**
     * Add an era to the list.
     *
     * @param {String} uuid      Unique id of the era.
     * @param {String} text      Text of the era
     * @param {Date}   startDate Start date of the era.
     * @param {Date}   endDate   End date of the era.
     * @param {String} color     Color of the era.
     *
     * @return {Bool}            True if the era has been added, false
     *                           otherwise.
     */
    addEra(uuid, text, startDate, endDate, color) {
        if(uuid in this.data.eras) {
            return false;
        }

        this.data.eras[uuid] = {
            text: text,
            start: startDate,
            end: endDate,
            color: color,
            visible: true,
        };

        return true;
    }

    /**
     * Remove an era from the list.
     *
     * @param {String} uuid Unique id of the era.
     *
     * @return {Bool}       True if the era has been removed, false otherwise.
     */
    removeEra(uuid) {
        if(!(uuid in this.data.eras)) {
            return false;
        }

        delete this.data.eras[uuid];

        return true;
    }

    /**
     * Update an era from the list.
     *
     * @param {String} uuid      Unique id of the era.
     * @param {String} text      Text of the era
     * @param {Date}   startDate Start date of the era.
     * @param {Date}   endDate   End date of the era.
     * @param {String} color     Color of the era.
     *
     * @return {Bool}            True if the era has been updated, false
     *                           otherwise.
     */
    updateEra(uuid, text, startDate, endDate, color) {
        if(!(uuid in this.data.eras)) {
            return false;
        }

        if(text) {
            this.data.eras[uuid].text = text;
        }

        if(startDate) {
            this.data.eras[uuid].start = startDate;
        }

        if(endDate) {
            this.data.eras[uuid].end = endDate;
        }

        if(color) {
            this.data.eras[uuid].color = color;
        }

        return true;
    }

    /**
     * Find an era by its ID and toggle its visibility.
     *
     * @param  {String} uuid Unique identifier of the era to be toggled.
     *
     * @return {Bool}        True if the era visibility has been toggled, false
     *                       otherwise.
     */
    toggleEraVisibility(uuid) {
        if(!(uuid in this.data.eras)) {
            return false;
        }

        this.data.eras[uuid].visible = !this.data.eras[uuid].visible;

        return true;
    }

    // -------------------------------------------------------------------------
    // Getters/setters
    // -------------------------------------------------------------------------

    /**
     * Returns the internal data structure.
     *
     * @return {Object} Internal representation of the JSON data loaded from the
     *                  file.
     */
    get data() {
        return this.#data;
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    /**
     * Sort the list of groups in the data.
     *
     * @param {Object} groups Group object to be sorted. If null is provided,
     *                        then the root of the groups tree is used.
     */
    #sortGroups(groups = null) {
        if(groups === null) {
            groups = this.data.groups;
        }

        groups.sort(function(a, b) {
            if(a.position < b.position) return -1;
            if(a.position > b.position) return 1;

            return 0;
        });

        // Sort child groups
        for(var groupId = 0; groupId < groups.length; groupId++) {
            this.#sortGroups(groups[groupId].childs);
        }
    }
}

// =============================================================================
// Timeline graph management
// =============================================================================

class Timeline extends EventTarget {
    #groups = null;
    #items = null;
    #options = null;
    #timeline = null;
    #json = null;
    #readOnly = false;

    // -------------------------------------------------------------------------
    // Constructor/destructor
    // -------------------------------------------------------------------------

    /**
     * Constructor of the class.
     *
     * @param {Object} json The json data object to be displayed in the
     *                      timeline.
     */
    constructor(json) {
        super();

        this.#groups = new vis.DataSet();
        this.#items = new vis.DataSet();
        this.#options = this.#createOptions();
        this.#json = json;

        this.#timeline = new vis.Timeline(
            $e(HTML.ID.VIEW.TIMELINE.CONTAINER),
            this.#items,
            this.#groups,
            this.#options);

        this.#timeline.on(VIS.EVENT.DOUBLE_CLICK, (properties) => {
            this.#onDoubleClicked(properties);
        });

        this.#timeline.on(VIS.EVENT.MARKER_CHANGED, (properties) => {
            this.#onMarkerTitleChange(properties);
        });

        this.#timeline.on(VIS.EVENT.TIME_CHANGED, (properties) => {
            this.#onMarkerDateChange(properties);
        });

        this.refresh();

        this.#addMarkers();

        this.#updateRange();
    }

    // -------------------------------------------------------------------------
    // Public
    // -------------------------------------------------------------------------

    /**
     * Refresh the display using the JSON data.
     */
    refresh() {
        // Clear
        this.#groups.clear();
        this.#items.clear();

        if(this.#json && this.#json.isValid()) {
            // Set options
            if(this.#timeline) {
                var options = {
                    locale: this.#json.data.configuration.locale,
                };

                if(this.#json.data.configuration.startDate) {
                    options.start =
                        new Date(this.#json.data.configuration.startDate);
                }

                if(this.#json.data.configuration.endDate) {
                    options.end =
                        new Date(this.#json.data.configuration.endDate);
                }

                this.#timeline.setOptions(options);
            }

            // Add groups and items
            if(this.#json.data.groups) {
                this.#groups.add(this.#fromJsonGroups(this.#json.data.groups));
            }

            if(this.#json.data.items) {
                this.#items.add(this.#json.data.items);
            }

            for(const [id, data] of Object.entries(this.#json.data.eras)) {
                if(!data.visible) {
                    continue;
                }

                const start = new Date(data.start);
                const end = new Date(data.end);

                if(end.getTime() <= start.getTime()) {
                    console.error('Ignoring invalid era: ' + id)
                    continue;
                }

                this.#items.add({
                    id: id,
                    className: id,
                    content: data.text,
                    start: data.start,
                    end: data.end,
                    type: VIS.ITEM.TYPE.BACKGROUND,
                });
            }
        }

        // Update display
        if(this.#timeline) {
            this.#timeline.redraw();
        }
    }

    toggleLockStatus() {
        this.#readOnly = !this.#readOnly;

        if(!this.#timeline) {
            return;
        }

        this.#timeline.setOptions({
            editable: this.#readOnly ? false : true,
        });

        this.#updateMarkersLockStatus();

        this.refresh();
    }

    isLocked() {
        return this.#readOnly;
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    /**
     * Create the list of options for the Vis timeline graphical object.
     *
     * @return {Object} Set of options.
     */
    #createOptions() {
        return {
            // Debug
            configure: false,

            // Generic
            align: 'center',
            autoResize: true,
            clickToUse: false,
            editable: this.#readOnly ? false : true,
            groupEditable: true,
            groupHeightMode: 'auto',
            groupOrder: 'order',
            groupOrder: function(a, b) {
                return a.position - b.position;
            },
            horizontalScroll: true,
            locale: 'en_US',
            moveable: true,
            multiselect: false,
            orientation: 'both',
            preferZoom: false,
            selectable: true,
            showCurrentTime: true,
            showMajorLabels: true,
            showMinorLabels: true,
            showWeekScale: false,
            type: 'box',
            verticalScroll: false,
            zoomable: true,
            zoomFriction: 5,
            zoomKey: 'ctrlKey',

            // Callbacks
            onInitialDrawComplete: async () => {
                this.#updateMarkersLockStatus();
            },

            onAdd: async (item, callback) => {
                const itemAdded =
                    await showAddUpdateItemPopup('Add item', item);

                if(this.#json.addItem(itemAdded)) {
                    callback(itemAdded);
                }
            },

            onRemove: async (item, callback) => {
                const data = {
                    titleText: 'Remove item ?',
                    text: item.content,
                    showCancelButton: true,
                    showConfirmButton: true,
                    allowOutsideClick: true,
                    allowEscapeKey: true,
                    allowEnterKey: true,
                    reverseButtons: true,
                };

                const { value: status } = await Swal.fire(data);
                if(!status) {
                    callback(null);
                    return;
                }

                if(this.#json.removeItem(item)) {
                    callback(item);
                }
            },

            onUpdate: async (item, callback) => {
                const itemUpdated =
                    await showAddUpdateItemPopup('Update item', item);

                if(this.#json.updateItem(itemUpdated)) {
                    callback(itemUpdated);
                }
            },

            onMove: async (item, callback) => {
                if(this.#json.updateItem(item)) {
                    callback(item);
                }
            },
        };
    }

    /**
     * Converts JSON groups to Vis format.
     *
     * @param {Object} groups     Array of groups to be converted.
     * @param {Integer} treeLevel Current level in the tree of groups.
     * @param {Object} parent     Object of the parent group.
     *
     * @return {Array} List of Vis groups.
     */
    #fromJsonGroups(groups, treeLevel = 1, parent = null) {
        if(groups.constructor !== Array) {
            return [];
        }

        var flatGroups = [];

        for(var groupId = 0; groupId < groups.length; groupId++) {
            const group = groups[groupId];

            if(!group.visible)
            {
                continue;
            }

            // Create a Vis group entry
            var visGroup = {
                id: uuidv4(),
                treeLevel: treeLevel,
                content: group.name,
                className: group.category,
                position: group.position,
            };

            // Override id if provided
            if('id' in group) {
                visGroup.id = group.id;
            }

            // Update parent
            if(parent) {
                visGroup.nestedInGroup = parent.id;

                if(!('nestedGroups' in parent)) {
                    parent.nestedGroups = [];
                    parent.showNested = true;
                }

                parent.nestedGroups.push(visGroup.id);
            }

            // Parse childs
            const childsGroups =
                this.#fromJsonGroups(
                    group.childs,
                    treeLevel + 1,
                    visGroup);

            // Add entries
            flatGroups.push(visGroup);
            flatGroups = flatGroups.concat(childsGroups);
        }

        return flatGroups;
    }

    /**
     * Update the range of the timeline whenever something has changed.
     */
    #updateRange() {
        if(this.#json && this.#json.isValid()) {
            const range = this.#timeline.getItemRange();

            if(!this.#json.data.configuration.startDate) {
                const start = range.min ? range.min.getTime(): Date.now();
                this.#json.data.configuration.startDate = start;
            }

            if(!this.#json.data.configuration.endDate) {
                const end = range.max ? range.max.getTime(): Date.now();
                this.#json.data.configuration.endDate = end;
            }
        }
    }

    /**
     * Callback called when a double click occured on the timeline.
     *
     * @param {Object} properties Properties object describing the event.
     */
    #onDoubleClicked(properties) {
        if(this.#readOnly) {
            return;
        }

        if(properties.what === "custom-time") {
            const id = properties.customTime;

            // Remove from json
            if(!this.#json.removeMarker(id)) {
                return;
            }

            // Remove from timeline
            this.#timeline.removeCustomTime(id);
        }
        else if(properties.what === 'axis') {
            const id = uuidv4();
            const name = 'New event';
            const date = properties.time;

            // Add it in json
            if(!this.#json.addMarker(id, name, date)) {
                return;
            }

            // Add it in timeline
            this.#timeline.addCustomTime(properties.time, id);
            this.#timeline.setCustomTimeMarker(name, id, !this.isLocked());
        }
    }

    /**
     * Callback called when a marker text has changed.
     *
     * @param {Object} properties Properties object describing the event.
     */
    #onMarkerTitleChange(properties) {
        if(this.#readOnly) {
            return;
        }

        // Update in json
        this.#json.updateMarker(properties.id, properties.title, null);
    }

    /**
     * Callback called when a marker date has changed.
     *
     * @param {Object} properties Properties object describing the event.
     */
    #onMarkerDateChange(properties) {
        if(this.#readOnly) {
            return;
        }

        // Update in json
        this.#json.updateMarker(properties.id, null, properties.time);
    }

    /**
     * Add markers from json to the timeline.
     */
    #addMarkers() {
        for(const [id, data] of Object.entries(this.#json.data.markers)) {
            this.#timeline.addCustomTime(new Date(data.date), id);
            this.#timeline.setCustomTimeMarker(data.name, id, !this.isLocked());
        }
    }

    /**
     * Update lock status of markers.
     */
    #updateMarkersLockStatus() {
        for(const [id, data] of Object.entries(this.#json.data.markers)) {
            // Block text editing
            this.#timeline.setCustomTimeMarker(data.name, id, !this.isLocked());

            // Block move of marker
            var elements = document.getElementsByClassName(id);
            if(elements.length > 1) {
                Swal.fire({
                    icon: 'error',
                    title: 'Same ID for multiple markers',
                    text: 'Did you edit the json manually?',
                });

                return;
            }

            if(elements.length == 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'No HTML element found for the marker',
                });

                return;
            }

            if(this.isLocked()) {
                elements[0].classList.add(HTML.CLASS.LOCKED);
            }
            else {
                elements[0].classList.remove(HTML.CLASS.LOCKED);
            }
        }
    }
}

// =============================================================================
// Panel used to manage the timeline configuration
// =============================================================================

class PanelConfiguration extends EventTarget {
    #eventClosed = null;
    #panelId = HTML.ID.VIEW.CONFIGURATION_EDIT.PANEL;
    #panel = null;
    #startDate = null;
    #endDate = null;
    #json = null;
    #iconClose = null;

    // -------------------------------------------------------------------------
    // Constructor/destructor
    // -------------------------------------------------------------------------

    /**
     * Constructor of the class.
     *
     * @param {Object} json Json data used to get the configuration.
     */
    constructor(json) {
        super();

        this.#json = json;

        // Create events
        this.#eventClosed = new CustomEvent(EVENT.CLOSED);

        // Create GUI objects
        this.#panel = $e(this.#panelId);
        this.#startDate = $e(HTML.ID.VIEW.CONFIGURATION_EDIT.CONF.START_DATE);
        this.#endDate = $e(HTML.ID.VIEW.CONFIGURATION_EDIT.CONF.END_DATE);
        this.#iconClose = $e(HTML.ID.VIEW.CONFIGURATION_EDIT.BUTTON.CLOSE);

        // Bind events
        Html.bind(this.#panel, EVENT.CLICK, event => {
            if(event.target.id === this.#panelId) {
                this.hide();
            }
        });

        Html.bind(this.#iconClose, EVENT.CLICK, event => {
            this.hide();
        });

        // Populate
        this.reset();

        // Binds
        Html.bind(this.#json, EVENT.UPDATED, () => {
            this.reset();
        });

        Html.bind(this.#startDate, EVENT.CHANGE, () => {
            const start = this.#startDate.valueAsDate.getTime();
            this.json.data.configuration.startDate = start;
        });

        Html.bind(this.#endDate, EVENT.CHANGE, () => {
            const end = this.#endDate.valueAsDate.getTime();
            this.json.data.configuration.endDate = end;
        });
    }

    // -------------------------------------------------------------------------
    // Public
    // -------------------------------------------------------------------------

    /**
     * Shows the panel.
     */
    show() {
        if(this.json &&
           this.json.isValid() &&
           Object.keys(this.json.data.item_categories).length > 0) {

            Html.show(this.#panelId);
        }
        else {
            Swal.fire({
                icon: 'info',
                title: 'No categories',
                text: 'Create at least one item with a category',
            });
        }
    }

    /**
     * Hides the panel.
     *
     * Sends a notification when closed.
     *
     * @param {Object} json JSON data to be set (optional).
     */
    hide() {
        Html.hide(this.#panelId);
        this.dispatchEvent(this.#eventClosed);
    }

    /**
     * Reset the HTML content of the panel.
     */
    reset() {
        const start = new Date(this.json.data.configuration.startDate);
        const end = new Date(this.json.data.configuration.endDate);

        this.#startDate.value = Utils.dateToString(start);
        this.#endDate.value = Utils.dateToString(end);
    }

    // -------------------------------------------------------------------------
    // Getters/setters
    // -------------------------------------------------------------------------

    /**
     * Returns the JSON object provided to build the panel.
     *
     * @return {Object} JSON instance.
     */
    get json() {
        return this.#json;
    }
}

// =============================================================================
// Panel used to manage the list of item categories
// =============================================================================

class PanelItemCategories extends EventTarget {
    #eventClosed = null;
    #eventStyleSheetUpdated = null;
    #panelId = HTML.ID.VIEW.ITEM_CATEGORIES_EDIT.PANEL;
    #panel = null;
    #list = null;
    #listId = null;
    #json = null;
    #iconClose = null;
    #sheet = null;

    // -------------------------------------------------------------------------
    // Constructor/destructor
    // -------------------------------------------------------------------------

    /**
     * Constructor of the class.
     *
     * @param {Object} json Json data used to get the categories.
     */
    constructor(json) {
        super();

        this.#json = json;

        // Create events
        this.#eventClosed = new CustomEvent(EVENT.CLOSED);
        this.#eventStyleSheetUpdated = new CustomEvent(EVENT.CSS_UPDATED);

        // Create GUI objects
        this.#panel = $e(this.#panelId);
        this.#list = $e(HTML.ID.VIEW.ITEM_CATEGORIES_EDIT.CONTENT_LIST);
        this.#listId = uuidv4();
        this.#iconClose = $e(HTML.ID.VIEW.ITEM_CATEGORIES_EDIT.BUTTON.CLOSE);
        this.#sheet = new CSSStyleSheet();

        // Bind events
        Html.bind(this.#panel, EVENT.CLICK, event => {
            if(event.target.id === this.#panelId) {
                this.hide();
            }
        });

        Html.bind(this.#iconClose, EVENT.CLICK, event => {
            this.hide();
        });

        // Populate
        this.rebuild();

        // Binds
        Html.bind(this.#json, EVENT.UPDATED, () => {
            this.rebuild();
        });
    }

    // -------------------------------------------------------------------------
    // Public
    // -------------------------------------------------------------------------

    /**
     * Shows the panel.
     */
    show() {
        if(this.json &&
           this.json.isValid() &&
           Object.keys(this.json.data.item_categories).length > 0) {

            Html.show(this.#panelId);
        }
        else {
            Swal.fire({
                icon: 'info',
                title: 'No categories',
                text: 'Create at least one item with a category',
            });
        }
    }

    /**
     * Hides the panel.
     *
     * Sends a notification when closed.
     *
     * @param {Object} json JSON data to be set (optional).
     */
    hide() {
        Html.hide(this.#panelId);
        this.dispatchEvent(this.#eventClosed);
    }

    /**
     * Rebuild the HTML content of the panel.
     */
    rebuild() {
        this.resetStylesheet();

        this.#list.innerHTML = '';
        this.#list.appendChild(this.#toHtml());
    }

    /**
     * Rebuild the stylesheet.
     */
    resetStylesheet() {
        if(!this.json || !this.json.isValid()) {
            return;
        }

        const categories = this.json.data.item_categories;
        var styles = '';

        for(const [key, value] of Object.entries(categories)) {
            styles += '.vis-item.' + key + ':not(.vis-selected) {';
            styles += 'color: ' + value.fg + ';';
            styles += 'background-color: ' + value.bg + ';';
            styles += 'border-color: ' + value.border + ';';
            styles += '}\n';
        }

        this.#sheet.replaceSync(styles);

        this.dispatchEvent(this.#eventStyleSheetUpdated);
    }

    /**
     * Slot called to when a foreground color has changed.
     *
     * @param {Object} panel Item categories panel instance.
     * @param {Object} input HTML input that triggered the action.
     */
    static async onForegroundChanged(panel, input) {
        const category = input.getAttribute(HTML.ATTR.ITEM.CATEGORY);

        panel.json.data.item_categories[category].fg = input.value;

        panel.resetStylesheet();
    }

    /**
     * Slot called to when a background color has changed.
     *
     * @param {Object} panel Item categories panel instance.
     * @param {Object} input HTML input that triggered the action.
     */
    static async onBackgroundChanged(panel, input) {
        const category = input.getAttribute(HTML.ATTR.ITEM.CATEGORY);

        panel.json.data.item_categories[category].bg = input.value;

        panel.resetStylesheet();
    }

    /**
     * Slot called to when a border color has changed.
     *
     * @param {Object} panel Item categories panel instance.
     * @param {Object} input HTML input that triggered the action.
     */
    static async onBorderChanged(panel, input) {
        const category = input.getAttribute(HTML.ATTR.ITEM.CATEGORY);

        panel.json.data.item_categories[category].border = input.value;

        panel.resetStylesheet();
    }

    // -------------------------------------------------------------------------
    // Getters/setters
    // -------------------------------------------------------------------------

    /**
     * Returns the JSON object provided to build the panel.
     *
     * @return {Object} JSON instance.
     */
    get json() {
        return this.#json;
    }

    /**
     * Returns the custom stylesheet for the item categories.
     *
     * @return {Object} Custom stylesheet.
     */
    get stylesheet() {
        return this.#sheet;
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    /**
     * Converts a the items categories to an HTML list.
     *
     * @return {Object} HTML ordered list object.
     */
    #toHtml() {
        var table = document.createElement('table');

        if(!this.json || !this.json.isValid()) {
            return table;
        }

        const categories = this.json.data.item_categories;

        // Header
        var tr = document.createElement('tr');

        var th = document.createElement('th');
        th.textContent = 'Name';
        tr.append(th);

        var th = document.createElement('th');
        th.textContent = 'Foreground';
        tr.append(th);

        var th = document.createElement('th');
        th.textContent = 'Background';
        tr.append(th);

        var th = document.createElement('th');
        th.textContent = 'Border';
        tr.append(th);

        table.append(tr);

        // Elements
        for(const [key, value] of Object.entries(categories)) {
            var tr = document.createElement('tr');

            // Category name
            var name = document.createElement('td');
            name.textContent = key;
            tr.append(name);

            // Foreground color
            var fg = document.createElement('td');
            var input = document.createElement('input');
            input.classList.add('button');
            input.setAttribute(HTML.ATTR.ITEM.TYPE, 'color');
            input.setAttribute(HTML.ATTR.ITEM.VALUE, value.fg);
            input.setAttribute(HTML.ATTR.ITEM.CATEGORY, key);
            Html.bind(input, EVENT.CHANGE, event => {
                PanelItemCategories.onForegroundChanged(this, event.srcElement);
            });

            fg.append(input);
            tr.append(fg);

            // Background color
            var bg = document.createElement('td');
            var input = document.createElement('input');
            input.classList.add('button');
            input.setAttribute(HTML.ATTR.ITEM.TYPE, 'color');
            input.setAttribute(HTML.ATTR.ITEM.VALUE, value.bg);
            input.setAttribute(HTML.ATTR.ITEM.CATEGORY, key);
            Html.bind(input, EVENT.CHANGE, event => {
                PanelItemCategories.onBackgroundChanged(this, event.srcElement);
            });

            bg.append(input);
            tr.append(bg);

            // Border color
            var border = document.createElement('td');
            var input = document.createElement('input');
            input.classList.add('button');
            input.setAttribute(HTML.ATTR.ITEM.TYPE, 'color');
            input.setAttribute(HTML.ATTR.ITEM.VALUE, value.border);
            input.setAttribute(HTML.ATTR.ITEM.CATEGORY, key);
            Html.bind(input, EVENT.CHANGE, event => {
                PanelItemCategories.onBorderChanged(this, event.srcElement);
            });

            border.append(input);
            tr.append(border);

            table.append(tr);
        }

        return table;
    }
}

// =============================================================================
// Panel used to manage the list of groups
// =============================================================================

class PanelGroups extends EventTarget {
    #eventClosed = null;
    #panelId = HTML.ID.VIEW.GROUP_EDIT.PANEL;
    #panel = null;
    #list = null;
    #listId = null;
    #json = null;
    #iconPlus = null;
    #iconClose = null;

    // -------------------------------------------------------------------------
    // Constructor/destructor
    // -------------------------------------------------------------------------

    /**
     * Constructor of the class.
     *
     * @param {Object} json JSON data to be set.
     */
    constructor(json) {
        super();

        // Create events
        this.#eventClosed = new CustomEvent(EVENT.CLOSED);

        // Create GUI objects
        this.#json = json;
        this.#panel = $e(this.#panelId);
        this.#list = $e(HTML.ID.VIEW.GROUP_EDIT.CONTENT_LIST);
        this.#listId = uuidv4();
        this.#iconPlus = $e(HTML.ID.VIEW.GROUP_EDIT.ICON.ADD);
        this.#iconClose = $e(HTML.ID.VIEW.GROUP_EDIT.BUTTON.CLOSE);

        // Populate
        this.rebuild();

        // Bind events
        Html.bind(this.#iconPlus, EVENT.CLICK, event => {
            this.onAddGroup();
        });

        Html.bind(this.#panel, EVENT.CLICK, event => {
            if(event.target.id === this.#panelId) {
                this.hide();
            }
        });

        Html.bind(this.#iconClose, EVENT.CLICK, event => {
            this.hide();
        });
    }

    // -------------------------------------------------------------------------
    // Public
    // -------------------------------------------------------------------------

    /**
     * Shows the panel.
     */
    show() {
        Html.show(this.#panelId);
    }

    /**
     * Hides the panel.
     *
     * Sends a notification when closed.
     *
     * @param {Object} json JSON data to be set (optional).
     */
    hide() {
        Html.hide(this.#panelId);
        this.dispatchEvent(this.#eventClosed);
    }

    /**
     * Rebuild the HTML content of the panel.
     */
    rebuild() {
        this.#list.innerHTML = '';
        this.#list.appendChild(this.#toHtml());
    }

    /**
     * Converts a HTML list to a JSON array.
     *
     * @param {Object} element HTML element to be converted. If null is
     *                 provided, then the root of the HTML list is used.
     *
     * @return {Array} List of groups.
     */
    fromHtml(element = null) {
        var groups = [];

        if(element === null) {
            element = $e(this.#listId);
        }

        const htmlGroups = element.children;

        for(var index = 0; index < htmlGroups.length; index++) {
            const group = htmlGroups[index];

            groups.push({
                id: group.getAttribute(HTML.ATTR.GROUP.ID),
                name: group.getAttribute(HTML.ATTR.GROUP.NAME),
                category: group.getAttribute(HTML.ATTR.GROUP.CATEGORY),
                position: index + 1,
                visible: group.getAttribute(HTML.ATTR.GROUP.VISIBLE),
                childs: this.fromHtml(group.getElementsByTagName('ol')[0]),
            });
        }

        return groups;
    }

    /**
     * Slot called to add a group.
     */
    async onAddGroup() {
        const data = {
            titleText: 'Add group',
            input: 'text',
            inputPlaceholder: 'Name of the group',
            backdrop: true,
            showCancelButton: true,
            showConfirmButton: true,
            allowOutsideClick: true,
            allowEscapeKey: true,
            allowEnterKey: true,
            reverseButtons: true,
        };

        const { value: name } = await Swal.fire(data);
        if(!name) {
            return;
        }

        if(this.json.addGroup(name)) {
            this.rebuild();
        }
    }

    /**
     * Slot called to rename a group.
     *
     * @param {Object} panel  Group panel instance.
     * @param {Object} button HTML button that triggered the action.
     */
    static async onRenameGroup(panel, button) {
        const uuid = button.getAttribute(HTML.ATTR.UUID);
        const li = $e(uuid);
        const groupId = li.getAttribute(HTML.ATTR.GROUP.ID);
        const groupName = li.getAttribute(HTML.ATTR.GROUP.NAME);

        const data = {
            titleText: 'Rename group',
            input: 'text',
            inputPlaceholder: 'Name of the group',
            inputValue: groupName,
            backdrop: true,
            showCancelButton: true,
            showConfirmButton: true,
            allowOutsideClick: true,
            allowEscapeKey: true,
            allowEnterKey: true,
            reverseButtons: true,
        };

        const { value: name } = await Swal.fire(data);
        if(!name) {
            return;
        }

        if(panel.json.renameGroup(groupId, name)) {
            panel.rebuild();
        }
    }

    /**
     * Slot called to remove a group.
     *
     * @param {Object} panel  Group panel instance.
     * @param {Object} button HTML button that triggered the action.
     */
    static async onRemoveGroup(panel, button) {
        const uuid = button.getAttribute(HTML.ATTR.UUID);
        const li = $e(uuid);
        const groupId = li.getAttribute(HTML.ATTR.GROUP.ID);

        const data = {
            titleText: 'Remove group',
            text: li.getAttribute(HTML.ATTR.GROUP.NAME),
            backdrop: true,
            showCancelButton: true,
            showConfirmButton: true,
            allowOutsideClick: true,
            allowEscapeKey: true,
            allowEnterKey: true,
            reverseButtons: true,
        };

        const { value: status } = await Swal.fire(data);
        if(!status) {
            return;
        }

        if(panel.json.removeGroup(groupId)) {
            panel.rebuild();
        }
    }

    /**
     * Slot called to toggle the visibility of a group.
     *
     * @param {Object} panel  Group panel instance.
     * @param {Object} button HTML button that triggered the action.
     */
    static onToggleGroupVisibility(panel, button) {
        const uuid = button.getAttribute(HTML.ATTR.UUID);
        const li = $e(uuid);
        const groupId = li.getAttribute(HTML.ATTR.GROUP.ID);

        if(panel.json.toggleGroupVisibility(groupId)) {
            panel.rebuild();
        }
    }

    // -------------------------------------------------------------------------
    // Getters/setters
    // -------------------------------------------------------------------------

    /**
     * Returns the JSON object provided to build the panel.
     *
     * @return {Object} JSON instance.
     */
    get json() {
        return this.#json;
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    /**
     * Converts a group to an HTML list.
     *
     * @param {Object}  group Group object to be converted. If null is provided,
     *                        the groups from JSON data will be used.
     *
     * @return {Object}       HTML ordered list object.
     */
    #toHtml(group = null) {
        var groups = null;

        var ol = document.createElement('ol');
        Sort.enable(
            ol,
            HTML.CLASS.SORTABLE_GROUP,
            this,
            function(event, panel) {
                panel.json.data.groups = panel.fromHtml();
            });

        if(group === null) {
            ol.id = this.#listId;

            if(this.#json && this.#json.isValid()) {
                groups = this.#json.data.groups;
            }
        }
        else {
            groups = group.childs;
        }

        if(!groups) {
            return ol;
        }

        for(var groupId = 0; groupId < groups.length; groupId++) {
            const group = groups[groupId];

            // Add group
            const uuid = uuidv4();

            var span = document.createElement('span');
            span.textContent = group.name;

            var li = document.createElement('li');
            li.id = uuid;
            li.setAttribute(HTML.ATTR.GROUP.ID, group.id);
            li.setAttribute(HTML.ATTR.GROUP.NAME, group.name);
            li.setAttribute(HTML.ATTR.GROUP.CATEGORY, group.category);
            li.setAttribute(HTML.ATTR.GROUP.POSITION, group.position);
            li.setAttribute(HTML.ATTR.GROUP.VISIBLE, group.visible);

            li.appendChild(span);

            // Icon: rename
            var btnRename = li.appendChild(document.createElement('i'));
            btnRename.classList.add('button');
            btnRename.classList.add('btn-rename-group');
            btnRename.classList.add('fa');
            btnRename.classList.add('fa-pen');
            btnRename.setAttribute(HTML.ATTR.UUID, uuid);
            Html.bind(btnRename, EVENT.CLICK, event => {
                PanelGroups.onRenameGroup(this, event.srcElement);
            });

            // Icon: show/hide
            var attrVisible = group.visible ? 'fa-eye' : 'fa-eye-slash';

            var btnVisibility = li.appendChild(document.createElement('i'));
            btnVisibility.classList.add('button');
            btnVisibility.classList.add('btn-show-hide-group');
            btnVisibility.classList.add('fa');
            btnVisibility.classList.add(attrVisible);
            btnVisibility.setAttribute(HTML.ATTR.UUID, uuid);
            Html.bind(btnVisibility, EVENT.CLICK, event => {
                PanelGroups.onToggleGroupVisibility(this, event.srcElement);
            });

            // Icon: remove
            var btnRemove = li.appendChild(document.createElement('i'));
            btnRemove.classList.add('button');
            btnRemove.classList.add('btn-remove-group');
            btnRemove.classList.add('fa');
            btnRemove.classList.add('fa-trash');
            btnRemove.setAttribute(HTML.ATTR.UUID, uuid);
            Html.bind(btnRemove, EVENT.CLICK, event => {
                PanelGroups.onRemoveGroup(this, event.srcElement);
            });

            // Add its childs
            li.appendChild(this.#toHtml(group));

            // Add to parent
            ol.appendChild(li);
        }

        return ol;
    }
}

// =============================================================================
// Panel used to manage the list of eras
// =============================================================================

class PanelEras extends EventTarget {
    #eventClosed = null;
    #eventStyleSheetUpdated = null;
    #panelId = HTML.ID.VIEW.ERAS_EDIT.PANEL;
    #panel = null;
    #list = null;
    #listId = null;
    #json = null;
    #iconPlus = null;
    #iconClose = null;
    #sheet = null;

    // -------------------------------------------------------------------------
    // Constructor/destructor
    // -------------------------------------------------------------------------

    /**
     * Constructor of the class.
     *
     * @param {Object} json JSON data to be set.
     */
    constructor(json) {
        super();

        // Create events
        this.#eventClosed = new CustomEvent(EVENT.CLOSED);
        this.#eventStyleSheetUpdated = new CustomEvent(EVENT.CSS_UPDATED);

        // Create GUI objects
        this.#json = json;
        this.#panel = $e(this.#panelId);
        this.#list = $e(HTML.ID.VIEW.ERAS_EDIT.CONTENT_LIST);
        this.#listId = uuidv4();
        this.#iconPlus = $e(HTML.ID.VIEW.ERAS_EDIT.ICON.ADD);
        this.#iconClose = $e(HTML.ID.VIEW.ERAS_EDIT.BUTTON.CLOSE);
        this.#sheet = new CSSStyleSheet();

        // Populate
        this.rebuild();

        // Bind events
        Html.bind(this.#iconPlus, EVENT.CLICK, event => {
            this.onAddEra();
        });

        Html.bind(this.#panel, EVENT.CLICK, event => {
            if(event.target.id === this.#panelId) {
                this.hide();
            }
        });

        Html.bind(this.#iconClose, EVENT.CLICK, event => {
            this.hide();
        });
    }

    // -------------------------------------------------------------------------
    // Public
    // -------------------------------------------------------------------------

    /**
     * Shows the panel.
     */
    show() {
        Html.show(this.#panelId);
    }

    /**
     * Hides the panel.
     *
     * Sends a notification when closed.
     *
     * @param {Object} json JSON data to be set (optional).
     */
    hide() {
        this.resetStylesheet();

        Html.hide(this.#panelId);
        this.dispatchEvent(this.#eventClosed);
    }

    /**
     * Rebuild the HTML content of the panel.
     */
    rebuild() {
        this.resetStylesheet();

        this.#list.innerHTML = '';
        this.#list.appendChild(this.#toHtml());
    }

    /**
     * Rebuild the stylesheet.
     */
    resetStylesheet() {
        if(!this.json || !this.json.isValid()) {
            return;
        }

        const eras = this.json.data.eras;
        var styles = '';

        for(const [id, data] of Object.entries(eras)) {
            styles += '.vis-item.vis-background.' + id + ' {';
            styles += 'background-color: ' + data.color + ';';
            styles += 'opacity: 0.2;';
            styles += '}\n';
        }

        this.#sheet.replaceSync(styles);

        this.dispatchEvent(this.#eventStyleSheetUpdated);
    }

    /**
     * Slot called to add an era.
     */
    async onAddEra() {
        if(this.json.addEra(uuidv4(),
                            'New era',
                            new Date(),
                            new Date(),
                            '#cccccc')) {
            this.rebuild();
        }
    }

    /**
     * Slot called to edit an era.
     *
     * @param {Object} panel  Era panel instance.
     * @param {Object} button HTML button that triggered the action.
     */
    static async onEditEra(panel, button) {
        const uuid = button.getAttribute(HTML.ATTR.UUID);

        var obj = panel.json.getEra(uuid);
        if(!obj) {
            console.error('Era not found in json: ' + uuid);
            return;
        }

        // Load popup data from template and define replacements
        var template = Utils.read('templates/update-era.html');

        var replacements = {
            TEXT: obj.text,
            START_DATE: Utils.dateToString(new Date(obj.start)),
            END_DATE: Utils.dateToString(new Date(obj.end)),
            COLOR: obj.color,
        };

        // Show popup
        const data = {
            titleText: obj.text,
            html: Template.replace(template, replacements),

            width: 800,

            preConfirm: async () => {
                return {
                    text: $e(HTML.ID.VIEW.ERA_EDIT.TEXT).value,
                    start: $e(HTML.ID.VIEW.ERA_EDIT.START).value,
                    end: $e(HTML.ID.VIEW.ERA_EDIT.END).value,
                    color: $e(HTML.ID.VIEW.ERA_EDIT.COLOR).value,
                }
            },

            backdrop: true,
            showCancelButton: true,
            showConfirmButton: true,
            allowOutsideClick: true,
            allowEscapeKey: true,
            allowEnterKey: true,
            reverseButtons: true,
        };

        const { value: formValues } = await Swal.fire(data);
        if(!formValues) {
            return null;
        }

        // Update fields
        if('text' in formValues) {
            obj.text = formValues.text;
        }

        if('start' in formValues) {
            obj.start = formValues.start;
        }

        if('end' in formValues) {
            obj.end = formValues.end;
        }

        if('color' in formValues) {
            obj.color = formValues.color;
        }

        if(panel.json.updateEra(uuid, obj.text, obj.start, obj.end)) {
            panel.rebuild();
        }
    }

    /**
     * Slot called to remove an era.
     *
     * @param {Object} panel Era panel instance.
     * @param {Object} button HTML button that triggered the action.
     */
    static async onRemoveEra(panel, button) {
        const uuid = button.getAttribute(HTML.ATTR.UUID);
        const li = $e(uuid);

        const data = {
            titleText: 'Remove era',
            text: li.getAttribute(HTML.ATTR.ERA.TEXT),
            backdrop: true,
            showCancelButton: true,
            showConfirmButton: true,
            allowOutsideClick: true,
            allowEscapeKey: true,
            allowEnterKey: true,
            reverseButtons: true,
        };

        const { value: status } = await Swal.fire(data);
        if(!status) {
            return;
        }

        if(panel.json.removeEra(uuid)) {
            panel.rebuild();
        }
    }

    /**
     * Slot called to toggle the visibility of an era.
     *
     * @param {Object} panel  Era panel instance.
     * @param {Object} button HTML button that triggered the action.
     */
    static onToggleEraVisibility(panel, button) {
        const uuid = button.getAttribute(HTML.ATTR.UUID);

        if(panel.json.toggleEraVisibility(uuid)) {
            panel.rebuild();
        }
    }

    // -------------------------------------------------------------------------
    // Getters/setters
    // -------------------------------------------------------------------------

    /**
     * Returns the JSON object provided to build the panel.
     *
     * @return {Object} JSON instance.
     */
    get json() {
        return this.#json;
    }

    /**
     * Returns the custom stylesheet for the item categories.
     *
     * @return {Object} Custom stylesheet.
     */
    get stylesheet() {
        return this.#sheet;
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    /**
     * Converts the eras to an HTML list.
     *
     * @return {Object}       HTML ordered list object.
     */
    #toHtml() {
        var ul = document.createElement('ul');

        if(!this.json || !this.json.isValid()) {
            return ul;
        }

        for(const [id, data] of Object.entries(this.#json.data.eras)) {
            var span = document.createElement('span');
            span.textContent = data.text;

            var li = document.createElement('li');
            li.id = id;

            li.appendChild(span);

            // Icon: edit
            var btnEdit = li.appendChild(document.createElement('i'));
            btnEdit.classList.add('button');
            btnEdit.classList.add('btn-edit-era');
            btnEdit.classList.add('fa');
            btnEdit.classList.add('fa-pen');
            btnEdit.setAttribute(HTML.ATTR.UUID, id);
            Html.bind(btnEdit, EVENT.CLICK, event => {
                PanelEras.onEditEra(this, event.srcElement);
            });

            // Icon: show/hide
            var attrVisible = data.visible ? 'fa-eye' : 'fa-eye-slash';

            var btnVisibility = li.appendChild(document.createElement('i'));
            btnVisibility.classList.add('button');
            btnVisibility.classList.add('btn-show-hide-era');
            btnVisibility.classList.add('fa');
            btnVisibility.classList.add(attrVisible);
            btnVisibility.setAttribute(HTML.ATTR.UUID, id);
            Html.bind(btnVisibility, EVENT.CLICK, event => {
                PanelEras.onToggleEraVisibility(this, event.srcElement);
            });

            // Icon: remove
            var btnRemove = li.appendChild(document.createElement('i'));
            btnRemove.classList.add('button');
            btnRemove.classList.add('btn-remove-era');
            btnRemove.classList.add('fa');
            btnRemove.classList.add('fa-trash');
            btnRemove.setAttribute(HTML.ATTR.UUID, id);
            Html.bind(btnRemove, EVENT.CLICK, event => {
                PanelEras.onRemoveEra(this, event.srcElement);
            });

            // Add to parent
            ul.appendChild(li);
        }

        return ul;
    }
}

// =============================================================================
// Html WYSIWYG editor
// =============================================================================

class HtmlEditor {
    #editor = null;

    // -------------------------------------------------------------------------
    // Constructor/destructor
    // -------------------------------------------------------------------------

    /**
     * Constructor of the class.
     *
     * @param {String} containerId HTML identifier of the container.
     * @param {Object} data        Data to be displayed.
     */
    constructor(containerId, data = {}) {
        this.#editor = new EditorJS({
            holder: containerId,
            data: data,

            minHeight: 0,

            tools: {
                delimiter: Delimiter,
                header: Header,
                image: SimpleImage,
                marker: Marker,
                quote: Quote,
                underline: Underline,

                checklist: {
                    class: Checklist,
                    inlineToolbar: true,
                },

                list: {
                    class: NestedList,
                    inlineToolbar: true,
                },
            },
        });
    }

    // -------------------------------------------------------------------------
    // Public
    // -------------------------------------------------------------------------

    /**
     * Converts data to JSON.
     *
     * return {Object} JSON object.
     */
    async toJson() {
        try {
            await this.#editor.isReady;

            return await this.#editor.save();
        }
        catch(reason) {
            console.error('HtmlEditor failed: ' + reason);
            return null;
        }
    }
}

// =============================================================================
// Application class (entry point of the program)
// =============================================================================

class Application {
    #json = null;
    #timeline = null;
    #panelGroups = null;
    #panelItemCategories = null;
    #panelEras = null;
    #panelConfiguration = null;
    #buttonLock = null;
    #buttonLoadData = null;
    #buttonSaveData = null;
    #buttonEditConfiguration = null;
    #buttonEditItemCategories = null;
    #buttonEditEras = null;
    #buttonEditGroups= null;

    // -------------------------------------------------------------------------
    // Constructor/destructor
    // -------------------------------------------------------------------------

    /**
     * Constructor of the class.
     */
    constructor() {
        // Create objects
        this.#json = new Json(FILE.DATA);
        this.#timeline = new Timeline(this.#json);
        this.#panelGroups = new PanelGroups(this.#json);
        this.#panelItemCategories = new PanelItemCategories(this.#json);
        this.#panelEras = new PanelEras(this.#json);
        this.#panelConfiguration = new PanelConfiguration(this.#json);
        this.#buttonLock = $e(HTML.ID.VIEW.ACTIONS.BUTTON.LOCK_UNLOCK);
        this.#buttonLoadData = $e(HTML.ID.VIEW.ACTIONS.BUTTON.LOAD_DATA);
        this.#buttonSaveData = $e(HTML.ID.VIEW.ACTIONS.BUTTON.SAVE_DATA);
        this.#buttonEditConfiguration =
            $e(HTML.ID.VIEW.ACTIONS.BUTTON.EDIT_CONFIGURATION);
        this.#buttonEditItemCategories =
            $e(HTML.ID.VIEW.ACTIONS.BUTTON.EDIT_ITEM_CATEGORIES);
        this.#buttonEditEras = $e(HTML.ID.VIEW.ACTIONS.BUTTON.EDIT_ERAS);
        this.#buttonEditGroups = $e(HTML.ID.VIEW.ACTIONS.BUTTON.EDIT_GROUPS);

        // Configure
        this.#updateLockIcon();
        this.#updateButtonsLockStatus();

        // Bind events
        Html.bind(this.#buttonLock, EVENT.CLICK, () => {
            this.#timeline.toggleLockStatus();
            this.#updateLockIcon();
            this.#updateButtonsLockStatus();
        });

        Html.bind(this.#buttonLoadData, EVENT.CLICK, () => {
            this.#json.load();
            this.#timeline.refresh();
        });

        Html.bind(this.#buttonSaveData, EVENT.CLICK, () => {
            this.#json.save(FILE.DATA);
        });

        Html.bind(this.#buttonEditGroups, EVENT.CLICK, () => {
            this.#panelGroups.show();
        });

        Html.bind(this.#buttonEditItemCategories, EVENT.CLICK, () => {
            this.#panelItemCategories.show();
        });

        Html.bind(this.#buttonEditEras, EVENT.CLICK, () => {
            this.#panelEras.show();
        });

        Html.bind(this.#buttonEditConfiguration, EVENT.CLICK, () => {
            this.#panelConfiguration.show();
        });

        Html.bind(this.#panelGroups, EVENT.CLOSED, () => {
            this.#timeline.refresh();
        });

        Html.bind(this.#panelConfiguration, EVENT.CLOSED, () => {
            this.#timeline.refresh();
        });

        Html.bind(this.#panelEras, EVENT.CLOSED, () => {
            this.#timeline.refresh();
        });

        Html.bind(this.#panelItemCategories, EVENT.CSS_UPDATED, () => {
            this.#updateCustomStyleSheets();
            this.#timeline.refresh();
        });

        Html.bind(this.#panelEras, EVENT.CSS_UPDATED, () => {
            this.#updateCustomStyleSheets();
            this.#timeline.refresh();
        });

        this.#updateCustomStyleSheets();
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    /**
     * Update custom stylesheets.
     */
    #updateCustomStyleSheets() {
        document.adoptedStyleSheets = [
            this.#panelItemCategories.stylesheet,
            this.#panelEras.stylesheet
        ];
    }

    /**
     * Update lock icon according to current status.
     */
    #updateLockIcon() {
        const classToSet =
            this.#timeline.isLocked() ? 'fa-lock' : 'fa-lock-open';

        this.#buttonLock.classList.remove('fa-lock');
        this.#buttonLock.classList.remove('fa-lock-open');
        this.#buttonLock.classList.add(classToSet);
    }

    /**
     * Update lock status of buttons according to current status.
     */
    #updateButtonsLockStatus() {
        if(this.#timeline.isLocked()) {
            Html.disable(this.#buttonLoadData);
            Html.disable(this.#buttonSaveData);
            Html.disable(this.#buttonEditConfiguration);
            Html.disable(this.#buttonEditItemCategories);
            Html.disable(this.#buttonEditEras);
            Html.disable(this.#buttonEditGroups);
        }
        else {
            Html.enable(this.#buttonLoadData);
            Html.enable(this.#buttonSaveData);
            Html.enable(this.#buttonEditConfiguration);
            Html.enable(this.#buttonEditItemCategories);
            Html.enable(this.#buttonEditEras);
            Html.enable(this.#buttonEditGroups);
        }
    }
};

// =============================================================================
// Sorting management class
// =============================================================================

class Sort {
    // -------------------------------------------------------------------------
    // Public
    // -------------------------------------------------------------------------

    /**
     * Enables sorting on a HTML element.
     *
     * @param {Object} element  HTML element on which the sorting must be
     *                          enabled.
     * @param {Object} category Unique category name used to group items.
     * @param {Object} data     Object that's passed to the callback when the
     *                          dragging ends.
     */
    static enable(element, category, data = null, onDraggingEnd = null) {
        element.classList.add(HTML.CLASS.SORTABLE);

        new Sortable(element, {
            group: {
                name: category,
                pull: true,
                put: true,
            },
            sort: true,
            delay: 0,
            swapThreshold: 0.50,
            direction: 'vertical',

            onEnd: function(event) {
                onDraggingEnd(event, data);
            },
        });
    }
}

// =============================================================================
// Class used to store various utilities
// =============================================================================

class Utils {
    // -------------------------------------------------------------------------
    // Public
    // -------------------------------------------------------------------------

    /**
     * Reads the content of a local file.
     *
     * @param {String}  path URL to be fetched.
     * @param {String}  type Mimetype of the file to be fetched.
     *
     * @return {String}      Content of the file.
     */
    static read(path, type) {
        var request = new XMLHttpRequest();

        request.open('GET', path, false);
        request.overrideMimeType(type);
        request.send();

        return request.responseText;
    }

    /**
     * Downloads data as a file.
     *
     * @param {String} data     Data to be written in the file.
     * @param {String} filename Output filename.
     * @param {String} type     Mimetype of the file to be written.
     */
    static download(data, filename, type) {
        var file = new Blob([data], {type: type});

        if(window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(file, filename);
        }
        else {
            var a = document.createElement('a');
            var url = URL.createObjectURL(file);

            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

    /**
     * Converts a Date javasript object to a string usable in HTML
     *
     * @param {Object}  date Object to be converted.
     *
     * @return {String}      String that can be used in HTML input.
     */
    static dateToString(date) {
        if(date === null) {
            return '';
        }

        const year = date.getFullYear();

        const month = date.getMonth().toString().length === 1
            ? '0' + (date.getMonth() + 1).toString()
            : date.getMonth() + 1;

        const day = date.getDate().toString().length === 1
            ? '0' + (date.getDate()).toString()
            : date.getDate();

        const hours = date.getHours().toString().length === 1
            ? '0' + date.getHours().toString()
            : date.getHours();

        const min = date.getMinutes().toString().length === 1
            ? '0' + date.getMinutes().toString()
            : date.getMinutes();

        const sec = date.getSeconds().toString().length === 1
            ? '0' + date.getSeconds().toString()
            : date.getSeconds();

        return year + '-' +
            month + '-' +
            day + 'T' +
            hours + ':' +
            min + ':' +
            sec;
    }
}

// =============================================================================
// Class used to store templating utilities
// =============================================================================

class Html {
    // -------------------------------------------------------------------------
    // Public
    // -------------------------------------------------------------------------

    /**
     * Enables a HTML element.
     *
     * @param {Object}   source   Html object or the string of the HTML
     *                            identifier.
     */
    static enable(source) {
        var element = typeof(source) === 'string' ? $e(source) : source;
        element.removeAttribute(HTML.ATTR.DISABLED);
    }

    /**
     * Disables a HTML element.
     *
     * @param {Object}   source   Html object or the string of the HTML
     *                            identifier.
     */
    static disable(source) {
        var element = typeof(source) === 'string' ? $e(source) : source;
        element.setAttribute(HTML.ATTR.DISABLED, '');
    }

    /**
     * Hides a HTML element.
     *
     * @param {Object}   source   Html object or the string of the HTML
     *                            identifier.
     */
    static hide(source) {
        var element = typeof(source) === 'string' ? $e(source) : source;
        element.classList.add(HTML.CLASS.HIDDEN);
    }

    /**
     * Shows a HTML element.
     *
     * @param {Object}   source   Html object or the string of the HTML
     *                            identifier.
     */
    static show(source) {
        var element = typeof(source) === 'string' ? $e(source) : source;
        element.classList.remove(HTML.CLASS.HIDDEN);
    }

    /**
     * Bind an event to a callback.
     *
     * @param {Object}   source   Object to be connected or the string of the
     *                            HTML identifier.
     * @param {Function} callback Method to be called when the event is fired.
     */
    static bind(source, event, callback) {
        var element = typeof(source) === 'string' ? $e(source) : source;

        element.addEventListener(event, callback);
    }
}

// =============================================================================
// Class used to store HTML utilities
// =============================================================================

class Template {
    // -------------------------------------------------------------------------
    // Public
    // -------------------------------------------------------------------------

    /**
     * Replaces patterns in a string.
     *
     * Patterns are of the form: "%PATTERN%".
     *
     * @param {String}  input  Input string.
     * @param {String}  values Values where to find the replacements.
     *
     * @return {String}        String with patterns replaced.
     */
    static replace(input, values) {
        return input.replace(
            /%(\w*)%/g,
            function(m, key) {
                return values.hasOwnProperty(key) ? values[key] : '';
            } );
    }
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Shows a popup used to update or add an item.
 *
 * @param {String}  text     Text to be displayed in the popup.
 * @param {Object}  item     Vis graphical item.
 *
 * @return {Object}          null or the updated item received.
 */
async function showAddUpdateItemPopup(text, item) {
    const itemType = 'type' in item ? item.type : VIS.ITEM.TYPE.POINT;
    const className = 'className' in item ? item.className : '';
    const description = 'description' in item ? item.description : {};
    const start = 'start' in item ? item.start : null;
    const end = 'end' in item ? item.end : null;

    // Load popup data from template and define replacements
    var template = Utils.read('templates/add-update-item.html');

    var getSelected = function(itemType, expected) {
        return itemType === expected ? HTML.ATTR.SELECTED : '';
    };

    var replacements = {
        TEXT: item.content,
        CLASS_NAME: className,
        DESCRIPTION: description,
        START_DATE: Utils.dateToString(start),
        END_DATE: Utils.dateToString(end),
        BOX_SELECTED: getSelected(itemType, VIS.ITEM.TYPE.BOX),
        POINT_SELECTED: getSelected(itemType, VIS.ITEM.TYPE.POINT),
        RANGE_SELECTED: getSelected(itemType, VIS.ITEM.TYPE.RANGE),
    };

    var htmlEditor = null;

    // Show popup
    const data = {
        titleText: text,
        html: Template.replace(template, replacements),

        width: 800,

        preConfirm: async () => {
            const className = $e(HTML.ID.VIEW.ITEM_EDIT.CLASS_NAME).value;
            if(className.includes(' ')) {
                Swal.showValidationMessage('No spaces allowed in category');
            }

            if(!htmlEditor) {
                return {};
            }

            const description = await htmlEditor.toJson();

            return {
                text: $e(HTML.ID.VIEW.ITEM_EDIT.TEXT).value,
                className: className,
                description: description,
                type: $e(HTML.ID.VIEW.ITEM_EDIT.TYPE).value,
                start: $e(HTML.ID.VIEW.ITEM_EDIT.START).value,
                end: $e(HTML.ID.VIEW.ITEM_EDIT.END).value,
            }
        },

        backdrop: true,
        showCancelButton: true,
        showConfirmButton: true,
        allowOutsideClick: true,
        allowEscapeKey: true,
        allowEnterKey: true,
        reverseButtons: true,

        willOpen: function(element) {
            // Enable HTML editors
            htmlEditor =
                new HtmlEditor(HTML.ID.VIEW.ITEM_EDIT.DESCRIPTION, description);

            // Disable end date if not needed
            function updateEndDateAvailability() {
                const type = $e(HTML.ID.VIEW.ITEM_EDIT.TYPE).value;

                if(type != VIS.ITEM.TYPE.RANGE) {
                    Html.disable(HTML.ID.VIEW.ITEM_EDIT.END);
                }
                else {
                    Html.enable(HTML.ID.VIEW.ITEM_EDIT.END);
                }
            }

            updateEndDateAvailability();

            Html.bind(HTML.ID.VIEW.ITEM_EDIT.TYPE,
                 EVENT.CHANGE,
                 updateEndDateAvailability);
        }
    };

    const { value: formValues } = await Swal.fire(data);
    if(!formValues) {
        return null;
    }

    // Update fields
    if('text' in formValues) {
        item.content = formValues.text;
    }

    if('className' in formValues) {
        item.className = formValues.className;
    }

    if('description' in formValues) {
        item.description = formValues.description;
    }

    if('type' in formValues) {
        item.type = formValues.type;
    }

    if('start' in formValues) {
        item.start = new Date(formValues.start);
    }

    if('end' in formValues && item.type === VIS.ITEM.TYPE.RANGE) {
        item.end = new Date(formValues.end);
    }

    return item;
}

/**
 * Get a HTML element from its id.
 *
 * @param {String}  id Identifier of the HTML item.
 *
 * @return {Object}    Element found or null.
 */
function $e(id) {
    return document.getElementById(id);
}

// =============================================================================
// Constant variables
// =============================================================================

// List of files
const FILE = {
    DATA: 'data.json',
}

// List of mimetypes
const MIMETYPE = {
    JSON: 'application/json',
};

// List of HTML values (identifiers, CSS classes, etc).
const HTML = {
    ID: {
        VIEW: {
            TIMELINE: {
                CONTAINER: 'Timeline',
            },

            ACTIONS: {
                BUTTON: {
                    LOCK_UNLOCK: 'Action_LockUnlock',
                    LOAD_DATA: 'Action_LoadData',
                    SAVE_DATA: 'Action_SaveData',
                    EDIT_CONFIGURATION: 'Action_EditConfiguration',
                    EDIT_ITEM_CATEGORIES: 'Action_EditItemCategories',
                    EDIT_ERAS: 'Action_EditEras',
                    EDIT_GROUPS: 'Action_EditGroups',
                },
            },

            CONFIGURATION_EDIT: {
                PANEL: 'Panel_Configuration',

                BUTTON: {
                    CLOSE: 'Panel_Configuration_Button_Close',
                },

                CONF: {
                    START_DATE: 'Conf_StartDate',
                    END_DATE: 'Conf_EndDate',
                }
            },

            GROUP_EDIT: {
                PANEL: 'Panel_GroupsEdit',
                CONTENT_LIST: 'Panel_GroupsEdit_Content_List',

                ICON: {
                    ADD: 'Panel_GroupsEdit_Content_Icon_Add',
                },

                BUTTON: {
                    CLOSE: 'Panel_GroupsEdit_Button_Close',
                },
            },

            ITEM_CATEGORIES_EDIT: {
                PANEL: 'Panel_ItemCategoriesEdit',
                CONTENT_LIST: 'Panel_ItemCategoriesEdit_Content_List',

                BUTTON: {
                    CLOSE: 'Panel_ItemCategoriesEdit_Button_Close',
                },
            },

            ERAS_EDIT: {
                PANEL: 'Panel_ErasEdit',
                CONTENT_LIST: 'Panel_ErasEdit_Content_List',

                ICON: {
                    ADD: 'Panel_ErasEdit_Content_Icon_Add',
                },

                BUTTON: {
                    CLOSE: 'Panel_ErasEdit_Button_Close',
                },
            },

            ERA_EDIT: {
                TEXT: 'UpdateEra_Text',
                START: 'UpdateEra_StartDate',
                END: 'UpdateEra_EndDate',
                COLOR: 'UpdateEra_Color',
            },

            ITEM_EDIT: {
                TEXT: 'AddUpdateItem_Text',
                CLASS_NAME: 'AddUpdateItem_ClassName',
                DESCRIPTION: 'AddUpdateItem_Description',
                TYPE: 'AddUpdateItem_Type',
                START: 'AddUpdateItem_StartDate',
                END: 'AddUpdateItem_EndDate',
            },
        },
    },

    ATTR: {
        UUID: 'uuid',
        SELECTED: 'selected',
        DISABLED: 'disabled',

        GROUP: {
            ID: 'group-id',
            NAME: 'group-name',
            CATEGORY: 'group-category',
            POSITION: 'group-position',
            VISIBLE: 'group-visible',
        },

        ITEM: {
            TYPE: 'type',
            VALUE: 'value',
            CATEGORY: 'item-category',
        },
    },

    CLASS: {
        VISIBLE: 'visible',
        SORTABLE: 'sortable',
        SORTABLE_GROUP: 'sortable-group',
        HIDDEN: 'hidden',
        LOCKED: 'locked',
    }
};

// List of common events shared between GUI objects
const EVENT = {
    CLICK: 'click',
    CLOSED: 'closed',
    UPDATED: 'updated',
    CHANGE: 'change',
    CSS_UPDATED: 'css-updated',
};

// List of available item types in the Vis timeline
const VIS = {
    ITEM: {
        TYPE: {
            BOX: 'box',
            POINT: 'point',
            RANGE: 'range',
            BACKGROUND: 'background',
        },

        DEFAULT_STYLE: {
            fg: '#1a1a1a',
            bg: '#d5ddf6',
            border: '#97b0f8',
        }
    },

    EVENT: {
        DOUBLE_CLICK: 'doubleClick',
        MARKER_CHANGED: 'markerchange',
        TIME_CHANGED: 'timechange',
    },
};

// =============================================================================
// Create GUI objects
// =============================================================================

const app = new Application();
