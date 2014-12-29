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
const Mainloop = imports.mainloop;

const PATTERNS_LAST_UPDATE_KEY = 'last-update';
const GNOME_BACKGROUND_SCHEMA = 'org.gnome.desktop.background';
const COLOURLOVERS_RANDOM_PATTERNS_URI = 'http://www.colourlovers.com/api/patterns/random?format=json';

const HOUR = 3600000;

const Patterns = new Lang.Class({
    Name: 'Patterns',

    _init: function() {
        this.settings = Convenience.getSettings();

        if (this.itsBeenADay()) {
            this.downloadNewWallpaper();
        }
    },

    itsBeenADay: function() {
        let current_time = GLib.DateTime.new_now_local().to_unix();
        let last_update_time = this.settings.get_int(PATTERNS_LAST_UPDATE_KEY);

        return ((current_time - last_update_time)/60/60/24) > 1;
    },

    downloadNewWallpaper: function() {
        let now = GLib.DateTime.new_now_local().to_unix();

        let file = Gio.file_new_for_uri(COLOURLOVERS_RANDOM_PATTERNS_URI);
        file.load_contents_async(null, Lang.bind(this, function(src, res) {
            try {
                let [success, contents] = file.load_contents_finish(res);

                if (success) {
                    let json_obj = JSON.parse(contents);
                    let uri = json_obj[0]['imageUrl'];
                    let path = GLib.build_filenamev([Me.dir.get_child('backgrounds').get_path(), now + ".png"]);

                    Convenience.downloadImageAsync(uri, path, this.setWallpaper.bind(this));

                    this.settings.set_int(PATTERNS_LAST_UPDATE_KEY, now);
                }
            } catch(e) {
                this.getNextWallpaper();
            }
        }));
    },

    setWallpaper: function(path) {
        let background_settings = new Gio.Settings({
            schema_id: GNOME_BACKGROUND_SCHEMA
        });

        background_settings.set_value('picture-uri', new GLib.Variant('s', path));
        background_settings.set_value('picture-options', new GLib.Variant('s', 'wallpaper'));

        this.getNextWallpaper();
    },

    getNextWallpaper: function() {
        this.timer = Mainloop.timeout_add(HOUR, Lang.bind(this, function() {
            if (this.itsBeenADay())
                this.downloadNewWallpaper();
        }));
    },

    destroy: function() {
        if (this.timer)
            Mainloop.source_remove(this.timer);
    },
});

let patterns = null;

function init() {
}

function enable() {
    patterns = new Patterns();
}

function disable() {
    patterns.destroy();
}
