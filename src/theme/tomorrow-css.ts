import * as dom from "../lib/dom";
dom.importCss({
".ace-tomorrow .ace_gutter": {
	backgroundColor: "#f6f6f6",
	textColor:"#4D4D4C",
},

".ace-tomorrow .ace_print-margin": {
	width: 1,
	backgroundColor: "#f6f6f6",
},

".ace-tomorrow": {
	backgroundColor: "#FFFFFF",
	textColor:"#4D4D4C",
},

".ace-tomorrow .ace_cursor": {
	textColor:"#AEAFAD",
},

".ace-tomorrow .ace_marker-layer .ace_selection": {
	backgroundColor: "#D6D6D6",
},

".ace-tomorrow.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #FFFFFF",
},

".ace-tomorrow .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(255, 255, 0)",
},

".ace-tomorrow .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 #D1D1D1",
},

".ace-tomorrow .ace_marker-layer .ace_active-line": {
	backgroundColor: "#EFEFEF",
},

".ace-tomorrow .ace_gutter-active-line": {
	backgroundColor : "#dcdcdc",
},

".ace-tomorrow .ace_marker-layer .ace_selected-word": {
	border: "1 #D6D6D6",
},

".ace-tomorrow .ace_invisible": {
	textColor:"#D1D1D1",
},

".ace-tomorrow .ace_keyword,.ace-tomorrow .ace_meta,.ace-tomorrow .ace_storage,.ace-tomorrow .ace_storage.ace_type,.ace-tomorrow .ace_support.ace_type": {
	textColor:"#8959A8",
},

".ace-tomorrow .ace_keyword.ace_operator": {
	textColor:"#3E999F",
},

".ace-tomorrow .ace_constant.ace_character,.ace-tomorrow .ace_constant.ace_language,.ace-tomorrow .ace_constant.ace_numeric,.ace-tomorrow .ace_keyword.ace_other.ace_unit,.ace-tomorrow .ace_support.ace_constant,.ace-tomorrow .ace_variable.ace_parameter": {
	textColor:"#F5871F",
},

".ace-tomorrow .ace_constant.ace_other": {
	textColor:"#666969",
},

".ace-tomorrow .ace_invalid": {
	textColor: "#FFFFFF",
	backgroundColor: "#C82829",
},

".ace-tomorrow .ace_invalid.ace_deprecated": {
	textColor: "#FFFFFF",
	backgroundColor: "#8959A8",
},

".ace-tomorrow .ace_fold": {
	backgroundColor: "#4271AE",
	borderColor: "#4D4D4C",
},

".ace-tomorrow .ace_entity.ace_name.ace_function,.ace-tomorrow .ace_support.ace_function,.ace-tomorrow .ace_variable": {
	textColor:"#4271AE",
},

".ace-tomorrow .ace_support.ace_class,.ace-tomorrow .ace_support.ace_type": {
	textColor:"#C99E00",
},

".ace-tomorrow .ace_heading,.ace-tomorrow .ace_markup.ace_heading,.ace-tomorrow .ace_string": {
	textColor:"#718C00",
},

".ace-tomorrow .ace_entity.ace_name.ace_tag,.ace-tomorrow .ace_entity.ace_other.ace_attribute-name,.ace-tomorrow .ace_meta.ace_tag,.ace-tomorrow .ace_string.ace_regexp,.ace-tomorrow .ace_variable": {
	textColor:"#C82829",
},

".ace-tomorrow .ace_comment": {
	textColor:"#8E908C",
},

".ace-tomorrow .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAE0lEQVQImWP4////f4bdu3f/BwAlfgctduB85QAAAABJRU5ErkJggg==', 1 auto, x=end, repeatY)",
},

".ace-tomorrow .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAZSURBVHjaYvj///9/hivKyv8BAAAA//8DACLqBhbvk+/eAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
} 
});
