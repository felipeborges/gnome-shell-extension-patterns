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
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Signals = imports.signals;

const Mainloop = imports.mainloop;

const COLOURLOVERS_PATTERNS_URI = 'http://www.colourlovers.com/api/patterns/%type%?format=json';

const PatternsManager = new Lang.Class({
    Name: 'PatternsManager',

    _init: function(type) {
        this._items = [];

        this.getWallpapers(COLOURLOVERS_PATTERNS_URI, type);
    },

    getWallpapers: function(base_url, type) {
        let url = base_url.replace("%type%", type);
        let path = GLib.build_filenamev([Me.dir.get_path(), type + "_cache.json"]);

        Convenience.downloadImageAsync(url, path, Lang.bind(this, function() {
            let imageList = Gio.file_new_for_path(path);
            imageList.load_contents_async(null, Lang.bind(this, function(src, res) {
                try {
                    let [success, contents] = imageList.load_contents_finish(res);

                    if (success) {
                        let json_obj = JSON.parse(contents);
                        json_obj.forEach(Lang.bind(this, function(image) {
                            this.downloadImage(image, Lang.bind(this, function() {
                                this._items.push(image);
                                this.emit('item-added', image);
                            }));
                        }));
                    }
                } catch(e) {
                    log("Error obtaining list of images");
                }
            }));
        }));
    },

    downloadImage: function(image, callback) {
        let path = GLib.build_filenamev([Me.dir.get_child('backgrounds').get_path(), image.id + ".png"]);
        let file = Gio.File.new_for_path(path);

        if (!file.query_exists(null)) {
            Convenience.downloadImageAsync(image.imageUrl, path, callback);
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
