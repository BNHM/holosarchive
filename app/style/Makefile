# BUILD Costum style file
OUTPUT_PATH = ../../css
NPM_PATH = ../node_modules/
BOOTSTRAP_PATH = ../bower_components/bootstrap
BOOTSWATCH_PATH = ../bower_components/bootswatch
LESSC_PATH = ../node_modules/less/bin/lessc

default: compile_less

compile_less:
	${LESSC_PATH} app.less > ${OUTPUT_PATH}/app.css;

.PHONY: default compile
