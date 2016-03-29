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
const GdkPixbuf = imports.gi.GdkPixbuf;
const Gettext = imports.gettext;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Manager = Me.imports.manager;
const Signals = imports.signals;

Gettext.textdomain("gnome-shell-extension-patterns");
Gettext.bindtextdomain("gnome-shell-extension-patterns", Me.dir.get_path() + "/locale");

const _ = Gettext.gettext;

const PATTERNS_TYPE_KEY = 'patterns-type';
const PATTERNS_FREQUENCY_KEY = 'patterns-frequency';
const GNOME_BACKGROUND_SCHEMA = 'org.gnome.desktop.background';

const PatternsView = new Lang.Class({
    Name: 'PatternsView',
    Extends: Gtk.Stack,

    _init: function(type, title) {
        this.parent();

        this.title = title;

        let builder = new Gtk.Builder();
        builder.add_from_file(Me.dir.get_path() + "/preferences_dialog.ui");

        let loading_icon = new Gtk.Spinner({
            active: true,
        });
        this.add(loading_icon);

        let scrolled_window = builder.get_object('scrolled_window');

        this._iconView = builder.get_object('iconview');
        this.model = Gtk.ListStore.new([
            GdkPixbuf.Pixbuf,
        ]);

        this._iconView.set_model(this.model);

        if (type === "favorites")
            this._manager = new Manager.FavoritesManager();
        else
            this._manager = new Manager.PatternsManager(type);

        this._manager.connect('loading-done', Lang.bind(this, function() {
            this.remove(loading_icon);
            this.add(scrolled_window);
        }));
        this._manager.connect('item-added', this.add_item.bind(this));
        this._iconView.connect('item-activated', Lang.bind(this, function(source, item) {
            let image = this._manager.getItem(item.to_string());
            this.emit('item-activated', image);
        }));
    },

    add_item: function(source, item) {
        let image_path = Me.dir.get_path() + "/backgrounds/" + item.id + ".png";
        try {
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(image_path, 192, 192);

            let iter = this.model.append();
            this.model.set(iter, [0], [pixbuf]);
        } catch (e) {}
    },

    favoriteItem: function(item) {
        this._manager.addItem(item);
    },
});
Signals.addSignalMethods(PatternsView.prototype);

const PatternsPrefs = new Lang.Class({
    Name: 'PatternsPrefs',
    Extends: Gtk.Stack,

    _settings: null,

    _init: function(params) {
        this.parent(params);

        this._bgBasePath = GLib.build_filenamev([
            Me.dir.get_child('backgrounds').get_path(),
            "<image_id>" + ".png"]);

        // hack, see bg#743380
        this.connect('realize', this._onRealize.bind(this));

        this._stack_switcher = new Gtk.StackSwitcher();
        this._stack_switcher.set_stack(this);

        this.views = {
            latest: new PatternsView("new", _("Latest")),
            popular: new PatternsView("top", _("Popular")),
            favorites: new PatternsView("favorites", _("Favorites")),
        };
        this._activeView = this.views.latest.title;

        for (let i in this.views) {
            this.add_titled(this.views[i], this.views[i].title, this.views[i].title);
            this.views[i].connect('item-activated', this.openPreview.bind(this));
        }

        this._previewView = new Gtk.Stack();
        this._previewView.show_all();

        this._goBackButton = new Gtk.Button({
            image: new Gtk.Image({
                icon_name: "go-previous-symbolic",
            })
        });
        this._goBackButton.connect('clicked', this.setOverviewMode.bind(this));

        this._favoriteButton = new Gtk.ToggleButton({
            image: new Gtk.Image({
                icon_name: "non-starred-symbolic",
            })
        });
        this._favoriteButton.connect('toggled', this.favoriteWallpaper.bind(this));

        this._setWallpaperButton = new Gtk.Button({
           label: _("Set as Wallpaper"),
        });
        this._setWallpaperButton.get_style_context().add_class("suggested-action");
        this._setWallpaperButton.connect('clicked', this.setWallpaper.bind(this));

        this._settingsButton = new Gtk.ToggleButton({
            image: new Gtk.Image({
                icon_name: "open-menu-symbolic",
            })
        });
        this._settingsButton.connect('toggled', Lang.bind(this, function() {
            let active = this._settingsButton.get_active();
            if (active)
                this._settingsPopover.show_all();
            else
                this._settingsPopover.hide();
        }));

        this._settingsPopover = new Gtk.Popover({
            relative_to: this._settingsButton,
            modal: false,
        });

        let builder = new Gtk.Builder();
        builder.add_from_file(Me.dir.get_path() + "/preferences_dialog.ui");
        this._settingsPopover.add(builder.get_object('radio_boxes'));

        let patternTypes = [];
        patternTypes[0] = builder.get_object('popular_button');
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

        this.get_toplevel().connect("destroy", this._onDestroy.bind(this));
    },

    _onRealize: function() {
        this.get_toplevel().set_size_request(917, 522);
        this._headerbar = this.get_toplevel().get_header_bar();
        this._headerbar.set_custom_title(this._stack_switcher);
        this._headerbar.pack_end(this._settingsButton, false, false, 0);
        this._headerbar.show_all();

        this.add_named(this._previewView, "preview");
        this._headerbar.pack_start(this._goBackButton, false, false, 0);
        this._headerbar.pack_end(this._favoriteButton, false, false, 0);
        this._headerbar.pack_end(this._setWallpaperButton, false, false, 0);
    },

    openPreview: function(source, image) {
        this._activeView = this.get_visible_child_name();

        this.setPreviewWallpaper(image);

        this._headerbar.set_custom_title(null)
        this._headerbar.set_title(image.title);
        this.set_visible_child(this._previewView);
        this._headerbar.show_all();

        this._settingsButton.hide();
    },

    setPreviewWallpaper: function(image) {
        let path = this._bgBasePath.replace('<image_id>', image.id);
        this._provider = new Gtk.CssProvider();
        this.get_toplevel().get_style_context().add_provider(this._provider, Gtk.STYLE_PROVIDER_PRIORITY_USER);
        this._provider.load_from_data("GtkWindow { background-image: url('" + path + "'); }");

        this._openedWallpaper = image;
    },

    setOverviewMode: function() {
        this._headerbar.set_custom_title(this._stack_switcher);
        this.set_visible_child_name(this._activeView);

        this._goBackButton.hide();
        this._favoriteButton.hide();
        this._setWallpaperButton.hide();

        this._settingsButton.show();

        this._provider.load_from_data("GtkWindow { background: #FFF; }");
    },

    favoriteWallpaper: function() {
        let active = this._favoriteButton.get_active();
        if (active) {
            this.views.favorites.favoriteItem(this._openedWallpaper);
        } else {
            // remove from favorites
        }
    },

    setWallpaper: function() {
        let background_settings = new Gio.Settings({
            schema_id: GNOME_BACKGROUND_SCHEMA
        });

        let path = this._bgBasePath.replace('<image_id>', this._openedWallpaper.id);

        background_settings.set_value('picture-uri', new GLib.Variant('s', path));
        background_settings.set_value('picture-options', new GLib.Variant('s', 'wallpaper'));
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

    _onDestroy: function() {
        this.views.favorites._manager.storeFavorites();

        return true;
    },
});

function init() {
}

function buildPrefsWidget() {
    let widget = new PatternsPrefs();
    widget.show_all();

    return widget;
}
