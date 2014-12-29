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
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;


const PatternsPrefs = new Lang.Class({
    Name: 'PatternsPrefs',
    Extends: Gtk.Frame,

    _init: function(params) {
        this.parent(params);

        this.margin = 24;

        let clearCacheButton = new Gtk.Button({ label: 'Clear cached wallpapers' });
        clearCacheButton.connect('clicked', this.clearCachedWallpapers.bind(this));
        this.add(clearCacheButton);
    },

    clearCachedWallpapers: function() {
        let base_path = Me.dir.get_child('backgrounds').get_path();
        let bg_dir = Gio.file_new_for_path(base_path);
        Convenience.listDirAsync(bg_dir, Lang.bind(this, function(files) {
            files.forEach(function(file_info) {
                let path = GLib.build_filenamev([base_path, file_info.get_name()]);
                let file = Gio.file_new_for_path(path);
                file.delete(null);
            });
        }));
    },
});

function init() {
}

function buildPrefsWidget() {
    let widget = new PatternsPrefs();
    widget.show_all();

    return widget;
}
