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
const BackgroundMenu = imports.ui.backgroundMenu;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const LayoutManager = imports.ui.main.layoutManager;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

function reloadMenuLayout() {
    LayoutManager._bgManagers.forEach(
        function(mgr) {
            if (!mgr.background)
                mgr.emit('changed');
            else // < gnome-shell-3.12?
                mgr.background.emit('changed');
        });
}

function patchMenu() {
    // patch PopupMenu
    PopupMenu.PopupMenu.prototype.addActionAt = function(title, callback) {
        let menuItem = new PopupMenu.PopupMenuItem(title);
        this.addMenuItem(menuItem);
        menuItem.connect('activate', Lang.bind(this, function(menuItem, event) {
            callback(event);
        }));
        return menuItem;
    };
    PopupMenu.PopupMenu.prototype.addAppAction = function(title) {
        let menuItem = this.addActionAt(title, function(event) {
            Main.overview.hide();
            GLib.spawn_command_line_async("gnome-shell-extension-prefs extension:///patterns@felipeborges.github.com", null);
        });
        menuItem.actor.visible = true;
        return menuItem;
    };

    // patch BackgroundMenu
    BackgroundMenu.BackgroundMenu.prototype._old_init = BackgroundMenu.BackgroundMenu.prototype._init;
    BackgroundMenu.BackgroundMenu.prototype._init = function(source) {
        this._old_init(source);
        this.actor.add_style_class_name('popup-menu-box');
        this.addAppAction(_("Patterned Wallpapers"));
    };

    reloadMenuLayout();
}

function unpatchMenu() {
    BackgroundMenu.BackgroundMenu.prototype._init = BackgroundMenu.BackgroundMenu.prototype._old_init;
    BackgroundMenu.BackgroundMenu.prototype._old_init = undefined;
    PopupMenu.PopupMenu.prototype.addAppAction = undefined;
    PopupMenu.PopupMenu.prototype.addActionAt = undefined;

    reloadMenuLayout();
}
