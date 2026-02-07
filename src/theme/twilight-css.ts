import * as dom from "../lib/dom";
dom.importCss({
".ace-twilight .ace_gutter": {
	backgroundColor: "#232323",
	textColor:"#E2E2E2",
},

".ace-twilight .ace_print-margin": {
	width: 1,
	backgroundColor: "#232323",
},

".ace-twilight": {
	backgroundColor: "#141414",
	textColor:"#F8F8F8",
},

".ace-twilight .ace_cursor": {
	textColor:"#A7A7A7",
},

".ace-twilight .ace_marker-layer .ace_selection": {
	backgroundColor: "rgba(221, 240, 255, 0.20)",
},

".ace-twilight.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #141414",
},

".ace-twilight .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(102, 82, 0)",
},

".ace-twilight .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 rgba(255, 255, 255, 0.25)",
},

".ace-twilight .ace_marker-layer .ace_active-line": {
	backgroundColor: "rgba(255, 255, 255, 0.031)",
},

".ace-twilight .ace_gutter-active-line": {
	backgroundColor: "rgba(255, 255, 255, 0.031)",
},

".ace-twilight .ace_marker-layer .ace_selected-word": {
	border: "1 rgba(221, 240, 255, 0.20)",
},

".ace-twilight .ace_invisible": {
	textColor:"rgba(255, 255, 255, 0.25)",
},

".ace-twilight .ace_keyword,.ace-twilight .ace_meta": {
	textColor:"#CDA869",
},

".ace-twilight .ace_constant,.ace-twilight .ace_constant.ace_character,.ace-twilight .ace_constant.ace_character.ace_escape,.ace-twilight .ace_constant.ace_other,.ace-twilight .ace_heading,.ace-twilight .ace_markup.ace_heading,.ace-twilight .ace_support.ace_constant": {
	textColor:"#CF6A4C",
},

".ace-twilight .ace_invalid.ace_illegal": {
	textColor: "#F8F8F8",
	backgroundColor: "rgba(86, 45, 86, 0.75)",
},

".ace-twilight .ace_invalid.ace_deprecated": {
	// text-decoration: "underline",
	fontSlant: "italic",
	textColor:"#D2A8A1",
},

".ace-twilight .ace_support": {
	textColor:"#9B859D",
},

".ace-twilight .ace_fold": {
	backgroundColor: "#AC885B",
	borderColor: "#F8F8F8",
},

".ace-twilight .ace_support.ace_function": {
	textColor:"#DAD085",
},

".ace-twilight .ace_list,.ace-twilight .ace_markup.ace_list,.ace-twilight .ace_storage": {
	textColor:"#F9EE98",
},

".ace-twilight .ace_entity.ace_name.ace_function,.ace-twilight .ace_meta.ace_tag": {
	textColor:"#AC885B",
},

".ace-twilight .ace_string": {
	textColor:"#8F9D6A",
},

".ace-twilight .ace_string.ace_regexp": {
	textColor:"#E9C062",
},

".ace-twilight .ace_comment": {
	fontSlant: "italic",
	textColor:"#5F5A60",
},

".ace-twilight .ace_variable": {
	textColor:"#7587A6",
},

".ace-twilight .ace_xml-pe": {
	textColor:"#494949",
},

".ace-twilight .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWMQERFpYLC1tf0PAAgOAnPnhxyiAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},

".ace-twilight .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
});
