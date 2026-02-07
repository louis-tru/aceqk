import * as dom from "../lib/dom";
dom.importCss({
".ace-kr-theme .ace_gutter": {
	backgroundColor: "#1c1917",
	textColor:"#FCFFE0",
},

".ace-kr-theme .ace_print-margin": {
	width: 1,
	backgroundColor: "#1c1917",
},

".ace-kr-theme": {
	backgroundColor: "#0B0A09",
	textColor:"#FCFFE0",
},

".ace-kr-theme .ace_cursor": {
	textColor:"#FF9900",
},

".ace-kr-theme .ace_marker-layer .ace_selection": {
	backgroundColor: "rgba(170, 0, 255, 0.45)",
},

".ace-kr-theme.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #0B0A09",
},

".ace-kr-theme .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(102, 82, 0)",
},

".ace-kr-theme .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 rgba(255, 177, 111, 0.32)",
},

".ace-kr-theme .ace_marker-layer .ace_active-line": {
	backgroundColor: "#38403D",
},

".ace-kr-theme .ace_gutter-active-line": {
	backgroundColor : "#38403D",
},

".ace-kr-theme .ace_marker-layer .ace_selected-word": {
	border: "1 rgba(170, 0, 255, 0.45)",
},

".ace-kr-theme .ace_invisible": {
	textColor:"rgba(255, 177, 111, 0.32)",
},

".ace-kr-theme .ace_keyword,.ace-kr-theme .ace_meta": {
	textColor:"#949C8B",
},

".ace-kr-theme .ace_constant,.ace-kr-theme .ace_constant.ace_character,.ace-kr-theme .ace_constant.ace_character.ace_escape,.ace-kr-theme .ace_constant.ace_other": {
	textColor:"rgba(210, 117, 24, 0.76)",
},

".ace-kr-theme .ace_invalid": {
	textColor: "#F8F8F8",
	backgroundColor: "#A41300",
},

".ace-kr-theme .ace_support": {
	textColor:"#9FC28A",
},

".ace-kr-theme .ace_support.ace_constant": {
	textColor:"#C27E66",
},

".ace-kr-theme .ace_fold": {
	backgroundColor: "#949C8B",
	borderColor: "#FCFFE0",
},

".ace-kr-theme .ace_support.ace_function": {
	textColor:"#85873A",
},

".ace-kr-theme .ace_storage": {
	textColor:"#FFEE80",
},

".ace-kr-theme .ace_string": {
	textColor:"rgba(164, 161, 181, 0.8)",
},

".ace-kr-theme .ace_string.ace_regexp": {
	textColor:"rgba(125, 255, 192, 0.65)",
},

".ace-kr-theme .ace_comment": {
	fontSlant: "italic",
	textColor:"#706D5B",
},

".ace-kr-theme .ace_variable": {
	textColor:"#D1A796",
},

".ace-kr-theme .ace_list,.ace-kr-theme .ace_markup.ace_list": {
	backgroundColor: "#0F0040",
},

".ace-kr-theme .ace_variable.ace_language": {
	textColor:"#FF80E1",
},

".ace-kr-theme .ace_meta.ace_tag": {
	textColor:"#BABD9C",
},

".ace-kr-theme .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYFBXV/8PAAJoAXX4kT2EAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},

".ace-kr-theme .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
});
