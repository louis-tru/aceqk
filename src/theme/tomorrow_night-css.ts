import * as dom from "../lib/dom";
dom.importCss({
".ace-tomorrow-night .ace_gutter": {
	backgroundColor: "#25282c",
	textColor:"#C5C8C6",
},

".ace-tomorrow-night .ace_print-margin": {
	width: 1,
	backgroundColor: "#25282c",
},

".ace-tomorrow-night": {
	backgroundColor: "#1D1F21",
	textColor:"#C5C8C6",
},

".ace-tomorrow-night .ace_cursor": {
	textColor:"#AEAFAD",
},

".ace-tomorrow-night .ace_marker-layer .ace_selection": {
	backgroundColor: "#373B41",
},

".ace-tomorrow-night.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #1D1F21",
},

".ace-tomorrow-night .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(102, 82, 0)",
},

".ace-tomorrow-night .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 #4B4E55",
},

".ace-tomorrow-night .ace_marker-layer .ace_active-line": {
	backgroundColor: "#282A2E",
},

".ace-tomorrow-night .ace_gutter-active-line": {
	backgroundColor: "#282A2E",
},

".ace-tomorrow-night .ace_marker-layer .ace_selected-word": {
	border: "1 #373B41",
},

".ace-tomorrow-night .ace_invisible": {
	textColor:"#4B4E55",
},

".ace-tomorrow-night .ace_keyword,.ace-tomorrow-night .ace_meta,.ace-tomorrow-night .ace_storage,.ace-tomorrow-night .ace_storage.ace_type,.ace-tomorrow-night .ace_support.ace_type": {
	textColor:"#B294BB",
},

".ace-tomorrow-night .ace_keyword.ace_operator": {
	textColor:"#8ABEB7",
},

".ace-tomorrow-night .ace_constant.ace_character,.ace-tomorrow-night .ace_constant.ace_language,.ace-tomorrow-night .ace_constant.ace_numeric,.ace-tomorrow-night .ace_keyword.ace_other.ace_unit,.ace-tomorrow-night .ace_support.ace_constant,.ace-tomorrow-night .ace_variable.ace_parameter": {
	textColor:"#DE935F",
},

".ace-tomorrow-night .ace_constant.ace_other": {
	textColor:"#CED1CF",
},

".ace-tomorrow-night .ace_invalid": {
	textColor: "#CED2CF",
	backgroundColor: "#DF5F5F",
},

".ace-tomorrow-night .ace_invalid.ace_deprecated": {
	textColor: "#CED2CF",
	backgroundColor: "#B798BF",
},

".ace-tomorrow-night .ace_fold": {
	backgroundColor: "#81A2BE",
	borderColor: "#C5C8C6",
},

".ace-tomorrow-night .ace_entity.ace_name.ace_function,.ace-tomorrow-night .ace_support.ace_function,.ace-tomorrow-night .ace_variable": {
	textColor:"#81A2BE",
},

".ace-tomorrow-night .ace_support.ace_class,.ace-tomorrow-night .ace_support.ace_type": {
	textColor:"#F0C674",
},

".ace-tomorrow-night .ace_heading,.ace-tomorrow-night .ace_markup.ace_heading,.ace-tomorrow-night .ace_string": {
	textColor:"#B5BD68",
},

".ace-tomorrow-night .ace_entity.ace_name.ace_tag,.ace-tomorrow-night .ace_entity.ace_other.ace_attribute-name,.ace-tomorrow-night .ace_meta.ace_tag,.ace-tomorrow-night .ace_string.ace_regexp,.ace-tomorrow-night .ace_variable": {
	textColor:"#CC6666",
},

".ace-tomorrow-night .ace_comment": {
	textColor:"#969896",
},

".ace-tomorrow-night .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYHB3d/8PAAOIAdULw8qMAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},

".ace-tomorrow-night .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
});
