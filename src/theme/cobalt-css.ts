import * as dom from "../lib/dom";
dom.importCss({
".ace-cobalt .ace_gutter": {
	backgroundColor: "#011e3a",
	textColor:"rgb(128,145,160)",
},

".ace-cobalt .ace_print-margin": {
	width: 1,
	backgroundColor: "#555555",
},

".ace-cobalt": {
	backgroundColor: "#002240",
	textColor:"#FFFFFF",
},

".ace-cobalt .ace_cursor": {
	textColor:"#FFFFFF",
},

".ace-cobalt .ace_marker-layer .ace_selection": {
	backgroundColor: "rgba(179, 101, 57, 0.75)",
},

".ace-cobalt.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #002240",
},

".ace-cobalt .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(127, 111, 19)",
},

".ace-cobalt .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 rgba(255, 255, 255, 0.15)",
},

".ace-cobalt .ace_marker-layer .ace_active-line": {
	backgroundColor: "rgba(0, 0, 0, 0.35)",
},

".ace-cobalt .ace_gutter-active-line": {
	backgroundColor: "rgba(0, 0, 0, 0.35)",
},

".ace-cobalt .ace_marker-layer .ace_selected-word": {
	border: "1 rgba(179, 101, 57, 0.75)",
},

".ace-cobalt .ace_invisible": {
	textColor:"rgba(255, 255, 255, 0.15)",
},

".ace-cobalt .ace_keyword,.ace-cobalt .ace_meta": {
	textColor:"#FF9D00",
},

".ace-cobalt .ace_constant,.ace-cobalt .ace_constant.ace_character,\
.ace-cobalt .ace_constant.ace_character.ace_escape,.ace-cobalt .ace_constant.ace_other": {
	textColor:"#FF628C",
},

".ace-cobalt .ace_invalid": {
	textColor: "#F8F8F8",
	backgroundColor: "#800F00",
},

".ace-cobalt .ace_support": {
	textColor:"#80FFBB",
},

".ace-cobalt .ace_support.ace_constant": {
	textColor:"#EB939A",
},

".ace-cobalt .ace_fold": {
	backgroundColor: "#FF9D00",
	borderColor: "#FFFFFF",
},

".ace-cobalt .ace_support.ace_function": {
	textColor:"#FFB054",
},

".ace-cobalt .ace_storage": {
	textColor:"#FFEE80",
},

".ace-cobalt .ace_entity": {
	textColor:"#FFDD00",
},

".ace-cobalt .ace_string": {
	textColor:"#3AD900",
},

".ace-cobalt .ace_string.ace_regexp": {
	textColor:"#80FFC2",
},

".ace-cobalt .ace_comment": {
	fontSlant: "italic",
	textColor:"#0088FF",
},

".ace-cobalt .ace_heading,.ace-cobalt .ace_markup.ace_heading": {
	textColor: "#C8E4FD",
	backgroundColor: "#001221",
},

".ace-cobalt .ace_list,.ace-cobalt .ace_markup.ace_list": {
	backgroundColor: "#130D26",
},

".ace-cobalt .ace_variable": {
	textColor:"#CCCCCC",
},

".ace-cobalt .ace_variable.ace_language": {
	textColor:"#FF80E1",
},

".ace-cobalt .ace_meta.ace_tag": {
	textColor:"#9EFFFF",
},

".ace-cobalt .ace_indent-guide": {
	// background: "url(data:image/png",base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYHCLSvkPAAP3AgSDTRd4AAAAAElFTkSuQmCC) right repeat-y
},

".ace-cobalt .ace_indent-guide-active": {
	// background: "url(data:image/png",base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC) right repeat-y;
},
});
