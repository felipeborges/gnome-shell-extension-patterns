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

release:
	glib-compile-schemas "schemas/";
	zip -r $(TARGET) $(DIST_FILES)
