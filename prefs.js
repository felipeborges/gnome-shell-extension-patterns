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

const PATTERNS_TYPE_KEY = 'patterns-type';
const PATTERNS_FREQUENCY_KEY = 'patterns-frequency';

const PatternsPrefs = new Lang.Class({
    Name: 'PatternsPrefs',
    Extends: Gtk.Box,

    _settings: null,

    _init: function(params) {
        this.parent(params);

        this.orientation = Gtk.Orientation.VERTICAL;

        let builder = new Gtk.Builder();
        builder.add_from_file(Me.dir.get_path() + "/preferences_dialog.ui");

        let radioBox = builder.get_object('radio_boxes');
        this.pack_start(radioBox, true, true, 0);

        let patternTypes = [];
        patternTypes[0] = builder.get_object('popular_button');
        patternTypes[1] = builder.get_object('favorites_button');
        patternTypes[2] = builder.get_object('random_button');

        patternTypes.forEach(Lang.bind(this, function(button) {
            button.connect('toggled', this._onPatternsChanged.bind(this));
        }));

        patternTypes[this.pattern_type].active = true;

        let frequencyModes = [];
        frequencyModes[0] = builder.get_object('daily_button');
        frequencyModes[1] = builder.get_object('weekly_button');
        frequencyModes[2] = builder.get_object('never_button');

        frequencyModes.forEach(Lang.bind(this, function(button) {
            button.connect('toggled', this._onFrequencyChanged.bind(this));
        }));

        frequencyModes[this.update_frequency].active = true;

        let privacyFrame = builder.get_object('privacy_frame');
        this.pack_end(privacyFrame, true, true, 0);

        let clearCacheButton = builder.get_object('clear_cache_button');
        clearCacheButton.connect('clicked', this.clearCachedWallpapers.bind(this));
    },

    get settings () {
        if (!this._settings) {
            try {
                this._settings = Convenience.getSettings();
            } catch(err) {
               log(err.message);
            }
        }

        return this._settings;
    },

    _onPatternsChanged: function(button) {
        if (button.active) {
            this.pattern_type = button.name;
        }
    },

    get pattern_type () {
        return this.settings.get_enum(PATTERNS_TYPE_KEY);
    },

    set pattern_type (type) {
        this.settings.set_enum(PATTERNS_TYPE_KEY, type);
    },

    _onFrequencyChanged: function(button) {
        if (button.active) {
            this.update_frequency = button.name;
        }
    },

    get update_frequency () {
        return this.settings.get_enum(PATTERNS_FREQUENCY_KEY);
    },

    set update_frequency (frequency) {
        this.settings.set_enum(PATTERNS_FREQUENCY_KEY, frequency);
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
