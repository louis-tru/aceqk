import * as dom from "../lib/dom";
dom.importCss({
".ace-clouds-midnight .ace_gutter": {
	backgroundColor: "#232323",
	textColor:"#929292",
},

".ace-clouds-midnight .ace_print-margin": {
	width: 1,
	backgroundColor: "#232323",
},

".ace-clouds-midnight": {
	backgroundColor: "#191919",
	textColor:"#929292",
},

".ace-clouds-midnight .ace_cursor": {
	textColor:"#7DA5DC",
},

".ace-clouds-midnight .ace_marker-layer .ace_selection": {
	backgroundColor: "#000000",
},

".ace-clouds-midnight.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #191919",
},

".ace-clouds-midnight .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(102, 82, 0)",
},

".ace-clouds-midnight .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 #BFBFBF",
},

".ace-clouds-midnight .ace_marker-layer .ace_active-line": {
	backgroundColor: "rgba(215, 215, 215, 0.031)",
},

".ace-clouds-midnight .ace_gutter-active-line": {
	backgroundColor: "rgba(215, 215, 215, 0.031)",
},

".ace-clouds-midnight .ace_marker-layer .ace_selected-word": {
	border: "1 #000000",
},

".ace-clouds-midnight .ace_invisible": {
	textColor:"#666",
},

".ace-clouds-midnight .ace_keyword,.ace-clouds-midnight .ace_meta,.ace-clouds-midnight .ace_support.ace_constant.ace_property-value": {
	textColor:"#927C5D",
},

".ace-clouds-midnight .ace_keyword.ace_operator": {
	textColor:"#4B4B4B",
},

".ace-clouds-midnight .ace_keyword.ace_other.ace_unit": {
	textColor:"#366F1A",
},

".ace-clouds-midnight .ace_constant.ace_language": {
	textColor:"#39946A",
},

".ace-clouds-midnight .ace_constant.ace_numeric": {
	textColor:"#46A609",
},

".ace-clouds-midnight .ace_constant.ace_character.ace_entity": {
	textColor:"#A165AC",
},

".ace-clouds-midnight .ace_invalid": {
	textColor: "#FFFFFF",
	backgroundColor: "#E92E2E",
},

".ace-clouds-midnight .ace_fold": {
	backgroundColor: "#927C5D",
	borderColor: "#929292",
},

".ace-clouds-midnight .ace_storage,.ace-clouds-midnight .ace_support.ace_class,\
.ace-clouds-midnight .ace_support.ace_function,.ace-clouds-midnight .ace_support.ace_other,\
.ace-clouds-midnight .ace_support.ace_type": {
	textColor:"#E92E2E",
},

".ace-clouds-midnight .ace_string": {
	textColor:"#5D90CD",
},

".ace-clouds-midnight .ace_comment": {
	textColor:"#3C403B",
},

".ace-clouds-midnight .ace_entity.ace_name.ace_tag,.ace-clouds-midnight .ace_entity.ace_other.ace_attribute-name": {
	textColor:"#606060",
},

".ace-clouds-midnight .ace_indent-guide": {
	// background: "url(data:image/png",base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYHB3d/8PAAOIAdULw8qMAAAAAElFTkSuQmCC) right repeat-y
},

".ace-clouds-midnight .ace_indent-guide-active": {
	// background: "url(data:image/png",base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC) right repeat-y;
},
});
