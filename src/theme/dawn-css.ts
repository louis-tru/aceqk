import * as dom from "../lib/dom";
dom.importCss({
".ace-dawn .ace_gutter": {
	backgroundColor: "#ebebeb",
	textColor:"#333",
},

".ace-dawn .ace_print-margin": {
	width: 1,
	backgroundColor: "#e8e8e8",
},

".ace-dawn": {
	backgroundColor: "#F9F9F9",
	textColor:"#080808",
},

".ace-dawn .ace_cursor": {
	textColor:"#000000",
},

".ace-dawn .ace_marker-layer .ace_selection": {
	backgroundColor: "rgba(39, 95, 255, 0.30)",
},

".ace-dawn.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #F9F9F9",
},

".ace-dawn .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(255, 255, 0)",
},

".ace-dawn .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 rgba(75, 75, 126, 0.50)",
},

".ace-dawn .ace_marker-layer .ace_active-line": {
	backgroundColor: "rgba(36, 99, 180, 0.12)",
},

".ace-dawn .ace_gutter-active-line": {
	backgroundColor : "#dcdcdc",
},

".ace-dawn .ace_marker-layer .ace_selected-word": {
	border: "1 rgba(39, 95, 255, 0.30)",
},

".ace-dawn .ace_invisible": {
	textColor:"rgba(75, 75, 126, 0.50)",
},

".ace-dawn .ace_keyword,.ace-dawn .ace_meta": {
	textColor:"#794938",
},

".ace-dawn .ace_constant,.ace-dawn .ace_constant.ace_character,\
.ace-dawn .ace_constant.ace_character.ace_escape,.ace-dawn .ace_constant.ace_other": {
	textColor:"#811F24",
},

".ace-dawn .ace_invalid.ace_illegal": {
	// text-decoration: "underline",
	fontSlant: "italic",
	textColor: "#F8F8F8",
	backgroundColor: "#B52A1D",
},

".ace-dawn .ace_invalid.ace_deprecated": {
	// text-decoration: "underline",
	fontSlant: "italic",
	textColor:"#B52A1D",
},

".ace-dawn .ace_support": {
	textColor:"#691C97",
},

".ace-dawn .ace_support.ace_constant": {
	textColor:"#B4371F",
},

".ace-dawn .ace_fold": {
	backgroundColor: "#794938",
	borderColor: "#080808",
},

".ace-dawn .ace_list,.ace-dawn .ace_markup.ace_list,.ace-dawn .ace_support.ace_function": {
	textColor:"#693A17",
},

".ace-dawn .ace_storage": {
	fontSlant: "italic",
	textColor:"#A71D5D",
},

".ace-dawn .ace_string": {
	textColor:"#0B6125",
},

".ace-dawn .ace_string.ace_regexp": {
	textColor:"#CF5628",
},

".ace-dawn .ace_comment": {
	fontSlant: "italic",
	textColor:"#5A525F",
},

".ace-dawn .ace_heading,.ace-dawn .ace_markup.ace_heading": {
	textColor:"#19356D",
},

".ace-dawn .ace_variable": {
	textColor:"#234A97",
},

".ace-dawn .ace_indent-guide": {
	// background: "url(data:image/png",base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYLh/5+x/AAizA4hxNNsZAAAAAElFTkSuQmCC) right repeat-y
},

".ace-dawn .ace_indent-guide-active": {
	// background: "url("data:image/png",base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAZSURBVHjaYvj///9/hivKyv8BAAAA//8DACLqBhbvk+/eAAAAAElFTkSuQmCC") right repeat-y;
} 
});
