import * as dom from "../lib/dom";
dom.importCss({
".ace-vibrant-ink .ace_gutter": {
	backgroundColor: "#1a1a1a",
	textColor:"#BEBEBE",
},

".ace-vibrant-ink .ace_print-margin": {
	width: 1,
	backgroundColor: "#1a1a1a",
},

".ace-vibrant-ink": {
	backgroundColor: "#0F0F0F",
	textColor:"#FFFFFF",
},

".ace-vibrant-ink .ace_cursor": {
	textColor:"#FFFFFF",
},

".ace-vibrant-ink .ace_marker-layer .ace_selection": {
	backgroundColor: "#6699CC",
},

".ace-vibrant-ink.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #0F0F0F",
},

".ace-vibrant-ink .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(102, 82, 0)",
},

".ace-vibrant-ink .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 #404040",
},

".ace-vibrant-ink .ace_marker-layer .ace_active-line": {
	backgroundColor: "#333333",
},

".ace-vibrant-ink .ace_gutter-active-line": {
	backgroundColor: "#333333",
},

".ace-vibrant-ink .ace_marker-layer .ace_selected-word": {
	border: "1 #6699CC",
},

".ace-vibrant-ink .ace_invisible": {
	textColor:"#404040",
},

".ace-vibrant-ink .ace_keyword,.ace-vibrant-ink .ace_meta": {
	textColor:"#FF6600",
},

".ace-vibrant-ink .ace_constant,.ace-vibrant-ink .ace_constant.ace_character,.ace-vibrant-ink .ace_constant.ace_character.ace_escape,.ace-vibrant-ink .ace_constant.ace_other": {
	textColor:"#339999",
},

".ace-vibrant-ink .ace_constant.ace_numeric": {
	textColor:"#99CC99",
},

".ace-vibrant-ink .ace_invalid,.ace-vibrant-ink .ace_invalid.ace_deprecated": {
	textColor: "#CCFF33",
	backgroundColor: "#000000",
},

".ace-vibrant-ink .ace_fold": {
	backgroundColor: "#FFCC00",
	borderColor: "#FFFFFF",
},

".ace-vibrant-ink .ace_entity.ace_name.ace_function,.ace-vibrant-ink .ace_support.ace_function,.ace-vibrant-ink .ace_variable": {
	textColor:"#FFCC00",
},

".ace-vibrant-ink .ace_variable.ace_parameter": {
	fontSlant: "italic",
},

".ace-vibrant-ink .ace_string": {
	textColor:"#66FF00",
},

".ace-vibrant-ink .ace_string.ace_regexp": {
	textColor:"#44B4CC",
},

".ace-vibrant-ink .ace_comment": {
	textColor:"#9933CC",
},

".ace-vibrant-ink .ace_entity.ace_other.ace_attribute-name": {
	fontSlant: "italic",
	textColor:"#99CC99",
},

".ace-vibrant-ink .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYNDTc/oPAALPAZ7hxlbYAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},

".ace-vibrant-ink .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
});
