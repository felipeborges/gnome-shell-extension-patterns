/*
 * Copyright (C) 2015 Felipe Borges <felipeborges@gnome.org>
 *
 * gnome-shell-extension-patterns is free software; you can redistribute it
 * and/or modify it under the terms of the GNU General Public License as
 * published by the Free Software Foundation; either version 2 of the License,
 * or (at your option) any later version.
 *
 * gnome-shell-extension-patterns is distributed in the hope that it will be
 * useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General
 * Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with gnome-shell-extension-patterns. If not, see http://www.gnu.org/licenses/.
 *
 */

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Signals = imports.signals;

const COLOURLOVERS_PATTERNS_URI = 'http://www.colourlovers.com/api/patterns/%type%?format=json';
const BASE_BG_PATH = Me.dir.get_child('backgrounds').get_path();

const PatternsManager = new Lang.Class({
    Name: 'PatternsManager',

    _init: function(type) {
        this._items = [];

        this.getWallpapers(COLOURLOVERS_PATTERNS_URI, type);
    },

    buildPath: function(filename) {
        return GLib.build_filenamev([BASE_BG_PATH, filename]);
    },

    getWallpapers: function(base_url, type) {
        let url = base_url.replace("%type%", type);
        let path = this.buildPath(type + "_cache.json");

        Convenience.downloadFile(url, path, this.fetchPatternsIndex.bind(this));
    },

    fetchPatternsIndex: function(success, path) {
        if (!success)
            return

        this.emit('loading-done');
        Convenience.loadJsonFromPath(path, Lang.bind(this, function(success, json_obj) {
            json_obj.forEach(Lang.bind(this, function(image) {
                this.downloadImage(image, Lang.bind(this, function() {
                    this._items.push(image);
                    this.emit('item-added', image);
                }));
            }));
        }));
    },

    downloadImage: function(image, callback) {
        let path = this.buildPath(image.id + ".png");

        if (!Convenience.fileExists(path)) {
            Convenience.downloadFile(image.imageUrl, path, callback);
        } else {
            callback();
        }
    },

    getItem: function(position) {
        let item = this._items[position];

        if (item) {
            return item;
        }

        return null;
    },
});
Signals.addSignalMethods(PatternsManager.prototype);
