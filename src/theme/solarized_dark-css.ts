import * as dom from "../lib/dom";
dom.importCss({
".ace-solarized-dark .ace_gutter": {
	backgroundColor: "#01313f",
	textColor:"#d0edf7",
},

".ace-solarized-dark .ace_print-margin": {
	width: 1,
	backgroundColor: "#33555E",
},

".ace-solarized-dark": {
	backgroundColor: "#002B36",
	textColor:"#839496",
},

".ace-solarized-dark .ace_entity.ace_other.ace_attribute-name,.ace-solarized-dark .ace_storage": {
	textColor:"#839496",
},

".ace-solarized-dark .ace_cursor,.ace-solarized-dark .ace_string.ace_regexp": {
	textColor:"#D30102",
},

".ace-solarized-dark .ace_marker-layer .ace_active-line,.ace-solarized-dark .ace_marker-layer .ace_selection": {
	backgroundColor: "rgba(255, 255, 255, 0.1)",
},

".ace-solarized-dark.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #002B36",
},

".ace-solarized-dark .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(102, 82, 0)",
},

".ace-solarized-dark .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 rgba(147, 161, 161, 0.50)",
},

".ace-solarized-dark .ace_gutter-active-line": {
	backgroundColor: "#0d3440",
},

".ace-solarized-dark .ace_marker-layer .ace_selected-word": {
	border: "1 #073642",
},

".ace-solarized-dark .ace_invisible": {
	textColor:"rgba(147, 161, 161, 0.50)",
},

".ace-solarized-dark .ace_keyword,.ace-solarized-dark .ace_meta,.ace-solarized-dark .ace_support.ace_class,.ace-solarized-dark .ace_support.ace_type": {
	textColor:"#859900",
},

".ace-solarized-dark .ace_constant.ace_character,.ace-solarized-dark .ace_constant.ace_other": {
	textColor:"#CB4B16",
},

".ace-solarized-dark .ace_constant.ace_language": {
	textColor:"#B58900",
},

".ace-solarized-dark .ace_constant.ace_numeric": {
	textColor:"#D33682",
},

".ace-solarized-dark .ace_fold": {
	backgroundColor: "#268BD2",
	borderColor: "#93A1A1",
},

".ace-solarized-dark .ace_entity.ace_name.ace_function,.ace-solarized-dark .ace_entity.ace_name.ace_tag,.ace-solarized-dark .ace_support.ace_function,.ace-solarized-dark .ace_variable,.ace-solarized-dark .ace_variable.ace_language": {
	textColor:"#268BD2",
},

".ace-solarized-dark .ace_string": {
	textColor:"#2AA198",
},

".ace-solarized-dark .ace_comment": {
	fontSlant: "italic",
	textColor:"#657B83",
},

".ace-solarized-dark .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNg0Db1ZVCxc/sPAAd4AlUHlLenAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},

".ace-solarized-dark .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
});
