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
const PATTERNS_POPULAR_RANK_KEY = 'popular-rank';
const GNOME_BACKGROUND_SCHEMA = 'org.gnome.desktop.background';
const COLOURLOVERS_RANDOM_PATTERNS_URI = 'http://www.colourlovers.com/api/patterns/random?format=json';
const COLOURLOVERS_POPULAR_PATTERNS_URI = 'http://www.colourlovers.com/api/patterns/top?format=json';
const COLOURLOVERS_MAX_RESULTS = 20;

const MILLISECONDS_HOUR = 3600000;
const UNIX_DAY = 86400;
const UNIX_WEEK = 604800;

let UpdateFrequency = {
    DAILY: 0,
    WEEKLY: 1,
    NEVER: 2,
};

let PatternCollection = {
    POPULAR: 0,
    RANDOM: 2,
};

const BASE_BG_PATH = Me.dir.get_child('backgrounds').get_path();

const Patterns = new Lang.Class({
    Name: 'Patterns',

    _settings: null,

    _init: function() {
        if (this.canUpdateWallpaper()) {
            this.getWallpaper();
        }
    },

    get settings () {
        if (!this._settings) {
            try {
                this._settings = Convenience.getSettings();
            } catch (err) {
                log(err.message);
            }
        }

        return this._settings;
    },

    canUpdateWallpaper: function() {
        let current_time = GLib.DateTime.new_now_local().to_unix();
        let last_update_time = this.settings.get_int(PATTERNS_LAST_UPDATE_KEY);

        let update_frequency = this.settings.get_enum('patterns-frequency');

        if (update_frequency === UpdateFrequency.DAILY)
            return (current_time - last_update_time) > UNIX_DAY;
        else if (update_frequency === UpdateFrequency.WEEKLY)
            return (current_time - last_update_time) > UNIX_WEEK;

        return false
    },

    getWallpaper: function() {
        let collection = this.settings.get_enum('patterns-type');
        let rank = 0;
        if (collection === PatternCollection.POPULAR) {
            rank = this.settings.get_int(PATTERNS_POPULAR_RANK_KEY);
            this.downloadWallpaper(COLOURLOVERS_POPULAR_PATTERNS_URI, rank);

            if (rank > (COLOURLOVERS_MAX_RESULTS - 1)) {
                rank = 0;
            }
            this.settings.set_int(PATTERNS_POPULAR_RANK_KEY, rank + 1);
        } else if (collection === PatternCollection.RANDOM) {
            this.downloadWallpaper(COLOURLOVERS_RANDOM_PATTERNS_URI, rank);
        }
    },

    downloadWallpaper: function(url, rank) {
        let path = this.buildPath("bg.json");
        Convenience.downloadFile(url, path, Lang.bind(this, function(res, path) {
            if (!res) {
                this.getNextWallpaper();
                return;
            }

            Convenience.loadJsonFromPath(path, Lang.bind(this, function(res, json_obj) {
                let imageId = json_obj[rank]['id'];

                Convenience.downloadFile(json_obj[rank]['imageUrl'],
                                         this.buildPath(imageId + ".png"),
                                         this.setWallpaper);

                this.settings.set_int(PATTERNS_LAST_UPDATE_KEY,
                                      GLib.DateTime.new_now_local().to_unix());
            }));
        }));
    },

    buildPath: function(filename) {
        return GLib.build_filenamev([BASE_BG_PATH, filename]);
    },

    setWallpaper: function(res, path) {
        let bg_settings = new Gio.Settings({
            schema_id: GNOME_BACKGROUND_SCHEMA
        });

        bg_settings.set_value('picture-uri', new GLib.Variant('s', path));
        bg_settings.set_value('picture-options', new GLib.Variant('s', 'wallpaper'));

        this.getNextWallpaper();
    },

    getNextWallpaper: function() {
        this.timer = Mainloop.timeout_add(MILLISECONDS_HOUR, Lang.bind(this, function() {
            if (this.canUpdateWallpaper())
                this.getWallpaper();
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
