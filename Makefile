TARGET = "patterns@felipeborges.github.com.zip"

DIST_FILES = \
			 backgrounds/.gitignore \
			 convenience.js \
			 extension.js \
			 metadata.json \
			 preferences_dialog.ui \
			 prefs.js \
			 schemas/gschemas.compiled \
			 schemas/org.gnome.shell.extensions.patterns.gschema.xml

MSGLANGS=$(notdir $(wildcard po/*po))
MSGOBJS=$(addprefix locale/,$(MSGLANGS:.po=/LC_MESSAGES/gnome-shell-extension-patterns.mo))

gettext: $(MSGOBJS)

locale/%/LC_MESSAGES/gnome-shell-extension-patterns.mo: po/%.po
	mkdir -p $(dir $@)
	msgfmt -c -o $@ po/$*.po

release:
	glib-compile-schemas "schemas/";
	zip -r $(TARGET) $(DIST_FILES)
