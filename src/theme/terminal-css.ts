import * as dom from "../lib/dom";
dom.importCss({
".ace-terminal-theme .ace_gutter": {
	backgroundColor: "#1a0005",
	textColor:"#4682B4",
},

".ace-terminal-theme .ace_print-margin": {
	width: 1,
	backgroundColor: "#1a1a1a",
},

".ace-terminal-theme": {
	backgroundColor: "#000",
	textColor:"#DEDEDE",
},

".ace-terminal-theme .ace_cursor": {
	textColor:"#9F9F9F",
},

".ace-terminal-theme .ace_marker-layer .ace_selection": {
	backgroundColor: "#424242",
},

".ace-terminal-theme.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #000",
},

".ace-terminal-theme .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(0, 0, 0)",
},

".ace-terminal-theme .ace_marker-layer .ace_bracket": {
	backgroundColor: "#090",
},

".ace-terminal-theme .ace_marker-layer .ace_bracket-start": {
	backgroundColor: "#090",
},

".ace-terminal-theme .ace_marker-layer .ace_bracket-unmatched": {
	margin: [-1, 0, 0, -1],
	border: "1 #900",
},

".ace-terminal-theme .ace_marker-layer .ace_active-line": {
	backgroundColor: "#2A2A2A",
},

".ace-terminal-theme .ace_gutter-active-line": {
	backgroundColor: "#2A112A",
},

".ace-terminal-theme .ace_marker-layer .ace_selected-word": {
	border: "1 #424242",
},

".ace-terminal-theme .ace_invisible": {
	textColor:"#343434",
},

".ace-terminal-theme .ace_keyword,.ace-terminal-theme .ace_meta,.ace-terminal-theme .ace_storage,.ace-terminal-theme .ace_storage.ace_type,.ace-terminal-theme .ace_support.ace_type": {
	textColor:"#FF6347",
},

".ace-terminal-theme .ace_keyword.ace_operator": {
	textColor:"#FF1493",
},

".ace-terminal-theme .ace_constant.ace_character,.ace-terminal-theme .ace_constant.ace_language,.ace-terminal-theme .ace_constant.ace_numeric,.ace-terminal-theme .ace_keyword.ace_other.ace_unit,.ace-terminal-theme .ace_support.ace_constant,.ace-terminal-theme .ace_variable.ace_parameter": {
	textColor:"#E78C45",
},

".ace-terminal-theme .ace_constant.ace_other": {
	textColor:"#FFD700",
},

".ace-terminal-theme .ace_invalid": {
	textColor:"#ff0",
	backgroundColor: "#f00",
},

".ace-terminal-theme .ace_invalid.ace_deprecated": {
	textColor: "#CED2CF",
	backgroundColor: "#B798BF",
},

".ace-terminal-theme .ace_fold": {
	backgroundColor: "#7AA6DA",
	borderColor: "#DEDEDE",
},

".ace-terminal-theme .ace_entity.ace_name.ace_function,.ace-terminal-theme .ace_support.ace_function,.ace-terminal-theme .ace_variable": {
	textColor:"#7AA6DA",
},

".ace-terminal-theme .ace_support.ace_class,.ace-terminal-theme .ace_support.ace_type": {
	textColor:"#E7C547",
},

".ace-terminal-theme .ace_heading,.ace-terminal-theme .ace_string": {
	textColor:"#B9CA4A",
},

".ace-terminal-theme .ace_entity.ace_name.ace_tag,.ace-terminal-theme .ace_entity.ace_other.ace_attribute-name,.ace-terminal-theme .ace_meta.ace_tag,.ace-terminal-theme .ace_string.ace_regexp,.ace-terminal-theme .ace_variable": {
	textColor:"#D54E53",
},

".ace-terminal-theme .ace_comment": {
	textColor:"#FF4500",
},

".ace-terminal-theme .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYLBWV/8PAAK4AYnhiq+xAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},

".ace-terminal-theme .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
});
