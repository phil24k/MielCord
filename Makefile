APP := mielcord
PYTHON ?= python3
HOST ?= 0.0.0.0
PORT ?= 8080

.PHONY: all run check clean package

all: $(APP)

$(APP): launcher.c
	gcc -O2 -Wall -Wextra -o $(APP) launcher.c
	chmod +x $(APP)
	chmod +x server.py

run: $(APP)
	MIELCORD_HOST=$(HOST) MIELCORD_PORT=$(PORT) ./$(APP)

check:
	$(PYTHON) -m py_compile server.py

clean:
	rm -f $(APP)
	rm -rf dist

package: $(APP)
	rm -rf dist
	mkdir -p dist/mielcord/static
	cp $(APP) server.py mielcord_config.json dist/mielcord/
	cp static/index.html static/app.js static/styles.css dist/mielcord/static/
	cp README.md dist/mielcord/
	tar -C dist -czf dist/mielcord-linux.tar.gz mielcord
