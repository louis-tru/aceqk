import * as dom from "../lib/dom";
dom.importCss({
".ace-clouds .ace_gutter": {
	backgroundColor: "#ebebeb",
	textColor:"#333",
},

".ace-clouds .ace_print-margin": {
	width: 1,
	backgroundColor: "#e8e8e8",
},

".ace-clouds": {
	backgroundColor: "#FFFFFF",
	textColor:"#000000",
},

".ace-clouds .ace_cursor": {
	textColor:"#000000",
},

".ace-clouds .ace_marker-layer .ace_selection": {
	backgroundColor: "#BDD5FC",
},

".ace-clouds.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #FFFFFF",
},

".ace-clouds .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(255, 255, 0)",
},

".ace-clouds .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 #BFBFBF",
},

".ace-clouds .ace_marker-layer .ace_active-line": {
	backgroundColor: "#FFFBD1",
},

".ace-clouds .ace_gutter-active-line": {
	backgroundColor : "#dcdcdc",
},

".ace-clouds .ace_marker-layer .ace_selected-word": {
	border: "1 #BDD5FC",
},

".ace-clouds .ace_invisible": {
	textColor:"#BFBFBF",
},

".ace-clouds .ace_keyword,.ace-clouds .ace_meta,.ace-clouds .ace_support.ace_constant.ace_property-value": {
	textColor:"#AF956F",
},

".ace-clouds .ace_keyword.ace_operator": {
	textColor:"#484848",
},

".ace-clouds .ace_keyword.ace_other.ace_unit": {
	textColor:"#96DC5F",
},

".ace-clouds .ace_constant.ace_language": {
	textColor:"#39946A",
},

".ace-clouds .ace_constant.ace_numeric": {
	textColor:"#46A609",
},

".ace-clouds .ace_constant.ace_character.ace_entity": {
	textColor:"#BF78CC",
},

".ace-clouds .ace_invalid": {
	backgroundColor: "#FF002A",
},

".ace-clouds .ace_fold": {
	backgroundColor: "#AF956F",
	borderColor: "#000000",
},

".ace-clouds .ace_storage,.ace-clouds .ace_support.ace_class,.ace-clouds .ace_support.ace_function,\
.ace-clouds .ace_support.ace_other,.ace-clouds .ace_support.ace_type": {
	textColor:"#C52727",
},

".ace-clouds .ace_string": {
	textColor:"#5D90CD",
},

".ace-clouds .ace_comment": {
	textColor:"#BCC8BA",
},

".ace-clouds .ace_entity.ace_name.ace_tag,.ace-clouds .ace_entity.ace_other.ace_attribute-name": {
	textColor:"#606060",
},

".ace-clouds .ace_indent-guide": {
	// background: "url("data:image/png",base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAE0lEQVQImWP4////f4bLly//BwAmVgd1/w11/gAAAABJRU5ErkJggg==") right repeat-y
},

".ace-clouds .ace_indent-guide-active": {
	// background: "url("data:image/png",base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAZSURBVHjaYvj///9/hivKyv8BAAAA//8DACLqBhbvk+/eAAAAAElFTkSuQmCC") right repeat-y;
} 
});
